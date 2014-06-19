var pg = require('pg').native
  , connectionString = process.env.DATABASE_URL
  , client
  , query;

client = new pg.Client(connectionString);
client.connect();
//query = client.query("CREATE TABLE userdatabase (id bigint,username text,typeofuser text,firstname text,points integer)");
//query = client.query('CREATE TABLE eventsdatabase (title text, description text, latitude text, longitude text, greenpoints integer)');
query = client.query('CREATE TABLE newsdatabase (name text, comment text)');
query.on('end', function(result) { client.end(); });