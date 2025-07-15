import { app } from "./app.js";
import { env } from "./config/index.js";

app.listen(env.port, () => {
  console.log(`⚙️ Server is running at port : ${env.port}`);
});
