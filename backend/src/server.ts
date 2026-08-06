import dotenv from 'dotenv';
import mongoose from 'mongoose';
import app from './app';

// dotenv.config();

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Quizzicle backend running on http://localhost:${PORT}`);
});

//console.log(`Quizzicle backend initialized`);

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
