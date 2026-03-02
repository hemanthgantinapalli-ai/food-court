import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/database.js";

import authRoutes from "./routes/authRoutes.js";
import restaurantRoutes from "./routes/restaurantRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import riderRoutes from './routes/riderRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import menuRoutes from './routes/menuRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { createServer } from 'http';
import { initSocket } from './utils/socket.js';


dotenv.config();
connectDB();

const app = express();

app.use(cors());

// Stripe webhooks require the raw body. Mount webhook route with raw parser before json parser.
app.use('/webhook', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use('/api/riders', riderRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/admin', adminRoutes);
// Keep webhook route at /webhook for Stripe


app.get("/", (req, res) => {
  res.send("FoodCourt API running 🚀");
});

const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
