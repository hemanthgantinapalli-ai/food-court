/**
 * seed_users.js
 * Run: node seed_users.js
 * Creates fresh test accounts in MongoDB Atlas after the DB wipe.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://hemanth:Hemanth123@cluster0.cki06oc.mongodb.net/foodcourt?appName=Cluster0';

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, lowercase: true, trim: true },
  password: { type: String, select: false },
  role: { type: String, default: 'customer' },
  phone: { type: String, default: '' },
  addresses: [],
  wallet: { balance: { type: Number, default: 0 } },
  isAvailable: { type: Boolean, default: true },
  favorites: [],
  favoriteFoods: [],
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const users = [
  { name: 'Admin User',    email: 'admin@foodcourt.com',    password: 'admin123',    role: 'admin'    },
  { name: 'Test Customer', email: 'user@foodcourt.com',     password: 'user123',     role: 'customer' },
  { name: 'Test Rider',    email: 'rider@foodcourt.com',    password: 'rider123',    role: 'rider'    },
  { name: 'Partner User',  email: 'partner@foodcourt.com',  password: 'partner123',  role: 'restaurant' },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB Atlas');

  for (const u of users) {
    const exists = await User.findOne({ email: u.email });
    if (exists) {
      console.log(`⚠️  User already exists: ${u.email} — skipping`);
      continue;
    }

    const hashedPassword = await bcrypt.hash(u.password, 10);
    await User.create({ ...u, password: hashedPassword });
    console.log(`✅ Created [${u.role}]: ${u.email} / ${u.password}`);
  }

  console.log('\n🎉 Seeding complete! Test credentials:');
  console.log('  Admin:    admin@foodcourt.com    / admin123');
  console.log('  Customer: user@foodcourt.com     / user123');
  console.log('  Rider:    rider@foodcourt.com    / rider123');
  console.log('  Partner:  partner@foodcourt.com  / partner123');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
