"use strict";
var conf = require('./conf.js');
var ddns = require('./ddns.js');

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
      req.flash('error', "Error registering: " + JSON.stringify(info) + "<br />" + JSON.stringify(req.body));
      res.redirect('/admin/setup');
      return;
    }


    ddns.zoneId(req.body.cfzonename).then(function (id) {
      // set cloudflare parameters in config
      conf.set('cloudflare:email', req.body.cfemail);
      conf.set('cloudflare:authkey', req.body.cfauthkey);
      conf.set('cloudflare:zoneid', id);
      // config set, login user
      req.logIn(user, function(err) {
        if (err) {
          console.log("Could not log in user: " + JSON.stringify(err));
          req.flash('error', "Could not log in user: " + JSON.stringify(err));
          res.redirect('/admin/setup');
          return
        }
        else {
          res.redirect('/admin/overview');
        }
      });
    }).catch(function (err) {
      console.log("Could not save cloudflare config: " + JSON.stringify(err.message || err.result));
      req.flash('error', "Could not save cloudflare config: " + (err.message || err.result));
      res.redirect('/admin/setup');
    });
  })(req, res, next);
}
