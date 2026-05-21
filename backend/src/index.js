import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import keywordRoutes from './routes/keywords.js';
import appsRoutes from './routes/apps.js';
import analysisRoutes from './routes/analysis.js';
import nicheRoutes from './routes/niches.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests, slow down.' }
});
app.use('/api/', limiter);

app.use('/api/keywords', keywordRoutes);
app.use('/api/apps', appsRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/niches', nicheRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => console.log(`AppNiche API running on port ${PORT}`));
