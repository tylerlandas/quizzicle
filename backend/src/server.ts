import dotenv from 'dotenv';
import mongoose from 'mongoose';
import app from './app';
import userRoutes from './routes/users';
import questionRoutes from './routes/questions';
import sessionRoutes from './routes/sessions';

dotenv.config();

const PORT = process.env.PORT || 3001;

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
