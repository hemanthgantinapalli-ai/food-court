import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const User = mongoose.model('User', new mongoose.Schema({}));

async function cleanup() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!');

    const count = await mongoose.connection.collection('users').countDocuments();
    console.log(`Found ${count} users.`);

    if (count > 0) {
      const result = await mongoose.connection.collection('users').deleteMany({});
      console.log(`Successfully deleted ${result.deletedCount} users.`);
    } else {
      console.log('No users to delete.');
    }

    // Also cleanup riders since they are linked to users
    await mongoose.connection.collection('riders').deleteMany({});
    console.log('Cleared riders collection as well.');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exit(1);
  }
}

cleanup();
