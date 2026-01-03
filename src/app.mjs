import dotenv from "dotenv";

const config = dotenv.config();

import cors from "cors";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { authenticate } from "./middleware/auth.mjs";
import authcheckRouter from "./routes/authcheck.mjs";
import hobbyRouter from "./routes/hobby.mjs";
import imagesRouter from "./routes/images.mjs";
import micropubRouter from "./routes/micropub.mjs";
import openaiRouter from "./routes/openai.mjs";
import openapiRouter from "./routes/openapi.mjs";
import photosRouter from "./routes/photos.mjs";
import publishRouter from "./routes/publish.mjs";
import { createStorageContainerClient } from "./utils/azureStorage.mjs";
import { createBunnyStorageConfig } from "./utils/bunnyStorage.mjs";
import { createDatabaseConnection } from "./utils/cosmosDb.mjs";
import log from "./utils/logger.mjs";
import swaggerSpec from "./utils/swaggerSpec.mjs";

const app = express();
// remove the x-powered-by header
app.disable("x-powered-by");
// Enable CORS for localhost
app.use(cors({ origin: ["http://localhost:8080", "http://localhost:5173"] }));
// Middleware

// Middleware to log requests
app.use((req, res, next) => {
  log.info(`${req.method} ${req.url}`);
  next();
});

app.use((req, _, next) => {
  req.database = createDatabaseConnection(
    process.env.COSMOS_CONNECTION_STRING,
    process.env.COSMOS_DATABASE
  );
  // req.storageContainerClient = createStorageContainerClient(
  //   process.env.STORAGE_ACCOUNT,
  //   process.env.STORAGE_KEY,
  //   process.env.CONTAINER_NAME
  // );
  req.bunnyStorageConfig = createBunnyStorageConfig(
    process.env.BUNNY_CONTAINER,
    process.env.BUNNY_ACCESS_KEY,
    process.env.BUNNY_REGION
  );
  next();
});
app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/", openapiRouter);
app.use("/photos", photosRouter);
app.use("/authcheck", authcheckRouter);

app.use(authenticate);

// Routes
app.use("/micropub", micropubRouter);
app.use("/images", imagesRouter);
app.use("/hobby", hobbyRouter);
app.use("/publish", publishRouter);
app.use("/openai", openaiRouter);

// Start the server
const PORT = process.env.PORT || 3000;

/**
 * Starts the server and listens on the specified port.
 * @param {number} PORT - The port number to listen on.
 */
app.listen(PORT, () => {
  // log the environment variables from config.parsed at debug level as KEY = value
  if (process.env.NODE_ENV !== "production") {
    Object.keys(config.parsed).forEach((key) => {
      log.debug(`${key} = ${config.parsed[key]}`);
    });
  }

  log.info(`Server is running on port ${PORT}`);
});

// gracefully handle shutdown
process.on("SIGINT", () => {
  log.info("Shutting down");
  process.exit(0);
});
