var conf = require('./conf.js');

function msg(message) {
  console.log(message);
  return message;
}

module.exports = {

  update: function(hostname, newip, req, res) {
    //TODO: get coninfo from config file
    var hostname = req.params.hostname;
    var ip = req.query.ip;
    var email = conf.get('cloudflare:email');
    var authkey = conf.get('cloudflare:authkey');
    if (!email || !authkey) {
      return msg("Sorry, can't do anything without cloudflare API data (email, authkey)!");
    }
    var coninfo = {
      email : email,
      authkey : authkey
    }

    // Get ZoneInfo first
    getZoneInfo(hostname, coninfo, function(zoneinfo, err) {
      if (err) {
        l.log(JSON.stringify(err, null, 2), "error");
        return;
      }

      // If successful, get DomainInfo next
      getDomainInfo(hostname, coninfo, function(dominfo, err) {
        if (err) {
          l.log(JSON.stringify(err, null, 2), "error");
          return;
        }

        // If successful again, update the record
        l.log("Updating DNS record for " + hostname);
        var zoneid = zoneinfo.zoneid;
        var zonename = zoneinfo.zonename;
        var domainid = dominfo.domainid;
        var options = {
          host: 'api.cloudflare.com',
          port: 443,
          path: '/client/v4/zones/'+zoneid+'/dns_records/'+domainid,
          method: 'PUT',
          headers: {
            "X-Auth-Email": coninfo.email,
            "X-Auth-Key": coninfo.authkey,
            "Content-Type": "application/json"
          }
        };

        var data = JSON.stringify({
          id: domainid,
          type: 'A',
          name: hostname,
          content: ip,
          ttl: 120,
          zone_id: zoneid,
          zone_name: zonename
        });

        // create http request to cloudflare
        var r = https.request(options, function(updateres) {
          var cfAnswer = "";
          updateres.setEncoding('utf8');
          updateres.on('data', function (chunk) {
            cfAnswer += chunk;
          });

          updateres.on('end', function () {
            jsonAnswer = JSON.parse(cfAnswer);
            l.log("Formatted answer:\n" + JSON.stringify(jsonAnswer, null, 2));
            if (jsonAnswer.success) {
              // required to let the fritzbox believe everything's alright
              // actually part of DynDNS protocol
              res.send("good");
            }
            else {
              res.send(JSON.stringify(jsonAnswer.errors));
            }
          });

          updateres.on('close', function() {
            res.send("Problem accessing cloudflare api");
          });
        });

        // send request
        r.write(data);
        r.end();
      });
    });
  },

    /**
     * Gets domain info from cloudflare api
     */
  getDomainInfo: function(hostname, coninfo, cb) {
    if (!conf.hostnames) {
      conf.hostnames = {};
    }
    if (!conf.hostnames[hostname]) {
      conf.hostnames[hostname] = {};
    }
    if (conf.hostnames[hostname].domainid) {
      return cb(conf.hostnames[hostname]);
    }


    queryDomain(hostname, coninfo, function(result, err) {
      if (err) {
        l.log(JSON.stringify(err, null, 2), "error");
        return cb(null, err);
      }

      if (result) {
        var domid = result.result[0].id;

        // save config with new data
        conf.hostnames[hostname].domainid = domid;
        saveConfig();

        cb({domainid: domid});
      }
    });
  },

    /**
     * Query a domain
     *
     **/
  queryDomain: function(hostname, coninfo, cb) {
    var zoneid = conf.hostnames[hostname].zoneid;
    var options = {
      host: 'api.cloudflare.com',
      port: 443,
      path: '/client/v4/zones/'+zoneid+'/dns_records?type=A&name='+hostname,
      method: 'GET',
      headers: {
        "X-Auth-Email": coninfo.email,
        "X-Auth-Key": coninfo.authkey,
        "Content-Type": "application/json"
      }
    };

    // create http request to cloudflare
    l.log("Querying domains with name " + hostname);
    var r = https.request(options, function(queryres) {
      var cfAnswer = "";
      queryres.setEncoding('utf8');
      queryres.on('data', function (chunk) {
        cfAnswer += chunk;
      });

      queryres.on('end', function () {
        jsonAnswer = JSON.parse(cfAnswer);
        if (jsonAnswer.success && jsonAnswer.result_info.count > 0) {
          // required to let the fritzbox belive everything's alright
          cb(jsonAnswer);
        }
        else {
          cb(null, jsonAnswer);
        }
      });

      queryres.on('close', function() {
        cb(null, "Connection has been closed!");
      });
    });

    // send request
    r.end();
  },

    /**
     * Gets zone info from cloudflare api
     *
     **/
  getZoneInfo: function(hostname, coninfo, cb) {
    if (!conf.hostnames) {
      conf.hostnames = {};
    }
    if (!conf.hostnames[hostname]) {
      conf.hostnames[hostname] = {};
    }
    if (conf.hostnames[hostname].zoneid) {
      l.log("Returned zone information from config:\n" + JSON.stringify(conf.hostnames[hostname]));
      return cb(conf.hostnames[hostname]);
    }

    var domparts = hostname.split(".");
    var host = domparts.slice(1).join('.');
    l.log("Querying zones with name " + host);
    queryZone(host, coninfo, function(result, err) {
      if (err) {
        l.log(JSON.stringify(err, null, 2), "error");
        return cb(null, err);
      }

      if (result) {
        var zoneid = result.result[0].id;
        var zonename = result.result[0].name;

        // save config with new data
        conf.hostnames[hostname].zoneid = zoneid;
        conf.hostnames[hostname].zonename = zonename;
        saveConfig();

        cb({zoneid: zoneid, zonename: zonename});
      }
      else {
        l.log("Didn't find anything - using next level of URL now...");
        getZoneInfo(host, coninfo, cb);
      }
    });
  },

    /**
     * Query zone
     *
     **/
  queryZone: function(hostname, coninfo, cb) {
    var options = {
      host: 'api.cloudflare.com',
      port: 443,
      path: '/client/v4/zones?name='+hostname,
      method: 'GET',
      headers: {
        "X-Auth-Email": coninfo.email,
        "X-Auth-Key": coninfo.authkey,
        "Content-Type": "application/json"
      }
    };

    // create http request to cloudflare
    var r = https.request(options, function(queryres) {
      var cfAnswer = "";
      queryres.setEncoding('utf8');
      queryres.on('data', function (chunk) {
        cfAnswer += chunk;
      });

      queryres.on('end', function () {
        jsonAnswer = JSON.parse(cfAnswer);
        if (jsonAnswer.success && jsonAnswer.result_info.count > 0) {
          // required to let the fritzbox belive everything's alright
          cb(jsonAnswer);
        }
        else {
          cb(null, null);
        }
      });

      queryres.on('close', function() {
        cb(null, "Connection has been closed!");
      });
    });

    // send request
    r.end();
  }
}
