var pg = require('pg').native
  , connectionString = process.env.DATABASE_URL
  , client
  , query;

client = new pg.Client(connectionString);
client.connect();
query = client.query("
	CREATE TYPE usertype AS ENUM ('user', 'staff');
	CREATE TABLE userdatabase (
		id bigint,
		username text,
		typeofuser usertype,
		firstname text,
		points integer
	);
");
query.on('end', function(result) { client.end(); });