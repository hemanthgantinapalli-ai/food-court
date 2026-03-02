import MenuItem from '../models/MenuItem.js';
import Restaurant from '../models/Restaurant.js';

export const createMenuItem = async (req, res, next) => {
  try {
    console.log("🍔 [Create Menu Item API] Request received with body:", req.body);
    const { name, description, price, image, restaurantId, category, recipe } = req.body;

    console.log("✨ [Create Menu Item API] Creating menu item in DB for restaurant:", restaurantId);
    const menuItem = await MenuItem.create({ name, description, price, image, restaurant: restaurantId, category, recipe });

    if (restaurantId) {
      console.log("🔗 [Create Menu Item API] Linking menu item to restaurant:", restaurantId);
      await Restaurant.findByIdAndUpdate(restaurantId, { $push: { menu: menuItem._id } });
    }

    console.log("✅ [Create Menu Item API] Menu item created successfully:", menuItem._id);
    res.status(201).json({ success: true, data: menuItem });
  } catch (err) {
    console.error("🔥 [Create Menu Item API] Error:", err.message);
    next(err);
  }
};

export const getMenuItems = async (req, res, next) => {
  try {
    const { restaurantId } = req.query;
    console.log("📋 [Get Menu Items API] Fetching menu items. Restaurant ID filter:", restaurantId || "None");

    const filter = {};
    if (restaurantId) filter.restaurant = restaurantId;

    const items = await MenuItem.find(filter).populate('restaurant', 'name');
    console.log(`✅ [Get Menu Items API] Found ${items.length} items`);
    res.json({ success: true, count: items.length, data: items });
  } catch (err) {
    console.error("🔥 [Get Menu Items API] Error:", err.message);
    next(err);
  }
};

export const getMenuItemById = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log(`🔍 [Get Menu Item API] Fetching item with ID: ${id}`);

    const item = await MenuItem.findById(id).populate('restaurant', 'name');
    if (!item) {
      console.log(`⚠️ [Get Menu Item API] Item not found: ${id}`);
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    console.log("✅ [Get Menu Item API] Item found successfully");
    res.json({ success: true, data: item });
  } catch (err) {
    console.error("🔥 [Get Menu Item API] Error fetching item:", err.message);
    next(err);
  }
};

export const updateMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log(`📝 [Update Menu Item API] Updating item ${id} with data:`, req.body);

    const updates = req.body;
    const item = await MenuItem.findByIdAndUpdate(id, updates, { new: true });

    if (!item) {
      console.log(`⚠️ [Update Menu Item API] Item not found: ${id}`);
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    console.log("✅ [Update Menu Item API] Item updated successfully");
    res.json({ success: true, data: item });
  } catch (err) {
    console.error("🔥 [Update Menu Item API] Error updating item:", err.message);
    next(err);
  }
};

export const deleteMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ [Delete Menu Item API] Deleting item with ID: ${id}`);

    const item = await MenuItem.findByIdAndDelete(id);
    if (!item) {
      console.log(`⚠️ [Delete Menu Item API] Item not found: ${id}`);
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    if (item.restaurant) {
      console.log(`🔗 [Delete Menu Item API] Unlinking item from restaurant: ${item.restaurant}`);
      await Restaurant.findByIdAndUpdate(item.restaurant, { $pull: { menu: item._id } });
    }

    console.log("✅ [Delete Menu Item API] Item deleted successfully");
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    console.error("🔥 [Delete Menu Item API] Error deleting item:", err.message);
    next(err);
  }
};
