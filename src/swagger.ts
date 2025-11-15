import path from "path";
import swaggerUi from "swagger-ui-express";
import fs from "fs";

const file = fs.readFileSync(
  path.resolve(__dirname, "../../api_doc.json"),
  "utf8"
);

export const swaggerSpec = JSON.parse(file);
export { swaggerUi };
