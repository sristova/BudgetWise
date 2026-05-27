import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';

// Standardni uvozi vseh poti
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import transactionRoutes from './transaction.routes';
import categoryRoutes from './category.routes';
import budgetRoutes from './budget.routes';
import goalRoutes from './goal.routes';
import reportRoutes from './report.routes';
import notificationRoutes from './notification.routes';
import aiChatRoutes from './aiChat.routes';

export const apiRouter = Router();

// 1. Javne poti
apiRouter.use('/auth', authRoutes);

// 2. Zaščitene poti (z dodanim authenticate middleware-om)
apiRouter.use('/users', authenticate, userRoutes);
apiRouter.use('/transactions', authenticate, transactionRoutes);
apiRouter.use('/categories', authenticate, categoryRoutes);
apiRouter.use('/budgets', authenticate, budgetRoutes);
apiRouter.use('/goals', authenticate, goalRoutes);
apiRouter.use('/reports', authenticate, reportRoutes);
apiRouter.use('/notifications', authenticate, notificationRoutes);
apiRouter.use('/ai-chat', authenticate, aiChatRoutes);