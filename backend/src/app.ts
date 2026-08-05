import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import userRoutes from './routes/users';
import questionRoutes from './routes/questions';
import sessionRoutes from './routes/sessions';

const app = express();
const port = process.env.PORT || 4000;

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

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

export default app;
