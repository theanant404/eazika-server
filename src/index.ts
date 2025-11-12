import app from "./app";
import env from "./config/env.config";

app.listen(env.port, () => {
  console.log(`Eazika server is running on port ${env.port}`);
});
