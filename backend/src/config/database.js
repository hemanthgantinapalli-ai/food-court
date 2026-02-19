import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/foodcourt';

    if (!process.env.MONGODB_URI && !process.env.MONGO_URI && process.env.NODE_ENV === 'production') {
      console.error('MONGODB_URI is not set in environment (production). Aborting.');
      process.exit(1);
    }

    console.log('Using Mongo URI:', mongoUri);

    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
