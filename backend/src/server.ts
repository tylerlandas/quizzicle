import dotenv from 'dotenv';
import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
// import app from './app';
import userRoutes from './routes/users';
import questionRoutes from './routes/questions';
import sessionRoutes from './routes/sessions';

dotenv.config();

const PORT = process.env.PORT || 3001;

const app = express();

// Local dev origins are always allowed; ALLOWED_ORIGIN adds the deployed
// frontend URL(s) in production (comma-separated, e.g. a Vercel domain).
const devOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const prodOrigins = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(',').map((origin) => origin.trim())
  : [];

app.use(cors({ origin: [...devOrigins, ...prodOrigins] }));
app.use(express.json());


app.use('/api/users', userRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/sessions', sessionRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', dbState: mongoose.connection.readyState });
});

app.listen(PORT, () => {
  console.log(`Quizzicle backend running on http://localhost:${PORT}`);
});

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
