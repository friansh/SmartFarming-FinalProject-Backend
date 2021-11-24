const express = require("express");
const router = express.Router();

const express_jwt = require("express-jwt");
const jsonwebtoken = require("jsonwebtoken");

const mw_jwt = express_jwt({
  secret: process.env.JWT_SECRET,
  algorithms: ["HS256"],
});

const bcrypt = require("bcrypt");

const User = require("../model/User");
const Configuration = require("../model/Config");

const random = require("../context/random");
const redis = require("../context/redis");

router.get("/", mw_jwt, (req, res) => {
  redis.HGETALL(`${req.user.user_id}:profile`, async (err, rep) => {
    if (rep) {
      res.status(200).send({
        user_id: rep.user_id,
        email: rep.email,
        fullname: rep.fullname,
        address: rep.address,
        device_token: rep.device_token,
      });
      return;
    }

    const user = await User.findById(req.user.user_id);

    redis.HMSET(
      `${req.user.user_id}:profile`,
      "user_id",
      user.id,
      "email",
      user.email,
      "fullname",
      user.fullname,
      "address",
      user.address,
      "device_token",
      user.device_token
    );

    redis.EXPIRE(
      `${req.user.user_id}:profile`,
      process.env.REDIS_CACHE_EXPIRES
    );

    res.status(200).send({
      user_id: user._id,
      email: user.email,
      fullname: user.fullname,
      address: user.address,
      device_token: user.device_token,
    });
  });
});

router.post("/login", async (req, res) => {
  const loggingInUser = await User.findOne({ email: req.body.email });

  if (!loggingInUser) {
    res.status(401).send({ message: "Invalid email or password." });
    return;
  }

  const compareHash = await bcrypt.compare(
    req.body.password,
    loggingInUser.password
  );

  if (compareHash) {
    const ttl = 24 * 3600;
    let token = jsonwebtoken.sign(
      {
        user_id: loggingInUser._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: ttl,
      }
    );

    res.status(200).send({ token, ttl });
  } else res.status(401).send({ message: "Invalid email or password." });
});

router.patch("/", mw_jwt, async (req, res) => {
  const updatingUser = await User.findOne({ _id: req.user.user_id });

  if (req.body.email != updatingUser.email) {
    const checkExistingEmail = await User.findOne({ email: req.body.email });
    if (checkExistingEmail) {
      res.status(409).send({
        message: "This email is already registered in the system.",
      });
      return;
    }
  }

  if (!updatingUser) {
    res.status(401).send({ message: "Invalid email or password." });
    return;
  }

  await User.updateOne(
    { _id: req.user.user_id },
    {
      email: req.body.email,
      fullname: req.body.fullname,
      address: req.body.address,
    }
  ).catch(() => {
    res.status(500).send({ message: "Failed to update the user profile." });
    return;
  });

  redis.DEL(`${req.user.user_id}:profile`);

  res
    .status(200)
    .send({ message: "The user profile has been successfully updated." });
});

router.patch("/password", mw_jwt, async (req, res) => {
  if (req.body.new_password !== req.body.new_password_confirm) {
    res.status(422).send({
      message: "The password and the confirmation field mismatch.",
    });
    return;
  }

  const user = await User.findOne({ _id: req.user.user_id }).catch(() => {
    res.status(500).send({ message: "Failed to update the user password." });
    return;
  });

  const checkOldPassword = await bcrypt
    .compare(req.body.old_password, user.password)
    .catch(() => {
      res.status(500).send({ message: "Failed to update the user password." });
      return;
    });

  if (!checkOldPassword) {
    res.status(401).send({ message: "Invalid old password." });
    return;
  }

  const newPasswordHash = await bcrypt.hash(req.body.new_password, 10);

  User.updateOne(
    { _id: req.user.user_id },
    {
      password: newPasswordHash,
    }
  ).catch(() => {
    res.status(500).send({ message: "Failed to update the user password." });
    return;
  });

  res.status(200).send({
    message: "Your password have been successfully updated.",
  });
});

router.patch("/device", mw_jwt, async (req, res) => {
  await User.updateOne(
    { _id: req.user.user_id },
    {
      device_token: random(process.env.DEVICE_TOKEN_LENGTH),
    }
  ).catch(() => {
    res
      .status(500)
      .send({ message: "Failed to re-randomized the user device token." });
    return;
  });

  redis.DEL(`${req.user.user_id}:profile`);

  res.status(200).send({
    message: "The user device token has been successfully re-randomized.",
  });
});

router.put("/", async (req, res) => {
  const userFound = await User.findOne({ email: req.body.email }).catch(
    (error) => {
      console.log(error);
    }
  );

  if (userFound) {
    res.status(401).send({
      message: "This email is already registered in the system.",
    });
    return;
  }

  const passwordHash = await bcrypt.hash(req.body.password, 10);

  const newUser = new User({
    email: req.body.email,
    password: passwordHash,
    fullname: req.body.fullname,
    address: req.body.address,
    device_token: random(process.env.DEVICE_TOKEN_LENGTH),
  });

  const savedNewUser = await newUser.save().catch(() => {
    res.status(500).send({
      message: "Failed to set up the new user.",
    });
    return;
  });

  const newConfig = new Configuration({
    user_id: savedNewUser._id,
    refresh_time: 0,
    logging_time: 0,
    temperature: 0,
    humidity: 0,
    ph: 0,
    light_intensity: 0,
    nutrient_flow: 0,
    nutrient_level: 0,
    acid_solution_level: 0,
    base_solution_level: 0,
    tds: 0,
    ec: 0,
    day_start: 0,
    day_end: 0,
  });

  await newConfig.save().catch(() => {
    res.status(500).send({
      message: "Failed to set up the new user.",
    });
    return;
  });

  res.status(200).send({ message: "Your account have been registered." });
});

module.exports = router;
