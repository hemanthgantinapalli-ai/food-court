import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import mongoose from 'mongoose';
import Restaurant from '../models/Restaurant.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Transaction from '../models/Transaction.js';
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

    // Ensure restaurant is set. If missing at top level, try inferring from items.
    if (!orderPayload.restaurant && orderPayload.items?.length > 0) {
      console.log(`🔎 [Create Order API] Restaurant missing from payload. Inferring from first item...`);
      const ItemModel = mongoose.model('MenuItem');
      const firstItem = await ItemModel.findById(orderPayload.items[0].menuItem);
      if (firstItem && firstItem.restaurant) {
        orderPayload.restaurant = firstItem.restaurant;
      }
    }

    if (!orderPayload.restaurant) {
      console.log(`❌ [Create Order API] Order creation aborted: No restaurant linked.`);
      return res.status(400).json({ success: false, message: 'Restaurant ID is required' });
    }

    // Check if restaurant is open
    const targetRestaurant = await Restaurant.findById(orderPayload.restaurant);
    if (!targetRestaurant) {
      console.log(`❌ [Create Order API] Restaurant ${orderPayload.restaurant} not found in DB.`);
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    console.log(`🕒 [Create Order API] Checking status for ${targetRestaurant.name}. isOpen: ${targetRestaurant.isOpen}`);

    if (!targetRestaurant.isOpen) {
      console.log(`⚠️ [Create Order API] Restaurant is manually closed.`);
      return res.status(400).json({ success: false, message: `"${targetRestaurant.name}" is currently not accepting orders. Please try another restaurant.` });
    }

    // Real-time Opening Hours check (Timezone aware: IST)
    const now = new Date();
    const istTime = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const istDate = new Date(istTime);
    const currentTime = `${String(istDate.getHours()).padStart(2, '0')}:${String(istDate.getMinutes()).padStart(2, '0')}`;

    const { open, close } = targetRestaurant.openingHours || { open: '00:00', close: '23:59' };

    console.log(`⏰ [Create Order API] Time Check - IST Now: ${currentTime}, Range: ${open} - ${close}`);

    if (currentTime < open || currentTime > close) {
      console.log(`⚠️ [Create Order API] Outside operating hours.`);
      return res.status(400).json({ success: false, message: `"${targetRestaurant.name}" is currently closed. Operating hours: ${open} to ${close}` });
    }


    console.log(`✨ [Create Order API] Creating order in database...`);
    const order = await Order.create(orderPayload);

    // For demo, mark as pending for cash payments
    if ((order.paymentMethod || '').toLowerCase() === 'cash') {
      console.log(`💵 [Create Order API] Cash payment detected. Setting status to 'pending'.`);
      order.paymentStatus = 'pending';
    } else if ((order.paymentMethod || '').toLowerCase() === 'wallet') {
      console.log(`💳 [Create Order API] Wallet payment detected. Processing debit...`);
      const user = await User.findById(req.userId);
      // Safely initialise wallet if it doesn't exist yet
      user.wallet = user.wallet || { balance: 0 };
      const walletBalance = user.wallet.balance || 0;
      if (walletBalance < order.total) {
        // Rollback order creation if balance insufficient
        await Order.findByIdAndDelete(order._id);
        return res.status(400).json({ success: false, message: `Insufficient wallet balance. Your balance is ₹${walletBalance}, but the order total is ₹${order.total}.` });
      }

      user.wallet.balance -= order.total;
      await user.save();

      order.paymentStatus = 'paid';

      // Create transaction record
      await Transaction.create({
        user: req.userId,
        amount: order.total,
        type: 'debit',
        paymentMethod: 'wallet',
        status: 'success',
        description: `Paid for Order #${order.orderId || order._id.toString().slice(-6)}`,
        order: order._id,
        transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      });
      console.log(`✅ [Create Order API] Wallet debited successfully.`);
    }

    console.log(`💾 [Create Order API] Saving order updates...`);
    // Define shares based on restaurant-specific commission
    const commissionRate = (targetRestaurant.commissionPercentage || 10) / 100;
    const PARTNER_SHARE = 1 - commissionRate;
    const PLATFORM_SHARE = commissionRate;

    // Calculate and store real-time shares
    order.partnerEarnings = Math.round(order.total * PARTNER_SHARE);
    order.platformFee = Math.round(order.total * PLATFORM_SHARE);

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

    // Notify Riders & Admin via Socket.io
    const io = getIO();
    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'name phone')
      .populate('restaurant', 'name location owner');

    const orderPayloadForRider = {
      _id: populatedOrder._id,
      orderId: populatedOrder.orderId,
      customerName: populatedOrder.customer?.name,
      restaurantName: populatedOrder.restaurant?.name,
      restaurantAddress: populatedOrder.restaurant?.location?.address,
      deliveryAddress: populatedOrder.deliveryAddress,
      total: populatedOrder.total,
      deliveryFee: populatedOrder.deliveryFee,
      orderStatus: populatedOrder.orderStatus,
      items: populatedOrder.items,
    };

    // Create Notification for Customer
    await Notification.create({
      user: req.userId,
      title: 'Order Placed!',
      message: `Your order #${order.orderId || order._id.toString().slice(-6)} has been placed successfully.`,
      orderId: order._id,
      type: 'info'
    });

    // Create Notification for Restaurant Owner
    if (populatedOrder.restaurant && populatedOrder.restaurant.owner) {
      await Notification.create({
        user: populatedOrder.restaurant.owner,
        title: 'New Order Received! 🔔',
        message: `New order #${order.orderId || order._id.toString().slice(-6)} from ${populatedOrder.customer?.name || 'Customer'}.`,
        orderId: order._id,
        type: 'info'
      });
    }

    // Notify the specific restaurant owner that there is a new order
    if (populatedOrder.restaurant && populatedOrder.restaurant.owner) {
      io.to(populatedOrder.restaurant.owner.toString()).emit('new_restaurant_order', orderPayloadForRider);
    }
    // Also inform admin immediately
    io.to('admins').emit('new_order', orderPayloadForRider);

    // Emit to customer for real-time update
    io.to(req.userId).emit('order_status_update', {
      orderId: order._id,
      status: 'placed',
      message: 'Your order has been placed successfully! 🍕'
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully. Waiting for restaurant approval.',
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
      // Riders see orders that the restaurant has confirmed but no rider has accepted yet
      query = { rider: null, orderStatus: { $in: ['confirmed', 'preparing', 'ready'] } };
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

    // Authorization checks
    if (req.userRole === 'restaurant') {
      // Safely extract the restaurant ID — it may be a raw ObjectId OR a populated object
      const orderRestaurantId = (order.restaurant?._id || order.restaurant)?.toString();
      // A partner can own multiple restaurants — find ALL of them
      const partnerRestaurants = await Restaurant.find({ owner: req.userId }).select('_id');
      const partnerRestaurantIds = partnerRestaurants.map(r => r._id.toString());
      console.log(`🔑 [Update Order Status] Partner ${req.userId} owns: [${partnerRestaurantIds.join(', ')}]`);
      console.log(`🔑 [Update Order Status] Order restaurant: ${orderRestaurantId}`);
      if (!orderRestaurantId || !partnerRestaurantIds.includes(orderRestaurantId)) {
        console.log(`⛔ [Update Order Status] Access denied — order restaurant not owned by this partner`);
        return res.status(403).json({ success: false, message: 'Forbidden: You can only update orders for your restaurant' });
      }
    }

    if (req.userRole === 'rider') {
      // Riders can only update orders that are assigned to them
      if (!order.rider || order.rider.toString() !== req.userId) {
        return res.status(403).json({ success: false, message: 'Forbidden: You can only update orders assigned to you' });
      }
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

      // Wallet Earnings for Partner and Rider
      const restaurant = await Restaurant.findById(order.restaurant).populate('owner');
      const commissionRate = (restaurant.commissionPercentage || 10) / 100;
      const commissionAmount = order.total * commissionRate;
      const partnerEarnings = order.total - commissionAmount - (order.deliveryFee || 0);

      // 1. Credit Restaurant Partner Wallet
      if (restaurant && restaurant.owner) {
        const owner = restaurant.owner;
        owner.wallet = owner.wallet || { balance: 0 };
        owner.wallet.balance += partnerEarnings;
        await owner.save();

        await Transaction.create({
          user: owner._id,
          amount: partnerEarnings,
          type: 'credit',
          paymentMethod: 'system',
          status: 'success',
          description: `Earnings for Order #${order.orderId || order._id.toString().slice(-6)}`,
          order: order._id,
          transactionId: `EARN-P-${Date.now()}`
        });
      }

      // 2. Credit Rider Wallet
      if (order.rider) {
        const rider = await User.findById(order.rider);
        if (rider) {
          const riderEarnings = (order.deliveryFee || 40); // Delivery fee or default 40
          rider.wallet = rider.wallet || { balance: 0 };
          rider.wallet.balance += riderEarnings;
          await rider.save();

          await Transaction.create({
            user: rider._id,
            amount: riderEarnings,
            type: 'credit',
            paymentMethod: 'system',
            status: 'success',
            description: `Delivery fee for Order #${order.orderId || order._id.toString().slice(-6)}`,
            order: order._id,
            transactionId: `EARN-R-${Date.now()}`
          });
        }
      }
    }

    console.log(`💾 [Update Order Status API] Saving updates...`);
    // validateBeforeSave:false allows updating orphaned orders (e.g. missing restaurant field)
    await order.save({ validateBeforeSave: false });

    console.log(`✅ [Update Order Status API] Order status updated successfully.`);

    // Notify Customer + Admin via Socket.io
    const io = getIO();

    if (status === 'confirmed') {
      const fullOrderForAdmin = await Order.findById(order._id)
        .populate('customer', 'name phone')
        .populate('restaurant', 'name location');

      const orderPayloadForAdmin = {
        _id: fullOrderForAdmin._id,
        orderId: fullOrderForAdmin.orderId,
        customerName: fullOrderForAdmin.customer?.name,
        restaurantName: fullOrderForAdmin.restaurant?.name,
        restaurantAddress: fullOrderForAdmin.restaurant?.location?.address,
        deliveryAddress: fullOrderForAdmin.deliveryAddress,
        total: fullOrderForAdmin.total,
        deliveryFee: fullOrderForAdmin.deliveryFee,
        orderStatus: fullOrderForAdmin.orderStatus,
        items: fullOrderForAdmin.items,
      };

      // Notify admin that restaurant has confirmed and they should assign a rider
      io.to('admins').emit('order_needs_rider', orderPayloadForAdmin);
    }

    const customerId = order.customer?.toString();

    const statusMessages = {
      confirmed: 'Your order has been confirmed!',
      preparing: 'The restaurant is preparing your food. 🍳',
      ready: 'Food is ready and a rider is being assigned. 🏍️',
      picked_up: 'Rider has picked up your food from the restaurant! 🛵',
      on_the_way: 'Your order is on the way! 🚗',
      delivered: 'Order delivered! Enjoy your meal! 🎉',
      cancelled: 'Your order has been cancelled.',
    };

    const notificationMessage = statusMessages[status] || '';
    const statusPayload = {
      orderId: order._id,
      status: order.orderStatus,
      message: notificationMessage,
    };

    if (notificationMessage && customerId) {
      // Create persistent notification for Customer
      await Notification.create({
        user: customerId,
        title: 'Order Update',
        message: notificationMessage,
        orderId: order._id,
        type: status === 'delivered' ? 'success' : 'info'
      });
      io.to(customerId).emit('order_status_update', statusPayload);
    }

    // Notify Restaurant Owner about the status change (if not updated by them)
    if (req.userRole !== 'restaurant') {
      const restaurant = await Restaurant.findById(order.restaurant);
      if (restaurant && restaurant.owner) {
        await Notification.create({
          user: restaurant.owner,
          title: 'Order Status Update',
          message: `Order #${order.orderId || order._id.toString().slice(-6)} status changed to ${status.replace('_', ' ')}`,
          orderId: order._id,
          type: 'info'
        });
        io.to(restaurant.owner.toString()).emit('order_status_update', statusPayload);
      }
    }

    // Notify Rider about status change (if not updated by them)
    if (order.rider && req.userRole !== 'rider') {
      await Notification.create({
        user: order.rider,
        title: 'Order Update',
        message: `Order #${order.orderId || order._id.toString().slice(-6)} status: ${status.replace('_', ' ')}`,
        orderId: order._id,
        type: 'info'
      });
      io.to(order.rider.toString()).emit('order_status_update', statusPayload);
    }

    // Always keep admin in sync
    io.to('admins').emit('order_status_update', { ...statusPayload, forAdmin: true });

    // If delivered, reset rider availability
    if (status === 'delivered' && order.rider) {
      await User.findByIdAndUpdate(order.rider, { isAvailable: true });
      console.log(`🏁 [Update Order Status API] Rider availability reset after delivery.`);
    }

    res.status(200).json({
      success: true,
      message: 'Order status updated',
      data: order,
    });
  } catch (error) {
    console.error(`🔥 [Update Order Status API] Error: ${error.message}`, error.stack?.split('\n')[1]);
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

    // Populate details for notification
    const fullOrder = await Order.findById(order._id)
      .populate('customer', 'name phone')
      .populate('restaurant', 'name location')
      .populate('rider', 'name phone');

    const io = getIO();
    // Notify the specific rider
    // Redundant emit removed, moved below after notification creation

    // Notify customer
    const customerId = fullOrder.customer?._id.toString();
    const assignmentMessage = `🛵 Rider ${fullOrder.rider?.name || 'has been'} assigned to your order!`;

    if (customerId) {
      await Notification.create({
        user: customerId,
        title: 'Rider Assigned',
        message: assignmentMessage,
        orderId: fullOrder._id,
        type: 'info'
      });
      io.to(customerId).emit('order_status_update', {
        orderId: fullOrder._id,
        status: fullOrder.orderStatus,
        message: assignmentMessage,
        rider: { name: fullOrder.rider?.name, phone: fullOrder.rider?.phone },
      });
    }

    // Notify Rider
    await Notification.create({
      user: riderId,
      title: 'New Delivery Assigned! 🛵',
      message: `You have been assigned to order #${fullOrder.orderId || fullOrder._id.toString().slice(-6)}`,
      orderId: fullOrder._id,
      type: 'success'
    });
    io.to(riderId).emit('order_assigned', fullOrder);

    // Notify admins
    io.to('admins').emit('order_assigned', {
      orderId: fullOrder._id,
      riderName: fullOrder.rider?.name,
    });

    console.log(`✅ [Assign Rider API] Rider and Customer notified of assignment.`);
    res.status(200).json({
      success: true,
      message: 'Rider assigned to order',
      data: fullOrder,
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

    order.statusHistory.push({
      status: order.orderStatus,
      timestamp: new Date(),
      note: 'Rider accepted the order and is on the way to restaurant'
    });

    console.log(`💾 [Accept Order API] Saving order updates...`);
    await order.save();

    // Populate rider info for notifications
    const riderInfo = await User.findById(req.userId).select('name phone email');

    console.log(`✅ [Accept Order API] Order accepted successfully.`);

    // Mark rider as busy
    await User.findByIdAndUpdate(req.userId, { isAvailable: false });

    // Notify Customer, Admin, and other riders
    const io = getIO();

    // Tell customer their rider has been assigned
    const customerId = order.customer.toString();
    const acceptMessage = `🛵 Rider ${riderInfo?.name || 'has been'} assigned to your order!`;

    // Notification for Rider
    await Notification.create({
      user: req.userId,
      title: 'Order Accepted! 🛵',
      message: `You have successfully accepted order #${order.orderId || order._id.toString().slice(-6)}`,
      orderId: order._id,
      type: 'success'
    });

    await Notification.create({
      user: customerId,
      title: 'Rider Assigned',
      message: acceptMessage,
      orderId: order._id,
      type: 'info'
    });

    io.to(customerId).emit('order_status_update', {
      orderId: order._id,
      status: order.orderStatus,
      message: acceptMessage,
      rider: { name: riderInfo?.name, phone: riderInfo?.phone },
    });

    // Tell admin which rider claimed it + full order info
    io.to('admins').emit('order_claimed', {
      orderId: order._id,
      orderStatus: order.orderStatus,
      rider: { _id: req.userId, name: riderInfo?.name, phone: riderInfo?.phone, email: riderInfo?.email },
    });

    // Remove this order from other riders' available list
    io.to('riders').emit('order_taken', { orderId: order._id });

    res.status(200).json({
      success: true,
      message: 'Order accepted! Please head to the restaurant.',
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

    if (order.restaurant) {
      const restaurant = await Restaurant.findById(order.restaurant);
      if (restaurant) {
        const newReviewCount = (restaurant.reviewCount || 0) + 1;
        const currentTotalScore = (restaurant.rating || 4) * (restaurant.reviewCount || 0);
        const newRating = (currentTotalScore + score) / newReviewCount;

        restaurant.reviewCount = newReviewCount;
        restaurant.rating = parseFloat(newRating.toFixed(1));
        await restaurant.save();
        console.log(`⭐ [Rate Order API] Restaurant ${restaurant._id} rating updated to ${restaurant.rating}`);
      }
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

export const exportOrderAnalytics = async (req, res) => {
  try {
    console.log(`📊 [Analytics] Admin requested order CSV export.`);

    // Fetch all orders with relevant data
    const orders = await Order.find({})
      .populate('customer', 'name email')
      .populate('restaurant', 'name')
      .populate('rider', 'name')
      .sort({ createdAt: -1 });

    // Define CSV Headers
    const headers = [
      'Order ID',
      'Date',
      'Time',
      'Customer Name',
      'Restaurant',
      'Rider',
      'Status',
      'Payment Method',
      'Total Value (INR)',
      'Subtotal (INR)',
      'Delivery Fee (INR)',
      'Discount (INR)',
      'Partner Earnings (INR)',
      'Platform Fee (INR)'
    ];

    // Map orders to CSV rows
    const rows = orders.map(order => [
      order.orderId || order._id.toString().slice(-8),
      new Date(order.createdAt).toLocaleDateString(),
      new Date(order.createdAt).toLocaleTimeString(),
      `"${order.customer?.name || 'Unknown'}"`,
      `"${order.restaurant?.name || 'Unknown'}"`,
      `"${order.rider?.name || 'Unassigned'}"`,
      order.orderStatus,
      order.paymentMethod,
      order.total || 0,
      order.subtotal || 0,
      order.deliveryFee || 0,
      order.discount || 0,
      order.partnerEarnings || 0,
      order.platformFee || 0
    ]);

    // Build the CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Send File Response
    const filename = `foodcourt_orders_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);

    console.log(`✅ [Analytics] CSV File sent successfully.`);
  } catch (error) {
    console.error(`🔥 [Analytics] Export failed:`, error);
    res.status(500).json({ success: false, message: 'Failed to export analytics' });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log(`🚫 [Cancel Order API] Request to cancel order: ${orderId} by user: ${req.userId}`);

    const order = await Order.findById(orderId);
    if (!order) {
      console.log(`⚠️ [Cancel Order API] Order not found: ${orderId}`);
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Verify authorization
    const isCustomer = order.customer?._id.toString() === req.userId;
    const isAdmin = req.userRole === 'admin';

    if (!isCustomer && !isAdmin) {
      console.log(`🚫 [Cancel Order API] Unauthorized attempt to cancel order ${orderId} by user ${req.userId}`);
      return res.status(403).json({ success: false, message: 'Unauthorized to cancel this order' });
    }

    if (order.orderStatus !== 'placed') {
      console.log(`🚫 [Cancel Order API] Order ${orderId} is not in 'placed' status (current: ${order.orderStatus}). Cannot cancel.`);
      return res.status(400).json({ success: false, message: 'Only newly placed orders can be cancelled' });
    }

    order.orderStatus = 'cancelled';
    order.statusHistory.push({
      status: 'cancelled',
      timestamp: new Date(),
      note: 'Cancelled by customer'
    });

    console.log(`💾 [Cancel Order API] Saving cancelled order...`);
    await order.save();

    // If paid by wallet, we need to refund
    if (order.paymentStatus === 'paid' && order.paymentMethod.toLowerCase() === 'wallet') {
      console.log(`💸 [Cancel Order API] Refunding wallet for cancelled order...`);
      const user = await User.findById(order.customer);
      if (user) {
        user.wallet = user.wallet || { balance: 0 };
        user.wallet.balance += order.total;
        await user.save();

        await Transaction.create({
          user: user._id,
          amount: order.total,
          type: 'credit',
          paymentMethod: 'system',
          status: 'success',
          description: `Refund for Cancelled Order #${order.orderId || order._id.toString().slice(-6)}`,
          order: order._id,
          transactionId: `REF-${Date.now()}`
        });
        console.log(`✅ [Cancel Order API] Wallet refunded successfully.`);
      }
    }

    // Notifications
    const io = getIO();
    const customerParams = order.customer.toString();

    const cancelMessage = 'Your order has been successfully cancelled.';

    await Notification.create({
      user: customerParams,
      title: 'Order Cancelled',
      message: cancelMessage,
      orderId: order._id,
      type: 'info'
    });

    io.to(customerParams).emit('order_status_update', {
      orderId: order._id,
      status: 'cancelled',
      message: cancelMessage,
    });

    if (order.restaurant) {
      const restaurant = await Restaurant.findById(order.restaurant);
      if (restaurant && restaurant.owner) {
        await Notification.create({
          user: restaurant.owner,
          title: 'Order Cancelled',
          message: `Order #${order.orderId || order._id.toString().slice(-6)} was cancelled by the customer.`,
          orderId: order._id,
          type: 'info'
        });
        io.to(restaurant.owner.toString()).emit('order_status_update', {
          orderId: order._id,
          status: 'cancelled',
          message: `Customer cancelled order #${order.orderId || order._id.toString().slice(-6)}`
        });
      }
    }

    io.to('admins').emit('order_status_update', {
      orderId: order._id,
      status: 'cancelled',
      message: 'Customer cancelled the order',
      forAdmin: true
    });

    res.status(200).json({ success: true, message: 'Order successfully cancelled', data: order });

  } catch (error) {
    console.error(`🔥 [Cancel Order API] Error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to cancel order', error: error.message });
  }
};
