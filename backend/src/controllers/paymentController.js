import stripe from '../config/stripe.js';

// Create a PaymentIntent and return client secret
export const createPaymentIntent = async (req, res) => {
  try {
    console.log(`💳 [Payment Intent API] Request from user: ${req.userId || 'guest'}`);
    const { amount, currency = 'usd' } = req.body;

    console.log(`📥 [Payment Intent API] Payload received: Amount: ${amount}, Currency: ${currency}`);

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      console.log(`❌ [Payment Intent API] Invalid amount provided: ${amount}`);
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    console.log(`✨ [Payment Intent API] Creating Stripe PaymentIntent...`);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(amount) * 100), // amount in cents
      currency,
      metadata: { createdBy: req.userId || 'guest' },
    });

    console.log(`✅ [Payment Intent API] PaymentIntent created successfully. ID: ${paymentIntent.id}`);
    return res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error(`🔥 [Payment Intent API] Error creating PaymentIntent: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Create a Stripe Checkout Session and return the session url
export const createCheckoutSession = async (req, res) => {
  try {
    console.log(`🛒 [Checkout Session API] Request from user: ${req.userId || 'guest'}`);
    const { items, success_url, cancel_url, currency = 'usd', orderId } = req.body;

    console.log(`📥 [Checkout Session API] Payload received. Items count: ${items ? items.length : 0}, OrderID: ${orderId}`);

    if (!items || !Array.isArray(items) || items.length === 0) {
      console.log(`❌ [Checkout Session API] Invalid or missing items array`);
      return res.status(400).json({ success: false, message: 'Cart items are required' });
    }

    console.log(`🏷️ [Checkout Session API] Mapping items to Stripe line_items format...`);
    const line_items = items.map((it) => {
      const name = it.menuItem?.name || it.name || 'Item';
      const unit_amount = Math.round((it.price || 0) * 100);
      const quantity = it.quantity || 1;

      console.log(`   - Item: ${name} | Price: ${it.price} | Qty: ${quantity}`);

      return {
        price_data: {
          currency,
          product_data: { name },
          unit_amount,
        },
        quantity,
      };
    });

    console.log(`✨ [Checkout Session API] Creating Stripe Checkout Session...`);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: success_url || `${process.env.FRONTEND_URL}/payment-success`,
      cancel_url: cancel_url || `${process.env.FRONTEND_URL}/checkout`,
      client_reference_id: orderId || undefined,
      metadata: { ...(orderId ? { orderId } : {}), createdBy: req.userId || 'guest' },
    });

    console.log(`✅ [Checkout Session API] Checkout Session created successfully. ID: ${session.id}`);
    console.log(`🔗 [Checkout Session API] Session URL: ${session.url}`);
    return res.status(200).json({ success: true, url: session.url, id: session.id });
  } catch (error) {
    console.error(`🔥 [Checkout Session API] Error creating Checkout Session: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
};
