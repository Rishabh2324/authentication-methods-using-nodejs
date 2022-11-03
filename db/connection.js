const mongoose = require('mongoose');
const { dbUri } = require('../config');

module.exports = {
  connectServerToDatabase: function () {
    mongoose.connect(dbUri, {
      useNewUrlParser: true, // Allow users to fall back to the old parser if they find a bug in the new parser for parsing conection string
      useUnifiedTopology: true, // maintaining a stable connection.
    });
    mongoose.connection.on('connected', () => {
      console.log('Mongo has connected succesfully');
    });
    mongoose.connection.on('reconnected', () => {
      console.log('Mongo has reconnected');
    });
    mongoose.connection.on('error', (error) => {
      console.log('Mongo connection has an error', error);
      mongoose.disconnect();
    });
    mongoose.connection.on('disconnected', () => {
      console.log('Mongo connection is disconnected');
    });
  },
};
