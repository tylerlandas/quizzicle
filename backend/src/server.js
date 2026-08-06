// const dotenv = require('dotenv');
const express = require('express');
const mongoose = require('mongoose');
const userRoutes = require('./routes/users');
const questionRoutes = require('./routes/questions');
const sessionRoutes = require('./routes/sessions');
const app = express();

dotenv.config();

// Local dev origins are always allowed; ALLOWED_ORIGIN adds the deployed
// frontend URL(s) in production (comma-separated, e.g. a Vercel domain).
const devOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const prodOrigins = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(',').map((origin) => origin.trim())
  : [];

app.use(cors({ origin: [...devOrigins, ...prodOrigins] }));
app.use(express.json());

console.log(`Quizzicle Before Routes`);

app.use('/api/users', userRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/sessions', sessionRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', dbState: mongoose.connection.readyState });
  console.log(`api health called.`);
});

console.log(`Quizzicle After Routes`);

// module.exports = app;

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Quizzicle backend running on http://localhost:${PORT}`);
});

console.log(`Quizzicle backend initialized`);

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

  export default app;