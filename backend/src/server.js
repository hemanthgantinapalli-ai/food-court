import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';

dotenv.config();

import { initSocket } from './utils/socket.js';
import { errorHandler, notFoundHandler, requireDB } from './middleware/errorHandler.js';

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

// ─── Global crash shields ─────────────────────────────────────────────────────
// Prevent the server from dying on unhandled errors - critical for deployment
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception (server kept alive):', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled Rejection (server kept alive):', reason?.message || reason);
});

// ─── MongoDB Connection ───────────────────────────────────────────────────────
// bufferCommands: false → fail immediately when disconnected, no infinite hangs
mongoose.set('bufferCommands', false);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
    });
    console.log('✅ MongoDB Connected: cluster0.cki06oc.mongodb.net');
  } catch (err) {
    console.error('🔥 MongoDB connection failed:', err.message);
    console.log('🔄 Retrying MongoDB connection in 5s...');
    setTimeout(connectDB, 5000);
  }
};

// Auto-reconnect on disconnect
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected. Reconnecting...');
  setTimeout(connectDB, 3000);
});

connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({ 
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false 
}));
app.use(compression());
app.use(cors());

// Stripe raw body parser
app.use('/webhook', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  res.json({
    status: dbStatus === 1 ? "ok" : "degraded",
    db: dbStatus === 1 ? "connected" : "disconnected",
    message: "FoodCourt API 🚀"
  });
});

// DB guard — apply to all routes that query the database
app.use('/api/auth', requireDB, authRoutes);
app.use('/api/restaurants', requireDB, restaurantRoutes);
app.use('/api/cart', requireDB, cartRoutes);
app.use('/api/orders', requireDB, orderRoutes);
app.use('/api/payments', requireDB, paymentRoutes);
app.use('/api/riders', requireDB, riderRoutes);
app.use('/api/menu', requireDB, menuRoutes);
app.use('/api/admin', requireDB, adminRoutes);
app.use('/api/support', requireDB, supportRoutes);
app.use('/api/bookings', requireDB, bookingRoutes);
app.use('/api/partner', requireDB, partnerRoutes);
app.use('/api/notifications', requireDB, notificationRoutes);
app.use('/api/wallet', requireDB, walletRoutes);
app.use('/api/analytics', requireDB, analyticsRoutes);
app.use('/api/upload', uploadRoutes); // upload is file-based, no DB needed

// ─── Production Frontend Serving ──────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
} else {
  app.get("/", (req, res) => res.send("FoodCourt API running 🚀 (Dev Mode)"));
}

// ─── Error Handlers ───────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);
initSocket(httpServer);

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`⚠️  Port ${PORT} is already in use — backend is likely already running (started from root). Exiting cleanly.`);
    process.exit(0);
  } else {
    console.error('💥 Server error:', err.message);
    process.exit(1);
  }
});

httpServer.listen(PORT, '0.0.0.0', () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
