import Restaurant from '../models/Restaurant.js';
import MenuItem from '../models/MenuItem.js';

export const getRestaurants = async (req, res) => {
    try {
        console.log("🏪 [Get Restaurants API] Fetching all restaurants");
        const restaurants = await Restaurant.find().select('name image cuisines rating location');
        console.log(`✅ [Get Restaurants API] Found ${restaurants.length} restaurants`);
        return res.status(200).json({ success: true, data: restaurants });
    } catch (error) {
        console.error("🔥 [Get Restaurants API] Error:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const createRestaurant = async (req, res) => {
    try {
        console.log("🏪 [Create Restaurant API] Request received with body:", req.body);
        const restaurant = await Restaurant.create(req.body);
        console.log("✅ [Create Restaurant API] Restaurant created successfully:", restaurant._id);
        return res.status(201).json({ success: true, data: restaurant });
    } catch (error) {
        console.error("🔥 [Create Restaurant API] Error creating restaurant:", error.message);
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const deleteRestaurant = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🗑️ [Delete Restaurant API] Deleting restaurant with ID: ${id}`);
        const restaurant = await Restaurant.findByIdAndDelete(id);

        if (!restaurant) {
            console.log(`⚠️ [Delete Restaurant API] Restaurant not found: ${id}`);
            return res.status(404).json({ success: false, message: 'Restaurant not found' });
        }

        console.log("✅ [Delete Restaurant API] Restaurant deleted successfully");
        return res.status(200).json({ success: true, message: 'Restaurant deleted' });
    } catch (error) {
        console.error("🔥 [Delete Restaurant API] Error deleting restaurant:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getRestaurantById = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🔍 [Get Restaurant By ID API] Fetching restaurant: ${id}`);

        const restaurant = await Restaurant.findById(id);
        if (!restaurant) {
            console.log(`⚠️ [Get Restaurant By ID API] Restaurant not found: ${id}`);
            return res.status(404).json({ success: false, message: 'Restaurant not found' });
        }

        console.log(`🍔 [Get Restaurant By ID API] Fetching menu items for restaurant: ${id}`);
        const menu = await MenuItem.find({ restaurant: restaurant._id, isAvailable: true });

        console.log(`✅ [Get Restaurant By ID API] Successfully fetched restaurant and ${menu.length} menu items`);
        return res.status(200).json({ success: true, data: { restaurant, menu } });
    } catch (error) {
        console.error("🔥 [Get Restaurant By ID API] Error fetching restaurant:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};