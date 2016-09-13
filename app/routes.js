"use strict";
var mongoose = require('mongoose');
var User = require('../models/user.js');

module.exports = function(app, passport) {

  app.get('/dyndns/:hostname', function (req, res) {
    console.log("Got a request for hostname " + req.params.hostname +
        ":\n" + JSON.stringify(req.query, null, 2));

    var ddns = require('../lib/ddns.js');

  });

  app.get("/admin/", function(req, res) {
    res.render('index', {
      title: "Home"
    });
  });

  app.get('/admin/login', function(req, res) {
    res.render('index', {
      message: req.flash('loginMessage'),
      title: 'Login'
    });
  });

  app.post('/admin/login', passport.authenticate('local-login', {
    successRedirect: '/admin/overview',
    failureRedirect: '/admin/login',
    failureFlash: true
  }));

  app.get('/admin/overview', isLoggedIn, function (req, res) {
    res.send('200');
  });

  //require('./api/routes.js')(app, isLoggedIn);
}

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated())
    return next();

  res.redirect('/admin/login');
}
