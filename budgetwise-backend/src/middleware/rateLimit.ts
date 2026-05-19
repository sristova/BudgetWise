// src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const globalRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX ?? '100'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' },
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX ?? '10'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, code: 'RATE_LIMITED', message: 'Too many auth attempts, please try again later.' },
});

// Ločen rate limit za AI endpointe (Groq klicev je drago)
export const aiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuta
  max: parseInt(process.env.AI_RATE_LIMIT_MAX ?? '20'),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? 'unknown', // per-user, ne per-IP
  message: { success: false, code: 'RATE_LIMITED', message: 'Preveč AI zahtev. Počakaj minuto.' },
});
