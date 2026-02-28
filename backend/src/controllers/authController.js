import User from "../models/User.js";
import { generateToken } from "../utils/jwt.js";

// ====== REGISTER USER ======
export const register = async (req, res) => {
  try {
    console.log("📝 [Register API] Request received with body:", req.body);
    const { name, email, password, role } = req.body;

    // Validate Input
    if (!name || !email || !password) {
      console.log("❌ [Register API] Missing required fields (name, email, or password)");
      return res.status(400).json({ message: "All fields are required" });
    }

    console.log("🔍 [Register API] Checking if user exists:", email);
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log("⚠️ [Register API] User already exists:", email);
      return res.status(400).json({ message: "User exists" });
    }

    console.log("✨ [Register API] Creating new user");
    const user = await User.create({ name, email, password, role });

    console.log("✅ [Register API] User created successfully:", user._id);

    const token = generateToken(user);
    console.log("🔑 [Register API] JWT Token generated for:", user.email);

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, role: user.role, email: user.email },
    });
  } catch (error) {
    console.error("🔥 [Register API] Server Error:", error.message);
    res.status(500).json({ message: "Server error during registration", error: error.message });
  }
};

// ====== LOGIN USER ======
export const login = async (req, res) => {
  try {
    console.log("📝 [Login API] Request received for email:", req.body.email);
    const { email, password } = req.body;

    // Validate Input
    if (!email || !password) {
      console.log("❌ [Login API] Missing email or password");
      return res.status(400).json({ message: "Email and password are required" });
    }

    console.log("🔍 [Login API] Looking up user by email:", email);
    const user = await User.findOne({ email });

    if (!user) {
      console.log("⚠️ [Login API] User not found:", email);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log("🔐 [Login API] Comparing passwords for:", email);
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log("❌ [Login API] Password mismatch for:", email);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log("✅ [Login API] Password matched. Generating token...");
    const token = generateToken(user);

    console.log("🚀 [Login API] Login successful for:", email);
    res.status(200).json({
      token,
      user: { id: user._id, name: user.name, role: user.role, email: user.email },
    });
  } catch (error) {
    console.error("🔥 [Login API] Server Error:", error.message);
    res.status(500).json({ message: "Server error during login", error: error.message });
  }
};

// ====== GET CURRENT USER PROFILE ======
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
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
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching profile", error: error.message });
  }
};

// ====== UPDATE USER PROFILE ======
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, addresses } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (addresses) user.addresses = addresses;

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || "",
        addresses: user.addresses || [],
        wallet: user.wallet || { balance: 0 },
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating profile", error: error.message });
  }
};
