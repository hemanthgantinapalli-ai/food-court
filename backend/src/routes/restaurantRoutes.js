import { Router } from 'express';
import { authenticateUser, authorizeRole } from '../middleware/auth.js';
import {
    getRestaurants,
    getRestaurantById,
    createRestaurant,
    deleteRestaurant,
    updateRestaurant
} from '../controllers/restaurantController.js';

const router = Router();

router.get('/', getRestaurants);
// ✅ Critical: This was missing — clicking any restaurant card was 404ing
router.get('/search/global', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json({ restaurants: [], items: [] });

        const [restaurants, items] = await Promise.all([
            Restaurant.find({
                $or: [
                    { name: { $regex: q, $options: 'i' } },
                    { cuisines: { $in: [new RegExp(q, 'i')] } }
                ],
                isApproved: true
            }).limit(5),
            MenuItem.find({
                $or: [
                    { name: { $regex: q, $options: 'i' } },
                    { description: { $regex: q, $options: 'i' } }
                ]
            }).populate('restaurant', 'name').limit(5)
        ]);

        res.json({ success: true, restaurants, items });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/:id', getRestaurantById);
router.post('/', authenticateUser, authorizeRole('admin', 'restaurant'), createRestaurant);
router.put('/:id', authenticateUser, authorizeRole('admin', 'restaurant'), updateRestaurant);
router.delete('/:id', authenticateUser, authorizeRole('admin'), deleteRestaurant);

export default router;