// src/controllers/notification.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { success, noContent } from '../lib/response';

export async function getNotifications(req: Request, res: Response) {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return success(res, notifications);
}

export async function markAsRead(req: Request, res: Response) {
  const { id } = req.params;
  await prisma.notification.updateMany({
    where: { id, userId: req.user!.id },
    data: { isRead: true },
  });
  return noContent(res);
}

export async function markAllAsRead(req: Request, res: Response) {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, isRead: false },
    data: { isRead: true },
  });
  return noContent(res);
}

// ─── Preferences ─────────────────────────────────────────────────────────────

export async function getNotificationPreferences(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { notifyBudget: true, notifyWeekly: true, notifyGoal: true },
  });
  return success(res, user);
}

export async function updateNotificationPreferences(req: Request, res: Response) {
  const { notifyBudget, notifyWeekly, notifyGoal } = req.body;
  const updated = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      ...(notifyBudget !== undefined && { notifyBudget }),
      ...(notifyWeekly !== undefined && { notifyWeekly }),
      ...(notifyGoal   !== undefined && { notifyGoal }),
    },
    select: { notifyBudget: true, notifyWeekly: true, notifyGoal: true },
  });
  return success(res, updated);
}
