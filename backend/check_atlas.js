
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const USER_URI = 'mongodb+srv://hemanth:Hemanth123@cluster0.cki06oc.mongodb.net/?appName=Cluster0';

async function checkDB() {
  try {
    console.log('Connecting to:', USER_URI);
    await mongoose.connect(USER_URI, { dbName: 'foodcourt' });
    console.log('✅ Successfully connected to MongoDB Atlas!');

    const admin = mongoose.connection.db.admin();
    const dbsInfo = await admin.listDatabases();
    const dbsNames = dbsInfo.databases.map(d => d.name);
    console.log('Available databases:', dbsNames);

    for (const dbName of dbsNames) {
      if (['admin', 'local', 'config'].includes(dbName)) continue;
      
      console.log(`\n--- Checking Database: ${dbName} ---`);
      const targetDb = mongoose.connection.useDb(dbName);
      
      const Restaurant = targetDb.model('Restaurant', new mongoose.Schema({}, { strict: false }), 'restaurants');
      const count = await Restaurant.countDocuments();
      console.log(`- 'restaurants' collection count: ${count}`);
      
      if (count > 0) {
        const list = await Restaurant.find({}, 'name isApproved');
        list.forEach(r => console.log(`  - ${r.name} (Approved: ${r.isApproved})`));
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error during check:', err.message);
    process.exit(1);
  }
}

checkDB();
