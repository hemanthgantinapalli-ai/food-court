import Restaurant from '../models/Restaurant.js';
import MenuItem from '../models/MenuItem.js';
import Order from '../models/Order.js';

export const getRestaurants = async (req, res) => {
    try {
        const { city } = req.query;
        let query = { isApproved: true };
        const isCityFilter = city && city.trim() !== 'Select Location';

        if (isCityFilter) {
            query['location.city'] = { $regex: city.trim(), $options: 'i' };
        }

        console.log(`🍽️ [Get Restaurants] Fetching restaurants. City filter: "${city || 'none'}"`);
        let restaurants = await Restaurant.find(query)
            .select('name image cuisines rating location deliveryTime deliveryFee isOpen');

        // SMART FALLBACK: If city filter returns 0, show all restaurants
        // This prevents a blank screen when user has selected a city we don't serve yet
        if (restaurants.length === 0 && isCityFilter) {
            console.warn(`⚠️ [Get Restaurants] No restaurants in "${city}". Returning all restaurants as fallback.`);
            restaurants = await Restaurant.find({ isApproved: true })
                .select('name image cuisines rating location deliveryTime deliveryFee isOpen');
        }

        console.log(`✅ [Get Restaurants] Returning ${restaurants.length} restaurants.`);
        return res.status(200).json(restaurants);
    } catch (error) {
        console.error("🔥 [Get Restaurants API] Error:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const createRestaurant = async (req, res) => {
    try {
        console.log("📝 [Create Restaurant API] Payload received:", req.body);
        const isAdmin = req.userRole === 'admin';
        const payload = {
            ...req.body,
            isApproved: isAdmin,
            isOpen: isAdmin ? (req.body.isOpen ?? true) : false,
            reviewCount: 0,
            rating: 4.0
        };

        if (!payload.owner) {
            payload.owner = req.userId;
        }

        const restaurant = await Restaurant.create(payload);
        console.log("✅ [Create Restaurant API] Created successfully:", restaurant.name);
        return res.status(201).json({ success: true, data: restaurant });
    } catch (error) {
        console.error("🔥 [Create Restaurant API] Error:", error.message);
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

/**
 * @desc Get recommended restaurants based on user's order history
 * @route GET /api/restaurants/recommendations
 * @access Private (Customer)
 */
export const getRecommendedRestaurants = async (req, res) => {
    try {
        const userId = req.userId;

        // If guest, return top rated restaurants
        if (!userId) {
            const topRated = await Restaurant.find({ isApproved: true })
                .sort({ rating: -1 })
                .limit(4)
                .select('name image cuisines rating location deliveryTime deliveryFee isOpen');
            return res.json({ success: true, data: topRated, isGuest: true });
        }

        // Find user's last 10 orders to detect cuisine preference
        const lastOrders = await Order.find({ customer: userId })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('restaurant');

        if (lastOrders.length === 0) {
            // New user with no orders? Return high rated or trending
            const trending = await Restaurant.find({ isApproved: true, rating: { $gte: 4.5 } })
                .limit(4)
                .select('name image cuisines rating location deliveryTime deliveryFee isOpen');
            return res.json({ success: true, data: trending, message: 'Trending near you' });
        }

        // Analyze cuisines
        const cuisineCounts = {};
        lastOrders.forEach(order => {
            if (order.restaurant && Array.isArray(order.restaurant.cuisines)) {
                order.restaurant.cuisines.forEach(c => {
                    cuisineCounts[c] = (cuisineCounts[c] || 0) + 1;
                });
            }
        });

        // Get top 2 preferred cuisines
        const topCuisines = Object.entries(cuisineCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 2)
            .map(([cuisine]) => cuisine);

        // Find restaurants with these cuisines that user hasn't ordered from RECENTLY
        const recommendations = await Restaurant.find({
            isApproved: true,
            cuisines: { $in: topCuisines },
            _id: { $nin: lastOrders.map(o => o.restaurant?._id) } // Suggest something fresh
        })
            .sort({ rating: -1 })
            .limit(4)
            .select('name image cuisines rating location deliveryTime deliveryFee isOpen');

        // Fallback if no fresh recommendations found in those cuisines
        if (recommendations.length < 2) {
            const fallback = await Restaurant.find({ isApproved: true, rating: { $gte: 4.2 } })
                .limit(4)
                .select('name image cuisines rating location deliveryTime deliveryFee isOpen');
            return res.json({ success: true, data: fallback });
        }

        res.json({ success: true, data: recommendations });
    } catch (error) {
        console.error("🔥 [AI Recommendations API] Error:", error.message);
        res.status(500).json({ success: false, message: 'Recommendation engine temporary offline' });
    }
};
