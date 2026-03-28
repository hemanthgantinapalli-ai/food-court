
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const LOCAL_URI = 'mongodb://127.0.0.1:27017/foodcourt';
const ATLAS_URI = 'mongodb+srv://hemanth:Hemanth123@cluster0.cki06oc.mongodb.net/foodcourt?appName=Cluster0';

async function fullSync() {
    let localConn, atlasConn;
    try {
        console.log('=== FULL SYNC: Local Compass → Atlas ===\n');
        localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
        atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
        console.log('✅ Both DBs connected.\n');

        // Get ALL collections from local
        const localCollections = await localConn.db.listCollections().toArray();
        const collectionNames = localCollections.map(c => c.name);
        console.log('Collections found in local:', collectionNames.join(', '), '\n');

        for (const collName of collectionNames) {
            const localColl = localConn.collection(collName);
            const atlasColl = atlasConn.collection(collName);

            const allLocalDocs = await localColl.find({}).toArray();
            if (allLocalDocs.length === 0) {
                console.log(`- ${collName}: [empty, skipping]`);
                continue;
            }

            let inserted = 0;
            let updated = 0;
            for (const doc of allLocalDocs) {
                try {
                    const exists = await atlasColl.findOne({ _id: doc._id });
                    if (!exists) {
                        await atlasColl.insertOne(doc);
                        inserted++;
                    } else {
                        // Update existing with latest local data
                        await atlasColl.replaceOne({ _id: doc._id }, doc);
                        updated++;
                    }
                } catch (err) {
                    // skip individual errors
                }
            }
            console.log(`✅ ${collName}: ${allLocalDocs.length} docs | ${inserted} new | ${updated} updated`);
        }

        // Final count check on Atlas
        console.log('\n=== ATLAS FINAL STATE ===');
        for (const collName of collectionNames) {
            const count = await atlasConn.collection(collName).countDocuments();
            if (count > 0) console.log(`  ${collName}: ${count} docs`);
        }

        console.log('\n🚀 Full sync complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    } finally {
        if (localConn) await localConn.close();
        if (atlasConn) await atlasConn.close();
    }
}

fullSync();
