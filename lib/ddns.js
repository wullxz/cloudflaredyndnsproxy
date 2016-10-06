"use strict";
var conf = require('./conf.js');

module.exports = function() {
  var DDNS = function() {
    this.authdata = {
      email: conf.get('cloudflare:email'),
      authkey: conf.get('cloudflare:authkey')
    };

    this.apiOpts = {
      host: 'api.cloudflare.com',
      port: 443,
      path: '/client/v4/',
      headers: {
        "X-Auth-Email": this.authdata.email,
        "X-Auth-Key": this.authdata.authkey,
        "Content-Type": "application/json"
      }
    };
  }

  proto.getApiOpts = function(path, method) {
    var opts = this.apiOpts;
    opts.path = opts.path + path;
    opts.method = method || 'GET';

    return opts;
  };

  /**
   * Generic query function for cloudflare requests.
   *
   * Queries cloudflare with options specified in opts, a descriptive
   * queryname and the callback to pass the result to once the request is done.
   *
   */
  function query(opts, queryname, callback) {
    var req = https.request(opts, function(result) {
      var cfAnswer = "";
      result.setEncoding('utf8');

      result.on('data', function(chunk) {
        cfAnswer += chunk;
      });

      result.on('end', function() {
        jsonAnswer = JSON.parse(cfAnswer);
        if (jsonAnswer.success && jsonAnswer.result_info.count > 0) {
          callback(null, jsonAnswer);
        }
        else {
          callback({ error: true, message: queryname+' query unsuccessful!' });
        }
      });

      result.on('close', function() {
        callback({ error: true, message: 'Connection has been closed by cloudflare! '+queryname+' query failed!' });
      });
    });

    return req;
  };

  var proto = DDNS.prototype;

  proto.getDomain = function(hostname, zoneid, callback) {
    queryDomain(hostname, zoneid, function(err, result) {
      if (err) {
        return callback(err);
      }

      if (result) {
        var domid = result.result[0].id;

        callback(null, { domainid: domid });
      }
    });

  };

  proto.queryDomain = function(hostname, zoneid, callback) {
    var opts = this.getApiOpts('zones/'+zoneid+'/dns_records?type=A&name='+hostname);

    var req = query(opts, "Domain", callback);

    req.end();
  };


  /**
   * Splits hostname into Zones and fires multiple requests (if necessary)
   *
   */
  proto.getZone = function(hostname, callback) {
    var domparts = hostname.split(".");
    var host = domparts.slice(1).join('.');

    this.queryZone(host, function(err, result) {
      if (err) {
        return callback(err);
      }

      if (result) {
        var zoneid = result.result[0].id;
        var zonename = result.result[0].name;

        callback(null, { zoneid: zoneid, zonename: zonename });
      }
      else {
        this.getZone(host, callback);
      }
    });
  };

  /**
   * Queries the cloudflare API for hostname's Zones
   *
   */
  proto.queryZone = function(hostname, callback) {
    var opts = this.getApiOpts('zones?name='+hostname);

    var req = query(opts, "Zone", callback);

    req.end();
  }

  /**
   * Updates a hostname to a new ip
   *
   */
  proto.updateHostname = function(hostname, newip, callback) {
    // get zone information first (required to get domain information)
    this.getZone(hostname, function(err, zone) {
      if (err) {
        return callback(err);
      }

      // get domain information (required to update hostname ip)
      this.getDomain(hostname, zone.zoneid, function(err, domain) {
        if (err) {
          return callback(err);
        }

        var opts = this.getApiOpts('zones/'+zoneid+'/dns_records/'+domainid, 'PUT');
        var req = query(opts, "Hostname Update", callback);

        var data = JSON.stringify({
          id: domain.domainid,
          type: 'A',
          name: hostname,
          content: newip,
          ttl: 120,
          zone_id: zone.zoneid,
          zone_name: zone.zonename
        });

        req.write(data);
        req.end();
      });
    });
  }

  return new DDNS();
}
