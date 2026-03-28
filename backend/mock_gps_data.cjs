const mongoose = require('mongoose');

async function update() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/foodcourt');
    const Order = mongoose.connection.collection('orders');
    const Rest = mongoose.connection.collection('restaurants');
    
    const o = await Order.findOne({ orderId: 'FC98334294000144' });
    if (!o) throw new Error('Order not found');
    
    const r_id = o.restaurant;
    
    // Near Tenali, AP (Rider: 16.2306, 80.6468)
    await Order.updateOne({ _id: o._id }, { 
        $set: { 
            'deliveryAddress.latitude': 16.224, 
            'deliveryAddress.longitude': 80.638 
        } 
    });
    
    if (r_id) {
        await Rest.updateOne({ _id: r_id }, { 
            $set: { 
                'location.latitude': 16.236, 
                'location.longitude': 80.655 
            } 
        });
    }
    
    console.log('Successfully updated order and restaurant with GPS coords for testing.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

update();
