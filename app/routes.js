"use strict";
var mongoose = require('mongoose');
var User = require('../models/user.js');
var userHelper = require('../lib/user.js');

module.exports = function(app, passport) {

  app.get("/admin/", function(req, res) {
    if (req.isUnauthenticated) {
      res.render('index', {
        title: "Login"
      });
    }
    else {
      res.redirect('/admin/overview');
    }
  });

  app.get('/admin/login', function(req, res) {
    res.render('index', {
      title: 'Login'
    });
  });

  app.post('/admin/logout', function(req, res) {
    req.session.destroy();
    req.logout();
    res.redirect('/admin/');
  });

  app.post('/admin/login', passport.authenticate('local-login', {
    successRedirect: '/admin/overview',
    failureRedirect: '/admin/login',
    failureFlash: true
  }));

  app.get('/admin/overview', isLoggedIn, function (req, res) {
    User.find({ _id: { $ne: req.user._id } }, function(err, users) {
      console.log(users);
      res.render('overview', {
        user: req.user,
        users: users,
        title: "Overview"
      });
    });
  });

  app.get('/admin/moduser', isAdmin, function (req, res) {
    var id = req.query.id;
    if (id) {
      var title = (!req.query.id) ? "Add User" : "Modify User";
      var moduser = User.findOne({ _id: id }).exec(function(err, u) {
        if (err) {
          req.flash('error', err.message);
        }
        renderModuser(req, res, title, id, u);
      });
    }
    else {
      var title = (!req.query.id) ? "Add User" : "Modify User";
      renderModuser(req, res, title, id, null);
    }
  });

  function renderModuser (req, res, title, id, moduser) {
    res.render('moduser', {
      user: req.user,
      title: title,
      id: id,
      moduser: moduser
    });
  }

  app.post('/admin/moduser', isAdmin, function(req, res) {
    if (req.body.id) {
      userHelper.updateUser(req, res, {
        successRedirect: '/admin/overview',
        failureRedirect: '/admin/moduser',
        appendIdToRedirect: true
      });
    }
    else {
      userHelper.createUser(req, req.body.email, req.body.password, null, {
        res: res,
        successRedirect: '/admin/overview',
        failureRedirect: '/admin/moduser',
        failureFlash: true
      })
    }
  });

  require('./api/routes.js')(app, passport, isLoggedIn, isAdmin);
}

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated())
    return next();

  res.redirect('/admin/login');
}

function isAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.superAdmin)
    return next();

  res.redirect('/admin/overview');
}
