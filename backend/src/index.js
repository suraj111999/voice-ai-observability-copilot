import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.js';
import webhookRoutes from './routes/webhooks.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'https://app.gohighlevel.com'],
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

app.use('/api', apiRoutes);
app.use('/webhooks', webhookRoutes);

app.get('/', (_req, res) => {
  res.json({
    name: 'Voice AI Observability Copilot',
    version: '1.0.0',
    docs: '/api/health',
  });
});

async function bootstrap() {
  const { getDb } = await import('./db/index.js');
  getDb();

  if (process.env.MOCK_MODE === 'true') {
    const count = getDb().prepare('SELECT COUNT(*) as c FROM agents').get().c;
    if (count === 0) {
      console.warn('MOCK_MODE=true: seeding demo data. Set MOCK_MODE=false for real GHL transcripts.');
      await import('./db/seed.js');
    }
  } else if (!process.env.GHL_API_KEY) {
    console.warn('No GHL_API_KEY — configure Private Integration or webhook to ingest real transcripts.');
  }

  app.listen(PORT, () => {
    console.log(`Observability Copilot API running on http://localhost:${PORT}`);
    console.log(`Mock mode: ${process.env.MOCK_MODE === 'true'}`);
    console.log(`GHL connected: ${!!(process.env.GHL_API_KEY && process.env.GHL_LOCATION_ID)}`);
  });
}

bootstrap();
