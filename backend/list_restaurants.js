import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Restaurant from './src/models/Restaurant.js';
import User from './src/models/User.js';

dotenv.config();

async function listRestaurants() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const restaurants = await Restaurant.find().populate('owner', 'name email role');
        console.log('Total Restaurants in DB:', restaurants.length);

        restaurants.forEach(r => {
            console.log(`- name: "${r.name}"`);
            console.log(`  city: "${r.location?.city}"`);
            console.log('---');
        });

        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
    }
}

listRestaurants();
