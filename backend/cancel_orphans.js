import mongoose from 'mongoose';

const conn = await mongoose.connect('mongodb://127.0.0.1:27017/foodcourt');

// Cancel all confirmed orders that have no restaurant linked (orphaned demo orders)
const result = await conn.connection.collection('orders').updateMany(
    { orderStatus: 'confirmed', restaurant: null },
    { $set: { orderStatus: 'cancelled' } }
);

console.log(`✅ Cancelled ${result.modifiedCount} orphaned confirmed orders.`);

// Also show remaining confirmed orders  
const remaining = await conn.connection.collection('orders').countDocuments({ orderStatus: { $in: ['placed', 'confirmed'] } });
console.log(`📋 Remaining active orders: ${remaining}`);

process.exit(0);
