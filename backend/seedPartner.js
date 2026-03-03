import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

const addPartner = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/foodcourt';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB...');

        // Check if partner already exists
        const existing = await User.findOne({ email: 'partner@foodcourt.com' });
        if (existing) {
            console.log('⚠️ Partner user already exists. Skipping.');
            process.exit(0);
        }

        // Create Restaurant Partner
        const partner = new User({
            name: 'Restaurant Partner',
            email: 'partner@foodcourt.com',
            password: 'partner123',
            role: 'restaurant'
        });
        await partner.save();
        console.log('✅ Restaurant Partner user created: partner@foodcourt.com / partner123');

        process.exit(0);
    } catch (err) {
        console.error('❌ Failed:', err.message);
        process.exit(1);
    }
};

addPartner();
