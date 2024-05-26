import express from 'express';
import dotenv from "dotenv";
import micropubRouter from './routes/micropub.mjs';
import imagesRouter from './routes/images.mjs';
import { authenticate } from './middleware/auth.mjs';

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(authenticate);

// Routes
app.use('/micropub', micropubRouter);
app.use('/images', imagesRouter)

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});