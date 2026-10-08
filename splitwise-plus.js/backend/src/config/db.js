import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

const connectDB = async () => {
  let mongoUri = process.env.MONGODB_URI;

  try {
    if (!mongoUri) {
      const memoryServer = await MongoMemoryServer.create();
      mongoUri = memoryServer.getUri();
      console.log('Using in-memory MongoDB for local development');
    }

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);

    try {
      const memoryServer = await MongoMemoryServer.create();
      const conn = await mongoose.connect(memoryServer.getUri(), {
        serverSelectionTimeoutMS: 5000,
      });

      console.log(`MongoDB connected via fallback memory server: ${conn.connection.host}`);
    } catch (fallbackError) {
      console.error('Fallback MongoDB connection failed:', fallbackError.message);
      process.exit(1);
    }
  }
};

export default connectDB;
