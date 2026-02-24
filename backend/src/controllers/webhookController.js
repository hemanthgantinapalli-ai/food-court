import Stripe from 'stripe';
import Order from '../models/Order.js';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });

export const handleStripeWebhook = async (req, res) => {
  console.log(`🔔 [Stripe Webhook] Received webhook POST request`);
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    console.log(`🛡️ [Stripe Webhook] Verifying webhook signature...`);
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    console.log(`✅ [Stripe Webhook] Signature verified. Event Type: ${event.type}`);
  } catch (err) {
    console.error(`❌ [Stripe Webhook] Signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  console.log(`⚙️ [Stripe Webhook] Processing event: ${event.type}`);
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      console.log(`🛒 [Stripe Webhook] Checkout Session Completed: ${session.id}`);

      // session.client_reference_id could hold order id
      const orderId = session.client_reference_id || session.metadata?.orderId;
      if (orderId) {
        console.log(`🔍 [Stripe Webhook] Found associated OrderId: ${orderId}. Updating payment status...`);
        try {
          await Order.findByIdAndUpdate(orderId, { paymentStatus: 'completed', paymentIntentId: session.payment_intent });
          console.log(`✅ [Stripe Webhook] Order ${orderId} marked as 'completed'.`);
        } catch (err) {
          console.error(`🔥 [Stripe Webhook] Failed to update order ${orderId}:`, err.message);
        }
      } else {
        console.log(`⚠️ [Stripe Webhook] No OrderId found in session metadata or client_reference_id.`);
      }
      break;
    }
    case 'payment_intent.succeeded': {
      const pi = event.data.object;
      console.log(`💵 [Stripe Webhook] PaymentIntent Succeeded: ${pi.id}. Amount: ${pi.amount_received}`);
      // Optionally update order by metadata
      break;
    }
    default:
      console.log(`🤷 [Stripe Webhook] Unhandled event type: ${event.type}`);
  }

  console.log(`✅ [Stripe Webhook] Event processing complete. Sending 200 response.`);
  res.json({ received: true });
};
