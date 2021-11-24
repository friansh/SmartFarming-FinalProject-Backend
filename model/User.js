const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  fullname: String,
  address: String,
  device_token: String,
});

const User = mongoose.model("user", userSchema);

module.exports = User;
