import express from "express";
import { register, login, googleLogin, getProfile, updateProfile, toggleFavorite, toggleFavoriteFood, forgotPassword, verifyOtp, resetPassword } from "../controllers/authController.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google-login", googleLogin);

router.get("/profile", authenticateUser, getProfile);
router.put("/profile", authenticateUser, updateProfile);
router.post("/favorites/toggle", authenticateUser, toggleFavorite);
router.post("/favorites/food/toggle", authenticateUser, toggleFavoriteFood);

// Password Reset Routes
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

// ─── GET /api/auth/stats ────────────────────────────────────────────────────
// User fetches their own activity stats for dashboard
router.get("/stats", authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const Order = (await import('../models/Order.js')).default;
        const User = (await import('../models/User.js')).default;

        const [user, totalOrders, activeOrders, totalSpentAgg] = await Promise.all([
            User.findById(userId),
            Order.countDocuments({ customer: userId }),
            Order.countDocuments({ customer: userId, orderStatus: { $nin: ['delivered', 'cancelled'] } }),
            Order.aggregate([
                { $match: { customer: new (await import('mongoose')).default.Types.ObjectId(userId), orderStatus: 'delivered' } },
                { $group: { _id: null, total: { $sum: '$total' } } }
            ])
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalOrders,
                activeOrders,
                totalSpent: totalSpentAgg[0]?.total || 0,
                favoritesCount: (user?.favorites?.length || 0) + (user?.favoriteFoods?.length || 0),
                walletBalance: user?.wallet?.balance || 0,
            },
        });
    } catch (error) {
        console.error(`🔥 [User Stats] Error: ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
