/**
 * seed.js  —  Seeds the DB with 6 realistic restaurants + their menu items
 * Run:  node seed.js   (from the /backend directory)
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Restaurant from './src/models/Restaurant.js';
import MenuItem from './src/models/MenuItem.js';
import Coupon from './src/models/Coupon.js';

dotenv.config();

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
    location: { address: '8 Bandra Link Road', city: 'Mumbai', state: 'MH' },
    menu: [
      { name: 'Dragon Roll (8 pcs)', price: 599, category: 'Sushi', description: 'Prawn tempura, avocado, cucumber topped with tobiko & drizzle.', image: 'https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=400&q=80', isVeg: false },
      { name: 'Spicy Tuna Roll', price: 499, category: 'Sushi', description: 'Fresh tuna, sriracha mayo, cucumber & sesame seeds.', image: 'https://images.unsplash.com/photo-1559410545-0bdcd187e0a6?w=400&q=80', isVeg: false },
      { name: 'Tonkotsu Ramen', price: 399, category: 'Mains', description: '12-hour pork bone broth, chashu, soft-boiled egg, bamboo shoots & nori.', image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&q=80', isVeg: false },
      { name: 'Miso Soup + Edamame', price: 149, category: 'Starters', description: 'Traditional white miso, silken tofu, wakame seaweed & green onion.', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80', isVeg: true },
      { name: 'Matcha Ice Cream', price: 199, category: 'Desserts', description: 'Premium Uji matcha ice cream served with black sesame brittle.', image: 'https://images.unsplash.com/photo-1541450805268-4822a3a774ca?w=400&q=80', isVeg: true },
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
    location: { address: '15 Colaba Causeway', city: 'Mumbai', state: 'MH' },
    menu: [
      { name: 'Margherita Pizza', price: 329, category: 'Pizza', description: 'San Marzano tomatoes, fresh mozzarella, basil & extra-virgin olive oil.', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80', isVeg: true },
      { name: 'Pepperoni Diavola', price: 429, category: 'Pizza', description: 'Spicy pepperoni, fiery chillies, smoked mozzarella on tomato base.', image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&q=80', isVeg: false },
      { name: 'Truffle Pasta', price: 379, category: 'Pasta', description: 'Fresh tagliolini, black truffle shavings, parmesan & cream.', image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&q=80', isVeg: true },
      { name: 'Bruschetta al Pomodoro', price: 179, category: 'Starters', description: 'Grilled sourdough, roma tomatoes, garlic, fresh basil & EVOO.', image: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=400&q=80', isVeg: true },
      { name: 'Tiramisu', price: 229, category: 'Desserts', description: 'Authentic Italian tiramisu with mascarpone, espresso & cocoa.', image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&q=80', isVeg: true },
    ],
  },
  {
    name: 'Spice Garden',
    description: 'Authentic Indian curries, biryanis, and tandoor delicacies from royal kitchens.',
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80',
    cuisines: ['Indian', 'Curry', 'Biryani'],
    rating: 4.6,
    deliveryTime: 35,
    deliveryFee: 29,
    isOpen: true,
    location: { address: '77 Andheri East', city: 'Mumbai', state: 'MH' },
    menu: [
      { name: 'Chicken Biryani', price: 349, category: 'Mains', description: 'Lucknowi dum biryani with saffron, whole spices, raita & salan.', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&q=80', isVeg: false },
      { name: 'Butter Chicken', price: 299, category: 'Mains', description: 'Tender chicken in rich tomato-butter-cream gravy. Served with naan.', image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&q=80', isVeg: false },
      { name: 'Paneer Tikka Masala', price: 249, category: 'Mains', description: 'Cottage cheese in vibrant, spiced tomato masala. Served with roti.', image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&q=80', isVeg: true },
      { name: 'Veg Samosa (4 pcs)', price: 99, category: 'Starters', description: 'Crispy pastry filled with spiced potato & peas. Green & tamarind chutney.', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80', isVeg: true },
      { name: 'Gulab Jamun', price: 99, category: 'Desserts', description: 'Soft milk-solid dumplings soaked in rose-cardamom sugar syrup.', image: 'https://images.unsplash.com/photo-1589734722768-4a9b7f8d57b5?w=400&q=80', isVeg: true },
    ],
  },
  {
    name: 'Green Bowl',
    description: 'Nutritious, beautifully crafted salads, smoothie bowls & plant-based mains.',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
    cuisines: ['Healthy', 'Salads', 'Vegan'],
    rating: 4.5,
    deliveryTime: 20,
    deliveryFee: 0,
    isOpen: true,
    location: { address: '3 Powai Lake Road', city: 'Mumbai', state: 'MH' },
    menu: [
      { name: 'SuperGreen Buddha Bowl', price: 299, category: 'Mains', description: 'Quinoa, kale, avocado, roasted sweet potato, hummus & tahini dressing.', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80', isVeg: true },
      { name: 'Mediterranean Salad', price: 249, category: 'Starters', description: 'Mixed greens, feta, kalamata olives, cherry tomatoes & lemon-herb dressing.', image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80', isVeg: true },
      { name: 'Acai Smoothie Bowl', price: 199, category: 'Bowls', description: 'Frozen acai, banana, strawberry topped with granola, coconut & honey.', image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400&q=80', isVeg: true },
      { name: 'Grilled Chicken Wrap', price: 279, category: 'Mains', description: 'Lean grilled chicken, romaine, tomato, cucumber & low-fat ranch in a whole-wheat tortilla.', image: 'https://images.unsplash.com/photo-1605333396915-47ed6b68a00e?w=400&q=80', isVeg: false },
      { name: 'Chia Pudding', price: 149, category: 'Desserts', description: 'Overnight chia in almond milk, topped with fresh mango & mint.', image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400&q=80', isVeg: true },
    ],
  },
  {
    name: 'Dragon Palace',
    description: 'Classic Cantonese and Sichuan flavors in a vibrant pan-Asian dining experience.',
    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&q=80',
    cuisines: ['Chinese', 'Dim Sum', 'Noodles'],
    rating: 4.7,
    deliveryTime: 30,
    deliveryFee: 39,
    isOpen: true,
    location: { address: '22 Worli Sea Face', city: 'Mumbai', state: 'MH' },
    menu: [
      { name: 'Dim Sum Basket (6 pcs)', price: 299, category: 'Starters', description: 'Mixed steamed dim sum: har gow, siu mai & crystal dumpling. Soy & chilli dip.', image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&q=80', isVeg: false },
      { name: 'Kung Pao Chicken', price: 329, category: 'Mains', description: 'Wok-tossed chicken, peanuts, dried chillies & Sichuan peppercorn glaze.', image: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=400&q=80', isVeg: false },
      { name: 'Vegetable Hakka Noodles', price: 219, category: 'Mains', description: 'Indo-Chinese style stir-fried noodles with fresh veggies & soy sauce.', image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&q=80', isVeg: true },
      { name: 'Hot & Sour Soup', price: 149, category: 'Starters', description: 'Traditional tangy & spicy broth with mushrooms, tofu & bamboo shoots.', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80', isVeg: true },
      { name: 'Mango Pudding', price: 149, category: 'Desserts', description: 'Silky Cantonese-style mango pudding with fresh mango coulis.', image: 'https://images.unsplash.com/photo-1541450805268-4822a3a774ca?w=400&q=80', isVeg: true },
    ],
  },
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
    console.log('🗑️  Cleared old data');

    // Seed Coupons
    const coupons = [
      { code: 'PIZZA40', description: '40% Off on Pizzas', discountType: 'percentage', discountValue: 40, maxDiscount: 200, minOrderValue: 400 },
      { code: 'FIRST50', description: 'Flat 50% Off on First Order', discountType: 'percentage', discountValue: 50, maxDiscount: 150, minOrderValue: 200 },
      { code: 'FREEDEL', description: 'Free Delivery on any order', discountType: 'fixed', discountValue: 50, minOrderValue: 300 },
      { code: 'WEEKEND30', description: '30% Off on Weekends', discountType: 'percentage', discountValue: 30, maxDiscount: 100 },
    ];
    await Coupon.create(coupons);
    console.log('🎟️  Seeded Coupons');

    for (const { menu, ...restData } of restaurantData) {
      // 1. Create the restaurant
      const restaurant = await Restaurant.create(restData);

      // 2. Create its menu items linked to this restaurant
      const menuItemIds = [];
      for (const itemData of menu) {
        const item = await MenuItem.create({
          ...itemData,
          restaurant: restaurant._id,
          isAvailable: true,
        });
        menuItemIds.push(item._id);
      }

      // 3. Link menu items back to the restaurant
      restaurant.menu = menuItemIds;
      await restaurant.save();
      console.log(`  🍽️  Seeded: ${restaurant.name} (${menu.length} items)`);
    }

    console.log('\n🚀 Database seeded successfully!');
    console.log(`   ${restaurantData.length} restaurants with full menus are ready.\n`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
};

seedDB();