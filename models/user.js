const mongoose = require('mongoose');
const Schema = mongoose.Schema; // As mongoDB is a schemaless database so we are using mongoose to define schema

let userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
    },
    fullname: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      required: true,
    },
    passResetKey: String,
    passKeyExpire: Number,
    createdAt: {
      type: Date,
      required: false,
    },
    updatedAt: {
      type: Number,
      required: false,
    },
  },
  { runSettersOnQuery: true }
);

// In 'save' middleware, `this` is the document being saved.
userSchema.pre('save', function (next) {
  this.email = this.email.toLowerCase(); // ensure email are in lowercase
  var currentDate = new Date().getTime();
  this.updatedAt = currentDate;

  if (!this.createdAt) {
    this.createdAt = currentDate;
  }
  next();
});

var user = mongoose.model('user', userSchema);
module.exports = user;
