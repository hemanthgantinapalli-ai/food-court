import Restaurant from '../models/Restaurant.js';
import MenuItem from '../models/MenuItem.js';
import Order from '../models/Order.js';

export const getRestaurants = async (req, res) => {
    try {
        const { city, search, cuisine, rating, sort, priceRange } = req.query;
        let query = { isApproved: true };

        // 1. Location Filter
        const isCityFilter = city && city.trim() !== 'Select Location' && city.trim() !== 'All Cities';
        if (isCityFilter) {
            query['location.city'] = { $regex: city.trim(), $options: 'i' };
        }

        // 2. Search Text Filter (Name or Cuisine)
        if (search && search.trim()) {
            query.$or = [
                { name: { $regex: search.trim(), $options: 'i' } },
                { cuisines: { $regex: search.trim(), $options: 'i' } }
            ];
        }

        // 3. Cuisine Filter (Exact or multiple)
        if (cuisine) {
            const cuisineList = Array.isArray(cuisine) ? cuisine : cuisine.split(',');
            query.cuisines = { $in: cuisineList.map(c => new RegExp(c.trim(), 'i')) };
        }

        // 4. Rating Filter
        if (rating) {
            query.rating = { $gte: parseFloat(rating) };
        }

        // 5. Price Range Filter
        if (priceRange) {
            const [min, max] = priceRange.split('-').map(Number);
            query.averagePrice = { $gte: min || 0, $lte: max || 10000 };
        }

        // 6. Sorting
        let sortQuery = { isOpen: -1 }; // Open restaurants always first
        if (sort === 'rating') sortQuery.rating = -1;
        else if (sort === 'deliveryTime') sortQuery.deliveryTime = 1;
        else if (sort === 'priceLowToHigh') sortQuery.averagePrice = 1;
        else if (sort === 'priceHighToLow') sortQuery.averagePrice = -1;
        else sortQuery.createdAt = -1; // Default: Newest

        console.log(`🍽️ [Get Restaurants] Filters: city=${city || 'none'}, search=${search || 'none'}, cuisine=${cuisine || 'none'}, rating=${rating || 'none'}`);

        let restaurants = await Restaurant.find(query)
            .select('name image cuisines rating location deliveryTime deliveryFee isOpen averagePrice')
            .sort(sortQuery)
            .lean();

        // SMART FALLBACK: If specific filters return 0 but they are not critical, 
        // return more broad results (e.g. ignore searches but keep city if possible)
        if (restaurants.length === 0 && (search || cuisine || rating)) {
            console.warn(`⚠️ [Get Restaurants] No matches for strict filters. Softening query...`);
            // Try removing search/cuisine but keeping city
            const fallbackQuery = { isApproved: true };
            if (isCityFilter) fallbackQuery['location.city'] = query['location.city'];

            restaurants = await Restaurant.find(fallbackQuery)
                .select('name image cuisines rating location deliveryTime deliveryFee isOpen averagePrice')
                .limit(10)
                .sort({ rating: -1 })
                .lean();
        }

        // Attach menu item keywords to each restaurant (Optimized: limit results)
        const menuItems = await MenuItem.find({ restaurant: { $in: restaurants.map(r => r._id) } })
            .select('restaurant name category')
            .limit(150) // Don't fetch thousands of items just for keywords
            .lean();

        const menuMap = {};
        menuItems.forEach(item => {
            if (item.restaurant) {
                const restId = item.restaurant.toString();
                if (!menuMap[restId]) menuMap[restId] = new Set();
                if (item.name) menuMap[restId].add(item.name.toLowerCase());
                if (item.category) menuMap[restId].add(item.category.toLowerCase());
            }
        });

        restaurants = restaurants.map(r => ({
            ...r,
            menuKeywords: Array.from(menuMap[r._id?.toString() || ''] || [])
        }));

        console.log(`✅ [Get Restaurants] Returning ${restaurants.length} restaurants for city: ${city || 'Global'}`);
        return res.status(200).json(restaurants);
    } catch (error) {
        console.error("🔥 [Get Restaurants API] Error:", error);
        return res.status(500).json({ success: false, message: "Error fetching restaurants. Please try again later." });
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

        const restaurant = await Restaurant.findByIdAndUpdate(id, updates, { new: true }).populate('owner', 'name email');
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
                .select('name image cuisines rating location deliveryTime deliveryFee isOpen')
                .lean();
            return res.json({ success: true, data: topRated || [], isGuest: true });
        }

        // Find user's last 10 orders to detect cuisine preference
        const lastOrders = await Order.find({ customer: userId })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('restaurant')
            .lean();

        if (!lastOrders || lastOrders.length === 0) {
            // New user with no orders? Return high rated or trending
            const trending = await Restaurant.find({ isApproved: true, rating: { $gte: 4.0 } })
                .limit(4)
                .select('name image cuisines rating location deliveryTime deliveryFee isOpen')
                .lean();
            return res.json({ success: true, data: trending || [], message: 'Trending near you' });
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

        // Get top preferred cuisines
        const topCuisines = Object.entries(cuisineCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 2)
            .map(([cuisine]) => cuisine);

        // Filter valid restaurant IDs to avoid CastError in $nin
        const previousRestaurantIds = lastOrders
            .map(o => o.restaurant?._id)
            .filter(id => id != null);

        // Find restaurants with these cuisines that user hasn't ordered from RECENTLY
        let recommendations = await Restaurant.find({
            isApproved: true,
            cuisines: { $in: topCuisines },
            _id: { $nin: previousRestaurantIds } // Suggest something fresh
        })
            .sort({ rating: -1 })
            .limit(4)
            .select('name image cuisines rating location deliveryTime deliveryFee isOpen')
            .lean();

        // Fallback if no fresh recommendations found
        if (!recommendations || recommendations.length < 2) {
            recommendations = await Restaurant.find({ 
                isApproved: true, 
                rating: { $gte: 4.0 },
                _id: { $nin: previousRestaurantIds }
            })
                .limit(4)
                .select('name image cuisines rating location deliveryTime deliveryFee isOpen')
                .lean();
        }

        res.json({ success: true, data: recommendations || [] });
    } catch (error) {
        console.error("🔥 [AI Recommendations API] Error:", error);
        res.status(500).json({ success: false, message: 'Recommendation engine temporary offline', data: [] });
    }
};
