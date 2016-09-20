"use strict";
var conf = require('./conf.js');

module.exports = function (req, res, next) {
  var p = req.body; // parameters
  var pw = p.password;
  var pwc = p.passwordconfirm;
  var passport = req.passport;

  if (pw != pwc) {
    req.flash('error', "Passwords do not match!");
    res.redirect('/admin/setup');
    return;
  }

  req.body.superAdmin = true;
  passport.authenticate('local-signup', function (err, user, info) {
    if (err || !user) {
      req.flash('error', "Error registering: " + info);
      res.redirect('/admin/setup');
      return;
    }

    req.logIn(user, function(err) {
      if (err) {
        return next(err);
      }

      // set cloudflare parameters in config
      conf.set('cloudflare:email', req.body.cfemail);
      conf.set('cloudflare:authkey', req.body.cfauthkey);
      res.redirect('/admin/overview');
    });
  })(req, res, next);
}
