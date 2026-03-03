import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

const seedUsers = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/foodcourt';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB for seeding...');

        // Drop users collection to start fresh
        try {
            await mongoose.connection.db.dropCollection('users');
            console.log('Dropped users collection');
        } catch (e) {
            console.log('Users collection did not exist, skipping drop');
        }

        // Create Admin
        const admin = new User({
            name: 'System Admin',
            email: 'admin@foodcourt.com',
            password: 'admin123',
            role: 'admin'
        });
        await admin.save();
        console.log('✅ Admin user created');

        // Create Rider
        const rider = new User({
            name: 'Fast Rider',
            email: 'rider@foodcourt.com',
            password: 'rider123',
            role: 'rider'
        });
        await rider.save();
        console.log('✅ Rider user created');

        // Create Customer
        const customer = new User({
            name: 'Demo Customer',
            email: 'user@foodcourt.com',
            password: 'user123',
            role: 'customer'
        });
        await customer.save();
        console.log('✅ Customer user created');

        // Create Restaurant Partner
        const partner = new User({
            name: 'Restaurant Partner',
            email: 'partner@foodcourt.com',
            password: 'partner123',
            role: 'restaurant'
        });
        await partner.save();
        console.log('✅ Restaurant Partner user created');

        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
};

seedUsers();
