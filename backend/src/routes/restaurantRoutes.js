import { Router } from 'express';
import { authenticateUser, authorizeRole } from '../middleware/auth.js';
import { 
    getRestaurants, 
    createRestaurant, 
    deleteRestaurant 
} from '../controllers/restaurantController.js';

const router = Router();

router.get('/', getRestaurants);
router.post('/', authenticateUser, authorizeRole('admin'), createRestaurant);
router.delete('/:id', authenticateUser, authorizeRole('admin'), deleteRestaurant);

export default router;