import mongoose from 'mongoose';

async function listAll() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/foodcourt');
        const db = mongoose.connection.db;
        const restaurants = await db.collection('restaurants').find({}).toArray();
        console.log('--- ALL RESTAURANTS ---');
        restaurants.forEach(r => {
            console.log(`- ${r.name}: ${r.location?.address}, ${r.location?.city}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

listAll();
