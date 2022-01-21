const mongoose = require("mongoose");

const configSchema = new mongoose.Schema(
  {
    user_id: String,
    refresh_time: Number,
    logging_time: Number,
    ph: Number,
    light_intensity: Number,
    nutrient_flow: Number,
    tds: Number,
    ec: Number,
    day_start: Date,
    day_end: Date,
  },
  {
    timestamps: true,
  }
);

const Configurations = mongoose.model("configurations", configSchema);

module.exports = Configurations;
