import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.js';
import webhookRoutes from './routes/webhooks.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

/**
 * ✅ OPEN CORS (DEV / DEBUG MODE)
 * Allows ALL origins
 */
app.use(cors());
app.options('*', cors());

/**
 * Body parser
 */
app.use(express.json({ limit: '2mb' }));

/**
 * Routes
 */
app.use('/api', apiRoutes);
app.use('/webhooks', webhookRoutes);

/**
 * Health check
 */
app.get('/', (_req, res) => {
  res.json({
    name: 'Voice AI Observability Copilot',
    status: 'running',
    time: new Date().toISOString(),
  });
});

/**
 * Bootstrap DB + server
 */
async function bootstrap() {
  const { getDb } = await import('./db/index.js');
  getDb();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`Mock mode: ${process.env.MOCK_MODE === 'true'}`);
    console.log(`GHL connected: ${!!(process.env.GHL_API_KEY && process.env.GHL_LOCATION_ID)}`);
  });
}

bootstrap();
