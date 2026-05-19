// src/controllers/user.controller.ts
import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { success, noContent } from '../lib/response';

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  currency: z.enum(['EUR', 'USD', 'GBP', 'CHF', 'HRK', 'RSD', 'BAM']).optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});

export async function getProfile(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      avatarUrl: true, currency: true, timezone: true, locale: true,
      isEmailVerified: true, lastLoginAt: true, createdAt: true,
    },
  });
  return success(res, user);
}

export async function updateProfile(req: Request, res: Response) {
  const data = updateProfileSchema.parse(req.body);
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data,
    select: {
      id: true, email: true, firstName: true, lastName: true,
      avatarUrl: true, currency: true, timezone: true, locale: true,
    },
  });
  return success(res, user);
}

export async function deleteAccount(req: Request, res: Response) {
  await prisma.user.delete({ where: { id: req.user!.id } });
  return noContent(res);
}
