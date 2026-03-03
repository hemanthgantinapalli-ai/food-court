import express from 'express';
import { authenticateUser, authorizeRole } from '../middleware/auth.js';
import Restaurant from '../models/Restaurant.js';
import MenuItem from '../models/MenuItem.js';
import Order from '../models/Order.js';

const router = express.Router();

// ── Get partner's own restaurants ──────────────────────────────────
router.get('/my-restaurants', authenticateUser, authorizeRole('restaurant'), async (req, res) => {
    try {
        const restaurants = await Restaurant.find({ owner: req.userId });
        res.status(200).json({ success: true, data: restaurants });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ── Get partner dashboard stats ────────────────────────────────────
router.get('/stats', authenticateUser, authorizeRole('restaurant'), async (req, res) => {
    try {
        const restaurants = await Restaurant.find({ owner: req.userId });
        const restaurantIds = restaurants.map(r => r._id);

        const totalOrders = await Order.countDocuments({ restaurant: { $in: restaurantIds } });
        const totalRevenue = await Order.aggregate([
            { $match: { restaurant: { $in: restaurantIds }, paymentStatus: 'completed' } },
            { $group: { _id: null, total: { $sum: '$total' } } },
        ]);
        const totalMenuItems = await MenuItem.countDocuments({ restaurant: { $in: restaurantIds } });
        const activeOrders = await Order.countDocuments({
            restaurant: { $in: restaurantIds },
            orderStatus: { $nin: ['delivered', 'cancelled'] },
        });

        res.status(200).json({
            success: true,
            data: {
                totalRestaurants: restaurants.length,
                totalOrders,
                totalRevenue: totalRevenue[0]?.total || 0,
                totalMenuItems,
                activeOrders,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ── Get orders for partner's restaurants ───────────────────────────
router.get('/orders', authenticateUser, authorizeRole('restaurant'), async (req, res) => {
    try {
        const restaurants = await Restaurant.find({ owner: req.userId });
        const restaurantIds = restaurants.map(r => r._id);

        const orders = await Order.find({ restaurant: { $in: restaurantIds } })
            .populate('customer', 'name phone')
            .populate('restaurant', 'name')
            .populate('rider', 'name')
            .sort({ createdAt: -1 })
            .limit(50);

        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ── Get menu items for partner's restaurants ───────────────────────
router.get('/menu', authenticateUser, authorizeRole('restaurant'), async (req, res) => {
    try {
        const restaurants = await Restaurant.find({ owner: req.userId });
        const restaurantIds = restaurants.map(r => r._id);

        const items = await MenuItem.find({ restaurant: { $in: restaurantIds } })
            .populate('restaurant', 'name');

        res.status(200).json({ success: true, data: items });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ── Update order status (partner can confirm/prepare/ready/cancel) ───────
router.put('/orders/:orderId/status', authenticateUser, authorizeRole('restaurant'), async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;
        const allowedStatuses = ['confirmed', 'preparing', 'ready', 'cancelled'];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: `Partners can only set: ${allowedStatuses.join(', ')}` });
        }

        // Verify order belongs to partner's restaurant
        const restaurants = await Restaurant.find({ owner: req.userId });
        const restaurantIds = restaurants.map(r => r._id.toString());

        const order = await Order.findById(orderId);
        if (!order || !restaurantIds.includes(order.restaurant?.toString())) {
            return res.status(404).json({ success: false, message: 'Order not found or access denied' });
        }

        order.orderStatus = status;
        order.statusHistory.push({ status, timestamp: new Date() });
        await order.save();

        res.status(200).json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
