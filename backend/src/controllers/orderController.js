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
    const { deliveryAddress, paymentMethod, items: bodyItems } = req.body;
    
    // 1. Fetch Cart
    const cart = await Cart.findOne({ user: req.userId }).populate('items.menuItem');
    
    let items = [];
    let restaurantId = null;

    if (cart && cart.items.length > 0) {
      items = cart.items.map(item => ({
        menuItem: item.menuItem._id,
        name: item.menuItem.name,
        quantity: item.quantity,
        price: item.price
      }));
      restaurantId = cart.restaurant;
    } else if (bodyItems && bodyItems.length > 0) {
      items = bodyItems;
      restaurantId = req.body.restaurantId || req.body.restaurant;
    }

    if (items.length === 0 || !restaurantId) {
      return res.status(400).json({ success: false, message: 'Cart is empty or restaurant missing' });
    }

    // 2. Fetch Fresh Settings & Restaurant data
    const [settings, restaurant] = await Promise.all([
      Settings.findOne({ key: 'global_config' }),
      Restaurant.findById(restaurantId)
    ]);

    if (!restaurant || !restaurant.isOpen) {
      return res.status(400).json({ success: false, message: 'Restaurant is currently closed or not found' });
    }

    // 3. Financial Calculations (Backend standard)
    const commRate = (restaurant.commissionPercentage || settings?.commissionPercentage || 15) / 100;
    const taxRate = (settings?.taxPercentage || 5) / 100;
    const deliveryFee = settings?.deliveryFee || 30;

    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = Math.round(totalAmount * taxRate);
    const commission = Math.round(totalAmount * commRate);
    const finalAmount = totalAmount + tax + deliveryFee;

    // 4. Wallet Check if needed
    const isWallet = paymentMethod === 'wallet';
    if (isWallet) {
      const user = await User.findById(req.userId);
      if ((user.wallet?.balance || 0) < finalAmount) {
        return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
      }
      user.wallet.balance -= finalAmount;
      await user.save();
    }

    // 5. Create Order
    const order = await Order.create({
      customer: req.userId,
      restaurant: restaurantId,
      items,
      deliveryAddress,
      totalAmount,
      commission,
      deliveryFee,
      tax,
      finalAmount,
      paymentMethod,
      paymentStatus: isWallet ? 'completed' : 'pending',
      orderStatus: 'placed',
      userLocation: {
        lat: deliveryAddress?.latitude || 0,
        lng: deliveryAddress?.longitude || 0,
        address: deliveryAddress?.street || ''
      },
      restaurantLocation: {
        lat: restaurant.location?.latitude || 0,
        lng: restaurant.location?.longitude || 0,
        address: restaurant.location?.address || ''
      }
    });

    // 6. Post-order processing (Silent)
    (async () => {
      try {
        await Cart.findOneAndUpdate({ user: req.userId }, { items: [], total: 0 });
        
        if (isWallet) {
          await Transaction.create({
            user: req.userId,
            amount: finalAmount,
            type: 'debit',
            description: `Order #${order.orderId}`,
            order: order._id
          });
        }

        const io = getIO();
        const notification = await Notification.create({
          userId: req.userId,
          title: 'Order Placed! 🍱',
          message: `Your order #${order.orderId || order._id.toString().slice(-6)} has been placed!`,
          type: 'order_update',
          orderId: order._id
        });

        io.to(req.userId).emit('new_notification', notification);
        if (restaurant.owner) {
          io.to(restaurant.owner.toString()).emit('new_order', order);
        }
      } catch (e) { console.error('BG Error:', e); }
    })();

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
      try {
        // 1. Fetch restaurant with specific commission percentage
        const restaurantId = order.restaurant?._id || order.restaurant;
        const restaurant = await Restaurant.findById(restaurantId).populate('owner');
        
        // Fetch global settings to use commission from config if restaurant has no specific setting
        const globalSettings = await Settings.findOne({ key: 'global_config' }) || { platformCommission: 20 };
        
        const commissionRate = (Number(restaurant?.commissionPercentage) || Number(globalSettings.platformCommission) || 10) / 100;

        // Calculate split amounts
        // Note: Commission is traditionally on the food subtotal, not the delivery fee
        const subtotal = Number(order.totalAmount) || Number(order.subtotal) || (Math.max(0, (Number(order.finalAmount) || Number(order.total) || 0) - (Number(order.deliveryFee) || 0)));
        const commissionAmount = Math.round(subtotal * commissionRate);
        const riderEarnings = Number(order.deliveryFee) || 40;
        const partnerEarnings = Math.max(0, subtotal - commissionAmount);

        console.log(`💰 [Earnings Build] Subtotal: ${subtotal} | Commission (${(commissionRate * 100).toFixed(0)}%): ${commissionAmount} | Rider: ${riderEarnings} | Partner: ${partnerEarnings}`);

        // 2. Credit Restaurant Partner Wallet
        if (restaurant && restaurant.owner && typeof restaurant.owner === 'object') {
          try {
            const owner = restaurant.owner;
            owner.wallet = owner.wallet || { balance: 0 };
            owner.wallet.balance = (Number(owner.wallet.balance) || 0) + partnerEarnings;
            await owner.save();

            await Transaction.create({
              user: owner._id,
              amount: partnerEarnings,
              type: 'credit',
              paymentMethod: 'system',
              status: 'success',
              description: `Earnings for Order #${order.orderId || order._id.toString().slice(-6)}`,
              order: order._id,
              transactionId: `EARN-P-${Date.now()}-${order._id.toString().slice(-4)}`
            });
            console.log(`✅ [Earnings] Credited ₹${partnerEarnings} to partner: ${owner.email}`);
          } catch (err) { console.error('❌ Failed to credit restaurant partner:', err.message); }
        }

        // 3. Credit Rider Wallet
        if (order.rider) {
          try {
            const riderDoc = await User.findById(order.rider);
            if (riderDoc) {
              riderDoc.wallet = riderDoc.wallet || { balance: 0 };
              riderDoc.wallet.balance = (Number(riderDoc.wallet.balance) || 0) + riderEarnings;
              await riderDoc.save();

              await Transaction.create({
                user: riderDoc._id,
                amount: riderEarnings,
                type: 'credit',
                paymentMethod: 'system',
                status: 'success',
                description: `Delivery fee for Order #${order.orderId || order._id.toString().slice(-6)}`,
                order: order._id,
                transactionId: `EARN-R-${Date.now()}-${order._id.toString().slice(-4)}`
              });
              console.log(`✅ [Earnings] Credited ₹${riderEarnings} to rider: ${riderDoc.email}`);
            }
          } catch (err) { console.error('❌ Failed to credit rider:', err.message); }
        }

        // 4. Credit Admin Wallet (Platform Profit)
        try {
          const adminUser = await User.findOne({ role: 'admin' });
          if (adminUser) {
            adminUser.wallet = adminUser.wallet || { balance: 0 };
            adminUser.wallet.balance = (Number(adminUser.wallet.balance) || 0) + commissionAmount;
            await adminUser.save();

            await Transaction.create({
              user: adminUser._id,
              amount: commissionAmount,
              type: 'credit',
              paymentMethod: 'system',
              status: 'success',
              description: `Platform Commission (${(commissionRate * 100).toFixed(0)}%) - Order #${order.orderId || order._id.toString().slice(-6)}`,
              order: order._id,
              transactionId: `COMM-A-${Date.now()}-${order._id.toString().slice(-4)}`
            });

            // Notify Admin
            await Notification.create({
              userId: adminUser._id,
              title: 'Commission Earned! 💰',
              message: `You earned ₹${commissionAmount} commission from Order #${order.orderId || order._id.toString().slice(-6)}`,
              orderId: order._id,
              type: 'success'
            });
            io.to('admins').emit('platform_earnings_update', { amount: commissionAmount, balance: adminUser.wallet.balance });
            console.log(`✅ [Earnings] Credited ₹${commissionAmount} to admin: ${adminUser.email}`);
          }
        } catch (adminErr) {
          console.error('❌ Failed to credit admin commission:', adminErr.message);
        }
      } catch (distErr) {
        console.error('❌ Critical Error in Revenue Distribution:', distErr.message);
      }

      // 5. Reset Rider Availability
      if (order.rider) {
        await User.findByIdAndUpdate(order.rider, { isAvailable: true }).catch(err => console.error('Failed to reset rider availability:', err));
      }
    }

    console.log(`💾 [Update Order Status API] Saving updates...`);
    // validateBeforeSave:false allows updating orphaned orders (e.g. missing restaurant field)
    await order.save({ validateBeforeSave: false });

    console.log(`✅ [Update Order Status API] Order status updated successfully.`);

      // --- Notifications & Sockets ---

    if (status === 'confirmed') {
      // --- Auto Rider Assignment Logic (Nearest-First) ---
      const settings = await Settings.findOne({ key: 'global_config' });
      if (settings?.autoRiderAssign && !order.rider) {
        const RiderModel = mongoose.model('Rider');
        const restLat = Number(order.restaurantLocation?.lat);
        const restLng = Number(order.restaurantLocation?.lng);

        if (restLat && restLng) {
          // Find the nearest online rider within 10km
          const nearestRiderProfiles = await RiderModel.find({
            isOnline: true,
            currentLocation: {
              $near: {
                $geometry: { type: "Point", coordinates: [restLng, restLat] },
                $maxDistance: 10000 // 10 Kilometers
              }
            }
          }).limit(10); // Check top 10 nearest

          // From the nearest online riders, pick the first one that is also 'isAvailable' in User model
          let assignedRiderId = null;
          for (const profile of nearestRiderProfiles) {
            const riderUser = await User.findOne({ _id: profile.user, role: 'rider', isAvailable: true });
            if (riderUser) {
              assignedRiderId = riderUser._id;
              break;
            }
          }

          if (assignedRiderId) {
            order.rider = assignedRiderId;
            order.orderStatus = 'assigned';
            await order.save();
            console.log(`🤖 [Auto Assign] Order ${order.orderId} assigned to nearest rider: ${assignedRiderId}`);
          }
        }
      }

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

      // Notify ALL admins via Database (Persistent)
      const admins = await User.find({ role: 'admin' }).select('_id');
      for (const admin of admins) {
        await Notification.create({
          userId: admin._id,
          title: 'Rider Needed! 🛵',
          message: `Order #${order.orderId || order._id.toString().slice(-6)} needs a delivery partner!`,
          orderId: order._id,
          type: 'info'
        });
        io.to(admin._id.toString()).emit('new_notification', {
           title: 'Rider Needed! 🛵',
           message: `Order #${order.orderId || order._id.toString().slice(-6)} needs a delivery partner!`,
           orderId: order._id,
           type: 'info'
        });
      }

      // Notify admin that restaurant has confirmed and they should assign a rider
      io.to('admins').emit('order_needs_rider', orderPayloadForAdmin);
    }

    const customerId = order.customer?.toString();

    const statusMessages = {
      confirmed: 'Your order has been confirmed!',
      preparing: 'The restaurant is preparing your food. 🍳',
      ready: 'Food is ready and a rider is being assigned. 🏍️',
      assigned: 'Rider is on the way to the restaurant! 🛵',
      arrived_at_restaurant: 'Rider has arrived at the restaurant! 🏪',
      picked_up: 'Rider has picked up your food from the restaurant! 🛵',
      on_the_way: 'Your order is on the way to you! 🚗',
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
      if (riderProfile && riderProfile.currentLocation && riderProfile.currentLocation.coordinates) {
        statusPayload.riderLocation = {
          lat: riderProfile.currentLocation.coordinates[1],
          lng: riderProfile.currentLocation.coordinates[0]
        };
      }
    }

    if (notificationMessage && customerId) {
      // Create persistent notification for Customer
      await Notification.create({
        userId: customerId,
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
          userId: restaurant.owner,
          title: 'Order Status Update',
          message: `Order #${order.orderId || order._id.toString().slice(-6)} status: ${status.replace('_', ' ')}`,
          orderId: order._id,
          type: 'info'
        });
        io.to(restaurant.owner.toString()).emit('order_status_update', statusPayload);
      }
    }

    // Notify Rider about status change (if not updated by them)
    if (order.rider && req.userRole !== 'rider') {
      await Notification.create({
        userId: order.rider,
        title: 'Delivery Update',
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
      { rider: riderId, orderStatus: 'assigned' },
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
    if (riderProfile && riderProfile.currentLocation && riderProfile.currentLocation.coordinates) {
      await Order.findByIdAndUpdate(orderId, {
        riderLocation: {
          lat: Number(riderProfile.currentLocation.coordinates[1]),
          lng: Number(riderProfile.currentLocation.coordinates[0]),
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
    if (riderProfile && riderProfile.currentLocation && riderProfile.currentLocation.coordinates) {
        statusPayload.riderLocation = {
            lat: riderProfile.currentLocation.coordinates[1],
            lng: riderProfile.currentLocation.coordinates[0]
        };
    }

    if (customerId) {
      await Notification.create({
        userId: customerId,
        title: 'Rider Assigned! 🛵',
        message: assignmentMessage,
        orderId: fullOrder._id,
        type: 'info'
      });
      io.to(customerId).emit('order_status_update', statusPayload);
    }

    // Notify Rider
    await Notification.create({
      userId: riderId,
      title: 'New Delivery Assigned! 🛵',
      message: `You've been assigned order #${fullOrder.orderId || fullOrder._id.toString().slice(-6)}`,
      orderId: fullOrder._id,
      type: 'success'
    });
    io.to(riderId).emit('order_assigned', fullOrder);

    // Notify admins (Persistent + Socket)
    const admins = await User.find({ role: 'admin' }).select('_id');
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        title: 'Rider Assigned! ✅',
        message: `Rider ${fullOrder.rider?.name || 'Partner'} assigned to Order #${fullOrder.orderId || fullOrder._id.toString().slice(-6)}`,
        orderId: fullOrder._id,
        type: 'success'
      });
      io.to(admin._id.toString()).emit('new_notification', {
        title: 'Rider Assigned! ✅',
        message: `Rider ${fullOrder.rider?.name || 'Partner'} assigned to Order #${fullOrder.orderId || fullOrder._id.toString().slice(-6)}`,
        orderId: fullOrder._id,
        type: 'success'
      });
    }

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
    order.orderStatus = 'assigned';

    order.statusHistory.push({
      status: order.orderStatus,
      timestamp: new Date(),
      note: 'Rider accepted the order and is on the way to restaurant'
    });

    console.log(`💾 [Accept Order API] Saving order updates...`);
    
    // ✨ Fix: Persist rider's initial coordinates when accepting the order
    const RiderModel = mongoose.model('Rider');
    const riderProfile = await RiderModel.findOne({ user: req.userId });
    if (riderProfile && riderProfile.currentLocation && riderProfile.currentLocation.coordinates) {
        order.riderLocation = {
            lat: Number(riderProfile.currentLocation.coordinates[1]),
            lng: Number(riderProfile.currentLocation.coordinates[0]),
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
      userId: req.userId,
      title: 'Order Accepted! 🛵',
      message: `You have accepted order #${order.orderId || order._id.toString().slice(-6)}`,
      orderId: order._id,
      type: 'success'
    });

    await Notification.create({
      userId: customerId,
      title: 'Rider Assigned! 🛵',
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
