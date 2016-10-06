"use strict";
var mongoose = require('mongoose');
var User = require('../models/user.js');
var Domain = require('../models/domain.js');
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
      if (err) {
        console.log(err);
        req.flash('error', err.message || err);
        return;
      }

      User.findOne({ _id: req.user._id }).populate('domains').exec(function (err, user) {
        if (err) {
          console.log(err);
          req.flash('error', err.message || err);
          return;
        }

        console.log(JSON.stringify(user, null, 2));
        res.render('overview', {
          user: user,
          users: users,
          title: "Overview"
        });
      });
    });
  });

  app.get('/admin/moddomain', isLoggedIn, function (req, res) {
    res.render('moddomain', {
      user: req.user,
      title: 'Modify Domain'
    });
  });

  app.post('/admin/moddomain', isLoggedIn, function (req, res) {
    console.log(JSON.stringify(req.body));
    Domain.find({ domain: req.body.domain }).exec(function(err, domain) {
      if (err) {
        req.flash('error', err.message || err);
        res.redirect('/admin/moddomain');
        return;
      }

      if (domain && domain.length > 0) {
        req.flash('warning', "This domain does already exist!");
        res.redirect('/admin/moddomain');
        return;
      }

      var user = req.user;
      if (!user.superAdmin && domain.match(/[a-zA-Z0-9-]\.ddns\.schnitzelspecht\.de/)) {
        req.flash('warning', "DynDNS Domains must be direct subdomains of ddns.schnitzelspecht.de!");
        res.redirect('/admin/moddomain');
        return;
      }

      // all prerequisites are matched, create ddns record
      //TODO: create on cloudflare
      var dom = new Domain();
      dom.domain = req.body.domain;
      dom.user = user;
      dom.save();

      user.domains.push(dom);
      user.save();

      req.flash('success', "OK!");
      res.redirect('/admin/overview');
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
