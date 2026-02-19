import express from 'express';
import { createPaymentIntent } from '../controllers/paymentController.js';
import { authenticateUser } from '../middleware/auth.js';
import { createCheckoutSession } from '../controllers/paymentController.js';

const router = express.Router();

// Protected: create a payment intent (frontend will use client secret)
router.post('/create-payment-intent', authenticateUser, createPaymentIntent);
router.post('/create-checkout-session', authenticateUser, createCheckoutSession);

export default router;
