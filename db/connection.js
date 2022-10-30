const { MongoClient } = require('mongodb'); // Class that allows for making Connections to MongoDB
const { dbUri } = require('../config');

let dbConnection;

const client = new MongoClient(dbUri, {
  useNewUrlParser: true, // Allow users to fall back to the old parser if they find a bug in the new parser for parsing conection string
  useUnifiedTopology: true, // maintaining a stable connection.
});

// Connecting to database
client.connect((err, client) => {
  if (err) {
    console.error(err);
    return;
  }
  dbConnection = client.db('authentications');
});

module.exports = {
  getDb: function () {
    return dbConnection;
  },
};
