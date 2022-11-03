//Defining Dependencies
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const shortid = require('shortid');
const nodemailer = require('nodemailer');

const db = require('./db/connection');
const User = require('./models/user');
const { PORT, EMAIL_ID, EMAIL_PASSWORD } = require('./config');

const app = express();

// Loading Database
db.connectServerToDatabase();

// configure bodyParser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', function (req, res) {
  res.send('Welcome to the Auth app');
});

// 1. SIGN UP
/**
 * @param fullname
 * @param username
 * @param password
 * @param email
 * @param gender
 */

app.post('/signup', function (req, res) {
  let { username, fullname, email, password, gender } = req.body;
  const newUser = new User({
    username,
    fullname,
    email,
    password: bcrypt.hashSync(password, 5),
    gender,
  });

  newUser.save().then(function (err) {
    if (!err) {
      // Use  res.json function on the other hand sets the content-type header to application/JSON so that the client treats the response string as a valid JSON object.
      return res.status(201).json('Signed up successfully');
    } else {
      if (err.code === 1100) {
        //This error occurs when two documents have the same value for a field that's defined as unique in your Mongoose schema
        return res.status(409).send(`User already exist`);
      } else {
        // Indenting the output with 2 space
        console.log(JSON.stringify(err, null, 2));
        // res.send function sets the content type to text/Html which means that the client will now treat it as text
        return res.status(500).send('Error signing up user');
      }
    }
  });
});

// 2. SIGN IN
app.post('/login', function (req, res) {
  let { username, password } = req;
  // .findOne are quieries not promises
  User.findOne({ username: username }, function (err, result) {
    if (!err) {
      const passwordCheck = bcrypt.compareSync(password, result.password); // return true / false
      if (passwordCheck) {
        // Saving some user data in session
        req.session.user = {
          email: result.email,
          username: result.username,
          id: result._id,
        };
        //  Session will expire in 3 days
        req.session.user.expires = new Date(
          Date.now() + 3 * 24 * 60 * 60 * 1000
        );
        res.status.send(200).send('You are logged in successfully');
      } else {
        res.status(401).send('Incorrect Password');
      }
    } else {
      res.status(401).send('Invalid login credentials');
    }
  });
});

// 3. Authorization
// Create a middleware if user session exist then you are authorized else you will fail
app.use(function (req, res, next) {
  if (!req.session.user) {
    next();
  } else {
    res.status(401).send('Authorization failed!. Please try again');
  }
});

app.get('/protected', function (req, res) {
  res.send(`You are seeing this because you have a valid session.
  Your username is ${req.session.user.username} 
    and email is ${req.session.user.email}.
`);
});

// 4.Logout
// app.all() function is used to routing all types of HTTP request. Like if we have POST, GET, PUT, DELETE, etc, request made to any specific route,
app.all('/logout', function (req, res) {
  delete req.session.destroy();
  res.status(200).send('Logout successfully');
});

// 5.Forgot Password

app.post('/forgot', function (req, res) {
  const { email } = req;
  User.findOne({ email: email }, function (err, result) {
    if (!err) {
      result.passResetKey = shortid.generate();
      result.passKeyExpire = new Date().getTime() + 20 * 60 * 1000; // pass reset key only valid for 20 minutes
      result.save().then(function (err) {
        if (!err) {
          // Configuring smtp for mail transportation
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 465,
            auth: {
              email: EMAIL_ID,
              pass: EMAIL_PASSWORD,
            },
          });
          const mailOptions = {
            subject: `NodeAuthTuts | Password reset`,
            to: email,
            from: `NodeAuthTuts ${EMAIL_ID}`,
            html: `
              <h1>Hi,</h1>
              <h2>Here is your password reset key</h2>
              <h2><code contenteditable="false" style="font-weight:200;font-size:1.5rem;padding:5px 10px; background: #EEEEEE; border:0">${passResetKey}</code></h4>
              <p>Please ignore if you didn't try to reset your password on our platform</p>
            `,
          };
          try {
            transporter.sendMail(mailOptions).then(function (err, response) {
              if (!err) {
                console.log('Email send:\n', response);
                res.status(200).send('Reset code sent');
              } else {
                console.log('error:\n', err, '\n');
                res.status(500).send('Could not send reset code');
              }
            });
          } catch (error) {}
        } else {
          res.status(500).send('Some error accrured');
        }
      });
    } else {
      res.status(400).send('Email address is incorrect!');
    }
  });
});

// 6. Reset Password

app.post('/resetpassword', function (req, res) {
  let { passResetKey, newPassword } = req;
  User.find({ passResetKey: passResetKey }, function (err, result) {
    if (!err) {
      const currentTime = new Date().now();
      const passKeyExpire = result.passKeyExpire;
      if (passKeyExpire > currentTime) {
        result.password = bcrypt.hashSync(newPassword, 5);
        result.passResetKey = null;
        result.passKeyExpire = null;
        result.save().then(function (err) {
          if (!err) {
            res.status(200).send('Password reset successful');
          } else {
            res.status(500).send('Error resetting your password');
          }
        });
      } else {
        res
          .status(400)
          .send(
            'Sorry , password reset key has expired. Please initiate the request for a new one'
          );
      }
    } else {
      res.status(400).send('Invalid password reset key');
    }
  });
});

app.listen(PORT, function () {
  console.log(`Connected to PORT ${PORT}`);
});
