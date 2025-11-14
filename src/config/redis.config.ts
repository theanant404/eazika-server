import { createClient } from "redis";
import env from "../config/env.config";

const { redisUsername, redisPassword, redisHost, redisPort } = env;

const redisClient = createClient({
  username: redisUsername,
  password: redisPassword,
  socket: {
    host: redisHost,
    port: Number(redisPort),
  },
});

redisClient.on("error", (err) => console.error("Redis Error:", err));

(async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      console.log("Connected to Redis");
    } else {
      console.log("Redis already connected");
    }
  } catch (err) {
    console.error("Redis connection error:", err);
  }
})();

export default redisClient;
