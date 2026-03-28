import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

const testConnection = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    console.log('Testing connection to:', uri.split('@')[1] || 'URL hidden');
    await mongoose.connect(uri);
    console.log('✅ SEAMLESS ATLAS CONNECTION: SUCCESS');
    process.exit(0);
  } catch (err) {
    console.error('❌ CONNECTION FAILED:', err.message);
    process.exit(1);
  }
};

testConnection();
