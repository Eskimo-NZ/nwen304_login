
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;

var FACEBOOK_APP_ID = "566740760110796"
var FACEBOOK_APP_SECRET = "ae1c43ba534dfdfe394c6e66e08dfcce";

var app = express();

// Database
var pg = require('pg').native;
var connectionString = process.env.DATABASE_URL;
var port = process.env.PORT;
var client = new pg.Client(connectionString);

client.connect();

// all environments

app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));


// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

passport.use(new FacebookStrategy({
  clientID: FACEBOOK_APP_ID,
  clientSecret: FACEBOOK_APP_SECRET,
  callbackURL: "http://evening-caverns-1488.herokuapp.com/auth/facebook/callback"
},
function (accessToken, refreshToken, profile, done) {
  process.nextTick(function () {
    console.log(profile);
    
    var query = client.query("SELECT * FROM logindatabase");
    
    query.on('end', function(result) {
      console.log(result.rows.length);
    });

    return done(null, profile);
  });
/*
  var query = client.query("SELECT * FROM logindatabase");

  query.on('row', function(row, result) {
    console.log(result.rows.length + " rows in table");

    for(var i = 0; i < result.rows.length; i++){
      if(result.rows[i].id == profile.id){
        console.log("----------- User found");
      }
    }
    console.log("----------- End of search");
    //client.query("INSERT INTO logindatabase (id, points) VALUES ($1, $2)", [profile.id, '10']);
  });

  return done(null, profile);
  */
}));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

function addUser(profile) {
  console.log("Function called");
}

app.get('/auth/facebook', passport.authenticate('facebook'));

app.get('/auth/facebook/callback', 
		  passport.authenticate('facebook', { successRedirect: '/success',
			                                        failureRedirect: '/error' }));

app.get('/success', function(req, res){
	res.send("success logged in");
});

app.get('/error', function(req, res){
	res.send("error logged in");
});

app.get('/', function(req, res){
  res.sendfile('./views/auth.html');
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});