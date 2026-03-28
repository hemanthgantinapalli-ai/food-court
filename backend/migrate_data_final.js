
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const LOCAL_URI = 'mongodb://127.0.0.1:27017/foodcourt';
const ATLAS_URI = 'mongodb+srv://hemanth:Hemanth123@cluster0.cki06oc.mongodb.net/foodcourt?appName=Cluster0';

async function migrate() {
    let localConn, atlasConn;
    try {
        console.log('--- Full Migration of remaining collections ---');
        localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
        atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();

        // Include everything else
        const collections = ['riders', 'orders', 'bookings', 'notifications', 'settings', 'supportrequests', 'coupons', 'transactions', 'carts'];

        for (const collName of collections) {
            console.log(`\nChecking collection: ${collName}...`);
            const localColl = localConn.collection(collName);
            const atlasColl = atlasConn.collection(collName);

            const data = await localColl.find({}).toArray();
            if (data.length === 0) continue;

            console.log(`- Moving ${data.length} documents for ${collName}`);
            for (const doc of data) {
                try {
                    const exists = await atlasColl.findOne({ _id: doc._id });
                    if (!exists) {
                        await atlasColl.insertOne(doc);
                    }
                } catch (err) {}
            }
        }

        console.log('\n--- Full Migration Completed! ---');
        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}
migrate();
