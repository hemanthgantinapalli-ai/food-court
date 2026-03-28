import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'c:/Users/heman/OneDrive/Desktop/food-court/backend/.env' });

const uri = process.env.MONGODB_URI;
console.log('Uri:', uri.split('@')[1]);

try {
  await mongoose.connect(uri, { 
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000
  });
  console.log('SUCCESS');
  process.exit(0);
} catch (e) {
  console.error('FAILED:', e.message);
  process.exit(1);
}
