"use strict";
var conf = require('./conf.js');
var CFApi = require('cloudflare');

module.exports = function() {
  var DDNS = function() {
    this.api = new CFApi({
      email: conf.get('cloudflare:email'),
      key: conf.get('cloudflare:authkey')
    });
    this.zone = conf.get('cloudflare:zoneid');
  }

  var proto = DDNS.prototype;

  proto.zoneId = function(name) {
    var api = this.api
    return new Promise(function (resolve, reject) {
      api.browseZones({ name: name }).then(function (data) {
        if (data.total === 1) {
          var zoneid = data.result[0].id;
          resolve(zoneid);
        }
        else {
          reject({ message: "Zone not found or not unique", error: true, result: [] });
        }
      }).catch(reject);
    });
  }

  return new DDNS();
}()
