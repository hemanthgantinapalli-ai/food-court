import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'mongodb';
const { MongoClient, BSON } = pkg;
const { EJSON } = BSON;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!uri) {
  console.error('❌ MONGODB_URI or MONGO_URI is not set in backend/.env');
  process.exit(1);
}

const outputDir = path.join(__dirname, 'atlas-export');

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
});

try {
  console.log('Connecting to Atlas...');
  await client.connect();

  const dbName = new URL(uri.split('?')[0]).pathname.replace(/^\//, '') || 'foodcourt';
  const db = client.db(dbName);

  const collections = await db.listCollections().toArray();
  if (collections.length === 0) {
    console.warn('⚠️ No collections found in database:', dbName);
  }

  await fs.mkdir(outputDir, { recursive: true });

  for (const { name } of collections) {
    console.log(`Exporting collection: ${name}`);
    const docs = await db.collection(name).find({}).toArray();
    const exportPath = path.join(outputDir, `${name}.json`);
    await fs.writeFile(exportPath, EJSON.stringify(docs, { relaxed: true, indent: 2 }), 'utf8');
    console.log(`  -> written ${docs.length} documents to ${exportPath}`);
  }

  console.log(`
Export complete. Files are in: ${outputDir}`);
} catch (error) {
  console.error('Export failed:', error);
  process.exit(1);
} finally {
  await client.close();
}
