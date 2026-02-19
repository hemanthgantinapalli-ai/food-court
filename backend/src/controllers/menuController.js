import MenuItem from '../models/MenuItem.js';
import Restaurant from '../models/Restaurant.js';

export const createMenuItem = async (req, res, next) => {
  try {
    const { name, description, price, image, restaurantId, category } = req.body;
    const menuItem = await MenuItem.create({ name, description, price, image, restaurant: restaurantId, category });

    if (restaurantId) {
      await Restaurant.findByIdAndUpdate(restaurantId, { $push: { menu: menuItem._id } });
    }

    res.status(201).json({ success: true, data: menuItem });
  } catch (err) {
    next(err);
  }
};

export const getMenuItems = async (req, res, next) => {
  try {
    const { restaurantId } = req.query;
    const filter = {};
    if (restaurantId) filter.restaurant = restaurantId;
    const items = await MenuItem.find(filter).populate('restaurant', 'name');
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
};

export const getMenuItemById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await MenuItem.findById(id).populate('restaurant', 'name');
    if (!item) return res.status(404).json({ success: false, message: 'Menu item not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

export const updateMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const item = await MenuItem.findByIdAndUpdate(id, updates, { new: true });
    if (!item) return res.status(404).json({ success: false, message: 'Menu item not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

export const deleteMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await MenuItem.findByIdAndDelete(id);
    if (!item) return res.status(404).json({ success: false, message: 'Menu item not found' });
    if (item.restaurant) {
      await Restaurant.findByIdAndUpdate(item.restaurant, { $pull: { menu: item._id } });
    }
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};
