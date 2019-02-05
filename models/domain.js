"use strict";
var mongoose = require('mongoose');
var User = require('./user.js');
var Schema = mongoose.Schema;

var domainSchema = Schema({
  domain:     String,
  user:       { type: Schema.ObjectId, ref: 'User' }
});

domainSchema.pre('remove', function (next) {
  var self = this;
  User.findOne(self.user).then(function (user) {
    console.log("Deleting domain " + self.domain + "! Cascading the deletion to user " + user.name);
    user.update({ $pull: { domains: self } });
    user.save();
  }).catch(function (err) {
    console.log("error cascade-deleting: " + err);
    console.log("\n" + JSON.stringify(err, null, 2));
  });
  next();
});

module.exports = mongoose.model('Domain', domainSchema);
