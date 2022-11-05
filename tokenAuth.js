const express = require('express');
const bodyParser = require('body-parser');
const bycrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const shortid = require('shortid');
const nodemailer = require('nodemailer');

const { PORT, TOKEN_SECRET, EMAIL_ID, EMAIL_PASSWORD } = require('./config');
const db = require('./db/connection');
const User = require('./models/user');

const app = express();

//Loading database
db.connectServerToDatabase();

//Body parser configuration
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

/*
Unprotected routes
*/
app.get('/', function (req, res) {
  res.send('Welcome to auth app');
});

/*
1. User sign up
*/
app.post('/signup', function (req, res) {
  let { username, password, email, fullname, gender } = req.body;
  const newUser = new User({
    username,
    email,
    fullname,
    gender,
    password: bycrypt.hashSync(password, 5),
  });

  newUser
    .save()
    .then(function () {
      return res.status(201).json('Sign Up successfull');
    })
    .catch(function (err) {
      if (err.code === 11000) {
        return res.status(409).send('User already exist');
      } else {
        console.log(JSON.stringify(err, null, 2));
        return res.status(500).send('Some error accured');
      }
    });
});

/*
User Sign In
*/

app.post('/login', function (req, res) {
  let { username, password } = req.body;
  User.findOne({ username: username }, function (err, result) {
    if (result) {
      const isPasswordCorrect = bycrypt.compareSync(password, result.password);
      if (isPasswordCorrect) {
        // So a paload is created which client will send us on every subsequent request
        const payload = {
          username: result.username,
          email: result.email,
          id: result._id,
        };
        // we will sign our payload with our TOKEN_SECRET using jsonwebtoken
        const token = jwt.sign(payload, TOKEN_SECRET);
        res.status(200).json({
          token,
          email: result.email,
          username,
        });
      } else {
        res.status(401).send('Invalid login credentials');
      }
    } else {
      res.status(401).send('Invalid login credentials');
    }
  });
});

/*
Forgot password
*/
app.post('/forgot', function (req, res) {
  const { email } = req.body;
  User.findOne({ email: email }, function (err, result) {
    if (result) {
      result.passResetKey = shortid.generate();
      result.passKeyExpire = new Date().getTime() + 20 * 60 * 1000; // pass reset key only valid for 20 minutes
      result
        .save()
        .then(function () {
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
            subject: `NodeAuthTuts | Password reset`,
            html: `
              <h1>Hi,</h1>
              <h2>Here is your password reset key</h2>
              <h2><code contenteditable="false" style="font-weight:200;font-size:1.5rem;padding:5px 10px; background: #EEEEEE; border:0">${result.passResetKey}</code></h4>
              <p>Please ignore if you didn't try to reset your password on our platform</p>
            `,
          };
          transporter
            .sendMail(mailOptions)
            .then(function (response) {
              console.log('Email send:\n', response);
              res.status(200).send('Reset code sent');
            })
            .catch(function (err) {
              console.log(JSON.stringify(err, null, 2));
              res.status(500).send('Could not send reset code');
            });
        })
        .catch(function (err) {
          console.log(JSON.stringify(err, null, 2));
          res.status(500).send('Some error accrured');
        });
    } else {
      res.status(400).send('Email address is incorrect!');
    }
  });
});

app.post('/resetpassword', function (req, res) {
  const { passResetKey, newPassword } = req.body;
  User.findOne({ passResetKey: passResetKey }, function (err, result) {
    if (result) {
      const currentTime = new Date().getTime();
      if (result.passKeyExpire > currentTime) {
        result.password = bycrypt.hashSync(newPassword, 5);
        result.passResetKey = null;
        result.passKeyExpire = null;
        result
          .save()
          .then(function () {
            res.status(200).send('Password reset successful');
          })
          .catch(function (err) {
            console.log(JSON.stringify(err, null, 2));
            res.status(500).send('Some error accured');
          });
      } else {
        res
          .status(400)
          .send(
            'Sorry, password key has expired. Please initiate the request again for new password key'
          );
      }
    } else {
      res.status(500).send('Invalid reset password key!');
    }
  });
});

/*
Protected routes
*/

/*
Authorization middleware
If request arrives for protected route then will middleware will verify the token attached with the request
*/

app.use(function (req, res, next) {
  // Token arrives in headers so we need to first extract token from headers
  const token = req.headers['x-access-token'] || req.body.token;

  if (token) {
    jwt.verify(token, TOKEN_SECRET, function (err, decoded) {
      if (decoded) {
        req.decoded = decoded;
        console.log(req.decoded);
        next();
      } else {
        console.log(JSON.stringigy(err, null, 2));
        res.status(401).send('Invalid token supplied!');
      }
    });
  } else {
    res.status(401).send('Authorization failed! Please provide a valid token');
  }
});

app.get('/protected', (req, res) => {
  res.send(`You have access to this because you have supplied a valid token.
    	Your username is ${req.decoded.username}
        and email is ${req.decoded.email}.
    `);
});

app.listen(PORT, function () {
  console.log(`App is running on port ${PORT}`);
});
