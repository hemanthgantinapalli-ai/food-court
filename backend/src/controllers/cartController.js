import Cart from '../models/Cart.js';
import MenuItem from '../models/MenuItem.js';
import Restaurant from '../models/Restaurant.js';
import Coupon from '../models/Coupon.js';

export const getCart = async (req, res) => {
  try {
    console.log(`🛒 [Get Cart API] Fetching cart for user: ${req.userId}`);
    const cart = await Cart.findOne({ user: req.userId })
      .populate('restaurant')
      .populate('items.menuItem');

    if (!cart) {
      console.log(`⚠️ [Get Cart API] Cart not found or empty for user: ${req.userId}`);
      return res.status(200).json({
        success: true,
        data: null,
      });
    }

    console.log(`✅ [Get Cart API] Successfully fetched cart with ${cart.items.length} items for user: ${req.userId}`);
    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error) {
    console.error(`🔥 [Get Cart API] Error fetching cart: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cart',
      error: error.message,
    });
  }
};

export const addToCart = async (req, res) => {
  try {
    console.log(`🛒 [Add To Cart API] Request from user: ${req.userId}`);
    const { restaurantId, menuItemId, quantity, addOns, specialInstructions } = req.body;

    console.log(`📥 [Add To Cart API] Request payload:`, { restaurantId, menuItemId, quantity, addOns, specialInstructions });

    // Validate input
    if (!restaurantId || !menuItemId || !quantity) {
      console.log(`❌ [Add To Cart API] Missing required fields`);
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const menuItem = await MenuItem.findById(menuItemId);
    if (!menuItem) {
      console.log(`⚠️ [Add To Cart API] Menu item not found: ${menuItemId}`);
      return res.status(404).json({
        success: false,
        message: 'Menu item not found',
      });
    }

    // Check if user has existing cart from another restaurant
    let cart = await Cart.findOne({ user: req.userId });

    if (cart && cart.restaurant && cart.restaurant.toString() !== restaurantId) {
      console.log(`🔄 [Add To Cart API] User switching restaurants (from ${cart.restaurant} to ${restaurantId}). Clearing cart.`);
      // Clear cart when switching restaurants
      cart.items = [];
      cart.restaurant = restaurantId;
    } else if (!cart) {
      console.log(`✨ [Add To Cart API] Creating new cart for user: ${req.userId}`);
      cart = new Cart({
        user: req.userId,
        restaurant: restaurantId,
        items: [],
      });
    } else if (!cart.restaurant) {
      cart.restaurant = restaurantId;
    }

    // Check if item already in cart
    const existingItem = cart.items.find((item) => item.menuItem && item.menuItem.toString() === menuItemId);

    if (existingItem) {
      console.log(`➕ [Add To Cart API] Item already in cart. Increasing quantity by ${quantity}.`);
      existingItem.quantity += quantity;
    } else {
      console.log(`🛍️ [Add To Cart API] Adding new item to cart: ${menuItemId}`);
      const addOnsCost = (addOns || []).reduce((sum, addon) => sum + addon.price, 0);
      cart.items.push({
        menuItem: menuItemId,
        quantity,
        price: menuItem.price,
        addOns,
        specialInstructions,
      });
    }

    console.log(`🧮 [Add To Cart API] Recalculating totals...`);
    // Calculate totals
    let subtotal = 0;
    cart.items.forEach((item) => {
      subtotal += (item.price + (item.addOns || []).reduce((sum, addon) => sum + addon.price, 0)) * item.quantity;
    });

    const restaurant = await Restaurant.findById(restaurantId);
    const tax = subtotal * 0.05; // 5% tax
    const deliveryFee = restaurant?.deliveryFee || 50;

    cart.subtotal = subtotal;
    cart.tax = tax;
    cart.deliveryFee = deliveryFee;
    cart.total = subtotal + tax + deliveryFee;

    console.log(`💾 [Add To Cart API] Saving cart updates... Total: ${cart.total}`);
    await cart.save();

    console.log(`✅ [Add To Cart API] Successfully added item to cart`);
    res.status(200).json({
      success: true,
      message: 'Item added to cart',
      data: cart,
    });
  } catch (error) {
    console.error(`🔥 [Add To Cart API] Error adding to cart: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to add to cart',
      error: error.message,
    });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const { menuItemId, quantity } = req.body;
    console.log(`🛒 [Update Cart API] Request from user: ${req.userId} for item ${menuItemId} to quantity: ${quantity}`);

    let cart = await Cart.findOne({ user: req.userId });

    if (!cart) {
      console.log(`⚠️ [Update Cart API] Cart not found for user: ${req.userId}`);
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    if (quantity <= 0) {
      console.log(`🗑️ [Update Cart API] Quantity <= 0. Removing item from cart.`);
      cart.items = cart.items.filter((item) => item.menuItem && item.menuItem.toString() !== menuItemId);
    } else {
      const item = cart.items.find((item) => item.menuItem && item.menuItem.toString() === menuItemId);
      if (item) {
        console.log(`🔄 [Update Cart API] Updating quantity from ${item.quantity} to ${quantity}`);
        item.quantity = quantity;
      } else {
        console.log(`⚠️ [Update Cart API] Item not found in cart: ${menuItemId}`);
      }
    }

    console.log(`🧮 [Update Cart API] Recalculating totals...`);
    // Recalculate totals
    let subtotal = 0;
    cart.items.forEach((item) => {
      subtotal += (item.price + (item.addOns || []).reduce((sum, addon) => sum + addon.price, 0)) * item.quantity;
    });

    const restaurant = await Restaurant.findById(cart.restaurant);
    const tax = subtotal * 0.05;
    const deliveryFee = restaurant?.deliveryFee || 50;

    cart.subtotal = subtotal;
    cart.tax = tax;
    cart.deliveryFee = deliveryFee;
    cart.total = subtotal + tax + deliveryFee;

    console.log(`💾 [Update Cart API] Saving cart updates... Total: ${cart.total}`);
    await cart.save();

    console.log(`✅ [Update Cart API] Successfully updated cart`);
    res.status(200).json({
      success: true,
      message: 'Cart updated',
      data: cart,
    });
  } catch (error) {
    console.error(`🔥 [Update Cart API] Error updating cart: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to update cart',
      error: error.message,
    });
  }
};

export const removeFromCart = async (req, res) => {
  try {
    const { menuItemId } = req.params;
    console.log(`🛒 [Remove From Cart API] Request from user: ${req.userId} to remove item: ${menuItemId}`);

    let cart = await Cart.findOne({ user: req.userId });

    if (!cart) {
      console.log(`⚠️ [Remove From Cart API] Cart not found for user: ${req.userId}`);
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    cart.items = cart.items.filter((item) => item.menuItem && item.menuItem.toString() !== menuItemId);

    console.log(`🧮 [Remove From Cart API] Recalculating totals...`);
    // Recalculate totals
    let subtotal = 0;
    cart.items.forEach((item) => {
      subtotal += (item.price + (item.addOns || []).reduce((sum, addon) => sum + addon.price, 0)) * item.quantity;
    });

    const restaurant = await Restaurant.findById(cart.restaurant);
    const tax = subtotal * 0.05;
    const deliveryFee = restaurant?.deliveryFee || 50;

    cart.subtotal = subtotal;
    cart.tax = tax;
    cart.deliveryFee = deliveryFee;
    cart.total = subtotal + tax + deliveryFee;

    console.log(`💾 [Remove From Cart API] Saving cart updates... Total: ${cart.total}`);
    await cart.save();

    console.log(`✅ [Remove From Cart API] Successfully removed item from cart`);
    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      data: cart,
    });
  } catch (error) {
    console.error(`🔥 [Remove From Cart API] Error removing from cart: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to remove from cart',
      error: error.message,
    });
  }
};

