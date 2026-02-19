import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import stripe from '../config/stripe.js';

export const createOrder = async (req, res) => {
  try {
    const { deliveryAddress, paymentMethod } = req.body;

    // Get cart
    const cart = await Cart.findOne({ user: req.userId }).populate('restaurant');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty',
      });
    }

    // Create order
    const order = await Order.create({
      customer: req.userId,
      restaurant: cart.restaurant._id,
      items: cart.items.map((item) => ({
        menuItem: item.menuItem,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        addOns: item.addOns,
      })),
      deliveryAddress,
      subtotal: cart.subtotal,
      tax: cart.tax,
      deliveryFee: cart.deliveryFee,
      discount: cart.discount,
      discountCode: cart.discountCode,
      total: cart.total,
      paymentMethod,
    });

    // For demo, mark as completed if COD, else pending
    if (paymentMethod === 'cash') {
      order.paymentStatus = 'pending';
    }

    await order.save();

    // Clear cart
    await Cart.findOneAndUpdate(
      { user: req.userId },
      {
        items: [],
        subtotal: 0,
        tax: 0,
        deliveryFee: 0,
        discount: 0,
        total: 0,
      }
    );

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message,
    });
  }
};

export const getOrderHistory = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.userId })
      .populate('restaurant', 'name image')
      .populate('items.menuItem')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order history',
      error: error.message,
    });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate('customer')
      .populate('restaurant')
      .populate('rider')
      .populate('items.menuItem');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check authorization
    if (order.customer._id.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error.message,
    });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    order.orderStatus = status;
    order.statusHistory.push({
      status,
      timestamp: new Date(),
    });

    if (status === 'delivered') {
      order.actualDeliveryTime = new Date();
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order status updated',
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message,
    });
  }
};

export const assignRiderToOrder = async (req, res) => {
  try {
    const { orderId, riderId } = req.body;

    const order = await Order.findByIdAndUpdate(
      orderId,
      { rider: riderId },
      { new: true }
    ).populate('rider');

    res.status(200).json({
      success: true,
      message: 'Rider assigned to order',
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to assign rider',
      error: error.message,
    });
  }
};

export const rateOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { score, review } = req.body;

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        rating: {
          score,
          review,
          timestamp: new Date(),
        },
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Order rated successfully',
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to rate order',
      error: error.message,
    });
  }
};

export const requestRefund = async (req, res) => {
  try {
    const { orderId, reason } = req.body;

    const existingOrder = await Order.findById(orderId);
    if (!existingOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const refundAmount = existingOrder.total || 0;

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        refundStatus: 'pending',
        refundAmount,
        refundReason: reason,
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Refund requested',
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to request refund',
      error: error.message,
    });
  }
};
