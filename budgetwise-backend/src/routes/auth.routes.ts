// src/routes/auth.routes.ts
import { Router } from 'express';
import { register, login, refreshToken, logout, me } from '../controllers/auth.controller';
import { authRateLimit } from '../middleware/rateLimit';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.post('/register', authRateLimit, register);
router.post('/login', authRateLimit, login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/me', authenticate, me);

export default router;
