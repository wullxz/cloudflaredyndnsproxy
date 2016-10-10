"use strict";
var conf = require('./conf.js');
var CFApi = require('cloudflare');

module.exports = function() {
  var DDNS = function() {
    this.api = new CFApi({
      email: conf.get('cloudflare:email'),
      key: conf.get('cloudflare:authkey')
    });
    this.zid = conf.get('cloudflare:zoneid');
    this.zone = CFApi.Zone.create({ id: this.zid });
  };

  var proto = DDNS.prototype;

  proto.zoneId = function(name) {
    var api = this.api;
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
  };

  /**
   * Checks if an A record already exists and passes a DNSRecord
   * object to resolve if so. If no record is found, null is passed to resolve.
   */
  proto.recordExists = function (name) {
    var api = this.api;
    var zone = this.zone;
    var filter = {
      name: name,
      type: "A"
    };

    return new Promise(function (resolve, reject) {
      api.browseDNS(zone, filter).then(function (data) {
        if (data.total === 0) {
          resolve(null);
        }
        else if (data.total === 1) {
          resolve(CFApi.DNSRecord.create(data.result[0]));
        }
        else {
          data.message = "Multiple matches were found!";
          reject(data);
        }
      }).catch(reject);
    });
  };

  /**
   * Initiates a new cloudflare DNSRecord object
   * with some default values if not passed explicitly.
   */
  proto.initDNSObject = function (data) {
    data.type = data.type || "A";
    data.zoneId = data.zoneId || this.zid;
    data.ttl = data.ttl || 120;
    return CFApi.DNSRecord.create(data);
  };

  /**
   * Gets data for a given DNS Name from cloudflare or
   * creates a new DNSRecord object if no data is
   * present on cloudflare.
   */
  proto.getDNSRecord = function (name) {
    var self = this;

    return new Promise(function (resolve, reject) {
      self.recordExists(name).then(function (data) {
        var result = {};
        if (data) {
          result.record = data;
          result.isNew = false;
          resolve(result);
        }
        else {
          result.record = self.initDNSObject({ name: name });
          result.isNew = true;
          resolve(result);
        }
      }).catch(reject);
    });
  };

  /**
   * Updates an existing DNS Record with a new ip address.
   * Creates the DNS Record if it doesn't exist yet.
   */
  proto.updateDNSRecord = function(name, newip) {
    var self = this;
    return new Promise(function (resolve, reject) {
      self.getDNSRecord(name).then(function (data) {
        if (data.isNew) {
          console.log("Record for domain " + name + " isn't present yet. Creating it...");
          data.record.content = newip;
          self.api.addDNS(data.record)
            .then(resolve)
            .catch(reject);
        }
        else {
          console.log("Record for domain " + name + " will be updated!");
          data.record.content = newip;
          self.api.editDNS(data.record)
            .then(resolve)
            .catch(reject);
        }
      }).catch(reject);
    });
  };

  return new DDNS();
}()
