// src/routes/notification.routes.ts
import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../controllers/notification.controller';

const router = Router();

router.get('/',              getNotifications);
router.patch('/:id/read',    markAsRead);
router.patch('/read-all',    markAllAsRead);
router.get('/preferences',   getNotificationPreferences);
router.patch('/preferences', updateNotificationPreferences);

export default router;
