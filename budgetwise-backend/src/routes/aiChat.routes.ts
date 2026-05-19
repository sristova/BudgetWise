// src/routes/aiChat.routes.ts
import { Router } from 'express';
import { getChatHistory, sendMessage, clearHistory, parseReceipt } from '../controllers/aiChat.controller';
import { aiRateLimit } from '../middleware/rateLimit';

const router = Router();

router.get('/history', getChatHistory);
router.post('/message', aiRateLimit, sendMessage);
router.delete('/history', clearHistory);
router.post('/parse-receipt', aiRateLimit, parseReceipt);

export default router;
