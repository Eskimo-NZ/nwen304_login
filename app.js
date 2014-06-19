// Module dependencies
var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;

// Facebook app details
var FACEBOOK_APP_ID = "566740760110796"
var FACEBOOK_APP_SECRET = "ae1c43ba534dfdfe394c6e66e08dfcce";

// Database
var pg = require('pg').native;
var connectionString = process.env.DATABASE_URL;
var port = process.env.PORT;
var client = new pg.Client(connectionString);

client.connect();

// Facebook login
passport.use(new FacebookStrategy({
  clientID: FACEBOOK_APP_ID,
  clientSecret: FACEBOOK_APP_SECRET,
  callbackURL: "http://evening-caverns-1488.herokuapp.com/auth/facebook/callback"
},
function (accessToken, refreshToken, profile, done) {
  process.nextTick(function () {
    console.log("User ID: "+profile.id+", Name: "+profile.displayName);
    
    var query = client.query("SELECT * FROM userdatabase");
    
    query.on('row', function(row, result) {
      result.addRow(row);
    });

    query.on('end', function(result) {
      var existingUser = false;

      console.log(result.rows.length + ' rows were received');
      for(var i = 0; i < result.rows.length; i++){
        if(result.rows[i].id == profile.id){
          console.log(" + User found at index "+i);
          existingUser = true;
          break;
        }
      }

      if (existingUser == true) {
        console.log(" - User already exists");
        return done(null, profile);
      } else {
        console.log(" - Making new user");
        client.query(
          "INSERT INTO userdatabase (id,username,typeofuser,firstname,points) VALUES ($1,$2,$3,$4,$5)", 
          [profile.id, 'no username', 'user', profile.givenName, '10']
        );
        return done(null, profile);
      }
      
    });  
  });
}));

// Persistent login sessions
passport.serializeUser(function(user, done) {
  console.log("Serialized User");
  done(null, user.id);
});

passport.deserializeUser(function(obj, done) {
  console.log("Deserialized User");
  done(null, obj);
});

var app = express();

// configure Express
app.configure(function() {
  app.set('port', process.env.PORT || 3000);
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.json());
  app.use(express.urlencoded());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: 'anything' }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
  // development only
  if ('development' == app.get('env')) {
    app.use(express.errorHandler());
  }
});

// Facebook authentication starts
app.get('/auth/facebook', passport.authenticate('facebook'));

// Callback from facebook
app.get('/auth/facebook/callback', 
	passport.authenticate('facebook', { successRedirect: '/success', failureRedirect: '/error' })
);

// Page shown when login succeeds
app.get('/success', function(req, res){
	res.send("Success: Logged in with "+req.user);
});

// Error page if login fails
app.get('/error', function(req, res){
	res.send("error logged in");
});

// Show authentication page
app.get('/', function(req, res){
  res.sendfile('./views/auth.html');
});

// Request for a user's data using their id
app.get('/user/:id', function(req, res){
  console.log(" - Client requested user's data");
  var query = client.query("SELECT * FROM userdatabase");
  query.on('row', function(row, result) {
    result.addRow(row);
  });
  query.on('end', function(result) {
    // For every row in the database
    for(var i = 0; i < result.rows.length; i++){
      // Check if the id matches the id passed in
      if(result.rows[i].id == req.params.id){
        console.log(" + User found at index "+i);

        // Send JSON back to the client
        res.json(result.rows[i]);
        break;
      }
    }
  });
});

// Request all events
app.get('/events', function(req, res) {
  console.log(" - Client requested all events");
  var query = client.query("SELECT * FROM eventsdatabase");
  query.on('row', function(row, result) {
    result.addRow(row);
  });
  query.on('end', function(result) {
    // Send JSON back to the client
    res.json(result.rows);
    });
});

// Request the news feed
app.get('/news', function(req, res) {
  console.log(" - Client requested the news feed");
  var query = client.query("SELECT * FROM newsdatabase");
  query.on('row', function(row, result) {
    result.addRow(row);
  });
  query.on('end', function(result) {
    // Send JSON back to the client
    res.json(result.rows);
    });
});

// Update the green points of the users
app.post('/updatepoints/', function(req, res) {
  console.log(" - Client requested greenpoints to be updated");
  console.log(req.body);
  if(!req.body.hasOwnProperty('id') || !req.body.hasOwnProperty('points')) {
    res.statusCode = 400;
    return res.send('Error 400: Post Syntax incorrect.');
  }
    var query = client.query("SELECT * FROM userdatabase");

    query.on('row', function(result, row) {
      console.log(result);
      var personId = req.body.id; // get the person's id 
      var newPoints = req.body.points; // the new points given 
      client.query("UPDATE userdatabase SET points = $1 WHERE id = $2", [newPoints, personId]); // update the person's points 
    });
});

// Insert events into the database
app.post('/event', function(req, res) {
  console.log(" - Client requested an event to be added");
  console.log(req.body);
  // This just checks if the title fileds and the description fields are empty. 
  if(!req.body.hasOwnProperty('title') || !req.body.hasOwnProperty('description')) {
    res.statusCode = 400;
    return res.send('Error 400: Post Syntax incorrect.');
  }
  // We insert the events into the database 
    client.query("INSERT INTO eventsdatabase (title, description, longitude, latitude, greenpoints) VALUES ($1, $2, $3, $4, $5)", [req.body.title, req.body.description, req.body.longitude, req.body.latitude, req.body.greenpoints]);
});

// Listen to the port
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});