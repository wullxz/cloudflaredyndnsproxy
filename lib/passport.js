"use strict";
var LocalStrategy = require('passport-local').Strategy;
var User = require('../models/user');
var userHelper = require('../lib/user.js');

module.exports = function(passport) {

  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

  passport.use('local-login', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
  },
  function(req, email, password, done) {
    User.findOne({ 'email': email }, function(err, user) {
      if (err) {
        return done(err);
      }

      if (!user) {
        return done(null, false, req.flash('error', 'No user with that email found!'));
      }

      if (!user.validPassword(password)) {
        return done(null, false, req.flash('error', 'Oops! Wrong password!'));
      }

      return done(null, user);
    });
  }));

  passport.use('local-signup', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
  }, userHelper.createUser));

}
