import Razorpay from 'razorpay';
import crypto from 'crypto';
import Order from '../models/Order.js';

// Setup Razorpay Instance
const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder', // Setup in .env
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_placeholder', // Setup in .env
  });
};

export const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, receipt } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    const instance = getRazorpayInstance();

    const options = {
      amount: Math.round(Number(amount) * 100),  // amount in the smallest currency unit (paise)
      currency: "INR",
      receipt: receipt || `receipt_${Date.now()}`
    };

    const order = await instance.orders.create(options);

    console.log(`✅ [Razorpay] Order created: ${order.id}`);

    res.status(200).json({
      success: true,
      order: order,
    });
  } catch (error) {
    console.error(`🔥 [Razorpay] Error creating order: ${error.message}`);
    res.status(500).json({ success: false, message: "Error creating Razorpay order" });
  }
};

export const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    const secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_placeholder';
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      console.log(`✅ [Razorpay] Payment Signature Verified for Payment ID: ${razorpay_payment_id}`);

      // If an internal OrderId was passed, update the order as completed.
      if (orderId) {
        await Order.findByIdAndUpdate(orderId, {
            paymentStatus: 'completed',
            paymentId: razorpay_payment_id
        });
      }

      res.status(200).json({ success: true, message: "Payment Verified successfully." });
    } else {
      console.log(`❌ [Razorpay] Invalid Payment Signature.`);
      res.status(400).json({ success: false, message: "Invalid Signature." });
    }
  } catch (error) {
    console.error(`🔥 [Razorpay] Error verifying payment: ${error.message}`);
    res.status(500).json({ success: false, message: "Error verifying payment signature." });
  }
};
