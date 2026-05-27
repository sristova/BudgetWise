import { Router } from 'express';
import { getProfile, updateProfile, deleteAccount, changePassword } from '../controllers/user.controller';

const router = Router();

router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.delete('/account', deleteAccount);
router.post('/change-password', changePassword);

export default router;