import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Restaurant from './src/models/Restaurant.js';
import MenuItem from './src/models/MenuItem.js';
import User from './src/models/User.js';

dotenv.config();

async function findOrphans() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const restaurants = await Restaurant.find().populate('owner');
        for (const r of restaurants) {
            const count = await MenuItem.countDocuments({ restaurant: r._id });
            console.log(`- ${r.name} (ID: ${r._id})`);
            console.log(`  Owner: ${r.owner?.name} (${r.owner?.email})`);
            console.log(`  Items: ${count}`);
            console.log('---');
        }

        const menuItems = await MenuItem.find();
        console.log(`Total Menu Items: ${menuItems.length}`);

        // Find if any menu items are pointing to non-existent restaurants
        for (const item of menuItems) {
            const r = await Restaurant.findById(item.restaurant);
            if (!r) {
                console.log(`!! Menu Item "${item.name}" (ID: ${item._id}) points to MISSING RESTAURANT ID: ${item.restaurant.toString()}`);
            }
        }

        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
    }
}

findOrphans();
