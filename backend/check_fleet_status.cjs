const mongoose = require('mongoose');

async function check() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/foodcourt');
    const Order = mongoose.connection.collection('orders');
    const User = mongoose.connection.collection('users');

    const activeStatuses = ['placed', 'confirmed', 'preparing', 'ready', 'Assigned', 'Arrived', 'Picked Up', 'picked_up', 'on_the_way'];
    const activeOrders = await Order.find({ orderStatus: { $in: activeStatuses } }).toArray();
    const onlineRiders = await User.find({ role: 'rider', isOnline: true }).toArray();

    console.log('Active Orders Count:', activeOrders.length);
    activeOrders.forEach(o => {
      console.log(`Order: ${o.orderId}, Status: ${o.orderStatus}, RiderID: ${o.rider ? o.rider.toString() : 'None'}`);
      console.log(`- Restaurant: ${o.restaurant}`);
      console.log(`- AddressCoords: ${o.deliveryAddress?.latitude}, ${o.deliveryAddress?.longitude}`);
    });

    console.log('\nOnline Riders:');
    onlineRiders.forEach(r => {
      console.log(`- Name: ${r.name}, ID: ${r._id.toString()}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
