import { Router } from 'express';
import { getProfile, updateProfile, deleteAccount, changePassword, uploadAvatar } from '../controllers/user.controller';
import { uploadMiddleware } from '../config/cloudinary';

const router = Router();

router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.delete('/account', deleteAccount);
router.post('/change-password', changePassword);

// Pot za nalaganje profilne slike
router.post('/upload-avatar', uploadMiddleware.single('avatar'), uploadAvatar);

export default router;