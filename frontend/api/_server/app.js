import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import keywordRoutes from './routes/keywords.js';
import appsRoutes from './routes/apps.js';
import analysisRoutes from './routes/analysis.js';
import nicheRoutes from './routes/niches.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/keywords', keywordRoutes);
app.use('/api/apps', appsRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/niches', nicheRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

export default app;
