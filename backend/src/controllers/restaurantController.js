import Restaurant from '../models/Restaurant.js';
import MenuItem from '../models/MenuItem.js';

export const getRestaurants = async (req, res) => {
    try {
        const { city } = req.query;
        let query = { isApproved: true };
        if (city && city !== 'Select Location') {
            query['location.city'] = { $regex: city, $options: 'i' };
        }

        const restaurants = await Restaurant.find(query)
            .select('name image cuisines rating location deliveryTime deliveryFee isOpen');
        return res.status(200).json(restaurants);
    } catch (error) {
        console.error("🔥 [Get Restaurants API] Error:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const createRestaurant = async (req, res) => {
    try {
        const payload = { ...req.body };
        // If created by a restaurant partner, enforce their user ID as the owner
        if (req.userRole === 'restaurant') {
            payload.owner = req.userId;
            payload.isApproved = false; // Always strict enforce approval for new ones
        }

        const restaurant = await Restaurant.create(payload);
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
        const updates = { ...req.body };

        // Prevent restaurant owners from overriding sensitive admin configs
        if (req.userRole === 'restaurant') {
            delete updates.commissionPercentage;
            delete updates.isApproved;
            delete updates.approvalDate;
            delete updates.owner; // prevent re-assigning owner
        }

        const restaurant = await Restaurant.findByIdAndUpdate(id, updates, { new: true });
        if (!restaurant) {
            return res.status(404).json({ success: false, message: 'Restaurant not found' });
        }
        return res.status(200).json({ success: true, data: restaurant });
    } catch (error) {
        console.error("🔥 [Update Restaurant API] Error:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};