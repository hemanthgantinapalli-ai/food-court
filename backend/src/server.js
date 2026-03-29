import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';

import { initSocket } from './utils/socket.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// --- Routes ---
import authRoutes from "./routes/authRoutes.js";
import restaurantRoutes from "./routes/restaurantRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import riderRoutes from './routes/riderRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import menuRoutes from './routes/menuRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import supportRoutes from './routes/supportRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import partnerRoutes from './routes/partnerRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import User from "./models/User.js";

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected: cluster0.cki06oc.mongodb.net'))
  .catch((err) => console.error('🔥 Error connecting to MongoDB:', err.message));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- Middleware ---
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(compression());
app.use(cors());

// Stripe raw body parser
app.use('/webhook', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// --- API Endpoints ---
app.get("/api/health", (req, res) => res.json({ status: "ok", message: "FoodCourt API is online 🚀" }));

app.post("/api/auth/register", async (req, res) => {
  try {
    console.log("BODY:", req.body);
    const { name, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }
    const user = new User({ name, email, password });
    await user.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use('/api/riders', riderRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/partner', partnerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/upload', uploadRoutes);

// --- Production Frontend Serving ---
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
} else {
  app.get("/", (req, res) => {
    res.send("FoodCourt API running 🚀 (Dev Mode)");
  });
}

// --- Errors ---
app.use(notFoundHandler);
app.use(errorHandler);

// --- Initialization ---
const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, '0.0.0.0', () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);

