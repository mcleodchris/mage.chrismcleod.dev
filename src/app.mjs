import express from "express";
import dotenv from "dotenv";
import micropubRouter from "./routes/micropub.mjs";
import imagesRouter from "./routes/images.mjs";
import hobbyRouter from "./routes/hobby.mjs";
import { authenticate } from "./middleware/auth.mjs";
import { createDatabaseConnection } from "./utils/cosmosDb.mjs";
import { createStorageContainerClient } from "./utils/azureStorage.mjs";
import log from "./utils/logger.mjs";

const config = dotenv.config();

const app = express();
// remove the x-powered-by header
app.disable("x-powered-by");

// Middleware
app.use((req, _, next) => {
  req.database = createDatabaseConnection(
    process.env.COSMOS_CONNECTION_STRING,
    process.env.COSMOS_DATABASE
  );
  req.storageContainerClient = createStorageContainerClient(
    process.env.STORAGE_ACCOUNT,
    process.env.STORAGE_KEY,
    process.env.CONTAINER_NAME
  );
  next();
});
app.use(express.json());
app.use(authenticate);

// Routes
app.use("/micropub", micropubRouter);
app.use("/images", imagesRouter);
app.use("/hobby", hobbyRouter);

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
