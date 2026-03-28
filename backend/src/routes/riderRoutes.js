import express from 'express';
import mongoose from 'mongoose';
import { authenticateUser, authorizeRole } from '../middleware/auth.js';
import Rider from '../models/Rider.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { getIO, getOnlineRiderLocations } from '../utils/socket.js';
import { sendOtp, emailLogin, emailSignup } from '../controllers/riderAuthController.js';

const router = express.Router();

// ─── GET /api/riders/online (admin only) ─────────────────────────────────────
// Admin fetches all currently online riders with their live GPS position
router.get('/online', authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
    console.log(`👑 [Admin] Fetching online riders with locations.`);
    // Get all online riders from DB
    const onlineRiders = await Rider.find({ isOnline: true })
      .populate('user', 'name email phone');

    // Merge with in-memory real-time locations (more up-to-date than DB)
    const liveLocations = getOnlineRiderLocations();

    const ridersWithLocation = onlineRiders.map(rider => {
      const liveData = liveLocations.get(rider.user?._id?.toString());
      return {
        _id: rider._id,
        userId: rider.user?._id,
        name: rider.user?.name,
        email: rider.user?.email,
        phone: rider.user?.phone,
        vehicleType: rider.vehicleType,
        rating: rider.rating,
        completedDeliveries: rider.completedDeliveries,
        // Live location from socket (most accurate) or DB fallback
        location: liveData ? {
          lat: liveData.latitude,
          lng: liveData.longitude,
          heading: liveData.heading,
          speed: liveData.speed,
          updatedAt: liveData.updatedAt,
        } : rider.currentLocation ? {
          lat: rider.currentLocation.latitude,
          lng: rider.currentLocation.longitude,
          heading: rider.currentLocation.heading || 0,
          speed: rider.currentLocation.speed || 0,
          updatedAt: rider.updatedAt,
        } : null,
      };
    });

    res.status(200).json({ success: true, data: ridersWithLocation });
  } catch (error) {
    console.error(`🔥 [Online Riders] Error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/riders/stats ──────────────────────────────────────────────────
// Rider fetches their own stats summary for dashboard
router.get('/stats', authenticateUser, authorizeRole('rider'), async (req, res) => {
  try {
    const userId = req.userId;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [rider, totalDeliveries, todayDeliveries, activeDeliveries, totalEarningsAgg] = await Promise.all([
      Rider.findOne({ user: userId }),
      Order.countDocuments({ rider: userId, orderStatus: 'delivered' }),
      Order.countDocuments({ rider: userId, orderStatus: 'delivered', createdAt: { $gte: startOfToday } }),
      Order.countDocuments({ rider: userId, orderStatus: { $in: ['confirmed', 'preparing', 'ready', 'on_the_way'] } }),
      Order.aggregate([
        { $match: { rider: new mongoose.Types.ObjectId(userId), orderStatus: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$deliveryFee' } } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        isOnline: rider?.isOnline || false,
        isVerified: rider?.isVerified || false,
        rating: rider?.rating || 4.5,
        totalEarnings: totalEarningsAgg[0]?.total || 0,
        totalDeliveries,
        todayDeliveries,
        activeDeliveries,
      },
    });
  } catch (error) {
    console.error(`🔥 [Rider Stats] Error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── AUTHENTICATION (OTP Based - Legacy / Disabled) ──────────────────────────
router.post('/auth/send-otp', sendOtp);

// ─── AUTHENTICATION (Email/Password Based) ───────────────────────────────────
router.post('/auth/login', emailLogin);
router.post('/auth/signup', emailSignup);

// ─── POST /api/riders/register ────────────────────────────────────────────────
// Register or update rider profile (rider or admin)
router.post('/register', authenticateUser, authorizeRole('admin', 'rider'), async (req, res) => {
  try {
    const { licenseNumber, vehicleType, vehicleNumber } = req.body;
    const userId = req.userId;

    console.log(`🛵 [Rider Register] Registering rider profile for user: ${userId}`);

    let rider = await Rider.findOne({ user: userId });
    if (rider) {
      // Update existing profile
      rider.licenseNumber = licenseNumber || rider.licenseNumber;
      rider.vehicleType = vehicleType || rider.vehicleType;
      rider.vehicleNumber = vehicleNumber || rider.vehicleNumber;
      await rider.save();
      console.log(`✅ [Rider Register] Updated existing rider profile.`);
    } else {
      rider = await Rider.create({ user: userId, licenseNumber, vehicleType, vehicleNumber });
      console.log(`✅ [Rider Register] New rider profile created.`);
    }

    res.status(201).json({ success: true, data: rider });
  } catch (error) {
    console.error(`🔥 [Rider Register] Error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PUT /api/riders/toggle-online ───────────────────────────────────────────
// Rider toggles their own online/offline status
router.put('/toggle-online', authenticateUser, authorizeRole('rider'), async (req, res) => {
  try {
    const { isOnline } = req.body;
    console.log(`🔄 [Rider Toggle Online] Rider ${req.userId} → isOnline: ${isOnline}`);

    const rider = await Rider.findOneAndUpdate(
      { user: req.userId },
      { isOnline: !!isOnline },
      { new: true, upsert: true }
    );

    // Also update User isAvailable status
    await User.findByIdAndUpdate(req.userId, { isAvailable: !!isOnline });

    console.log(`✅ [Rider Toggle Online] Rider status updated to: ${rider.isOnline ? 'ONLINE' : 'OFFLINE'}`);
    res.status(200).json({ success: true, data: rider });
  } catch (error) {
    console.error(`🔥 [Rider Toggle Online] Error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/riders/status ──────────────────────────────────────────────────
// Rider fetches their own profile/status
router.get('/status', authenticateUser, authorizeRole('rider'), async (req, res) => {
  try {
    console.log(`📊 [Rider Status] Fetching status for rider: ${req.userId}`);
    const rider = await Rider.findOne({ user: req.userId });

    if (!rider) {
      console.log(`⚠️ [Rider Status] No rider profile found. Returning defaults.`);
      return res.status(200).json({ success: true, data: { isOnline: false, isVerified: false } });
    }

    res.status(200).json({ success: true, data: rider });
  } catch (error) {
    console.error(`🔥 [Rider Status] Error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/riders/orders/available ────────────────────────────────────────
// Rider fetches orders that are READY and have no assigned rider
// Rider MUST be online
router.get('/orders/available', authenticateUser, authorizeRole('rider'), async (req, res) => {
  try {
    console.log(`🛎️ [Rider Available Orders] Checking for rider: ${req.userId}`);

    // Verify rider is ONLINE
    const rider = await Rider.findOne({ user: req.userId });
    if (!rider || !rider.isOnline) {
      console.log(`⚠️ [Rider Available Orders] Rider is OFFLINE. No orders shown.`);
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        message: 'Go online to see available orders',
      });
    }

    // Only show orders that are DISPATCHED and have no rider assigned
    const orders = await Order.find({
      orderStatus: 'dispatched',
      rider: null,
    })
      .populate('restaurant', 'name image address')
      .populate('customer', 'name phone')
      .populate('items.menuItem', 'name')
      .sort({ createdAt: -1 });

    console.log(`✅ [Rider Available Orders] Found ${orders.length} available order(s).`);
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    console.error(`🔥 [Rider Available Orders] Error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/riders/orders/assigned ─────────────────────────────────────────
// Rider fetches their currently assigned / active deliveries
router.get('/orders/assigned', authenticateUser, authorizeRole('rider'), async (req, res) => {
  try {
    console.log(`📦 [Rider Assigned Orders] Fetching for rider: ${req.userId}`);

    const orders = await Order.find({
      rider: req.userId,
      orderStatus: { $in: ['on_the_way'] },
    })
      .populate('restaurant', 'name image address')
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 });

    console.log(`✅ [Rider Assigned Orders] Found ${orders.length} active delivery/ies.`);
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    console.error(`🔥 [Rider Assigned Orders] Error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/riders/orders/history ──────────────────────────────────────────
// Rider fetches all their past completed deliveries + earnings
router.get('/orders/history', authenticateUser, authorizeRole('rider'), async (req, res) => {
  try {
    console.log(`📋 [Rider History] Fetching completed deliveries for: ${req.userId}`);

    const orders = await Order.find({
      rider: req.userId,
      orderStatus: 'delivered',
    })
      .populate('restaurant', 'name')
      .populate('customer', 'name')
      .sort({ createdAt: -1 });

    const totalEarnings = orders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);

    console.log(`✅ [Rider History] ${orders.length} completed deliveries. Total earnings: ₹${totalEarnings}`);
    res.status(200).json({
      success: true,
      count: orders.length,
      totalEarnings,
      data: orders,
    });
  } catch (error) {
    console.error(`🔥 [Rider History] Error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /api/riders/orders/:orderId/claim ──────────────────────────────────
// Rider claims an available order (must be online)
router.post('/orders/:orderId/claim', authenticateUser, authorizeRole('rider'), async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log(`🤝 [Rider Claim] Rider ${req.userId} claiming order ${orderId}`);

    // Must be online
    const rider = await Rider.findOne({ user: req.userId });
    if (!rider || !rider.isOnline) {
      return res.status(403).json({ success: false, message: 'You must be online to claim orders' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.rider) {
      return res.status(400).json({ success: false, message: 'Order already claimed by another rider' });
    }
    if (order.orderStatus !== 'ready') {
      return res.status(400).json({ success: false, message: 'Order is not ready for pickup yet' });
    }

    order.rider = req.userId;
    order.orderStatus = 'on_the_way';
    order.statusHistory.push({ status: 'on_the_way', timestamp: new Date(), note: 'Rider claimed the order' });
    await order.save();

    // Mark rider as unavailable
    await User.findByIdAndUpdate(req.userId, { isAvailable: false });

    // Notify user
    const io = getIO();
    io.to(order.customer.toString()).emit('order_status_update', {
      orderId: order._id,
      status: 'on_the_way',
      message: 'A rider has claimed your order and is on the way!'
    });

    console.log(`✅ [Rider Claim] Order ${orderId} claimed successfully.`);
    res.status(200).json({ success: true, message: 'Order claimed successfully', data: order });
  } catch (error) {
    console.error(`🔥 [Rider Claim] Error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PUT /api/riders/orders/:orderId/pickup ───────────────────────────────────
// Rider confirms they have picked up the order from restaurant
router.put('/orders/:orderId/pickup', authenticateUser, authorizeRole('rider'), async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log(`📦 [Rider Pickup] Rider ${req.userId} confirming pickup for order ${orderId}`);

    const order = await Order.findOne({ _id: orderId, rider: req.userId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found or not assigned to you' });
    }

    order.orderStatus = 'picked_up';
    order.statusHistory.push({ status: 'picked_up', timestamp: new Date(), note: 'Rider confirmed pickup' });
    await order.save();

    console.log(`✅ [Rider Pickup] Order ${orderId} marked as picked up.`);
    res.status(200).json({ success: true, message: 'Pickup confirmed', data: order });
  } catch (error) {
    console.error(`🔥 [Rider Pickup] Error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PUT /api/riders/orders/:orderId/deliver ──────────────────────────────────
// Rider marks order as delivered
router.put('/orders/:orderId/deliver', authenticateUser, authorizeRole('rider'), async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log(`🏠 [Rider Deliver] Rider ${req.userId} marking order ${orderId} as delivered`);

    const order = await Order.findOne({ _id: orderId, rider: req.userId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found or not assigned to you' });
    }

    order.orderStatus = 'delivered';
    order.actualDeliveryTime = new Date();
    order.paymentStatus = 'completed';
    order.statusHistory.push({ status: 'delivered', timestamp: new Date(), note: 'Rider confirmed delivery' });
    await order.save();

    // Mark rider as available again
    await User.findByIdAndUpdate(req.userId, { isAvailable: true });

    // Notify user
    const io = getIO();
    io.to(order.customer.toString()).emit('order_status_update', {
      orderId: order._id,
      status: 'delivered',
      message: 'Order has been delivered! Enjoy your meal.'
    });

    console.log(`✅ [Rider Deliver] Order ${orderId} delivered. Rider marked as available.`);
    res.status(200).json({ success: true, message: 'Order marked as delivered', data: order });
  } catch (error) {
    console.error(`🔥 [Rider Deliver] Error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/riders (admin only) ────────────────────────────────────────────
router.get('/', authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
    console.log(`👑 [Admin] Fetching all riders.`);
    const riders = await Rider.find().populate('user', 'name email');
    res.status(200).json({ success: true, data: riders });
  } catch (error) {
    console.error(`🔥 [Admin Get Riders] Error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PUT /api/riders/:riderId/verify (admin only) ────────────────────────────
router.put('/:riderId/verify', authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
    const { isVerified } = req.body;
    console.log(`✅ [Admin] Verifying rider: ${req.params.riderId}`);
    const rider = await Rider.findByIdAndUpdate(req.params.riderId, { isVerified }, { new: true });
    res.status(200).json({ success: true, data: rider });
  } catch (error) {
    console.error(`🔥 [Admin Verify Rider] Error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /api/riders/update-location ────────────────────────────────────────
// Rider updates their live coordinates
router.post('/update-location', authenticateUser, authorizeRole('rider'), async (req, res) => {
  try {
    const { latitude, longitude, heading, speed } = req.body;
    
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
    }

    console.log(`📍 [Rider Location] Updating location for rider: ${req.userId} → ${latitude}, ${longitude} (Heading: ${heading}, Speed: ${speed})`);

    await Rider.findOneAndUpdate(
      { user: req.userId },
      { 
        currentLocation: { 
          latitude, 
          longitude,
          heading: Number(heading) || 0,
          speed: Number(speed) || 0
        } 
      }
    );

    // Notify active customers linked to this rider
    const activeOrders = await Order.find({
      rider: req.userId,
      orderStatus: { $in: ['on_the_way', 'picked_up', 'ready', 'Assigned', 'Arrived', 'Picked Up'] }
    });

    // Persistent DB Lock: Update active orders in DB too so customer refresh doesn't jitter
    await Order.updateMany(
      { 
        rider: req.userId, 
        orderStatus: { $in: ['on_the_way', 'picked_up', 'ready', 'Assigned', 'Arrived', 'Picked Up'] } 
      },
      { 
        riderLocation: { 
          lat: latitude, 
          lng: longitude, 
          bearing: Number(heading) || 0,
          speed: Number(speed) || 0,
          lastUpdated: new Date() 
        } 
      }
    );

    const io = getIO();
    activeOrders.forEach(order => {
      // Consolidate event name to rider_location_updated and use consistent structure
      const payload = {
        orderId: order._id,
        location: { lat: latitude, lng: longitude },
        heading: Number(heading) || 0,
        speed: Number(speed) || 0,
        timestamp: new Date()
      };
      
      io.to(order.customer.toString()).emit('rider_location_updated', payload);
      io.to(`order_${order._id}`).emit('rider_location_updated', payload);
      // Also broadcast to admins
      io.to('admins').emit('rider_position_update', {
        riderId: req.userId,
        location: { lat: latitude, lng: longitude },
        heading: Number(heading) || 0,
        speed: Number(speed) || 0,
      });
    });

    res.status(200).json({ success: true, message: 'Location updated' });
  } catch (error) {
    console.error(`🔥 [Rider Location] Error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
