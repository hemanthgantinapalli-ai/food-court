const mongoose = require('mongoose');

async function update() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/foodcourt');
    const Order = mongoose.connection.collection('orders');
    const Rest = mongoose.connection.collection('restaurants');
    
    // Find the current active order
    const o = await Order.findOne({ orderId: 'FC98334294000144' });
    if (!o) throw new Error('Order not found');
    
    const r_id = o.restaurant;
    
    // 1. Destination: Tenali Junction Railway Station
    const dest = {
        street: "Station Road, Morrispet",
        area: "Tenali Junction",
        city: "Tenali",
        state: "Andhra Pradesh",
        zipCode: "522201",
        country: "India",
        latitude: 16.2410, 
        longitude: 80.6380,
        label: "Home"
    };
    
    // 2. Restaurant: Food Court Central Kitchen (Tenali Center)
    const restLoc = {
        address: "Main Road, Ramalingeswara Pet, Tenali, AP",
        city: "Tenali",
        latitude: 16.2435,
        longitude: 80.6480
    };
    
    await Order.updateOne({ _id: o._id }, { 
        $set: { 
            'deliveryAddress': dest
        } 
    });
    
    if (r_id) {
        await Rest.updateOne({ _id: r_id }, { 
            $set: { 
                'location': restLoc,
                'name': 'Food Court Central Kitchen (Tenali)'
            } 
        });
    }
    
    console.log('Successfully updated order and restaurant with high-fidelity valid data.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

update();
