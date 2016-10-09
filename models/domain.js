"use strict";
var mongoose = require('mongoose');
var User = require('./user.js');
var Schema = mongoose.Schema;

var domainSchema = Schema({
  domain:     String,
  user:       { type: Schema.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Domain', domainSchema);
