import express from 'express';
import { authenticateUser, authorizeRole } from '../middleware/auth.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';
import Rider from '../models/Rider.js';
import Settings from '../models/Settings.js';
import bcrypt from 'bcrypt';

const router = express.Router();

// Admin dashboard stats
router.get('/stats', authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalSummary = await Order.aggregate([
      { 
        $match: { 
          paymentStatus: { $in: ['completed', 'pending'] },
          orderStatus: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$total' },
          restaurantCommission: { $sum: '$platformFee' },
          logisticsCommission: { $sum: '$platformCommission' }
        }
      },
    ]);

    const totalRestaurants = await Restaurant.countDocuments();
    const unapprovedRestaurants = await Restaurant.countDocuments({ isApproved: false });
    const totalRiders = await User.countDocuments({ role: 'rider' });

    const statsData = totalSummary[0] || { revenue: 0, restaurantCommission: 0, logisticsCommission: 0 };
    const totalRevenue = statsData.revenue;
    const totalCommission = (statsData.restaurantCommission || 0) + (statsData.logisticsCommission || 0);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalOrders,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCommission: Math.round(totalCommission * 100) / 100,
        totalRestaurants,
        unapprovedRestaurants,
        totalRiders,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats',
      error: error.message,
    });
  }
});

// Create new user (admin only)
router.post('/users/create', authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Missing fields' });

    console.log(`👤 [Admin Create User] Creating ${role}: ${email}`);

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) return res.status(400).json({ success: false, message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({ name, email, password: hashedPassword, role });

    // If rider, create profile
    if (role === 'rider') {
      await Rider.create({
        user: user._id,
        fullName: name,
        status: 'APPROVED', // Admin created riders are pre-approved
        isVerified: true
      });
      console.log(`✅ [Admin Create User] Rider profile auto-created & approved.`);
    }

    res.status(201).json({
      success: true,
      message: `${role} account created successfully`,
      data: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error(`🔥 [Admin Create User] Error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Manage users
router.get('/users', authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message,
    });
  }
});

// Get user profile details (full data)
router.get('/users/:userId', authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    let riderData = null;
    let restaurantData = null;

    if (user.role === 'rider') {
      riderData = await Rider.findOne({ user: user._id });
    } else if (user.role === 'restaurant') {
      restaurantData = await Restaurant.findOne({ owner: user._id });
    }

    res.status(200).json({
      success: true,
      data: { ...user, riderData, restaurantData }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update user (full profile)
router.put('/users/:userId', authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
    const { isActive, role, name, phone, email, addresses, walletBalance, riderData, restaurantData } = req.body;
    const updateData = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (role) updateData.role = role;
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (email) updateData.email = email.toLowerCase();
    if (addresses) updateData.addresses = addresses;
    if (walletBalance !== undefined) updateData['wallet.balance'] = walletBalance;

    const user = await User.findByIdAndUpdate(req.params.userId, updateData, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Handle role-specific data
    if (user.role === 'rider' && riderData) {
      await Rider.findOneAndUpdate(
        { user: user._id },
        { ...riderData, fullName: user.name },
        { upsert: true, new: true }
      );
    }

    if (user.role === 'restaurant' && restaurantData) {
      // Find or create restaurant
      await Restaurant.findOneAndUpdate(
        { owner: user._id },
        { ...restaurantData, name: restaurantData.name || user.name },
        { upsert: true, new: true }
      );
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user,
    });
  } catch (error) {
    console.error('🔥 Update failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message,
    });
  }
});

// Delete user (admin only)
router.delete('/users/:userId', authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    await User.findByIdAndDelete(userId);
    // Also delete associated rider/restaurant profile
    await Rider.deleteOne({ user: userId });
    await Restaurant.deleteMany({ owner: userId });

    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Manage restaurants
router.get('/restaurants', authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
    const restaurants = await Restaurant.find().populate('owner', 'name email');
    res.status(200).json({
      success: true,
      data: restaurants,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch restaurants',
      error: error.message,
    });
  }
});

router.put('/restaurants/:restaurantId/approve', authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.restaurantId,
      {
        isApproved: true,
        isOpen: true,
        approvalDate: new Date(),
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Restaurant approved',
      data: restaurant,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to approve restaurant',
      error: error.message,
    });
  }
});

// Manage rider applications
router.get('/riders', authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
    const riders = await Rider.find().populate('user', 'name email phone isActive');
    res.status(200).json({
      success: true,
      data: riders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch riders',
      error: error.message,
    });
  }
});

router.put('/riders/:riderId/approve', authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
    const rider = await Rider.findByIdAndUpdate(
      req.params.riderId,
      { status: 'APPROVED' },
      { new: true }
    );
    res.status(200).json({
      success: true,
      message: 'Rider approved',
      data: rider,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to approve rider',
      error: error.message,
    });
  }
});

// Monitor orders
router.get('/orders', authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('customer', 'name phone')
      .populate('restaurant', 'name location')
      .populate('rider', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message,
    });
  }
});

// Analytics
router.get('/analytics/orders', authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      success: true,
      data: ordersByStatus,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message,
    });
  }
});

// Assign rider to order
router.post('/orders/:orderId/assign', authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
    const { orderId } = req.params;
    const { riderId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.rider = riderId;
    if (order.orderStatus === 'placed') {
      order.orderStatus = 'confirmed';
    }
    await order.save();

    // Populate for socket
    const updatedOrder = await Order.findById(orderId)
      .populate('customer', 'name phone')
      .populate('restaurant', 'name location');

    // Notify rider via socket
    const { getIO } = await import('../utils/socket.js');
    const io = getIO();
    io.to(riderId).emit('order_assigned', updatedOrder);

    res.status(200).json({
      success: true,
      message: 'Rider assigned successfully',
      data: updatedOrder
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Finance & Reports
router.get('/finance', authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
    const orders = await Order.find({
      paymentStatus: { $in: ['completed', 'pending'] },
      orderStatus: { $ne: 'cancelled' }
    }).populate('restaurant', 'name commissionPercentage');

    let totalGrossRevenue = 0;
    let totalCommission = 0;
    let pendingRevenue = 0;
    const dailyReport = Array(7).fill(0);
    const restaurantSettlements = {};
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    orders.forEach(order => {
      const total = order.total || 0;
      const commission = (total * (order.restaurant?.commissionPercentage || 10)) / 100;

      totalGrossRevenue += total;
      totalCommission += commission;

      if (order.paymentStatus === 'pending') {
        pendingRevenue += total;
      }

      // Last 7 days breakdown
      const orderDate = new Date(order.createdAt);
      const diffTime = Math.abs(today - orderDate);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 7) {
        dailyReport[6 - diffDays] += total;
      }

      // Per restaurant settlement
      const rId = order.restaurant?._id;
      if (rId) {
        if (!restaurantSettlements[rId]) {
          restaurantSettlements[rId] = {
            name: order.restaurant.name,
            totalOrders: 0,
            gross: 0,
            commission: 0,
            net: 0,
            pending: 0
          };
        }
        restaurantSettlements[rId].totalOrders += 1;
        restaurantSettlements[rId].gross += total;
        restaurantSettlements[rId].commission += commission;
        restaurantSettlements[rId].net += (total - commission);
        if (order.paymentStatus === 'pending') {
          restaurantSettlements[rId].pending += total;
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalGrossRevenue,
        totalCommission,
        pendingRevenue,
        weeklyReport: dailyReport,
        settlements: Object.values(restaurantSettlements),
        totalOrders: orders.length,
        averageOrderValue: orders.length > 0 ? totalGrossRevenue / orders.length : 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update Restaurant Settings (Commission, etc)
router.put('/restaurants/:id/settings', authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
    const { commissionPercentage, isOpen } = req.body;
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { commissionPercentage, isOpen },
      { new: true }
    );
    res.status(200).json({ success: true, data: restaurant });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GLOBAL PLATFORM SETTINGS ───
router.get('/settings', authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
    let settings = await Settings.findOne({ key: 'global_config' });
    if (!settings) {
      settings = await Settings.create({ 
        key: 'global_config',
        commissionPercentage: 15,
        deliveryFee: 30,
        taxPercentage: 5
      });
    }
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/settings', authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
      const { 
        commissionPercentage, deliveryFee, taxPercentage,
        baseDeliveryFee, perKmCharge, isMaintenanceMode,
        maxDeliveryDistance, autoRiderAssign, liveTrackingToggle,
        acceptingNewRestaurants
      } = req.body;
  
      const settings = await Settings.findOneAndUpdate(
        { key: 'global_config' },
        { 
          commissionPercentage, deliveryFee, taxPercentage,
          baseDeliveryFee, perKmCharge, isMaintenanceMode,
          maxDeliveryDistance, autoRiderAssign, liveTrackingToggle,
          acceptingNewRestaurants
        },
      { new: true, upsert: true }
    );

    res.status(200).json({ success: true, message: 'Settings updated successfully', data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/settings/public', async (req, res) => {
  try {
    const settings = await Settings.findOne({ key: 'global_config' }) || { 
      commissionPercentage: 15,
      deliveryFee: 30,
      taxPercentage: 5,
      maxDeliveryDistance: 15
    };
    res.status(200).json({ 
      success: true, 
      data: {
        commissionPercentage: settings.commissionPercentage,
        deliveryFee: settings.deliveryFee,
        taxPercentage: settings.taxPercentage,
        maxDeliveryDistance: settings.maxDeliveryDistance || 15
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
