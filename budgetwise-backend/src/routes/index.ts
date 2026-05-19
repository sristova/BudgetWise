// src/routes/index.ts
import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import transactionRoutes from './transaction.routes';
import categoryRoutes from './category.routes';
import budgetRoutes from './budget.routes';
import goalRoutes from './goal.routes';
import reportRoutes from './report.routes';
import notificationRoutes from './notification.routes';
import aiChatRoutes from './aiChat.routes';
import { authenticate } from '../middleware/authenticate';

export const apiRouter = Router();

// Public routes
apiRouter.use('/auth', authRoutes);

// Protected routes (JWT required)
apiRouter.use('/users', authenticate, userRoutes);
apiRouter.use('/transactions', authenticate, transactionRoutes);
apiRouter.use('/categories', authenticate, categoryRoutes);
apiRouter.use('/budgets', authenticate, budgetRoutes);
apiRouter.use('/goals', authenticate, goalRoutes);
apiRouter.use('/reports', authenticate, reportRoutes);
apiRouter.use('/notifications', authenticate, notificationRoutes);
apiRouter.use('/ai-chat', authenticate, aiChatRoutes);
