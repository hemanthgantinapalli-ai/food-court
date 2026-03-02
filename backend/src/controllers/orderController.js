import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import mongoose from 'mongoose';
import Restaurant from '../models/Restaurant.js';
import User from '../models/User.js';
import { getIO } from '../utils/socket.js';

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const createOrder = async (req, res) => {
  try {
    console.log(`📦 [Create Order API] Request from user: ${req.userId}`);
    const { deliveryAddress, paymentMethod } = req.body;
    console.log(`📥 [Create Order API] Payload received (partial):`, { deliveryAddress, paymentMethod });

    // Get cart
    console.log(`🛒 [Create Order API] Fetching cart for user: ${req.userId}...`);
    const cart = await Cart.findOne({ user: req.userId }).populate('restaurant');

    let orderPayload;
    if (!cart || cart.items.length === 0) {
      console.log(`⚠️ [Create Order API] Cart is empty or not found. Checking request body for items...`);
      const { items, subtotal, tax, deliveryFee, discount, discountCode, total, restaurant } = req.body;
      if (!items || items.length === 0) {
        console.log(`❌ [Create Order API] No items found in cart or request body. Aborting.`);
        return res.status(400).json({ success: false, message: 'Cart is empty and no items provided' });
      }

      const normalizedPaymentMethod = paymentMethod === 'cod' ? 'cash' : paymentMethod;
      console.log(`💳 [Create Order API] Payment method normalized to: ${normalizedPaymentMethod}`);

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
      console.log(`🛒 [Create Order API] Cart found with ${cart.items.length} items. Fetching full details...`);
      // Re-fetch cart with populated items for names
      const fullCart = await Cart.findOne({ user: req.userId }).populate('items.menuItem');

      if (!fullCart) {
        console.log(`❌ [Create Order API] Failed to re-fetch full cart.`);
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

    console.log(`✨ [Create Order API] Creating order in database...`);
    const order = await Order.create(orderPayload);

    // For demo, mark as pending for cash payments
    if ((order.paymentMethod || '').toLowerCase() === 'cash') {
      console.log(`💵 [Create Order API] Cash payment detected. Setting status to 'pending'.`);
      order.paymentStatus = 'pending';
    }

    console.log(`💾 [Create Order API] Saving order updates...`);
    await order.save();

    console.log(`🧹 [Create Order API] Clearing user's cart...`);
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

    console.log(`✅ [Create Order API] Order created successfully: ${order._id}`);

    // Notify Admin via Socket.io
    const io = getIO();
    io.to('admins').emit('new_order', {
      orderId: order.orderId,
      customerName: order.customer.name,
      total: order.total
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully. Admin notified.',
      data: order,
    });
  } catch (error) {
    console.error('🔥 [Create Order API] Order Creation Failure:', error);
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
    console.log(`📋 [Get Order History API] Request from user: ${req.userId}, Role: ${req.userRole}, Type: ${type || 'all'}`);
    let query = { customer: req.userId };

    // If type=delivery and user is rider, show orders assigned to them
    if (type === 'delivery' && req.userRole === 'rider') {
      console.log(`🛵 [Get Order History API] Fetching assigned deliveries for rider.`);
      query = { rider: req.userId };
    } else if (type === 'available' && req.userRole === 'rider') {
      console.log(`🛎️ [Get Order History API] Fetching available orders for rider.`);
      // Show orders that are waiting for acceptance, being prepared, or ready, and have no rider
      query = { rider: null, orderStatus: { $in: ['placed', 'confirmed', 'preparing', 'ready'] } };
    } else if (req.userRole === 'restaurant') {
      console.log(`🏪 [Get Order History API] Fetching orders for restaurant owner.`);
      const restaurant = await Restaurant.findOne({ owner: req.userId });
      if (restaurant) {
        query = { restaurant: restaurant._id };
      } else {
        console.log(`⚠️ [Get Order History API] No restaurant found for owner: ${req.userId}`);
        return res.status(200).json({ success: true, count: 0, data: [], message: 'No restaurant linked to this account' });
      }
    } else if (req.userRole === 'admin' && type === 'all') {
      console.log(`👑 [Get Order History API] Admin fetching all orders.`);
      query = {}; // Admins can see everything if they ask for 'all'
    }

    console.log(`🔍 [Get Order History API] Executing query...`);
    const orders = await Order.find(query)
      .populate('restaurant', 'name image location')
      .populate('customer', 'name phone email')
      .populate('items.menuItem')
      .populate('rider', 'name email phone')
      .sort({ createdAt: -1 });

    console.log(`✅ [Get Order History API] Found ${orders.length} orders.`);
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error(`🔥 [Get Order History API] Error fetching history: ${error.message}`);
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
    console.log(`🔍 [Get Order By ID API] Request from user: ${req.userId}, Role: ${req.userRole} for order: ${orderId}`);

    // Try finding by MongoDB _id first, then by human-readable orderId
    let order;
    if (isValidObjectId(orderId)) {
      order = await Order.findById(orderId)
        .populate('customer', 'name email phone')
        .populate('restaurant')
        .populate('rider', 'name email phone')
        .populate('items.menuItem');
    }

    if (!order) {
      order = await Order.findOne({ orderId })
        .populate('customer', 'name email phone')
        .populate('restaurant')
        .populate('rider', 'name email phone')
        .populate('items.menuItem');
    }

    if (!order) {
      console.log(`⚠️ [Get Order By ID API] Order not found: ${orderId}`);
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check authorization
    const isCustomer = order.customer?._id.toString() === req.userId;
    const isAdmin = req.userRole === 'admin';
    const isRider = order.rider?._id.toString() === req.userId;
    const isRestaurantOwner = order.restaurant?.owner?.toString() === req.userId;

    if (!isCustomer && !isAdmin && !isRider && !isRestaurantOwner) {
      console.log(`🚫 [Get Order By ID API] Unauthorized access attempt for order: ${orderId} by user: ${req.userId}`);
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    console.log(`✅ [Get Order By ID API] Successfully fetched order: ${orderId}`);
    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error(`🔥 [Get Order By ID API] Error: ${error.message}`);
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
    console.log(`📝 [Update Order Status API] Updating order ${orderId} to status: ${status}`);

    const order = await Order.findById(orderId);

    if (!order) {
      console.log(`⚠️ [Update Order Status API] Order not found: ${orderId}`);
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    console.log(`🔄 [Update Order Status API] Changing status from ${order.orderStatus} to ${status}`);
    order.orderStatus = status;
    order.statusHistory.push({
      status,
      timestamp: new Date(),
    });

    if (status === 'delivered') {
      console.log(`🏠 [Update Order Status API] Order marked as delivered. Updating actualDeliveryTime.`);
      order.actualDeliveryTime = new Date();
    }

    console.log(`💾 [Update Order Status API] Saving updates...`);
    await order.save();

    console.log(`✅ [Update Order Status API] Order status updated successfully.`);

    // Notify User via Socket.io
    const io = getIO();
    const customerId = order.customer.toString();

    let notificationMessage = '';
    switch (status) {
      case 'preparing': notificationMessage = 'Restaurant is preparing your food.'; break;
      case 'dispatched': notificationMessage = 'Food is ready and waiting for a rider.'; break;
      case 'on_the_way': notificationMessage = 'Your order is on the way!'; break;
      case 'delivered': notificationMessage = 'Order has been delivered. Enjoy your meal!'; break;
    }

    if (notificationMessage) {
      io.to(customerId).emit('order_status_update', {
        orderId: order._id,
        status: order.orderStatus,
        message: notificationMessage
      });
    }

    // Phase 2 Logic: If dispatched, notify all available riders
    if (status === 'dispatched') {
      const availableRiders = await User.find({ role: 'rider', isAvailable: true });
      availableRiders.forEach(rider => {
        io.to(rider._id.toString()).emit('delivery_available', {
          orderId: order._id,
          restaurantName: order.restaurant?.name || 'Local Restaurant',
          deliveryAddress: order.deliveryAddress
        });
      });
    }

    // Phase 4 Logic: If delivered, reset rider availability
    if (status === 'delivered' && order.rider) {
      await User.findByIdAndUpdate(order.rider, { isAvailable: true });
    }

    res.status(200).json({
      success: true,
      message: 'Order status updated',
      data: order,
    });
  } catch (error) {
    console.error(`🔥 [Update Order Status API] Error updating status: ${error.message}`);
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
    console.log(`🤝 [Assign Rider API] Assigning rider ${riderId} to order ${orderId}`);

    const order = await Order.findByIdAndUpdate(
      orderId,
      { rider: riderId },
      { new: true }
    ).populate('rider');

    if (!order) {
      console.log(`⚠️ [Assign Rider API] Order not found: ${orderId}`);
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    console.log(`✅ [Assign Rider API] Rider successfully assigned.`);
    res.status(200).json({
      success: true,
      message: 'Rider assigned to order',
      data: order,
    });
  } catch (error) {
    console.error(`🔥 [Assign Rider API] Error assigning rider: ${error.message}`);
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
    console.log(`🛵 [Accept Order API] Rider ${req.userId} accepting order ${orderId}`);

    const order = await Order.findById(orderId);

    if (!order) {
      console.log(`⚠️ [Accept Order API] Order not found: ${orderId}`);
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.rider) {
      console.log(`🚫 [Accept Order API] Order ${orderId} is already assigned to rider: ${order.rider}`);
      return res.status(400).json({ success: false, message: 'Order already assigned to a rider' });
    }

    console.log(`🔄 [Accept Order API] Assigning order to rider...`);
    order.rider = req.userId;
    order.orderStatus = 'confirmed'; // Automatically confirm when rider accepts? Or keep as is.
    // Let's just assign and maybe update status if it was 'placed'
    if (order.orderStatus === 'placed') {
      console.log(`🏷️ [Accept Order API] Changing status from 'placed' to 'confirmed'`);
      order.orderStatus = 'confirmed';
    }

    order.statusHistory.push({
      status: order.orderStatus,
      timestamp: new Date(),
      note: 'Rider accepted the order'
    });

    console.log(`💾 [Accept Order API] Saving order updates...`);
    await order.save();

    console.log(`✅ [Accept Order API] Order accepted successfully.`);

    // Phase 3 Logic: Update rider availability
    await User.findByIdAndUpdate(req.userId, { isAvailable: false });

    // Notify User & Admin
    const io = getIO();
    io.to(order.customer.toString()).emit('order_status_update', {
      orderId: order._id,
      status: 'on_the_way',
      message: 'A rider has accepted your order and is on the way!'
    });
    io.to('admins').emit('order_claimed', {
      orderId: order._id,
      riderId: req.userId
    });

    res.status(200).json({
      success: true,
      message: 'Order accepted successfully. You are now on the way!',
      data: order,
    });
  } catch (error) {
    console.error(`🔥 [Accept Order API] Error accepting order: ${error.message}`);
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
    console.log(`⭐ [Rate Order API] Rating order ${orderId} with score: ${score}`);

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

    if (!order) {
      console.log(`⚠️ [Rate Order API] Order not found: ${orderId}`);
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    console.log(`✅ [Rate Order API] Order rated successfully.`);
    res.status(200).json({
      success: true,
      message: 'Order rated successfully',
      data: order,
    });
  } catch (error) {
    console.error(`🔥 [Rate Order API] Error rating order: ${error.message}`);
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
    console.log(`💸 [Request Refund API] Requesting refund for order ${orderId}. Reason: ${reason}`);

    const existingOrder = await Order.findById(orderId);
    if (!existingOrder) {
      console.log(`⚠️ [Request Refund API] Order not found: ${orderId}`);
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const refundAmount = existingOrder.total || 0;
    console.log(`🧮 [Request Refund API] Refund amount calculated: ${refundAmount}`);

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        refundStatus: 'pending',
        refundAmount,
        refundReason: reason,
      },
      { new: true }
    );

    console.log(`✅ [Request Refund API] Refund requested successfully.`);
    res.status(200).json({
      success: true,
      message: 'Refund requested',
      data: order,
    });
  } catch (error) {
    console.error(`🔥 [Request Refund API] Error requesting refund: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to request refund',
      error: error.message,
    });
  }
};
