import mongoose from 'mongoose';
import Order from './backend/src/models/Order.js';

async function checkOrders() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/foodcourt');
        const counts = await Order.aggregate([
            { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
        ]);
        console.log('Order Status Counts:', JSON.stringify(counts, null, 2));

        const unassigned = await Order.countDocuments({ rider: null });
        console.log('Unassigned Orders:', unassigned);

        const available = await Order.find({ rider: null, orderStatus: { $in: ['placed', 'confirmed', 'preparing', 'ready'] } });
        console.log('Available Orders Detail:', JSON.stringify(available.map(o => ({ id: o._id, status: o.orderStatus })), null, 2));

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkOrders();
