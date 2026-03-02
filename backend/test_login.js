import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import connectDB from './src/config/database.js';

dotenv.config();

const testLogin = async () => {
    await connectDB();
    const email = 'admin@foodcourt.com';
    const password = 'admin123';
    const user = await User.findOne({ email });
    if (!user) {
        console.log('User not found in DB');
        process.exit(1);
    }
    const isMatch = await user.comparePassword(password);
    console.log(`Login test for ${email}: ${isMatch ? 'SUCCESS ✅' : 'FAILED ❌'}`);
    process.exit(0);
};

testLogin();
