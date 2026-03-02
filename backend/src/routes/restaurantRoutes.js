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
router.get('/:id', getRestaurantById);
router.post('/', authenticateUser, authorizeRole('admin'), createRestaurant);
router.put('/:id', authenticateUser, authorizeRole('admin'), updateRestaurant);
router.delete('/:id', authenticateUser, authorizeRole('admin'), deleteRestaurant);

export default router;