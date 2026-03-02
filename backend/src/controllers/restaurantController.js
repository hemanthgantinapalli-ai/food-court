import Restaurant from '../models/Restaurant.js';
import MenuItem from '../models/MenuItem.js';

export const getRestaurants = async (req, res) => {
    try {
        const restaurants = await Restaurant.find()
            .select('name image cuisines rating location deliveryTime deliveryFee isOpen');
        return res.status(200).json(restaurants);   // ✅ Return array directly — frontend expects array
    } catch (error) {
        console.error("🔥 [Get Restaurants API] Error:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const createRestaurant = async (req, res) => {
    try {
        const restaurant = await Restaurant.create(req.body);
        return res.status(201).json({ success: true, data: restaurant });
    } catch (error) {
        console.error("🔥 [Create Restaurant API] Error creating restaurant:", error.message);
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const deleteRestaurant = async (req, res) => {
    try {
        const { id } = req.params;
        const restaurant = await Restaurant.findByIdAndDelete(id);

        if (!restaurant) {
            return res.status(404).json({ success: false, message: 'Restaurant not found' });
        }

        return res.status(200).json({ success: true, message: 'Restaurant deleted' });
    } catch (error) {
        console.error("🔥 [Delete Restaurant API] Error deleting restaurant:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getRestaurantById = async (req, res) => {
    try {
        const { id } = req.params;
        const restaurant = await Restaurant.findById(id);
        if (!restaurant) {
            return res.status(404).json({ success: false, message: 'Restaurant not found' });
        }

        const menu = await MenuItem.find({ restaurant: restaurant._id, isAvailable: true });
        return res.status(200).json({ success: true, data: { restaurant, menu } });
    } catch (error) {
        console.error("🔥 [Get Restaurant By ID API] Error fetching restaurant:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const updateRestaurant = async (req, res) => {
    try {
        const { id } = req.params;
        const restaurant = await Restaurant.findByIdAndUpdate(id, req.body, { new: true });
        if (!restaurant) {
            return res.status(404).json({ success: false, message: 'Restaurant not found' });
        }
        return res.status(200).json({ success: true, data: restaurant });
    } catch (error) {
        console.error("🔥 [Update Restaurant API] Error:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};