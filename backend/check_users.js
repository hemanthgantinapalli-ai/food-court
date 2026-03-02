import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import connectDB from './src/config/database.js';

dotenv.config();

const checkUsers = async () => {
    await connectDB();
    const users = await User.find({}, 'email role');
    console.log('--- Current Users in DB ---');
    console.log(users);
    process.exit(0);
};

checkUsers();
