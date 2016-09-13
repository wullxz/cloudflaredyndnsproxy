"use strict";

module.exports = function (req, res, next) {
  var p = req.body; // parameters
  var pw = p.password;
  var pwc = p.passwordconfirm;
  var passport = req.passport;

  if (pw != pwc) {
    req.flash('registerError', "Passwords do not match!");
    res.redirect('/admin/setup');
    return;
  }

  req.superAdmin = true;
  passport.authenticate('local-signup', function (err, user, info) {
    if (err || !user) {
      req.flash('registerError', "Error registering: " + info);
      res.redirect('/admin/setup');
      return;
    }

    req.logIn(user, function(err) {
      if (err) {
        return next(err);
      }

      res.redirect('/admin/');
    });
  })(req, res, next);
}
