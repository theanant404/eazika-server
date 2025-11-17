import path from "path";
import swaggerUi from "swagger-ui-express";
import fs from "fs";

const file = fs.readFileSync(
  path.resolve(__dirname, "../../api-docs.json"),
  "utf8"
);

export const swaggerSpec = JSON.parse(file);
export { swaggerUi };
