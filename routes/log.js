const app = require("express");
const router = app.Router();

const Log = require("../model/Log");

const express_jwt = require("express-jwt");
const jwt = express_jwt({
  secret: process.env.JWT_SECRET,
  algorithms: ["HS256"],
});

// const fs = require("fs");
// const { promisify } = require("util");

// const redis = require("../context/redis");

router.get("/", jwt, async (req, res) => {
  Log.find({ user_id: req.user.user_id }, (err, logs) => {
    if (err) return res.status(200).send("There is an error on the server :(");

    agroclimateLog = logs.map((log) => ({
      ph: log.ph,
      light_intensity_inside: log.light_intensity_inside,
      light_intensity_outside: log.light_intensity_outside,
      nutrient_flow: log.nutrient_flow,
      tds: log.tds,
      ec: log.ec,
      createdAt: log.createdAt,
    }));

    res.status(200).send(agroclimateLog);
  });
});

router.post("/clear", jwt, async (req, res) => {
  await Log.deleteMany({ user_id: req.user.user_id }).catch(() => {
    res.status(500).send({
      message: "Failed to clear your agroclimate parameters database log.",
    });
    return;
  });

  // fs.rmdir(
  //   `${process.env.IMAGE_DIR}/${req.user.user_id}`,
  //   { recursive: true },
  //   (err) => {
  //     if (!err)
  //       res.status(200).send({
  //         message: "Your agroclimate parameters log has been cleared.",
  //       });
  //     else
  //       res.status(500).send({
  //         message: "Failed to clear your saved image(s).",
  //       });
  //   }
  // );
});

// router.get("/image/:user_id/:filename", (req, res) => {
//   let imagePath = `${process.env.IMAGE_DIR}/${req.params.user_id}/${req.params.filename}`;
//   if (!fs.existsSync(imagePath))
//     res.status(422).send({
//       message:
//         "Invalid image file or you don't have an permission to access the specified image.",
//     });
//   else res.download(imagePath);
// });

router.get("/latest", jwt, async (req, res) => {
  let agroclimateLog = await Log.findOne(
    { user_id: req.user.user_id },
    { _id: 0, user_id: 0, __v: 0, updatedAt: 0 },
    {
      sort: {
        createdAt: -1,
      },
    }
  );

  res.status(200).send(agroclimateLog);
});

module.exports = router;
