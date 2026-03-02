const mongoose = require('mongoose');

async function checkKFC() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/foodcourt');
        const db = mongoose.connection.db;
        const restaurants = await db.collection('restaurants').find({ name: /KFC/i }).toArray();

        if (restaurants.length > 0) {
            console.log(`Found ${restaurants.length} KFC entry/entries:`);
            restaurants.forEach(r => {
                console.log(`Name: ${r.name}`);
                console.log(`Address: ${r.location?.address || 'N/A'}`);
                console.log(`City: ${r.location?.city || 'N/A'}`);
            });
        } else {
            console.log('KFC not found in the database.');
        }
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
}

checkKFC();
