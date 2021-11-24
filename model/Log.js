const mongoose = require("mongoose");

const logSchema = new mongoose.Schema(
  {
    user_id: String,
    temperature: Number,
    humidity: Number,
    ph: Number,
    light_intensity: Number,
    nutrient_flow: Number,
    nutrient_level: Number,
    acid_solution_level: Number,
    base_solution_level: Number,
    tds: Number,
    ec: Number,
    // image_filename: String,
  },
  {
    timestamps: true,
  }
);

const Log = mongoose.model("Log", logSchema);

module.exports = Log;
