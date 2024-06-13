import express from "express";
import dotenv from "dotenv";
import micropubRouter from "./routes/micropub.mjs";
import imagesRouter from "./routes/images.mjs";
import hobbyRouter from "./routes/hobby.mjs";
import { authenticate } from "./middleware/auth.mjs";
import { CosmosClient } from "@azure/cosmos";

dotenv.config();

const connectionString =
  process.env.COSMOS_CONNECTION_STRING || "your-connection-string";

// Create a new CosmosClient
const client = new CosmosClient(connectionString);

// Get a reference to the database and the container
const database = client.database(process.env.COSMOS_DATABASE || "your-database");

const app = express();
// remove the x-powered-by header
app.disable("x-powered-by");

// Middleware
app.use((req, _, next) => {
  req.database = database;
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
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
// gracefully handle shutdown
process.on("SIGINT", () => {
  console.info("Shutting down");
  process.exit(0);
});
