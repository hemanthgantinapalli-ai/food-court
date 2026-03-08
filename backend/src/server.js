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
import supportRoutes from './routes/supportRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import partnerRoutes from './routes/partnerRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import { createServer } from 'http';
import { initSocket } from './utils/socket.js';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import compression from 'compression';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
connectDB();

const app = express();

app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for simplicity, or configure it properly for production
}));
app.use(compression());
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
app.use('/api/support', supportRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/partner', partnerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/wallet', walletRoutes);
// Keep webhook route at /webhook for Stripe

// --- SERVE FRONTEND IN PRODUCTION ---
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    // Only serve index.html if the request isn't for an API route
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
} else {
  app.get("/", (req, res) => {
    res.send("FoodCourt API running 🚀 (Dev Mode)");
  });
}

const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, '0.0.0.0', () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
