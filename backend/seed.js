/**
 * seed.js  —  Seeds the DB with 4 Demo Users + 6 realistic restaurants + their menu items
 * Run:  node seed.js   (from the /backend directory)
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Restaurant from './src/models/Restaurant.js';
import MenuItem from './src/models/MenuItem.js';
import Coupon from './src/models/Coupon.js';
import User from './src/models/User.js';
import Rider from './src/models/Rider.js';

dotenv.config();

// ─── User Data ────────────────────────────────────────────────
const userData = [
  {
    name: 'FoodCourt Admin',
    email: 'admin@foodcourt.com',
    password: 'admin123',
    role: 'admin',
    phone: '9999999999'
  },
  {
    name: 'Demo Customer',
    email: 'user@foodcourt.com',
    password: 'user123',
    role: 'customer',
    phone: '8888888888',
    wallet: { balance: 500 }
  },
  {
    name: 'Restaurant Partner',
    email: 'partner@foodcourt.com',
    password: 'partner123',
    role: 'restaurant',
    phone: '7777777777'
  },
  {
    name: 'Delivery Rider',
    email: 'rider@foodcourt.com',
    password: 'rider123',
    role: 'rider',
    phone: '6666666666'
  }
];

// ─── Restaurant Data ───────────────────────────────────────────
const restaurantData = [
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
      { name: 'Signature Smash Burger', price: 349, category: 'Mains', description: 'Double smash patty, aged cheddar, caramelized onions & secret sauce on brioche bun.', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80', isVeg: false },
      { name: 'Crispy Chicken Wings', price: 249, category: 'Starters', description: 'Marinated overnight, tossed in buffalo or honey-garlic sauce. Blue cheese dip.', image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&q=80', isVeg: false },
      { name: 'Truffle Mac & Cheese', price: 279, category: 'Mains', description: 'Rich béchamel, gruyère & sharp cheddar, topped with shaved black truffle.', image: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=400&q=80', isVeg: true },
      { name: 'BBQ Platter', price: 599, category: 'Mains', description: '200g slow-smoked brisket, 4 ribs, 2 sausages, coleslaw & fries.', image: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400&q=80', isVeg: false },
      { name: 'Molten Lava Cake', price: 159, category: 'Desserts', description: 'Warm dark chocolate cake with molten center. Vanilla bean ice cream.', image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&q=80', isVeg: true },
    ],
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
      { name: 'Dragon Roll (8 pcs)', price: 599, category: 'Sushi', description: 'Prawn tempura, avocado, cucumber topped with tobiko & drizzle.', image: 'https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=400&q=80', isVeg: false },
      { name: 'Tonkotsu Ramen', price: 399, category: 'Mains', description: '12-hour pork bone broth, chashu, soft-boiled egg, bamboo shoots & nori.', image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&q=80', isVeg: false },
    ],
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
      { name: 'Margherita Pizza', price: 329, category: 'Pizza', description: 'San Marzano tomatoes, fresh mozzarella, basil & extra-virgin olive oil.', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80', isVeg: true },
      { name: 'Truffle Pasta', price: 379, category: 'Pasta', description: 'Fresh tagliolini, black truffle shavings, parmesan & cream.', image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&q=80', isVeg: true },
    ],
  }
];

// ─── Seed Function ───────────────────────────────────────────────
const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Restaurant.deleteMany({});
    await MenuItem.deleteMany({});
    await Coupon.deleteMany({});
    await User.deleteMany({});
    await Rider.deleteMany({});
    console.log('🗑️  Cleared old data (Users, Riders, Restaurants, Menus, Coupons)');

    // 1. Seed Users
    const users = await User.create(userData);
    console.log('👥 Seeded Demo Users');

    const adminUser = users.find(u => u.role === 'admin');
    const partnerUser = users.find(u => u.role === 'restaurant');
    const riderUser = users.find(u => u.role === 'rider');

    // 2. Seed Rider Profile
    await Rider.create({
      user: riderUser._id,
      fullName: riderUser.name,
      licenseNumber: 'DL-1234567890',
      vehicleType: 'bike',
      vehicleNumber: 'MH-12-AB-1234',
      status: 'APPROVED',
      isVerified: true,
      isOnline: true
    });
    console.log('🛵 Seeded Rider Profile (Status: APPROVED)');

    // 3. Seed Coupons
    const coupons = [
      { code: 'PIZZA40', description: '40% Off on Pizzas', discountType: 'percentage', discountValue: 40, maxDiscount: 200, minOrderValue: 400 },
      { code: 'FIRST50', description: 'Flat 50% Off on First Order', discountType: 'percentage', discountValue: 50, maxDiscount: 150, minOrderValue: 200 },
      { code: 'FREEDEL', description: 'Free Delivery on any order', discountType: 'fixed', discountValue: 50, minOrderValue: 300 },
    ];
    await Coupon.create(coupons);
    console.log('🎟️  Seeded Coupons');

    // 4. Seed Restaurants
    for (const { menu, ...restData } of restaurantData) {
      // Create the restaurant with 'partner' as owner
      const restaurant = await Restaurant.create({
        ...restData,
        owner: partnerUser._id
      });

      // Create its menu items linked to this restaurant
      const menuItemIds = [];
      for (const itemData of menu) {
        const item = await MenuItem.create({
          ...itemData,
          restaurant: restaurant._id,
          isAvailable: true,
        });
        menuItemIds.push(item._id);
      }

      // Link menu items back to the restaurant
      restaurant.menu = menuItemIds;
      await restaurant.save();
      console.log(`  🍽️  Seeded: ${restaurant.name} (${menu.length} items)`);
    }

    console.log('\n🚀 Database seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
};

seedDB();