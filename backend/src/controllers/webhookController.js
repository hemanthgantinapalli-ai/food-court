import Stripe from 'stripe';
import Order from '../models/Order.js';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });

export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      // session.client_reference_id could hold order id
      const orderId = session.client_reference_id || session.metadata?.orderId;
      if (orderId) {
        try {
          await Order.findByIdAndUpdate(orderId, { paymentStatus: 'completed', paymentIntentId: session.payment_intent });
        } catch (err) {
          console.error('Failed to update order from webhook', err.message);
        }
      }
      break;
    }
    case 'payment_intent.succeeded': {
      const pi = event.data.object;
      // Optionally update order by metadata
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
};
