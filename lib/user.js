"use strict";
var User = require('../models/user.js');

function validatePassword (pw1, pw2) {
  return (pw1 === pw2);
}

module.exports = {

  createUser: function(req, email, password, done, opts) {
    var opts = opts || {};
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
              req.flash('success', 'New user saved!');
              return done(null, newUser);
            }
            return;
          });
        }
      });
    });
  },

  /**
   * Updates a user who's ID is passed in via <c>req.body.id</c>
   *
   */
  updateUser: function(req, res, opts) {
    var u = req.user;
    var id = req.body.id;
    var param = req.body;
    var fail = opts.failureRedirect;
    var success = opts.successRedirect;
    var appendId = opts.appendIdToRedirect;
    var fallbackRedir = '/admin/overview';

    if (appendId) {
      fail = fail + '?id=' + id;
      success = success + '?id=' + id;
      fallbackRedir = fallbackRedir + '?id=' + id;
    }

    if (u._id != id && !u.superAdmin) {
      req.flash('error', 'You are not allowed to edit this user!');
      res.redirect(fail || fallbackRedir);
      return;
    }

    User.findOne({ _id: id }, function(err, user) {
      if (err) {
        req.flash('error', 'This user does not exist!');
        res.redirect(fail || fallbackRedir);
        return;
      }

      // update user data
      user.name = param.name || user.name;
      user.email = param.email || user.email;
      // these options may only be changed by a super admin
      if (u.superAdmin) {
        user.maxDomains = param.maxdomains || user.maxDomains;
        user.superAdmin = param.superAdmin;
      }

      // password change?
      var pw1 = param.password;
      var pw2 = param.passwordconfirm;
      console.log(pw1);
      console.log(pw2);
      console.log(validatePassword(pw1, pw2));
      if (pw1 && pw2 && validatePassword(pw1, pw2)) {
        if (!u.superAdmin && !user.validPassword(param.oldpassword)) {
          req.flash('error', 'Old password does not match!');
          res.redirect(fail || fallbackRedir);
          return;
        }
        else {
          user.password = user.generateHash(pw1);
        }
      }
      else {
        // only error out if passwords have been set!
        // otherwise we just assume that passwords
        // shouldn't be changed!
        if (pw1 || pw2) {
          req.flash('error', 'Passwords don\'t match!');
          res.redirect(fail || fallbackRedir);
          return;
        }
      }

      user.save(function(err) {
        if (err) {
          req.flash('error', 'Could not save user: ' + err.message);
          res.redirect(fail || fallbackRedir);
          return;
        }

        req.flash('success', 'OK!');
        res.redirect(success || fallbackRedir);
        return;
      });
    });
  }
}
