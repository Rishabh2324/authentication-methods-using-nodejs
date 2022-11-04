//Loading Environment variables
const dotenv = require('dotenv');
dotenv.config();
module.exports = {
  dbUri: process.env.DB_URI,
  PORT: process.env.PORT,
  EMAIL_ID: process.env.EMAIL_ID,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
  SESSION_SECRET: process.env.SESSION_SECRET,
};
