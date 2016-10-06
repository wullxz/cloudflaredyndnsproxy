"use strict";
var mongoose = require('mongoose');
var Domain = require('./domain.js');
var bcrypt = require('bcrypt-nodejs');
var Schema = mongoose.Schema;

var userSchema = Schema({
  name:         String,
  email:        String,
  password:     String,
  domains:      [{ type: Schema.ObjectId, ref: 'Domain' }],
  superAdmin:   { type: Boolean, default: false },
  maxDomains:   { type: Number, default:3 }
});

userSchema.methods.generateHash = function(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

userSchema.methods.validPassword = function(password) {
  return bcrypt.compareSync(password, this.password);
};

var User = mongoose.model('User', userSchema);

module.exports = mongoose.model('User', userSchema);
