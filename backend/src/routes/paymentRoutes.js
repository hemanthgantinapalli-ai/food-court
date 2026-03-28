import express from 'express';
import { createRazorpayOrder, verifyRazorpayPayment } from '../controllers/paymentController.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

router.post('/create-order', authenticateUser, createRazorpayOrder);
router.post('/verify', authenticateUser, verifyRazorpayPayment);

export default router;
