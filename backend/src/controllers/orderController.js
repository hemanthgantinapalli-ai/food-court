import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import mongoose from 'mongoose';
import Restaurant from '../models/Restaurant.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Transaction from '../models/Transaction.js';
import Settings from '../models/Settings.js';
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
      const bodyData = req.body;
      const { items, subtotal, tax, deliveryFee: bodyDeliveryFee, discount, discountCode, total, restaurant } = bodyData;
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
        deliveryFee: bodyDeliveryFee || 0,
        discount: discount || 0,
        discountCode: discountCode || '',
        total: total || 0,
        paymentMethod: normalizedPaymentMethod,
      };
    } else {
      console.log(`🛒 [Create Order API] Cart found with ${cart.items.length} items. Merging with checkout data...`);
      // Re-fetch cart with populated items for names
      const fullCart = await Cart.findOne({ user: req.userId }).populate('items.menuItem');

      if (!fullCart) {
        console.log(`❌ [Create Order API] Failed to re-fetch full cart.`);
        return res.status(404).json({ success: false, message: 'Cart not found' });
      }

      // PRIORITIZE Body values for dynamic fields (fee, total, address) determined at checkout
      const body = req.body;
      orderPayload = {
        customer: req.userId,
        restaurant: fullCart.restaurant?._id || fullCart.restaurant || body.restaurant || null,
        items: fullCart.items.map((item) => ({
          menuItem: item.menuItem?._id || item.menuItem,
          name: item.menuItem?.name || 'Unknown Item',
          quantity: item.quantity,
          price: item.price || item.menuItem?.price || 0,
          addOns: item.addOns,
        })),
        deliveryAddress: body.deliveryAddress || {},
        subtotal: body.subtotal || fullCart.subtotal,
        tax: body.tax || fullCart.tax,
        deliveryFee: body.deliveryFee !== undefined ? body.deliveryFee : fullCart.deliveryFee,
        discount: body.discount || fullCart.discount,
        discountCode: body.discountCode || fullCart.discountCode,
        total: body.total || fullCart.total,
        paymentMethod: body.paymentMethod || paymentMethod,
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
    const istOptions = {
      timeZone: "Asia/Kolkata",
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    };
    const currentTime = new Intl.DateTimeFormat('en-GB', istOptions).format(now);

    const { open, close } = targetRestaurant.openingHours || { open: '00:00', close: '23:59' };

    console.log(`⏰ [Create Order API] Time Check - IST Now: ${currentTime}, Range: ${open} - ${close}`);

    if (currentTime < open || currentTime > close) {
      console.log(`⚠️ [Create Order API] Outside operating hours.`);
      return res.status(400).json({ success: false, message: `"${targetRestaurant.name}" is currently closed. Operating hours: ${open} to ${close}` });
    }

    // --- Wallet Deduction (Atomic-ish) ---
    const isWallet = (paymentMethod || '').toLowerCase() === 'wallet';
    let user = null;
    let deductionSucceeded = false;

    if (isWallet) {
      console.log(`💳 [Create Order API] Wallet payment detected. Processing debit...`);
      user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ success: false, message: "User not found for wallet debit" });

      const walletBalance = user.wallet?.balance || 0;
      const orderTotal = Number(orderPayload.total);

      if (walletBalance < orderTotal) {
        console.error(`❌ [Create Order API] Insufficient balance: ${walletBalance} < ${orderTotal}`);
        return res.status(400).json({ success: false, message: `Insufficient wallet balance. Your balance is ₹${walletBalance}, but the order total is ₹${orderTotal}.` });
      }

      try {
        user.wallet.balance -= orderTotal;
        await user.save();
        deductionSucceeded = true;
        console.log(`✅ [Create Order API] Wallet debited successfully. New balance: ${user.wallet.balance}`);
      } catch (debitError) {
        console.error(`🔥 [Create Order API] Wallet debit failed:`, debitError.message);
        return res.status(500).json({ success: false, message: "Failed to process wallet deduction." });
      }
    }

    // --- Prepare Full Order Payload ---
    // Fetch platform settings for dynamic calculation
    const globalSettings = await Settings.findOne({ key: 'global_config' }) || { 
      baseDeliveryFee: 30, 
      perKmCharge: 10,
      platformCommission: 20,
      taxRate: 5
    };

    // Calculate commission rate: Use restaurant specific if available, otherwise global platform setting
    const commissionRate = (targetRestaurant.commissionPercentage || globalSettings.platformCommission || 20) / 100;

    const finalOrderTotal = Number(orderPayload.total) || 0;
    // Logistics & Earnings Split (Swiggy/Zomato Professional Style)
    const dist = Number(orderPayload.distance) || 0;
    
    // Use settings for calculation
    const baseFee = globalSettings.baseDeliveryFee || 30;
    const kmCharge = globalSettings.perKmCharge || 10;
    const calculatedDeliveryFee = dist <= 3 ? baseFee : Math.round(baseFee + (dist - 3) * kmCharge);
    
    // Final fee used is what came from frontend, but we use our calculation for internal sanity or if missing
    const finalDeliveryFee = Number(orderPayload.deliveryFee) || calculatedDeliveryFee;
    
    // Total order subtotal (food only)
    const orderSubtotal = Number(orderPayload.subtotal) || (finalOrderTotal - finalDeliveryFee);

    // Rider Earnings: Rider gets 100% of the delivery fee (Standard Swiggy model for small distances)
    const riderEarnings = finalDeliveryFee;
    const platformCommissionFromDelivery = 0; // Everything goes to rider for logistics

    // Platform Fee (Restaurant Commission - e.g. 10%)
    const platformFeeFromFood = Math.round(orderSubtotal * (isNaN(commissionRate) ? 0.1 : commissionRate));
    const partnerEarnings = orderSubtotal - platformFeeFromFood;

    // Add additional fields to payload before creation
    const finalOrderPayload = {
      ...orderPayload,
      customer: req.userId,
      deliveryFee: finalDeliveryFee, // Use strictly validated/calculated fee
      paymentStatus: isWallet ? 'completed' : (orderPayload.paymentMethod === 'cash' ? 'pending' : 'pending'),
      partnerEarnings: partnerEarnings,
      platformFee: platformFeeFromFood, 
      riderEarnings: riderEarnings,
      platformCommission: platformCommissionFromDelivery,
      // ✨ Fix: Explicitly save coordinates into the order document for route calculation
      userLocation: {
        lat: Number(orderPayload.deliveryAddress?.latitude) || 0,
        lng: Number(orderPayload.deliveryAddress?.longitude) || 0,
        address: orderPayload.deliveryAddress?.street || 'Customer Location'
      },
      restaurantLocation: {
        lat: Number(targetRestaurant.location?.latitude) || 0,
        lng: Number(targetRestaurant.location?.longitude) || 0,
        address: targetRestaurant.location?.address || 'Restaurant Location'
      },
      distance: dist || 0 // Sync the calculated distance into the record
    };

    console.log(`✨ [Create Order API] Creating order in database...`);
    let order;
    try {
      order = await Order.create(finalOrderPayload);
      console.log(`✅ [Create Order API] Order created successfully: ${order._id}`);
    } catch (createError) {
      console.error(`🔥 [Create Order API] Order creation failed:`, createError.message);

      // Rollback wallet if it was deducted
      if (deductionSucceeded && user) {
        try {
          user.wallet.balance += orderTotal;
          await user.save();
          console.log(`♻️ [Create Order API] Wallet refunded due to creation failure.`);
        } catch (refundError) {
          console.error(`🚨 [CRITICAL] Wallet refund failed! User charged but no order created.`, refundError.message);
        }
      }

      return res.status(500).json({
        success: false,
        message: "Failed to create order record.",
        error: createError.message,
        details: createError.errors ? Object.keys(createError.errors).map(k => createError.errors[k].message).join(', ') : createError.message
      });
    }

    // --- Post-Order tasks (Non-blocking / Background) ---
    (async () => {
      try {
        console.log(`🧹 [Create Order API] Background tasks starting for order: ${order._id}`);

        // 1. Transaction Record for Wallet
        if (isWallet) {
          try {
            await Transaction.create({
              user: req.userId,
              amount: orderTotal,
              type: 'debit',
              paymentMethod: 'wallet',
              status: 'success',
              description: `Paid for Order #${order.orderId || order._id.toString().slice(-6)}`,
              order: order._id,
              transactionId: `TXN-W-${Date.now()}-${Math.floor(Math.random() * 10000)}`
            });
            console.log(`[Background] Transaction record created`);
          } catch (tError) {
            console.error(`[Background] Transaction creation failed:`, tError.message);
          }
        }

        // 2. Clear Cart
        await Cart.findOneAndUpdate({ user: req.userId }, { items: [], subtotal: 0, tax: 0, deliveryFee: 0, discount: 0, total: 0 });
        console.log(`[Background] Cart cleared`);

        // 3. Notifications & Sockets
        const io = getIO();
        const populatedOrder = await Order.findById(order._id)
          .populate('customer', 'name phone')
          .populate('restaurant', 'name location owner');

        if (populatedOrder) {
          const orderIdShort = order.orderId || order._id.toString().slice(-6);

          await Notification.create({
            user: req.userId,
            title: 'Order Placed!',
            message: `Your order #${orderIdShort} has been placed successfully.`,
            orderId: order._id,
            type: 'info'
          });

          if (populatedOrder.restaurant?.owner) {
            await Notification.create({
              user: populatedOrder.restaurant.owner,
              title: 'New Order Received! 🔔',
              message: `New order #${orderIdShort} from ${populatedOrder.customer?.name || 'Customer'}.`,
              orderId: order._id,
              type: 'info'
            });

            const socketPayload = {
              _id: populatedOrder._id,
              orderId: populatedOrder.orderId,
              customerName: populatedOrder.customer?.name,
              restaurantName: populatedOrder.restaurant?.name,
              total: populatedOrder.total,
              orderStatus: populatedOrder.orderStatus,
            };
            io.to(populatedOrder.restaurant.owner.toString()).emit('new_restaurant_order', socketPayload);
          }

          io.to('admins').emit('new_order', populatedOrder);
          io.to(req.userId).emit('order_status_update', {
            orderId: order._id,
            status: 'placed',
            message: 'Your order has been placed successfully! 🍕'
          });
        }
        console.log(`✅ [Background] All tasks finished for order: ${order._id}`);
      } catch (bgError) {
        console.error(`⚠️ [Background Tasks Error]:`, bgError.message);
      }
    })();

    // --- Final Response ---
    return res.status(201).json({
      success: true,
      message: 'Order created successfully. Waiting for restaurant approval.',
      data: order,
    });
  } catch (error) {
    console.error('🔥 [Create Order API] Critical Unhandled Failure:', error);
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
    
    // Attach current rider location if order is active
    if (order.rider && ['picked_up', 'on_the_way'].includes(order.orderStatus)) {
      const Rider = mongoose.model('Rider');
      const riderProfile = await Rider.findOne({ user: order.rider._id });
      if (riderProfile && riderProfile.currentLocation) {
        // Convert to structure expected by frontend
        const plainOrder = order.toObject();
        plainOrder.rider.currentLocation = riderProfile.currentLocation;
        return res.status(200).json({
          success: true,
          data: plainOrder,
        });
      }
    }

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
    const io = getIO();
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

    const previousStatus = order.orderStatus;
    console.log(`🔄 [Update Order Status API] Changing status from ${previousStatus} to ${status}`);

    // Update the basic order status info first
    order.orderStatus = status;
    order.statusHistory.push({
      status,
      timestamp: new Date(),
    });

    // Only process financial earnings if the order is newly 'delivered'
    if (status === 'delivered' && previousStatus !== 'delivered') {
      console.log(`🏠 [Update Order Status API] Order marked as delivered. Updating actualDeliveryTime.`);
      order.actualDeliveryTime = new Date();

      // --- Revenue Distribution Hub ---
      // 1. Fetch restaurant with specific commission percentage
      const restaurant = await Restaurant.findById(order.restaurant).populate('owner');
      const commissionRate = (restaurant?.commissionPercentage ?? 10) / 100;

      // Calculate split amounts
      // Note: Commission is traditionally on the food subtotal, not the delivery fee
      const subtotal = order.subtotal || (order.total - (order.deliveryFee || 0));
      const commissionAmount = Math.round(subtotal * commissionRate);
      const riderEarnings = order.deliveryFee || 40;
      const partnerEarnings = subtotal - commissionAmount;

      console.log(`💰 [Earnings] Total: ${order.total} | Subtotal: ${subtotal} | Commission (${restaurant?.commissionPercentage}%): ${commissionAmount}`);

      // 2. Credit Restaurant Partner Wallet (Earnings for food)
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

      // 3. Credit Rider Wallet (Delivery Fee)
      if (order.rider) {
        const rider = await User.findById(order.rider);
        if (rider) {
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

      // 4. NEW: Credit Admin Wallet (Platform Profit)
      try {
        const adminUser = await User.findOne({ role: 'admin' });
        if (adminUser) {
          adminUser.wallet = adminUser.wallet || { balance: 0 };
          adminUser.wallet.balance += commissionAmount;
          await adminUser.save();

          await Transaction.create({
            user: adminUser._id,
            amount: commissionAmount,
            type: 'credit',
            paymentMethod: 'system',
            status: 'success',
            description: `Platform Commission (${restaurant?.commissionPercentage}%) - Order #${order.orderId || order._id.toString().slice(-6)}`,
            order: order._id,
            transactionId: `COMM-A-${Date.now()}`
          });

          // Notify Admin of earnings
          await Notification.create({
            user: adminUser._id,
            title: 'Commission Earned! 💰',
            message: `You earned ₹${commissionAmount} commission from Order #${order.orderId || order._id.toString().slice(-6)}`,
            orderId: order._id,
            type: 'success'
          });
          io.to('admins').emit('platform_earnings_update', { amount: commissionAmount, balance: adminUser.wallet.balance });

          console.log(`🏦 [Admin Earnings] Credited ₹${commissionAmount} to admin: ${adminUser.email}`);
        }
      } catch (adminErr) {
        console.error('❌ Failed to credit admin commission:', adminErr.message);
      }

      // 5. Reset Rider Availability
      if (order.rider) {
        await User.findByIdAndUpdate(order.rider, { isAvailable: true });
        console.log(`🏍️ [Rider Status] Rider ${order.rider} is now available for new orders.`);
      }
    }

    console.log(`💾 [Update Order Status API] Saving updates...`);
    // validateBeforeSave:false allows updating orphaned orders (e.g. missing restaurant field)
    await order.save({ validateBeforeSave: false });

    console.log(`✅ [Update Order Status API] Order status updated successfully.`);

    // --- Notifications & Sockets ---

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
        restaurantLocation: fullOrderForAdmin.restaurant?.location,
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

    // Include rider location if available for live tracking initialization
    if (order.rider && (status === 'picked_up' || status === 'on_the_way')) {
      const Rider = mongoose.model('Rider');
      const riderProfile = await Rider.findOne({ user: order.rider });
      if (riderProfile && riderProfile.currentLocation) {
        statusPayload.riderLocation = {
          lat: riderProfile.currentLocation.latitude,
          lng: riderProfile.currentLocation.longitude
        };
      }
    }

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
    const RiderModel = mongoose.model('Rider');
    const riderProfile = await RiderModel.findOne({ user: riderId });
    
    // ✨ Fix: Persist rider's initial coordinates to the Order document for tracking
    if (riderProfile && riderProfile.currentLocation) {
      await Order.findByIdAndUpdate(orderId, {
        riderLocation: {
          lat: Number(riderProfile.currentLocation.latitude),
          lng: Number(riderProfile.currentLocation.longitude),
          lastUpdated: new Date()
        }
      });
      console.log(`📍 Initial rider location persisted to Order ${orderId}`);
    }

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

    const statusPayload = {
        orderId: fullOrder._id,
        status: fullOrder.orderStatus,
        message: assignmentMessage,
        rider: { name: fullOrder.rider?.name, phone: fullOrder.rider?.phone },
    };

    // Attach current rider location if available
    if (riderProfile && riderProfile.currentLocation) {
        statusPayload.riderLocation = {
            lat: riderProfile.currentLocation.latitude,
            lng: riderProfile.currentLocation.longitude
        };
    }

    if (customerId) {
      await Notification.create({
        user: customerId,
        title: 'Rider Assigned',
        message: assignmentMessage,
        orderId: fullOrder._id,
        type: 'info'
      });
      io.to(customerId).emit('order_status_update', statusPayload);
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
    
    // ✨ Fix: Persist rider's initial coordinates when accepting the order
    const RiderModel = mongoose.model('Rider');
    const riderProfile = await RiderModel.findOne({ user: req.userId });
    if (riderProfile && riderProfile.currentLocation) {
        order.riderLocation = {
            lat: Number(riderProfile.currentLocation.latitude),
            lng: Number(riderProfile.currentLocation.longitude),
            lastUpdated: new Date()
        };
    }
    
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
    if (order.paymentStatus === 'completed' && (order.paymentMethod || '').toLowerCase() === 'wallet') {
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
