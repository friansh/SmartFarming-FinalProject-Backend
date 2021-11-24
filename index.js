console.log("[INFO] Program started...");

require("dotenv").config();
require("./context/mqtt");

var fs = require("fs");
// const https = require("https");
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

const corsOptions = {
  origin: "*",
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));

mongoose.connect(
  `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority`,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  }
);

app.get("/", (req, res) => {
  res.status(200).send({
    message: "The smart-farmer backend is running...",
    config: {
      APP_URL: process.env.APP_URL,
      MQTT_SERVER: process.env.MQTT_SERVER,
      DB_CLUSTER: process.env.DB_CLUSTER,
      DB_NAME: process.env.DB_NAME,
      IMAGE_ENCODING: process.env.IMAGE_ENCODING,
      IMAGE_DIR: process.env.IMAGE_DIR,
    },
  });
});

const userRoutes = require("./routes/user");
const configRoutes = require("./routes/config");
const logRoutes = require("./routes/log");

app.use("/user", userRoutes);
app.use("/agroclimate", configRoutes);
app.use("/log", logRoutes);

app.use((req, res, next) => {
  res.status(404).send({ message: "Cannot find the specified resource." });
});

app.use((err, req, res, next) => {
  console.error(`[ERRR] ${err.name}: ${err.message}`);
  if (err.name === "UnauthorizedError") {
    res.status(err.status).send({
      message: `Authentication error, reason: ${err.message.toLowerCase()}`,
    });
    return;
  }
});

// const privateKey = fs.readFileSync("certs/friansh.dev.key", "utf8");
// const certificate = fs.readFileSync("certs/friansh.dev.cert.pem", "utf8");

// const credentials = { key: privateKey, cert: certificate };
// const httpsServer = https.createServer(credentials, app);
const port = process.env.HTTP_PORT || 443;

// httpsServer.listen(port);
app.listen(port);

console.log(`[INFO] Express is listening on ${process.env.APP_URL}`);
