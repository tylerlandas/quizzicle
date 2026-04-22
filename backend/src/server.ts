import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import userRoutes from './routes/users';
import questionRoutes from './routes/questions';
import sessionRoutes from './routes/sessions';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quizzicle';

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/sessions', sessionRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', dbState: mongoose.connection.readyState });
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB at', MONGODB_URI);
    app.listen(PORT, () => {
      console.log(`Quizzicle backend running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  });
