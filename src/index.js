import { app } from "./app.js";
import { env } from "./config/index.js";

app.listen(env.port, () => {
  console.table({
    url: `http://localhost:${env.port}`,
    Port: env.port,
  });
});
