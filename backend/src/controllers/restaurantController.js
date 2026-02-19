import Restaurant from '../models/Restaurant.js';
import MenuItem from '../models/MenuItem.js';

export const getRestaurants = async (req, res) => {
    try {
        const restaurants = await Restaurant.find().select('name image cuisines rating location');
        return res.status(200).json({ success: true, data: restaurants });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const createRestaurant = async (req, res) => {
    try {
        const restaurant = await Restaurant.create(req.body);
        return res.status(201).json({ success: true, data: restaurant });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const deleteRestaurant = async (req, res) => {
    try {
        await Restaurant.findByIdAndDelete(req.params.id);
        return res.status(200).json({ success: true, message: 'Restaurant deleted' });
    } catch (error) {
        return res.status(404).json({ success: false, message: error.message });
    }
};

export const getRestaurantById = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });

        const menu = await MenuItem.find({ restaurant: restaurant._id, isAvailable: true });

        return res.status(200).json({ success: true, data: { restaurant, menu } });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};