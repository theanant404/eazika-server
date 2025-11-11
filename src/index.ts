import app from "./app.js";
import env from "./config/env.config.js";

app.listen(env.port, () => {
  console.log(`Eazika server is running on port ${env.port}`);
});
