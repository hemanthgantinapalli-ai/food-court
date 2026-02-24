import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import mongoose from 'mongoose';
import Restaurant from '../models/Restaurant.js';

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const createOrder = async (req, res) => {
  try {
    const { deliveryAddress, paymentMethod } = req.body;

    // Get cart
    const cart = await Cart.findOne({ user: req.userId }).populate('restaurant');

    let orderPayload;
    if (!cart || cart.items.length === 0) {
      const { items, subtotal, tax, deliveryFee, discount, discountCode, total, restaurant } = req.body;
      if (!items || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Cart is empty and no items provided' });
      }

      const normalizedPaymentMethod = paymentMethod === 'cod' ? 'cash' : paymentMethod;

      orderPayload = {
        customer: req.userId,
        restaurant: isValidObjectId(restaurant) ? restaurant : null,
        items: items.map((item) => {
          const mId = item.menuItem || item._id;
          return {
            menuItem: isValidObjectId(mId) ? mId : null,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            addOns: item.addOns || [],
          };
        }),
        deliveryAddress: deliveryAddress || {},
        subtotal: subtotal || 0,
        tax: tax || 0,
        deliveryFee: deliveryFee || 0,
        discount: discount || 0,
        discountCode: discountCode || '',
        total: total || 0,
        paymentMethod: normalizedPaymentMethod,
      };
    } else {
      // Re-fetch cart with populated items for names
      const fullCart = await Cart.findOne({ user: req.userId }).populate('items.menuItem');

      if (!fullCart) {
        return res.status(404).json({ success: false, message: 'Cart not found' });
      }

      orderPayload = {
        customer: req.userId,
        restaurant: fullCart.restaurant?._id || fullCart.restaurant || null,
        items: fullCart.items.map((item) => ({
          menuItem: item.menuItem?._id || item.menuItem,
          name: item.menuItem?.name || 'Unknown Item',
          quantity: item.quantity,
          price: item.price || item.menuItem?.price || 0,
          addOns: item.addOns,
        })),
        deliveryAddress,
        subtotal: fullCart.subtotal,
        tax: fullCart.tax,
        deliveryFee: fullCart.deliveryFee,
        discount: fullCart.discount,
        discountCode: fullCart.discountCode,
        total: fullCart.total,
        paymentMethod,
      };
    }

    const order = await Order.create(orderPayload);

    // For demo, mark as pending for cash payments
    if ((order.paymentMethod || '').toLowerCase() === 'cash') {
      order.paymentStatus = 'pending';
    }

    await order.save();

    // Clear cart (if exists)
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
    console.error('Order Creation Failure:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message,
    });
  }
};


export const getOrderHistory = async (req, res) => {
  try {
    const { type } = req.query;
    let query = { customer: req.userId };

    // If type=delivery and user is rider, show orders assigned to them
    if (type === 'delivery' && req.userRole === 'rider') {
      query = { rider: req.userId };
    } else if (type === 'available' && req.userRole === 'rider') {
      query = { rider: null, orderStatus: { $in: ['placed', 'confirmed', 'preparing', 'ready'] } };
    } else if (req.userRole === 'restaurant') {
      const restaurant = await Restaurant.findOne({ owner: req.userId });
      if (restaurant) {
        query = { restaurant: restaurant._id };
      } else {
        return res.status(200).json({ success: true, count: 0, data: [], message: 'No restaurant linked to this account' });
      }
    } else if (req.userRole === 'admin' && type === 'all') {
      query = {}; // Admins can see everything if they ask for 'all'
    }

    const orders = await Order.find(query)
      .populate('restaurant', 'name image')
      .populate('items.menuItem')
      .populate('rider', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
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

export const acceptOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.rider) {
      return res.status(400).json({ success: false, message: 'Order already assigned to a rider' });
    }

    order.rider = req.userId;
    order.orderStatus = 'confirmed'; // Automatically confirm when rider accepts? Or keep as is.
    // Let's just assign and maybe update status if it was 'placed'
    if (order.orderStatus === 'placed') {
      order.orderStatus = 'confirmed';
    }

    order.statusHistory.push({
      status: order.orderStatus,
      timestamp: new Date(),
      note: 'Rider accepted the order'
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order accepted successfully',
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to accept order',
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
