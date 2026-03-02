import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import connectDB from './src/config/database.js';

dotenv.config();

const checkUsers = async () => {
    await connectDB();
    const users = await User.find({});
    const result = users.map(u => ({ role: u.role, name: u.name, email: u.email }));
    console.log('JSON_DATA_START');
    console.log(JSON.stringify(result, null, 2));
    console.log('JSON_DATA_END');
    process.exit(0);
};

checkUsers();
