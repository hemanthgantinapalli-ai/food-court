
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
        console.log('--- Migration Started ---');
        
        // 1. Connect to Local
        console.log('Connecting to Local MongoDB...');
        localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
        console.log('✅ Local Connected');

        // 2. Connect to Atlas
        console.log('Connecting to Atlas MongoDB...');
        atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
        console.log('✅ Atlas Connected');

        // Collections to migrate (Core only first)
        const collections = ['users', 'restaurants', 'menuitems'];

        for (const collName of collections) {
            console.log(`\nMigrating collection: ${collName}...`);
            
            const localColl = localConn.collection(collName);
            const atlasColl = atlasConn.collection(collName);

            const data = await localColl.find({}).toArray();
            console.log(`- Found ${data.length} documents in local ${collName}`);

            if (data.length === 0) {
                console.log(`- Skipping ${collName} (empty)`);
                continue;
            }

            // Insert into Atlas (ignoring duplicates by name/email/ID to prevent crashes on retry)
            let insertedCount = 0;
            for (const doc of data) {
                try {
                    // Check if exists in Atlas by ID
                    const exists = await atlasColl.findOne({ _id: doc._id });
                    if (!exists) {
                        await atlasColl.insertOne(doc);
                        insertedCount++;
                    }
                } catch (err) {
                    // ignore individual insert errors (like duplicates)
                }
            }
            console.log(`- Successfully updated Atlas with ${insertedCount} new ${collName} documents.`);
        }

        console.log('\n--- Migration Completed! ---');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration Error:', err.message);
        process.exit(1);
    } finally {
        if (localConn) localConn.close();
        if (atlasConn) atlasConn.close();
    }
}

migrate();
