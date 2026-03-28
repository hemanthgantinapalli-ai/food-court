import User from "../models/User.js";
import Rider from "../models/Rider.js";
import Restaurant from "../models/Restaurant.js";
import { generateToken } from "../utils/jwt.js";

// ====== REGISTER USER ======
export const register = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({ name, email, password: password, role: role || 'customer', phone });
    const token = generateToken(user);

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, role: user.role, email: user.email, phone: user.phone },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error during registration", error: error.message });
  }
};

// ====== LOGIN USER ======
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user);
    res.status(200).json({
      token,
      user: { id: user._id, name: user.name, role: user.role, email: user.email, phone: user.phone, addresses: user.addresses },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error during login", error: error.message });
  }
};

// ====== GET CURRENT USER PROFILE ======
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate("favorites", "name image rating cuisines location")
      .populate("favoriteFoods", "name price description image isVeg restaurant")
      .select("-password");

    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    let riderData = null;
    let restaurants = [];

    if (user.role === 'rider') {
      riderData = await Rider.findOne({ user: user._id });
    } else if (user.role === 'restaurant') {
      restaurants = await Restaurant.find({ owner: user._id });
    }

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || "",
        addresses: user.addresses || [],
        wallet: user.wallet || { balance: 0 },
        favorites: user.favorites || [],
        favoriteFoods: user.favoriteFoods || [],
        riderData,
        restaurants,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching profile", error: error.message });
  }
};

// ====== UPDATE USER PROFILE ======
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, street, area, city, pincode } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    
    // Handle primary address update
    if (street || city || pincode) {
        if (!user.addresses) user.addresses = [];
        const mainAddr = user.addresses[0] || {};
        user.addresses[0] = {
            ...mainAddr,
            street: street || mainAddr.street,
            area: area || mainAddr.area,
            city: city || mainAddr.city,
            zipCode: pincode || mainAddr.zipCode,
            label: 'Home'
        };
        user.markModified('addresses');
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        addresses: user.addresses
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating profile", error: error.message });
  }
};

// ====== TOGGLE FAVORITE FOOD ======
export const toggleFavoriteFood = async (req, res) => {
  try {
    const { foodId } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const index = user.favoriteFoods.indexOf(foodId);
    if (index === -1) user.favoriteFoods.push(foodId);
    else user.favoriteFoods.splice(index, 1);

    await user.save();
    const updatedUser = await User.findById(req.userId).populate("favoriteFoods", "name price description image isVeg restaurant");

    res.status(200).json({ message: "Favorites updated", favoriteFoods: updatedUser.favoriteFoods });
  } catch (error) {
    res.status(500).json({ message: "Error toggling favorite food", error: error.message });
  }
};

// ====== TOGGLE FAVORITE RESTAURANT ======
export const toggleFavorite = async (req, res) => {
  try {
    const { restaurantId } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const index = user.favorites.indexOf(restaurantId);
    if (index === -1) user.favorites.push(restaurantId);
    else user.favorites.splice(index, 1);

    await user.save();
    const updatedUser = await User.findById(req.userId).populate("favorites", "name image rating cuisines location");

    res.status(200).json({ message: "Favorites updated", favorites: updatedUser.favorites });
  } catch (error) {
    res.status(500).json({ message: "Error toggling favorite", error: error.message });
  }
};
