//Loading Environment variables
const dotenv = require('dotenv');
dotenv.config();
module.exports = {
  dbUri: process.env.DB_URI,
  PORT: process.env.PORT,
  EMAIL_ID: process.env.EMAIL_ID,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
  SESSION_SECRET: process.env.SESSION_SECRET,
  TOKEN_SECRET: process.env.TOKEN_SECRET,
  JWT_AUTH_TOKEN: process.env.JWT_AUTH_TOKEN,
  JWT_REFRESH_TOKEN: process.env.JWT_REFRESH_TOKEN,
  TWILIO_SSID: process.env.TWILIO_SSID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
  SMS_KEY: process.env.SMS_KEY,
};
