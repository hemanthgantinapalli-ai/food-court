import mongoose from 'mongoose';

async function checkRestaurants() {
    try {
        const conn = await mongoose.connect('mongodb://127.0.0.1:27017/foodcourt');
        const restaurants = await conn.connection.collection('restaurants').find({}).toArray();
        console.log('Total Restaurants:', restaurants.length);
        restaurants.forEach(r => {
            console.log(`- ${r.name} | Approved: ${r.isApproved === true} | City: ${r.location?.city || 'N/A'}`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkRestaurants();
