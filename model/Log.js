const mongoose = require("mongoose");

const logSchema = new mongoose.Schema(
  {
    user_id: String,
    ph: Number,
    light_intensity_inside: Number,
    light_intensity_outside: Number,
    nutrient_flow: Number,
    tds: Number,
    ec: Number,
    sent: Number,
    received: Number,
    latency: Number,
    index: Number,
  },
  {
    timestamps: true,
  }
);

const Log = mongoose.model("Log", logSchema);

module.exports = Log;
