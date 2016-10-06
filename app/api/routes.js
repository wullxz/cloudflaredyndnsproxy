"use strict";
var mongoose = require('mongoose');
var User = require('../../models/user.js');
var ddns = require('../../lib/ddns.js');

module.exports = function(app, passport, isLoggedIn, isAdmin) {

  app.get('/dyndns/:hostname', function (req, res) {
    console.log("Got a request for hostname " + req.params.hostname +
        ":\n" + JSON.stringify(req.query, null, 2));

    var email = req.query.email;
    var password = req.query.password || req.query.pass;
    var ip = req.query.ip || req.query.newip;
    var domain = req.params.hostname;

    // Check if user and pass is right
    User.findOne({ 'email': email }, function(err, user) {
      if (err) {
        res.status(400).send("Could not find user with email " + email);
        return;
      }

      if (user) {
        if (user.validPassword(password)) {
          Domain.find({ domain: domain }).populate('user').exec(function(err, domain) {
            if (domain.user._id === user._id) {
              //TODO: update hostname
            }
            else {
              res.status(400).send("Updating that hostname not allowed for this user!");
            }
          });
        }
        else {
          res.status(400).send("Bad user password!");
          return;
        }
      }
    });


  });
}
