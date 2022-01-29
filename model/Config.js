const mongoose = require("mongoose");

const configSchema = new mongoose.Schema(
  {
    user_id: String,
    refresh_time: Number,
    logging_time: Number,
    ph: Number,
    light_intensity: Number,
    nutrient_flow: Number,
    tds_max: Number,
    tds_min: Number,
    ec_max: Number,
    ec_min: Number,
    day_start: Date,
    day_end: Date,
  },
  {
    timestamps: true,
  }
);

const Configurations = mongoose.model("configurations", configSchema);

module.exports = Configurations;
