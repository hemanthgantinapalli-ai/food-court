import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Restaurant from './src/models/Restaurant.js';
import MenuItem from './src/models/MenuItem.js';

dotenv.config();

async function checkMenu() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const restaurants = await Restaurant.find();
        for (const r of restaurants) {
            const items = await MenuItem.find({ restaurant: r._id });
            console.log(`Restaurant: ${r.name}`);
            console.log(`  Menu items: ${items.length}`);
            if (items.length > 0) {
                console.log(`  Categories: ${[...new Set(items.map(i => i.category))].join(', ')}`);
            }
            console.log('---');
        }

        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkMenu();
