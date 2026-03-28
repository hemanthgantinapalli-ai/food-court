
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const ATLAS_URI = 'mongodb+srv://hemanth:Hemanth123@cluster0.cki06oc.mongodb.net/?appName=Cluster0';

async function verify() {
  try {
    console.log('Connecting to Atlas...');
    const conn = await mongoose.createConnection(ATLAS_URI).asPromise();
    console.log('Connected.');

    const admin = conn.db.admin();
    const dbsInfo = await admin.listDatabases();
    
    for (const dbInfo of dbsInfo.databases) {
      const dbName = dbInfo.name;
      if (['admin', 'local', 'config'].includes(dbName)) continue;
      
      console.log(`\n--- DB: ${dbName} ---`);
      
      const targetDb = conn.useDb(dbName);
      const collections = await targetDb.db.listCollections().toArray();
      for (const coll of collections) {
          const count = await targetDb.db.collection(coll.name).countDocuments();
          console.log(` - ${coll.name}: ${count} docs`);
          if (coll.name === 'restaurants' && count > 0) {
              const samples = await targetDb.db.collection(coll.name).find({}, { projection: { name: 1 } }).limit(10).toArray();
              console.log('   Samples:', samples.map(s => s.name).join(', '));
          }
      }
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
verify();
