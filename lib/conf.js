var nconf = require('nconf');

module.exports = function() {
  nconf.argv().env();
  proto = Object.getPrototypeOf(nconf);

  // replace default save
  proto.origSave = proto.save;
  proto.save = function() {
    this.origSave(function (err) {
      if (err) {
        console.log(err.message);
        return;
      }
    });
  };

  // replace default set to save automatically
  proto.origSet = proto.set;
  proto.set = function(key, value) {
    this.origSet(key, value);
    this.save();
  };

  // get method with default value
  proto.getDefault = function(key, defaultValue) {
    var val = this.get(key);
    if (typeof val === 'undefined') {
      return defaultValue;
    }
    else {
      return val;
    }
  };

  nconf.use('file', { file: '../config/default.json' });
  nconf.load();

  nconf.defaults({
    service: {
      port: 3100
    },
    db: {
      url: "mongodb://localhost/ddns"
    }
  });

  return nconf;
}()
