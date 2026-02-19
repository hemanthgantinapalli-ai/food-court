import mongoose from 'mongoose';
import dotenv from 'dotenv';
// IMPORTANT: Update this path to where your Restaurant model is
import Restaurant from './src/models/Restaurant.js'; 

dotenv.config();

const restaurants = [
  { name: "Spice Hub", cuisine: "Indian", rating: 4.5, image: "https://via.placeholder.com/300" },
  { name: "Pizza Palace", cuisine: "Italian", rating: 4.3, image: "https://via.placeholder.com/300" },
  { name: "Dragon Bowl", cuisine: "Chinese", rating: 4.6, image: "https://via.placeholder.com/300" }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await Restaurant.deleteMany({}); // Clears existing data
    await Restaurant.insertMany(restaurants);
    console.log("✅ Database Seeded Successfully!");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedDB();