import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import connectDB from './src/config/database.js';

dotenv.config();

const users = [
    { name: 'Demo Customer', email: 'user@foodcourt.com', password: 'user123', role: 'customer' },
    { name: 'Demo Admin', email: 'admin@foodcourt.com', password: 'admin123', role: 'admin' },
    { name: 'Demo Rider', email: 'rider@foodcourt.com', password: 'rider123', role: 'rider' },
];

const seed = async () => {
    await connectDB();
    for (const userData of users) {
        const exists = await User.findOne({ email: userData.email });
        if (!exists) {
            console.log(`Creating ${userData.role}: ${userData.email}`);
            await User.create(userData);
        } else {
            console.log(`Updating ${userData.role}: ${userData.email} password`);
            exists.password = userData.password; // This will trigger pre-save hashing
            await exists.save();
        }
    }
    console.log('Seeding complete! Try logging in now.');
    process.exit(0);
};

seed();
