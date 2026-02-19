import express from 'express';
import { handleStripeWebhook } from '../controllers/webhookController.js';

const router = express.Router();

// Note: this route must receive raw body; server.js will mount it with raw parser
router.post('/', handleStripeWebhook);

export default router;
