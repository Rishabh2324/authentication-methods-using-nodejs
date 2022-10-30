//Loading Environment variables
const dotenv = require('dotenv');
dotenv.config();
module.exports = {
  dbUri: process.env.DB_URI,
};
