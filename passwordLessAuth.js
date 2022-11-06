const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

const {
  PORT,
  JWT_AUTH_TOKEN,
  JWT_REFRESH_TOKEN,
  TWILIO_SSID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER,
  SMS_KEY,
} = require('./config');

//Loading app
const app = express();

//Loading twilio
const twilio = require('twilio')(TWILIO_SSID, TWILIO_AUTH_TOKEN);

// Refresh Tokens
const refreshTokens = [];

//Body parser configuration
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//Cookie parser middleware
app.use(cookieParser());

app.get('/', function (req, res) {
  res.send('Welcome to the Auth app');
});

/*
 Send otp route
*/

app.post('/sendOTP', function (req, res) {
  const { phoneNumber, email } = req.body;
  const oneTimeCode = Math.floor(100000 + Math.random() * 900000);

  // Time limit of one day
  const oneTimeCodeTimeLimit = new Date().getTime() + 8640000;

  // User will have otp on email or on phone
  const userIdentity = email || phoneNumber;

  // Generate Data
  const data = `${userIdentity}.${oneTimeCode}.${oneTimeCodeTimeLimit}`;

  // Generate Hash
  const hash = crypto.createHmac('sha256', SMS_KEY).update(data).digest('hex');
  const hashWithOtcTimeLimit = `${hash}.${oneTimeCodeTimeLimit}`;

  if (userIdentity === phoneNumber) {
    twilio.messages
      .create({
        body: `Your One Time Password for confirmation is ${oneTimeCode}`,
        from: TWILIO_PHONE_NUMBER,
        to: userIdentity,
      })
      .then(function (result) {
        console.log(result);
      })
      .catch(function (error) {
        console.log(JSON.stringify(error), null, 2);
        res.status(500).send('Some error accured');
      });
  } else {
    // Configuring smtp for mail transportation
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_ID,
        pass: EMAIL_PASSWORD,
      },
    });
    const mailOptions = {
      from: EMAIL_ID,
      to: email,
      subject: `Passwordless Auth | OTP code`,
      html: `<h1>Hi,</h1>
              <h2>Here is your OTP</h2>
              <h2><code contenteditable="false" style="font-weight:200;font-size:1.5rem;padding:5px 10px; background: #EEEEEE; border:0">${oneTimeCode}</code></h4>
            `,
    };
    transporter
      .sendMail(mailOptions)
      .then(function (response) {
        console.log('Email send:\n', response);
        res.status(200).send('OTP code sent');
      })
      .catch(function (err) {
        console.log(JSON.stringify(err, null, 2));
        res.status(500).send('Could not send OTP');
      });
  }

  res.status(200).json({ userIdentity, hash: hashWithOtcTimeLimit });
});

app.post('/verifyOTP', function (req, res) {
  const {
    phoneNumber,
    email,
    hash: hashWithOtcTimeLimit,
    oneTimeCode,
  } = req.body;
  const [oldHash, oneTimeCodeTimeLimit] = hashWithOtcTimeLimit.split('.');
  const currentTime = Date.now();

  // User will have otp on email or on phone
  const userIdentity = email || phoneNumber;

  if (parseInt(oneTimeCodeTimeLimit) > currentTime) {
    //Again generate data
    const data = `${userIdentity}.${oneTimeCode}.${oneTimeCodeTimeLimit}`;

    //Again generate Hash
    const hash = crypto
      .createHmac('sha256', SMS_KEY)
      .update(data)
      .digest('hex');
    const newHash = `${hash}.${oneTimeCodeTimeLimit}`;

    if (newHash === oldHash) {
      const accessToken = jwt.sign({ data: userIdentity }, JWT_AUTH_TOKEN, {
        expiresIn: '30s',
      });
      const refreshToken = jwt.sign({ data: userIdentity }, JWT_REFRESH_TOKEN, {
        expiresIn: '1y',
      });
      refreshTokens.push(refreshToken);
      res
        .status(202)
        .cookie('accessToken', accessToken, {
          expires: new Date(new Date().getTime() + 30 * 1000),
          sameSite: 'strict',
          httpOnly: true,
        })
        .cookie('refreshToken', refreshToken, {
          expires: new Date(new Date().getTime() + 31557600000),
          sameSite: 'strict',
          httpOnly: true,
        })
        .cookie('authSession', true, {
          expires: new Date(new Date().getTime() + 30 * 1000),
          sameSite: 'strict',
        })
        .cookie('refreshTokenID', true, {
          expires: new Date(new Date().getTime() + 31557600000),
          sameSite: 'strict',
        })
        .send({ msg: 'Device verified' });
    } else {
      res.send(400).json({ verification: false, message: 'Incorrect OTP' });
    }
  } else {
    res.send(400).send('OTP expired. Please try again');
  }
});

/*
Authorization middleware
*/

app.use(function (req, res, next) {
  const { accessToken } = req.body;
  jwt.verify(accessToken, JWT_AUTH_TOKEN, function (err, verifiedJwt) {
    if (err) {
      return res.status(403).send({ err, msg: 'User not authenticated' });
    } else if (err.message === 'TokenExpiredError') {
      return res.status(403).json({
        success: false,
        message: 'Access token exprired',
      });
    } else {
      res.verifiedJwt = verifiedJwt;
      next();
    }
  });
});

app.get('/protectedRoute', function (req, res) {
  res.status(200).send('You have access of Protected Routed');
});

app.post('/refresh', function (req, res) {
  const { refreshToken } = req.cookies;
  if (!refreshToken)
    return res
      .status(403)
      .send({ message: 'Refresh token not found, login again' });
  if (!refreshTokens.includes(refreshToken))
    return res
      .status(403)
      .send({ message: 'Refresh token blocked, login again' });
  jwt.verify(refreshToken, JWT_REFRESH_TOKEN, function (err, verifiedJwt) {
    if (err) {
      return res.status(403).send({ err, msg: 'Invalid refresh token' });
    } else if (err.message === 'TokenExpiredError') {
      return res.status(403).json({
        success: false,
        message: 'Access token exprired',
      });
    } else {
      const accessToken = jwt.sign({ data: verifiedJwt }, JWT_AUTH_TOKEN, {
        expiresIn: '30s',
      });
      return res
        .status(200)
        .cookie('accessToken', accessToken, {
          expires: new Date(new Date().getTime() + 30 * 1000),
          sameSite: 'strict',
          httpOnly: true,
        })
        .cookie('authSession', true, {
          expires: new Date(new Date().getTime() + 30 * 1000),
          sameSite: 'strict',
        })
        .send({ previousSessionExpired: true, success: true });
    }
  });
});

app.get('/logout', function (req, res) {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.clearCookie('authSession');
  res.clearCookie('refreshTokenID').send('logout');
});

app.listen(PORT, function () {
  console.log(`App is listening to port ${PORT}`);
});
