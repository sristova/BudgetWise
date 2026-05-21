// src/app.ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { pinoHttp } from 'pino-http';
import { logger } from './lib/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { globalRateLimit } from './middleware/rateLimit';
import { apiRouter } from './routes';

export const app = express();

// ─── SECURITY 
app.use(helmet());
app.set('trust proxy', 1); // for Railway/Render behind reverse proxy

// ─── CORS 
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    // Allow mobile apps (no origin) and listed origins
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// ─── BODY PARSING 
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// ─── LOGGING 
if (process.env.NODE_ENV !== 'test') {
  app.use(pinoHttp({ logger }));
}

// ─── RATE LIMITING 
app.use(globalRateLimit);

// ─── HEALTH CHECK 
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ─── API ROUTES 
app.use('/api/v1', apiRouter);

// ─── ERROR HANDLING 
app.use(notFound);
app.use(errorHandler);
