import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.js';
import webhookRoutes from './routes/webhooks.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

/**
 * ✅ CLEAN CORS CONFIG (FIXED)
 */
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://app.gohighlevel.com',
  'https://voice-ai-observability-copilot-ui.vercel.app',
  'https://voice-ai-observability-copilot-lxnio5pvz-surajpersonal.vercel.app',
];

const envOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : [];

const allOrigins = [...allowedOrigins, ...envOrigins];

app.use(cors({
  origin: function (origin, callback) {
    // allow server-to-server / curl / railway internal
    if (!origin) return callback(null, true);

    if (allOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log('❌ CORS BLOCKED:', origin);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

/**
 * ✅ IMPORTANT: HANDLE PREFLIGHT REQUESTS
 */
app.options('*', cors());

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
      console.warn('MOCK_MODE=true: seeding demo data.');
      await import('./db/seed.js');
    }
  } else if (!process.env.GHL_API_KEY) {
    console.warn('No GHL_API_KEY configured.');
  }

  app.listen(PORT, () => {
    console.log(`API running on port ${PORT}`);
    console.log(`Mock mode: ${process.env.MOCK_MODE === 'true'}`);
    console.log(`GHL connected: ${!!(process.env.GHL_API_KEY && process.env.GHL_LOCATION_ID)}`);
  });
}

bootstrap();
