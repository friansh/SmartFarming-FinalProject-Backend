const mqtt = require("mqtt");
const fs = require("fs");
const User = require("../model/User");
const Log = require("../model/Log");

const mqttClient = mqtt.connect(
  `mqtt://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`,
  {
    rejectUnauthorized: false,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    // clientId: "friansh-" + Math.random().toString(16).substr(2, 8),
  }
);

const redis = require("redis");

const redisSettings = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  user: process.env.REDIS_USER,
  password: process.env.REDIS_PASSWORD,
};

const redisClient = redis.createClient(redisSettings);
const subscriber = redis.createClient(redisSettings);
const publisher = redis.createClient(redisSettings);

const io = require("socket.io")(process.env.SOCKETIO_PORT, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

publisher.on("error", (err) => {
  console.log("error from pub");
  console.log(err);
});

subscriber.on("error", (err) => {
  console.log("error from sub");
  console.log(err);
});

const redisAdapter = require("socket.io-redis");
io.adapter(
  redisAdapter({
    pubClient: publisher,
    subClient: subscriber,
  })
);

const mqttPublish = (message, token) => {
  function twoDigits(number) {
    if (number < 10) return "0" + number;
    return number;
  }

  mqttClient.publish(
    "smartfarmer/feedback" + (token ? `/${token}` : ""),
    `[${twoDigits(new Date().getHours())}:${twoDigits(
      new Date().getMinutes()
    )}:${twoDigits(new Date().getSeconds())}] ${message}`
  );
};

const mqttPublishBroadcast = (message) => {
  mqttClient.publish("smartfarmer/broadcast", message);
};

mqttClient.on("connect", (connack) => {
  mqttClient.subscribe("smartfarmer/data/#", () => {
    console.log("[INFO] MQTT is subscribing to 'smartfarmer/data/#'...");
    mqttPublishBroadcast(
      "[INFO] The server has started listening to the MQTT data topic..."
    );
  });
});

let dataIndex = 0;

mqttClient.on("message", async (topic, message) => {
  let data = undefined;

  try {
    data = JSON.parse(message.toString());
  } catch {
    mqttPublishBroadcast(
      "[WARN] I received a data from somebody but i dont understand it!"
    );
    return;
  }

  const token = topic.split("/")[2];

  console.log(
    `[INFO] A data update received from device token '${token.slice(0, 10)}...'`
  );

  const user = await User.findOne({ device_token: token });

  if (!user) {
    mqttPublishBroadcast(
      "[WARN] I received a data from somebody but i dont know who!"
    );
    return;
  }

  // let timestamp = new Date().getTime();

  // if (!fs.existsSync(`${process.env.IMAGE_DIR}/${user._id}`))
  //   fs.mkdirSync(`${process.env.IMAGE_DIR}/${user._id}`);

  // mqttPublish("Saving the received image to local storage...", data.token);

  // fs.writeFile(
  //   `${process.env.IMAGE_DIR}/${user._id}/${timestamp}.jpg`,
  //   data.image,
  //   { encoding: process.env.IMAGE_ENCODING },
  //   () =>
  //     mqttPublish(
  //       "The received image has been recorded to the database.",
  //       data.token
  //     )
  // );

  const newLog = new Log({
    user_id: user._id,
    ph: data.ph,
    light_intensity_inside: data.light_intensity_inside,
    light_intensity_outside: data.light_intensity_outside,
    nutrient_flow: data.nutrient_flow,
    tds: data.tds,
    ec: data.ec,
    sent: data.sent,
    received: Date.now(),
    latency: Date.now() - data.sent,
    index: dataIndex++,
  });

  redisClient.DEL(`${user._id}:log`);

  mqttPublish("Saving the received data to database...", token);

  newLog.save().then(() => {
    mqttPublish("The data has been saved to the database.", token);
  });

  mqttPublish("Clearing the Redis cache...", token);
  redisClient.DEL(`${user._id}:log`);

  io.emit(
    user._id,
    JSON.stringify({
      user_id: user._id,
      ph: data.ph,
      light_intensity_inside: data.light_intensity_inside,
      light_intensity_outside: data.light_intensity_outside,
      nutrient_flow: data.nutrient_flow,
      tds: data.tds,
      ec: data.ec,
    })
  );
});
