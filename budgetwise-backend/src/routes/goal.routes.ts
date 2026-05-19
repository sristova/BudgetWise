// src/routes/goal.routes.ts
import { Router } from 'express';
import { getGoals, createGoal, updateGoal, addContribution, deleteGoal } from '../controllers/goal.controller';
const router = Router();
router.get('/', getGoals);
router.post('/', createGoal);
router.patch('/:id', updateGoal);
router.post('/:id/contribute', addContribution);
router.delete('/:id', deleteGoal);
export default router;
