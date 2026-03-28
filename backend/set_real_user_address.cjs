const mongoose = require('mongoose');

async function update() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/foodcourt');
    const Order = mongoose.connection.collection('orders');
    
    // Find the current active order
    const o = await Order.findOne({ orderId: 'FC98334294000144' });
    if (!o) throw new Error('Order not found');
    
    // Exact user address and coords from Kabela Center link
    const deliveryAddress = {
        street: "19-1-49, M.S. Palem",
        area: "Near Kabela Center, Ramalingeswara Pet",
        city: "Tenali",
        state: "Andhra Pradesh",
        zipCode: "522201",
        country: "India",
        latitude: 16.2316196, 
        longitude: 80.6468509,
        label: "Home"
    };
    
    await Order.updateOne({ _id: o._id }, { 
        $set: { 
            'deliveryAddress': deliveryAddress
        } 
    });
    
    console.log('Successfully adjusted order destination to the REAL Kabela Center address and coordinates.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

update();
