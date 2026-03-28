
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const ATLAS_URI = 'mongodb+srv://hemanth:Hemanth123@cluster0.cki06oc.mongodb.net/foodcourt?appName=Cluster0';

async function cleanup() {
  try {
    await mongoose.connect(ATLAS_URI);
    console.log('Connected to Atlas.');

    const Restaurant = mongoose.model('Restaurant', new mongoose.Schema({ name: String }, { strict: false }), 'restaurants');
    const User = mongoose.model('User', new mongoose.Schema({ name: String, role: String, email: String }, { strict: false }), 'users');
    const Rider = mongoose.model('Rider', new mongoose.Schema({ user: mongoose.Schema.Types.ObjectId }, { strict: false }), 'riders');
    const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }), 'orders');
    const Transaction = mongoose.model('Transaction', new mongoose.Schema({}, { strict: false }), 'transactions');
    const Notification = mongoose.model('Notification', new mongoose.Schema({}, { strict: false }), 'notifications');
    const MenuItem = mongoose.model('MenuItem', new mongoose.Schema({}, { strict: false }), 'menuitems');

    const keepRestaurants = [
        'Food Court Central Kitchen (Tenali)',
        'KFC',
        'The Pan Indian Food'
    ];

    // 1. Identify restaurants to DELETE
    const allRestaurants = await Restaurant.find({});
    const toDeleteRest = allRestaurants.filter(r => !keepRestaurants.includes(r.name));
    console.log(`Restaurants to delete: ${toDeleteRest.map(r => r.name).join(', ')}`);

    // 2. Identify users to KEEP
    // User mentioned: 1 Admin, 1 User.
    // I will look for 'FoodCourt Admin' and maybe 'Bobby' or 'santosh'?
    // Let's list users first.
    const allUsers = await User.find({});
    console.log('--- ALL USERS ---');
    allUsers.forEach(u => console.log(`- ${u.name} (Role: ${u.role}, Email: ${u.email})`));

    // Wait, the user said they have "admin 1" and "user 1".
    // I'll assume they mean 'FoodCourt Admin' and the customer 'Bobby' or 'santosh'.
    // Let's keep the admin and the customer 'Bobby'.
    const keepUserNames = ['FoodCourt Admin', 'Bobby', 'Rider@foodcourt.com']; // Wait, rider too.
    
    // I'll ask for permission or use my best judgment.
    // Actually, I'll keep one Admin, one Rider, and one Customer.

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
cleanup();
