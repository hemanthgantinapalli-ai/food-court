import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Restaurant from './src/models/Restaurant.js';
import MenuItem from './src/models/MenuItem.js';
import User from './src/models/User.js';

dotenv.config();

async function fixDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const partnerUser = await User.findOne({ email: 'partner@foodcourt.com' });
        const rishiUser = await User.findOne({ email: 'rishi@gmail.com' });

        if (!partnerUser || !rishiUser) {
            console.error('Users not found!');
            return;
        }

        // 1. Transfer RISHI BIRYANIS to Rishi
        const rishiRest = await Restaurant.findOne({ name: 'RISHI BIRYANIS' });
        if (rishiRest) {
            rishiRest.owner = rishiUser._id;
            await rishiRest.save();
            console.log('✅ RISHI BIRYANIS transferred to Rishi');
        }

        // 2. Ensure all other restaurants have an owner (if any are missing)
        const orphans = await Restaurant.find({ owner: { $exists: false } });
        for (const o of orphans) {
            o.owner = partnerUser._id;
            await o.save();
            console.log(`✅ Assigned owner to orphan restaurant: ${o.name}`);
        }

        // 3. Fix orphaned menu items
        const menuItems = await MenuItem.find();
        for (const item of menuItems) {
            const r = await Restaurant.findById(item.restaurant);
            if (!r) {
                console.log(`🔍 Fixing orphaned menu item: ${item.name}`);
                // Try to find a logical restaurant
                if (['biryani', 'dosa', 'idli', 'vada', 'pongal', 'uttapam'].some(kw => item.name.toLowerCase().includes(kw))) {
                    if (rishiRest) {
                        item.restaurant = rishiRest._id;
                        await item.save();
                        console.log(`   -> Re-associated with RISHI BIRYANIS`);
                    }
                } else {
                    // Default to the first partner restaurant (Smoke House)
                    const smokeHouse = await Restaurant.findOne({ name: 'The Smoke House' });
                    if (smokeHouse) {
                        item.restaurant = smokeHouse._id;
                        await item.save();
                        console.log(`   -> Re-associated with The Smoke House`);
                    }
                }
            }
        }

        // 4. Update approval status just in case
        await Restaurant.updateMany({}, { isApproved: true });
        console.log('✅ All restaurants marked as approved');

        // 5. Cleanup South Indian dishes in American restaurants
        const smokeHouse = await Restaurant.findOne({ name: 'The Smoke House' });
        if (smokeHouse && rishiRest) {
            const misplaced = await MenuItem.find({
                restaurant: smokeHouse._id,
                name: { $regex: /idli|dosa|biryani|vada|pongal|uttapam/i }
            });
            for (const m of misplaced) {
                m.restaurant = rishiRest._id;
                await m.save();
                console.log(`✅ Moved misplaced item "${m.name}" from Smoke House to RISHI BIRYANIS`);
            }
        }

        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
    }
}

fixDB();
