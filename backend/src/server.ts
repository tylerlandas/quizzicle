import dotenv from 'dotenv';
import mongoose from 'mongoose';
import app from './app';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quizzicle';

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB at', MONGODB_URI);
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  });
