// set up express
var express = require('express');
var app = express();
// other requires
var https = require('https');
var conf = require('./lib/conf.js');
var mongoose = require('mongoose');
var passport = require('passport');
var flash = require('connect-flash');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var configDB = conf.get('db');
var User = require('./models/user.js');

mongoose.connect(configDB.url);

require('./lib/passport.js')(passport);

app.use(morgan('dev'));
app.use(cookieParser());
app.use(bodyParser());

app.use("/admin/public", express.static('public'));

app.set('view engine', 'ejs');

var sessionOpts = {
  secret: "ifuckinglvoeschnitzel",
  maxAge: new Date(Date.now() + 3600000),
  store: new MongoStore(
      { mongooseConnection: mongoose.connection },
      function(err) {
        console.log(err || 'connect-mongodb setup ok');
      })
}
app.use(session(sessionOpts));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// set up proper routing (trailing slash problems)
app.enable('strict routing');
app.get('/admin', function (req, res, next) {
  res.redirect('/admin/');
});

// Check if System's already been set up (if there's an admin user)
// using " for the 2nd element because vim doesn't like the asterisk
// and destroys formatting! 0.o
app.get(['/admin/', "/admin/*"], function (req, res, next) {
  var db = mongoose.connection;
  User.find({ superAdmin: true }, function(err, users) {
    console.log(JSON.stringify(users, null, 2));
  });
  User.count({superAdmin: true}, function(err, c) {
    if (err) {
      console.log("Error!");
      console.log(err);
      return;
    }
    console.log("Super-Admin count:");
    console.log(c);
  });
  User.count({superAdmin: true}, function(err, c) {
    if (c < 1) {
      res.render('setup', {
        message: req.flash('registerError')
      });
      return;
    }
    else {
      next();
    }
  });
});
// make setup POST available if not set up yet
app.post('/admin/setup', function (req, res, next) {
  var db = mongoose.connection;
  if (!db.User || db.User.find({"superAdmin": true}).count() < 1) {
    req.passport = passport;
    require('./lib/setup.js')(req, res, next);
  }
  else {
    next();
  }
});

require('./app/routes.js')(app, passport);

var port = conf.get('service:port');
app.listen(port);
console.log('Listening on port '+port+'...');

// helper functions
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
