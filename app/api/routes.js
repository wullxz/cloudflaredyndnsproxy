"use strict";
var mongoose = require('mongoose');
var User = require('../../models/user.js');
var Domain = require('../../models/domain.js');
var ddns = require('../../lib/ddns.js');

module.exports = function(app, passport, isLoggedIn, isAdmin) {

  app.get('/ddns/get/:hostname', function (req, res) {
    var domain = req.params.hostname;

    ddns.getDNSRecord(domain)
      .then(function (result) {
        if (result.isNew) {
          return res.status(400).send({ message: "This domain is nonexistent!" });
        }
        else {
          return res.status(200).send(result.record);
        }
      })
      .catch(function (err) {
        return res.status(400).send({ error: err, message: "Could not get information for that domain" });
      });
  });

  app.get('/ddns/update/:hostname', function (req, res) {
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

      // If user is present and pw is valid, update that hostname
      if (user && user.validPassword(password)) {
        Domain.findOne({ domain: domain }).populate('user').then(function (domain) {
          if (domain.user._id.equals(user._id)) {
            //TODO: update hostname
            ddns.updateDNSRecord(domain.domain, ip)
              .then(function (data) {
                console.log("Success!");
                console.log("\n" + JSON.stringify(data, null, 2));
                // sorry, DynDNS protocol specifies to just return a "good"
                // if IP udpate was successful. No fancy stuff here.
                res.status(200).send("good");
              })
              .catch(function (err) {
                console.log("An error occured:" + (err.message || JSON.stringify(err)));
                res.status(400).send("An error occured:" + (err.message || JSON.stringify(err)));
              });
          }
          else {
            res.status(400).send("Updating that hostname not allowed for this user!");
          }
        }).catch(function (err) {
          res.status(400).send("Bad request: " + (err.message || JSON.stringify(err)));
          throw err;
        });
      }
      else {
        res.status(400).send("Bad user password!");
        return;
      }
    });
  });
}
