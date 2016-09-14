"use strict";
var User = require('../models/user.js');

module.exports = {
  createUser: function(req, email, password, done, opts) {
    process.nextTick(function() {
      console.log(JSON.stringify(req.body, null, 2));
      User.findOne({'email': email}, function(err, user) {
        if (err) {
          if (opts.res) {
            opts.res.redirect(opts.failureRedirect);
          }
          if (done) {
            return done(err);
          }
          return;
        }

        if (user) {
          var flash = req.flash('error', 'That email is already taken.');
          if (opts.res) {
            opts.res.redirect(opts.failureRedirect);
          }
          if (done) {
            return done(null, false, flash);
          }
          return;
        }
        else {
          var newUser = new User();
          newUser.email = email;
          newUser.password = newUser.generateHash(password);
          newUser.name = req.body.name;
          if (req.body.superAdmin) {
            newUser.superAdmin = req.body.superAdmin;

            if (!req.body.maxdomains) {
              newUser.maxDomains = 1000;
            }
            else {
              newUser.maxDomains = req.body.maxdomains;
            }
          }
          else {
            if (req.body.maxdomains) {
              newUser.maxDomains = req.body.maxdomains;
            }
          }

          newUser.save(function(err) {
            if (err) {
              throw err;
            }

            if (opts.res) {
              opts.res.redirect(opts.successRedirect);
            }
            if (done) {
              return done(null, newUser);
            }
            return;
          });
        }
      });
    });
  }
}
