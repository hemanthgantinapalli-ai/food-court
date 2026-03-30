import User from '../models/User.js';
import Rider from '../models/Rider.js';
import { generateToken } from '../utils/jwt.js';
import bcrypt from 'bcrypt';

// Mock sending OTP
export const sendOtp = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ message: 'Phone number is required' });

        // In a real app, integrate Twilio / MSG91 here. For now, log and mock success.
        console.log(`📱 [Rider Auth] OTP sent to ${phone}: 123456`);
        res.status(200).json({ success: true, message: 'OTP sent successfully (Use 123456)' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Verify OTP for Login
export const verifyLogin = async (req, res) => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) return res.status(400).json({ message: 'Phone and OTP required' });

        if (otp !== '123456') return res.status(401).json({ message: 'Invalid OTP' });

        // Find rider user
        const user = await User.findOne({ phone, role: 'rider' });
        if (!user) {
            return res.status(404).json({ message: 'No rider account found with this number. Please sign up.' });
        }

        // Check Rider profile status
        const rider = await Rider.findOne({ user: user._id });
        if (!rider) {
            return res.status(400).json({ message: 'Rider profile incomplete.' });
        }

        if (rider.status === 'PENDING') {
            return res.status(403).json({ message: 'Your account is under verification. Please wait for admin approval.' });
        }
        if (rider.status === 'BLOCKED' || rider.status === 'REJECTED') {
            return res.status(403).json({ message: `Your account has been ${rider.status.toLowerCase()}. Contact support.` });
        }

        // All good, APPROVED
        const token = generateToken(user);
        res.status(200).json({
            success: true,
            token,
            user: { _id: user._id, id: user._id, name: user.name, role: user.role, phone: user.phone },
            rider,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// EMAIL/PASSWORD LOGIN (Replaces OTP for Riders)
export const emailLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

        // Find rider user with normalized email
        const user = await User.findOne({ email: email.toLowerCase(), role: 'rider' }).select('+password');
        
        // DEBUG: Check rider user object
        console.log("DEBUG RIDER LOGIN USER:", user);

        // ✅ check user exists FIRST
        if (!user) {
            return res.status(404).json({ message: 'No account found with this email. Please check your credentials.' });
        }

        // ✅ compare password safely
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect password. Please try again.' });
        }

        // Check Rider profile status
        const rider = await Rider.findOne({ user: user._id });
        if (!rider) {
            return res.status(400).json({ message: 'Rider profile incomplete.' });
        }

        if (rider.status === 'PENDING') {
            return res.status(403).json({ message: 'Your account is under verification.' });
        }
        if (rider.status === 'BLOCKED' || rider.status === 'REJECTED') {
            return res.status(403).json({ message: `Your account has been ${rider.status.toLowerCase()}.` });
        }

        // All good, APPROVED
        const token = generateToken(user);
        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: { _id: user._id, id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone },
            rider,
        });
    } catch (error) {
        console.error("RIDER LOGIN ERROR:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// EMAIL/PASSWORD SIGNUP (Replaces OTP for Riders)
export const emailSignup = async (req, res) => {
    try {
        const { email, password, phone, fullName, profilePhoto, vehicleType, vehicleNumber, licenseNumber, aadhaarNumber } = req.body;

        if (!email || !password || !phone || !fullName || !vehicleNumber || !licenseNumber || !aadhaarNumber) {
            return res.status(400).json({ message: 'Please provide all mandatory profile details.' });
        }

        // Check if email already registered
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered.' });
        }

        // ✅ Hash password safely
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name: fullName,
            phone,
            email: email.toLowerCase(),
            password: hashedPassword,
            role: 'rider'
        });

        // Create Rider profile (PENDING status)
        const rider = await Rider.create({
            user: user._id,
            fullName,
            profilePhoto: profilePhoto || '',
            vehicleType: vehicleType || 'bike',
            vehicleNumber,
            licenseNumber,
            aadhaarDetails: {
                aadhaarNumber,
                frontImage: '',
                backImage: ''
            },
            status: 'PENDING'
        });

        console.log(`✅ [Rider Auth] New rider signup: ${email} - Status: PENDING`);

        res.status(201).json({
            success: true,
            message: 'Application Submitted successfully. Your account is under verification.',
            data: rider
        });
    } catch (error) {
        console.error("RIDER SIGNUP ERROR:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
