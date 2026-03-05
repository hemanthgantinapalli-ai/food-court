import express from 'express';
import { authenticateUser, authorizeRole } from '../middleware/auth.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';
import Rider from '../models/Rider.js';

const router = express.Router();

// Admin dashboard stats
router.get('/stats', authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $match: { paymentStatus: { $in: ['completed', 'pending'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);
    const totalRestaurants = await Restaurant.countDocuments();
    const unapprovedRestaurants = await Restaurant.countDocuments({ isApproved: false });
    const totalRiders = await User.countDocuments({ role: 'rider' });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
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

// Manage users
router.get('/users', authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password');
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

// Update user (status/role)
router.put('/users/:userId', authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
    const { isActive, role } = req.body;
    const updateData = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (role) updateData.role = role;

    const user = await User.findByIdAndUpdate(req.params.userId, updateData, { new: true }).select('-password');

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message,
    });
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
      .populate('restaurant', 'name')
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

export default router;
