import mongoose from 'mongoose';

const conn = await mongoose.connect('mongodb://127.0.0.1:27017/foodcourt');
const active = ['placed', 'confirmed', 'preparing', 'ready', 'picked_up', 'on_the_way'];
const orders = await conn.connection.collection('orders').find({ orderStatus: { $in: active } }).toArray();
console.log('Active orders count:', orders.length);
orders.forEach(o => console.log('-', o.orderId || o._id, '|', o.orderStatus, '| restaurant:', o.restaurant));
process.exit(0);
