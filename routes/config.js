const app = require("express");
const router = app.Router();

const Configuration = require("../model/Config");
const User = require("../model/User");

const express_jwt = require("express-jwt");
const jwt = express_jwt({
  secret: process.env.JWT_SECRET,
  algorithms: ["HS256"],
});

const { promisify } = require("util");
const redis = require("../context/redis");

router.get("/device", (req, res) => {
  if (req.body.device_token == null)
    return res.status(422).json("No device token found in the request.");
  User.findOne(
    {
      device_token: req.body.device_token,
    },
    { _id: 1 },
    (err, user) => {
      if (err)
        return res.status(200).send("There is an error on the server :(");
      if (user == null) return res.status(404).json("Device not found.");

      Configuration.findOne(
        {
          user_id: user._id,
        },
        {
          _id: 0,
          refresh_time: 1,
          logging_time: 1,
          ph: 1,
          light_intensity: 1,
          nutrient_flow: 1,
          day_start: 1,
          day_end: 1,
          nutrient_level: 1,
          updatedAt: 1,
        },
        (err, config) => {
          if (err)
            return res.status(200).send("There is an error on the server :(");
          res.json(config);
        }
      );
    }
  );
});

router.patch("/", jwt, async (req, res) => {
  Configuration.findOneAndUpdate(
    { user_id: req.user.user_id },
    {
      refresh_time: req.body.refresh_time,
      logging_time: req.body.logging_time,
      ph: req.body.ph,
      light_intensity: req.body.light_intensity,
      nutrient_flow: req.body.nutrient_flow,
      tds: req.body.tds,
      ec: req.body.ec,
      day_start: req.body.day_start,
      day_end: req.body.day_end,
    },
    { new: true },
    (err, doc) => {
      if (err)
        return res.status(200).send("There is an error on the server :(");

      res.status(200).json({
        message: "Your new agroclimate configurations has been saved.",
        device_config: {
          refresh_time: doc.refresh_time,
          logging_time: doc.logging_time,
        },
        agroclimate_config: {
          ph: doc.ph,
          ec: doc.ec,
          tds: doc.tds,
          light_intensity: doc.light_intensity,
          nutrient_flow: doc.nutrient_flow,
          day_start: doc.day_start,
          day_end: doc.day_end,
        },
      });
    }
  );
});

router.get("/", jwt, (req, res) => {
  Configuration.findOne({ user_id: req.user.user_id }, (err, configs) => {
    if (err) {
      res.status(200).send("There is an error on the server :(");
      return;
    }

    res.status(200).json({
      refresh_time: configs.refresh_time,
      logging_time: configs.logging_time,
      ph: configs.ph,
      light_intensity: configs.light_intensity,
      nutrient_flow: configs.nutrient_flow,
      tds: configs.tds,
      ec: configs.ec,
      day_start: configs.day_start,
      day_end: configs.day_end,
    });
  });
});

module.exports = router;
