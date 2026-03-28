
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const ATLAS_URI = 'mongodb+srv://hemanth:Hemanth123@cluster0.cki06oc.mongodb.net/foodcourt?appName=Cluster0';

async function performNeatSetup() {
  try {
    console.log('--- NEAT SETUP STARTED ---');
    await mongoose.connect(ATLAS_URI, { serverSelectionTimeoutMS: 50000, connectTimeoutMS: 50000 });
    console.log('✅ Connected to Atlas.');

    const Restaurant = mongoose.model('Restaurant', new mongoose.Schema({}, { strict: false }), 'restaurants');
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
    const Rider = mongoose.model('Rider', new mongoose.Schema({}, { strict: false }), 'riders');
    const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }), 'orders');
    const Transaction = mongoose.model('Transaction', new mongoose.Schema({}, { strict: false }), 'transactions');
    const Notification = mongoose.model('Notification', new mongoose.Schema({}, { strict: false }), 'notifications');
    const MenuItem = mongoose.model('MenuItem', new mongoose.Schema({}, { strict: false }), 'menuitems');
    const Coupon = mongoose.model('Coupon', new mongoose.Schema({}, { strict: false }), 'coupons');

    const keepRestaurantNames = [
        'Food Court Central Kitchen (Tenali)',
        'KFC',
        'The Pan Indian Food'
    ];

    // Find our specific restaurants to keep their IDs/owners
    const herRestaurants = await Restaurant.find({ name: { $in: keepRestaurantNames } });
    const herOwnerIds = herRestaurants.map(r => r.owner);
    const herRIDs = herRestaurants.map(r => r._id);

    console.log(`Found ${herRestaurants.length} restaurants to preserve.`);

    // 1. DELETE EVERYTHING NOT OUR CORE DATA
    // Clearing orders/transactions mostly to have a clean historical record
    console.log('Cleaning environment...');
    await Order.deleteMany({});
    await Transaction.deleteMany({});
    await Notification.deleteMany({});
    await Coupon.deleteMany({});
    
    // Partially delete restaurants: delete those NOT in our list
    await Restaurant.deleteMany({ name: { $nin: keepRestaurantNames } });
    // And their menu items (default ones will be re-seeded)
    await MenuItem.deleteMany({ restaurant: { $nin: herRIDs } });
    
    // Partially delete users: delete those NOT owners or admin
    // User mentioned: admin 1, user 1, rider 1.
    // I'll keep: FoodCourt Admin, one Rider, her owners.
    const keepUserQuery = { 
        $or: [
            { name: 'FoodCourt Admin' },
            { role: 'admin' },
            { _id: { $in: herOwnerIds } }
        ]
    };
    await User.deleteMany({ 
        $and: [
            { name: { $nin: ['FoodCourt Admin', 'Bobby', 'Rishi', 'Restaurant Partner'] } },
            { email: { $ne: 'admin@foodcourt.com' } },
            { role: { $ne: 'admin' } },
            { _id: { $nin: herOwnerIds } }
        ]
    });
    
    // Setup Riders neatly (keep only one)
    const allRiders = await Rider.find({});
    if (allRiders.length > 1) {
        await Rider.deleteMany({ _id: { $ne: allRiders[0]._id } });
    }

    // 2. ADD DEFAULT DATA (Smoke House, Sakura, Bella Italia)
    // Borrowing from seed.js logic
    const defaultRestaurants = [
      {
        name: 'The Smoke House',
        description: 'Award-winning burgers & BBQ crafted with locally sourced premium ingredients.',
        image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
        cuisines: ['American', 'Burgers', 'BBQ'],
        rating: 4.8,
        deliveryTime: 25,
        deliveryFee: 0,
        isOpen: true,
        isApproved: true,
        location: { address: '42 Gourmet Street', city: 'Mumbai', state: 'MH' },
        menu: [
          { name: 'Signature Smash Burger', price: 349, category: 'Mains', isVeg: false },
          { name: 'Crispy Chicken Wings', price: 249, category: 'Starters', isVeg: false }
        ]
      },
      {
        name: 'Sakura Japanese',
        description: 'Authentic Osaka-style sushi & ramen crafted by our Michelin-trained chef.',
        image: 'https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=800&q=80',
        cuisines: ['Japanese', 'Sushi', 'Ramen'],
        rating: 4.9,
        deliveryTime: 30,
        deliveryFee: 49,
        isOpen: true,
        isApproved: true,
        location: { address: '8 Bandra Link Road', city: 'Mumbai', state: 'MH' },
        menu: [
          { name: 'Dragon Roll (8 pcs)', price: 599, category: 'Sushi', isVeg: false },
          { name: 'Tonkotsu Ramen', price: 399, category: 'Mains', isVeg: false }
        ]
      },
      {
        name: 'Bella Italia',
        description: 'Authentic wood-fired Neapolitan pizza and handmade pasta straight from Naples.',
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80',
        cuisines: ['Italian', 'Pizza', 'Pasta'],
        rating: 4.7,
        deliveryTime: 20,
        deliveryFee: 0,
        isOpen: true,
        isApproved: true,
        location: { address: '15 Colaba Causeway', city: 'Mumbai', state: 'MH' },
        menu: [
            { name: 'Margherita Pizza', price: 329, category: 'Pizza', isVeg: true },
            { name: 'Truffle Pasta', price: 379, category: 'Pasta', isVeg: true }
        ]
      }
    ];

    const adminUser = await User.findOne({ role: 'admin' });

    for (const resData of defaultRestaurants) {
        const { menu, ...info } = resData;
        const restaurant = await Restaurant.create({ ...info, owner: adminUser ? adminUser._id : null });
        for (const item of menu) {
            await MenuItem.create({ ...item, restaurant: restaurant._id, isAvailable: true });
        }
        console.log(`Added default restaurant: ${restaurant.name}`);
    }

    console.log('--- NEAT SETUP FINISHED ---');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
performNeatSetup();
