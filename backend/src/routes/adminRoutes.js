import express from 'express';
import { authenticateUser, authorizeRole } from '../middleware/auth.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';

const router = express.Router();

// Admin dashboard stats
router.get('/stats', authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);
    const totalRestaurants = await Restaurant.countDocuments({ isApproved: true });
    const totalRiders = await User.countDocuments({ role: 'rider' });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalRestaurants,
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

router.put('/users/:userId/status', authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(req.params.userId, { isActive }, { new: true });

    res.status(200).json({
      success: true,
      message: 'User status updated',
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: error.message,
    });
  }
});

// Manage restaurants
router.get('/restaurants', authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
    const restaurants = await Restaurant.find().populate('owner', 'firstName lastName email');
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

// Monitor orders
router.get('/orders', authenticateUser, authorizeRole('admin'), async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('customer', 'firstName lastName phone')
      .populate('restaurant', 'name')
      .populate('rider', 'firstName lastName')
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

export default router;