export const clearCart = async (req, res) => {
  try {
    console.log(`🛒 [Clear Cart API] Request from user: ${req.userId} to clear cart`);
    await Cart.findOneAndUpdate(
      { user: req.userId },
      {
        items: [],
        subtotal: 0,
        tax: 0,
        deliveryFee: 0,
        total: 0,
      }
    );

    console.log(`✅ [Clear Cart API] Successfully cleared cart for user: ${req.userId}`);
    res.status(200).json({
      success: true,
      message: 'Cart cleared',
    });
  } catch (error) {
    console.error(`🔥 [Clear Cart API] Error clearing cart: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart',
      error: error.message,
    });
  }
};

export const applyCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;
    console.log(`🎟️ [Apply Coupon API] Request from user: ${req.userId} with code: ${couponCode}`);

    let cart = await Cart.findOne({ user: req.userId });
    if (!cart) {
      console.log(`⚠️ [Apply Coupon API] Cart not found for user: ${req.userId}`);
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    const coupon = await Coupon.findOne({ code: couponCode, isActive: true });

    if (!coupon) {
      console.log(`❌ [Apply Coupon API] Invalid or inactive coupon code: ${couponCode}`);
      return res.status(404).json({
        success: false,
        message: 'Invalid coupon',
      });
    }

    // Check if coupon is expired
    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      console.log(`⏳ [Apply Coupon API] Coupon expired: ${couponCode}`);
      return res.status(400).json({
        success: false,
        message: 'Coupon expired',
      });
    }

    console.log(`🧮 [Apply Coupon API] Calculating discount...`);
    // Calculate discount
    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (cart.subtotal * coupon.discountValue) / 100;
    } else {
      discount = coupon.discountValue;
    }

    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }

    cart.discount = discount;
    cart.discountCode = couponCode;
    cart.total = cart.subtotal + cart.tax + cart.deliveryFee - discount;

    console.log(`💾 [Apply Coupon API] Saving cart updates... Discount applied: ${discount}`);
    await cart.save();

    console.log(`✅ [Apply Coupon API] Successfully applied coupon`);
    res.status(200).json({
      success: true,
      message: 'Coupon applied',
      data: cart,
    });
  } catch (error) {
    console.error(`🔥 [Apply Coupon API] Error applying coupon: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to apply coupon',
      error: error.message,
    });
  }
};
