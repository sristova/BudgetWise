// src/controllers/user.controller.ts
import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { success, noContent } from '../lib/response';
import bcrypt from 'bcryptjs';
import { UnauthorizedError } from '../lib/errors';

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

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.body;
  
  const user = await prisma.user.findUniqueOrThrow({ 
    where: { id: req.user!.id } 
  });

  if (user.passwordHash) {
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedError('Napačno trenutno geslo');
  }

  if (!newPassword || newPassword.length < 8) {
    throw new Error('Geslo mora imeti vsaj 8 znakov');
  }

  const hash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS ?? '12'));
  
  await prisma.user.update({ 
    where: { id: req.user!.id }, 
    data: { passwordHash: hash } 
  });

  // Revoke vse refresh tokene — varnostni ukrep
  await prisma.refreshToken.updateMany({
    where: { userId: req.user!.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return success(res, { message: 'Geslo uspešno posodobljeno' });
}

export async function deleteAccount(req: Request, res: Response) {
  await prisma.user.delete({ where: { id: req.user!.id } });
  return noContent(res);
}
