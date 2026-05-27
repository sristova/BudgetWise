import { Router } from 'express';
import authRoutes from './auth.routes';
import { authenticate } from '../middleware/authenticate';

export const apiRouter = Router();

// 1. Javne poti (Ostanejo standardne)
apiRouter.use('/auth', authRoutes);


// 2. Trajna rešitev za vse zaščitene poti (Naložijo se varno ob klicu):

apiRouter.use('/users', authenticate, (req, res, next) => {
  const routes = require('./user.routes').default;
  return routes(req, res, next);
});

apiRouter.use('/transactions', authenticate, (req, res, next) => {
  const routes = require('./transaction.routes').default;
  return routes(req, res, next);
});

apiRouter.use('/categories', authenticate, (req, res, next) => {
  const routes = require('./category.routes').default;
  return routes(req, res, next);
});

apiRouter.use('/budgets', authenticate, (req, res, next) => {
  const routes = require('./budget.routes').default;
  return routes(req, res, next);
});

apiRouter.use('/goals', authenticate, (req, res, next) => {
  const routes = require('./goal.routes').default;
  return routes(req, res, next);
});

apiRouter.use('/reports', authenticate, (req, res, next) => {
  const routes = require('./report.routes').default;
  return routes(req, res, next);
});

apiRouter.use('/notifications', authenticate, (req, res, next) => {
  const routes = require('./notification.routes').default;
  return routes(req, res, next);
});

apiRouter.use('/ai-chat', authenticate, (req, res, next) => {
  const routes = require('./aiChat.routes').default;
  return routes(req, res, next);
});