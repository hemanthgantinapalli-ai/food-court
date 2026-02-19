import express from 'express';
import * as orderController from '../controllers/orderController.js';
import { authenticateUser, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/create', authenticateUser, orderController.createOrder);
router.get('/history', authenticateUser, orderController.getOrderHistory);
router.get('/:orderId', authenticateUser, orderController.getOrderById);
router.put('/:orderId/status', authenticateUser, authorizeRole('restaurant', 'admin', 'rider'), orderController.updateOrderStatus);
router.post('/:orderId/assign-rider', authenticateUser, authorizeRole('admin'), orderController.assignRiderToOrder);
router.post('/:orderId/rate', authenticateUser, orderController.rateOrder);
router.post('/:orderId/refund', authenticateUser, orderController.requestRefund);

export default router;
