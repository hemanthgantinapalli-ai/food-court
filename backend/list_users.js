import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import connectDB from './src/config/database.js';

dotenv.config();

const checkUsers = async () => {
    await connectDB();
    const users = await User.find({});
    console.log('--- Current Users in DB ---');
    users.forEach(u => {
        console.log(`[${u.role}] ${u.name} - ${u.email}`);
    });
    console.log('Total:', users.length);
    process.exit(0);
};

checkUsers();
