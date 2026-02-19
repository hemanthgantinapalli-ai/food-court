import Cart from '../models/Cart.js';
import MenuItem from '../models/MenuItem.js';
import Restaurant from '../models/Restaurant.js';
import Coupon from '../models/Coupon.js';

export const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.userId })
      .populate('restaurant')
      .populate('items.menuItem');

    if (!cart) {
      return res.status(200).json({
        success: true,
        data: null,
      });
    }

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cart',
      error: error.message,
    });
  }
};

export const addToCart = async (req, res) => {
  try {
    const { restaurantId, menuItemId, quantity, addOns, specialInstructions } = req.body;

    // Validate input
    if (!restaurantId || !menuItemId || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const menuItem = await MenuItem.findById(menuItemId);
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found',
      });
    }

    // Check if user has existing cart from another restaurant
    let cart = await Cart.findOne({ user: req.userId });

    if (cart && cart.restaurant.toString() !== restaurantId) {
      // Clear cart when switching restaurants
      cart.items = [];
      cart.restaurant = restaurantId;
    } else if (!cart) {
      cart = new Cart({
        user: req.userId,
        restaurant: restaurantId,
        items: [],
      });
    }

    // Check if item already in cart
    const existingItem = cart.items.find((item) => item.menuItem.toString() === menuItemId);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      const addOnsCost = (addOns || []).reduce((sum, addon) => sum + addon.price, 0);
      cart.items.push({
        menuItem: menuItemId,
        quantity,
        price: menuItem.price,
        addOns,
        specialInstructions,
      });
    }

    // Calculate totals
    let subtotal = 0;
    cart.items.forEach((item) => {
      subtotal += (item.price + (item.addOns || []).reduce((sum, addon) => sum + addon.price, 0)) * item.quantity;
    });

    const restaurant = await Restaurant.findById(restaurantId);
    const tax = subtotal * 0.05; // 5% tax
    const deliveryFee = restaurant.deliveryFee || 50;

    cart.subtotal = subtotal;
    cart.tax = tax;
    cart.deliveryFee = deliveryFee;
    cart.total = subtotal + tax + deliveryFee;

    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Item added to cart',
      data: cart,
    });
  } catch (error) {
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

    let cart = await Cart.findOne({ user: req.userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    if (quantity <= 0) {
      cart.items = cart.items.filter((item) => item.menuItem.toString() !== menuItemId);
    } else {
      const item = cart.items.find((item) => item.menuItem.toString() === menuItemId);
      if (item) {
        item.quantity = quantity;
      }
    }

    // Recalculate totals
    let subtotal = 0;
    cart.items.forEach((item) => {
      subtotal += (item.price + (item.addOns || []).reduce((sum, addon) => sum + addon.price, 0)) * item.quantity;
    });

    const restaurant = await Restaurant.findById(cart.restaurant);
    const tax = subtotal * 0.05;
    const deliveryFee = restaurant.deliveryFee || 50;

    cart.subtotal = subtotal;
    cart.tax = tax;
    cart.deliveryFee = deliveryFee;
    cart.total = subtotal + tax + deliveryFee;

    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Cart updated',
      data: cart,
    });
  } catch (error) {
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

    let cart = await Cart.findOne({ user: req.userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    cart.items = cart.items.filter((item) => item.menuItem.toString() !== menuItemId);

    // Recalculate totals
    let subtotal = 0;
    cart.items.forEach((item) => {
      subtotal += (item.price + (item.addOns || []).reduce((sum, addon) => sum + addon.price, 0)) * item.quantity;
    });

    const restaurant = await Restaurant.findById(cart.restaurant);
    const tax = subtotal * 0.05;
    const deliveryFee = restaurant.deliveryFee || 50;

    cart.subtotal = subtotal;
    cart.tax = tax;
    cart.deliveryFee = deliveryFee;
    cart.total = subtotal + tax + deliveryFee;

    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      data: cart,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to remove from cart',
      error: error.message,
    });
  }
};

export const clearCart = async (req, res) => {
  try {
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

    res.status(200).json({
      success: true,
      message: 'Cart cleared',
    });
  } catch (error) {
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

    let cart = await Cart.findOne({ user: req.userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    const coupon = await Coupon.findOne({ code: couponCode, isActive: true });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Invalid coupon',
      });
    }

    // Check if coupon is expired
    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Coupon expired',
      });
    }

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

    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Coupon applied',
      data: cart,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to apply coupon',
      error: error.message,
    });
  }
};
