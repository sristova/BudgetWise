// types/goals.ts
export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED';
export type GoalCurrency = 'EUR' | 'USD' | 'GBP' | 'CHF' | 'HRK' | 'RSD' | 'BAM';

export interface Goal {
  id: string;
  name: string;
  description?: string;
  icon: string;
  targetAmount: number;
  currentAmount: number;
  currency: GoalCurrency;
  deadline?: string;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalPayload {
  name: string;
  description?: string;
  icon?: string;
  targetAmount: number;
  currency?: GoalCurrency;
  deadline?: string;
}

export interface UpdateGoalPayload extends Partial<CreateGoalPayload> {
  status?: GoalStatus;
}