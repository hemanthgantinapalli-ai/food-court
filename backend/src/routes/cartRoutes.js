import express from 'express';
import * as cartController from '../controllers/cartController.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateUser, cartController.getCart);
router.post('/add', authenticateUser, cartController.addToCart);
router.put('/update', authenticateUser, cartController.updateCartItem);
router.delete('/:menuItemId', authenticateUser, cartController.removeFromCart);
router.delete('/', authenticateUser, cartController.clearCart);
router.post('/coupon', authenticateUser, cartController.applyCoupon);

export default router;
