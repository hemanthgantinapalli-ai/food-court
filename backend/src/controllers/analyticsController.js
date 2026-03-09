import Order from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

/**
 * @desc Get comprehensive admin analytics for the BI dashboard
 * @route GET /api/analytics/admin/overview
 * @access Private (Admin)
 */
export const getAdminOverviewAnalytics = async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // 1. Revenue & Order Trends (Last 30 Days)
        const revenueTrends = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: thirtyDaysAgo },
                    orderStatus: { $ne: 'cancelled' },
                    paymentStatus: 'completed'
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    revenue: { $sum: "$total" },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // 2. Peak Hours Analysis (Orders per hour of the day)
        const peakHours = await Order.aggregate([
            {
                $match: { orderStatus: { $ne: 'cancelled' } }
            },
            {
                $group: {
                    _id: { $hour: "$createdAt" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // 3. Category/Cuisine Popularity (Aggregating from Restaurant model)
        const restaurantCuisines = await Restaurant.aggregate([
            { $unwind: "$cuisines" },
            {
                $group: {
                    _id: "$cuisines",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // 4. Top Customers by Revenue
        const topCustomers = await Order.aggregate([
            {
                $match: { orderStatus: 'delivered' }
            },
            {
                $group: {
                    _id: "$customer",
                    totalSpent: { $sum: "$total" },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { totalSpent: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'customerDetails'
                }
            },
            { $unwind: "$customerDetails" },
            {
                $project: {
                    name: "$customerDetails.name",
                    totalSpent: 1,
                    orderCount: 1
                }
            }
        ]);

        // 5. Payment Method Distribution
        const paymentDistribution = await Order.aggregate([
            {
                $group: {
                    _id: "$paymentMethod",
                    count: { $sum: 1 }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: {
                revenueTrends,
                peakHours,
                restaurantCuisines,
                topCustomers,
                paymentDistribution
            }
        });
    } catch (error) {
        console.error("🔥 [Admin Analytics API] Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc Get partner-specific analytics
 * @route GET /api/analytics/partner/overview
 * @access Private (Restaurant Owner)
 */
export const getPartnerOverviewAnalytics = async (req, res) => {
    try {
        const userId = req.userId;
        const restaurant = await Restaurant.findOne({ owner: userId });

        if (!restaurant) {
            return res.status(404).json({ success: false, message: 'Restaurant not found for this user' });
        }

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // 1. Revenue Trends for this restaurant
        const revenueTrends = await Order.aggregate([
            {
                $match: {
                    restaurant: restaurant._id,
                    createdAt: { $gte: thirtyDaysAgo },
                    orderStatus: { $ne: 'cancelled' }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    revenue: { $sum: "$total" },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // 2. Peak Hours for this restaurant
        const peakHours = await Order.aggregate([
            {
                $match: {
                    restaurant: restaurant._id,
                    orderStatus: { $ne: 'cancelled' }
                }
            },
            {
                $group: {
                    _id: { $hour: "$createdAt" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // 3. Top Selling Items (from order.items)
        const topItems = await Order.aggregate([
            { $match: { restaurant: restaurant._id, orderStatus: 'delivered' } },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.name",
                    totalSold: { $sum: "$items.quantity" },
                    revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 10 }
        ]);

        res.status(200).json({
            success: true,
            data: {
                revenueTrends,
                peakHours,
                topItems
            }
        });
    } catch (error) {
        console.error("🔥 [Partner Analytics API] Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};
