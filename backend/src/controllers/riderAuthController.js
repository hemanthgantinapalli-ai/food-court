import User from '../models/User.js';
import Rider from '../models/Rider.js';
import { generateToken } from '../utils/jwt.js';

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
            user: { id: user._id, name: user.name, role: user.role, phone: user.phone },
            rider,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Verify OTP and create profile for Signup
export const verifySignup = async (req, res) => {
    try {
        const { phone, otp, fullName, profilePhoto, vehicleType, vehicleNumber, licenseNumber, aadhaarNumber, bankAccount } = req.body;

        if (!phone || !otp || !fullName || !vehicleNumber || !licenseNumber || !aadhaarNumber) {
            return res.status(400).json({ message: 'Please provide all mandatory profile details.' });
        }

        if (otp !== '123456') return res.status(401).json({ message: 'Invalid OTP' });

        // Check if phone already registered
        let user = await User.findOne({ phone, role: 'rider' });
        if (user) {
            return res.status(400).json({ message: 'Phone number already registered. Please login.' });
        }

        // Create User account with pseudo email
        const pseudoEmail = `${phone}@rider.foodcourt.com`;
        // Create random password
        const pseudoPassword = Math.random().toString(36).slice(-8);

        user = await User.create({
            name: fullName,
            phone,
            email: pseudoEmail,
            password: pseudoPassword,
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
            bankAccount: bankAccount || {
                accountHolder: fullName,
                accountNumber: '',
                bankName: '',
                ifscCode: ''
            },
            status: 'PENDING'
        });

        console.log(`✅ [Rider Auth] New rider signup: ${phone} - Status: PENDING`);

        // We don't log them in fully. We just tell them it's pending.
        res.status(201).json({
            success: true,
            message: 'Profile created successfully. Your account is under verification.',
            data: rider
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
