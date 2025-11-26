import swaggerUi, { SwaggerOptions } from "swagger-ui-express";
import path from "path";
import fs from "fs";
import { asyncHandler } from "./utils/asyncHandler";

const swaggerDocument = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../../api-docs.json"), "utf8")
);

const options: SwaggerOptions = {
  swaggerOptions: {
    docExpansion: "none",
    filter: true,
    showRequestHeaders: true,
  },
};

declare global {
  namespace Express {
    interface Request {
      swaggerDoc?: any;
    }
  }
}
const swaggerHost = asyncHandler(async (req, _, next) => {
  console.log("swagger host", req.get("host"));
  swaggerDocument.host =
    req.get("host") == "backend" ? "server.eazika.com" : req.get("host");
  req.swaggerDoc = swaggerDocument;
  next();
});

const swaggerServeFile = () => swaggerUi.serveFiles(swaggerDocument, options);
const swaggerSetup = () => swaggerUi.setup(options);

export { swaggerHost, swaggerServeFile, swaggerSetup };
