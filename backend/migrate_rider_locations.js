import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment');
  process.exit(1);
}

const riderSchema = new mongoose.Schema({
  currentLocation: mongoose.Schema.Types.Mixed,
}, { strict: false });

const Rider = mongoose.model('Rider', riderSchema);

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const riders = await Rider.find({});
    console.log(`🔍 Found ${riders.length} riders to check...`);

    let updatedCount = 0;

    for (const rider of riders) {
      const loc = rider.currentLocation;
      
      // If it exists and is in the old format { latitude, longitude }
      if (loc && loc.latitude !== undefined && loc.longitude !== undefined) {
        console.log(`🔄 Migrating rider: ${rider._id}`);
        
        const newLocation = {
          type: 'Point',
          coordinates: [Number(loc.longitude), Number(loc.latitude)],
          heading: Number(loc.heading) || 0,
          speed: Number(loc.speed) || 0
        };

        await Rider.updateOne(
          { _id: rider._id },
          { $set: { currentLocation: newLocation } }
        );
        updatedCount++;
      }
    }

    console.log(`🎉 Migration complete! Updated ${updatedCount} riders.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
