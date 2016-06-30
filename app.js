var express = require('express');
var https = require('https');
var fs = require('fs');
var app = express();
var l = logger();

// get config
confpath = './cfg.json';
var conf = null;
try { conf = fs.statSync(confpath) } catch (err) { }
conf = (conf && conf.isFile()) ? fs.readFileSync(confpath, { encoding: 'utf8' }).toString() : "{}";
conf = (conf.trim() === "") ? {} : JSON.parse(conf);

var authkey = "6db933c5d00d834c51313242119423420876e";
var zoneid = "ebffbb384e7c99c1dcff8ada78e6c2a5";
var domainid = "6ce3ea52b55bd309928c9f5d0e74f0aa";

l.log("Registering endpoint: /dyndns/:hostname");
app.get('/dyndns/:hostname', function (req, res) {
  l.log("Got a request for hostname " + req.params.hostname + ":\n" + JSON.stringify(req.query, null, 2));
  var hostname = req.params.hostname;
  var ip = req.query.ip;
  var coninfo = {
    email : req.query.email,
    authkey : req.query.authkey
  }

  getZoneInfo(hostname, coninfo, function(zoneinfo, err) {
    if (err) {
      l.log(JSON.stringify(err, null, 2), "error");
      return;
    }

    getDomainInfo(hostname, coninfo, function(dominfo, err) {
      if (err) {
        l.log(JSON.stringify(err, null, 2), "error");
        return;
      }

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
        zone_name: zonename //TODO get from api
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
            // required to let the fritzbox belive everything's alright
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
});

var port = (conf.port) ? conf.port : "3000";
app.listen(port);
l.log('Listening on port '+port+'...');

// helper functions
function getDomainInfo(hostname, coninfo, cb) {
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
}

function queryDomain(hostname, coninfo, cb) {
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
}

function getZoneInfo(hostname, coninfo, cb) {
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
}

function queryZone(hostname, coninfo, cb) {
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

function saveConfig() {
  fs.writeFileSync(confpath, JSON.stringify(conf, null, 2), { encoding: 'utf8' }, function (err) {
    if (err) {
      l.log(JSON.stringify(err, null, 2), "error");
      throw err;
    }
  });
}

function logger(dateFmt, logfn) {
  if (!dateFmt) {
    dateFmt = "dd.mm.yy hh:M:s";
  }
  if (!logfn) {
    logfn = console.log;
  }

  var obj = {
    dateFmt: dateFmt,
    formatter: require('dateformat'),
    logfn: logfn,

    log: function (msg, level) {
      if (!level) {
        level = "INFO";
      }
      else {
        level = level.toUpperCase();
      }
      now = this.formatter(new Date(), this.dateFmt);
      logfn(now + " " + level + ": " + msg);
    }
  }

  return obj;
}
