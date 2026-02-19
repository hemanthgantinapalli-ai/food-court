import stripe from '../config/stripe.js';

// Create a PaymentIntent and return client secret
export const createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency = 'usd' } = req.body;

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(amount) * 100), // amount in cents
      currency,
      metadata: { createdBy: req.userId || 'guest' },
    });

    return res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Create a Stripe Checkout Session and return the session url
export const createCheckoutSession = async (req, res) => {
  try {
    const { items, success_url, cancel_url, currency = 'usd' } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart items are required' });
    }

    const line_items = items.map((it) => {
      const name = it.menuItem?.name || it.name || 'Item';
      const unit_amount = Math.round((it.price || 0) * 100);
      const quantity = it.quantity || 1;
      return {
        price_data: {
          currency,
          product_data: { name },
          unit_amount,
        },
        quantity,
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: success_url || `${process.env.FRONTEND_URL}/payment-success`,
      cancel_url: cancel_url || `${process.env.FRONTEND_URL}/checkout`,
      client_reference_id: req.body.orderId || undefined,
      metadata: { ...(req.body.orderId ? { orderId: req.body.orderId } : {}), createdBy: req.userId || 'guest' },
    });

    return res.status(200).json({ success: true, url: session.url, id: session.id });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
