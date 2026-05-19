// src/routes/user.routes.ts
import { Router } from 'express';
import { getProfile, updateProfile, deleteAccount } from '../controllers/user.controller';
const router = Router();
router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.delete('/account', deleteAccount);
export default router;
