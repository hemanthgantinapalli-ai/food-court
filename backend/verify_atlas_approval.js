
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const ATLAS_URI = 'mongodb+srv://hemanth:Hemanth123@cluster0.cki06oc.mongodb.net/foodcourt?appName=Cluster0';

async function verify() {
  try {
    await mongoose.connect(ATLAS_URI);
    console.log('Connected.');

    const Restaurant = mongoose.model('Restaurant', new mongoose.Schema({
        name: String,
        isApproved: Boolean,
        location: { city: String }
    }, { strict: false }), 'restaurants');

    const list = await Restaurant.find({});
    console.log(`Found ${list.length} restaurants total.`);
    list.forEach(r => {
        console.log(`- ${r.name} (Approved: ${r.isApproved}, City: ${r.location?.city || 'N/A'})`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
verify();
