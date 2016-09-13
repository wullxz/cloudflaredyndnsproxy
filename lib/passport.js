"use strict";
var LocalStrategy = require('passport-local').Strategy;
var User = require('../models/user');

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
        return done(null, false, req.flash('loginMessage', 'No user with that email found!'));
      }

      if (!user.validPassword(password)) {
        return done(null, false, req.flash('loginMessage', 'Oops! Wrong password!'));
      }

      return done(null, user);
    });
  }));

  passport.use('local-signup', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
  },
  function(req, email, password, done) {
    process.nextTick(function() {
      console.log(JSON.stringify(req.body, null, 2));
      User.findOne({'email': email}, function(err, user) {
        if (err) {
          return done(err);
        }

        if (user) {
          return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
        }
        else {
          var newUser = new User();
          newUser.email = email;
          newUser.password = newUser.generateHash(password);
          newUser.name = req.body.name;
          if (req.superAdmin) {
            newUser.superAdmin = req.superAdmin;
          }

          newUser.save(function(err) {
            if (err) {
              throw err;
            }

            return done(null, newUser);
          });
        }
      });
    });
  }));
}
