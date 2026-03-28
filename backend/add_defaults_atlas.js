
const admin = db.users.findOne({ role: 'admin' });
const adminId = admin ? admin._id : null;

const defaults = [
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

defaults.forEach(res => {
  const { menu, ...info } = res;
  info.owner = adminId;
  info.isApproved = true;
  info.isOpen = true;
  
  const insertRes = db.restaurants.insertOne(info);
  const restaurantId = insertRes.insertedId;
  
  const menuWithId = menu.map(m => {
    m.restaurant = restaurantId;
    m.isAvailable = true;
    return m;
  });
  
  const insertMenu = db.menuitems.insertMany(menuWithId);
  const menuIds = Object.values(insertMenu.insertedIds);
  
  db.restaurants.updateOne({ _id: restaurantId }, { $set: { menu: menuIds } });
  console.log("Added restaurant: " + res.name);
});
