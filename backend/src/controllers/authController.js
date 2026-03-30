import User from "../models/User.js";
import Rider from "../models/Rider.js";
import Restaurant from "../models/Restaurant.js";
import { generateToken } from "../utils/jwt.js";
import { OAuth2Client } from "google-auth-library";
import bcrypt from "bcrypt";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '490086107739-95l6hep5ivhaklsv6h1mri8024g2d9bg.apps.googleusercontent.com');

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

    // ✅ Hash password safely
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || 'customer',
      phone
    });

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: { _id: user._id, id: user._id, name: user.name, role: user.role, email: user.email, phone: user.phone },
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res.status(500).json({ message: "Server error during registration", error: error.message });
  }
};

// ====== LOGIN USER ======
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

    // DEBUG: Check user object
    console.log("DEBUG LOGIN USER:", user);

    // ✅ check user exists FIRST
    if (!user) {
      return res.status(401).json({ message: "No account found with this email. Please register." });
    }

    // ✅ compare password safely
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password. Please try again." });
    }

    // ✅ Generate JWT
    const token = generateToken(user);

    // ✅ success
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        role: user.role,
        email: user.email,
        phone: user.phone || "",
        addresses: user.addresses || []
      },
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error); // VERY IMPORTANT
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
        _id: user._id,
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
        _id: user._id,
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

// ====== FORGOT PASSWORD (OTP) ======
import sendEmail from "../utils/email.js";

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ success: false, message: "No account found with that email." });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set OTP and expiry (10 minutes)
    user.resetPasswordOtp = otp;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    // Send the email
    try {
      await sendEmail({
        email: user.email,
        subject: "FoodCourt Password Reset OTP",
        message: `Your password reset code is: ${otp}. It is valid for 10 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #f97316; text-align: center;">FoodCourt Password Reset</h2>
            <p>Hello ${user.name},</p>
            <p>We received a request to reset your password. Use the code below to proceed.</p>
            <div style="background: #f1f5f9; padding: 15px; text-align: center; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #0f172a; margin: 20px 0;">
              ${otp}
            </div>
            <p>This code will expire in <strong>10 minutes</strong>.</p>
            <p>If you did not request a password reset, please ignore this email.</p>
          </div>
        `
      });

      res.status(200).json({ success: true, message: "OTP sent to email successfully." });
    } catch (err) {
      // Clean up if email fails
      user.resetPasswordOtp = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });
      console.error("Email Error:", err);
      return res.status(500).json({ success: false, message: "There was an error sending the email. Try again later." });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ====== VERIFY OTP ======
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required." });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordOtp: otp,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
    }

    // OTP is correct!
    res.status(200).json({ success: true, message: "OTP verified successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ====== RESET PASSWORD ======
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordOtp: otp,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP. Please request a new one." });
    }

    // Update password (will be hashed in the pre-save hook)
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    // Clear the OTP fields
    user.resetPasswordOtp = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ success: true, message: "Password updated successfully! You can now sign in." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ====== GOOGLE LOGIN ======
export const googleLogin = async (req, res) => {
  try {
    const { token, role } = req.body;
    
    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID || '490086107739-95l6hep5ivhaklsv6h1mri8024g2d9bg.apps.googleusercontent.com',
    });
    
    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    // Check if user exists
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // First time logging in with Google: create the user
      // Role defaults to 'customer' unless specified during a google-signup flow
      const randomPassword = Math.random().toString(36).slice(-12) + "Gg1!";
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);

      user = await User.create({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role || 'customer',
        // Optional: save picture if your schema supports it
      });
    }

    // Generate our JWT
    const jwtToken = generateToken(user);
    
    res.status(200).json({
      token: jwtToken,
      user: { 
        _id: user._id,
        id: user._id, 
        name: user.name, 
        role: user.role, 
        email: user.email, 
        phone: user.phone || "", 
        addresses: user.addresses 
      },
    });
  } catch (error) {
    console.error("🔥 [Google Login API] Error:", error.message);
    res.status(401).json({ success: false, message: "Invalid Google Token" });
  }
};

