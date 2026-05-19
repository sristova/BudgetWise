// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
} from '../lib/jwt';
import { registerSchema, loginSchema, refreshSchema } from '../validators/auth.validator';
import { ConflictError, UnauthorizedError } from '../lib/errors';
import { success, created } from '../lib/response';
import { logger } from '../lib/logger';

export async function register(req: Request, res: Response) {
  const { email, password, firstName, lastName, currency } = registerSchema.parse({ body: req.body }).body;

  // Check duplicate
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ConflictError('Email already in use');

  const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS ?? '12'));

  const user = await prisma.user.create({
    data: { email, passwordHash, firstName, lastName, currency: currency ?? 'EUR' },
    select: { id: true, email: true, firstName: true, lastName: true, currency: true, createdAt: true },
  });

  // Seed default categories
  await seedDefaultCategories(user.id);

  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  const refreshToken = signRefreshToken({ sub: user.id, email: user.email });

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: getRefreshTokenExpiry(),
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent'],
    },
  });

  logger.info({ userId: user.id }, 'User registered');

  return created(res, { user, accessToken, refreshToken });
}

export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse({ body: req.body }).body;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, passwordHash: true, firstName: true, lastName: true, currency: true, isActive: true },
  });

  if (!user || !user.isActive) throw new UnauthorizedError('Invalid email or password');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new UnauthorizedError('Invalid email or password');

  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  const refreshToken = signRefreshToken({ sub: user.id, email: user.email });

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: getRefreshTokenExpiry(),
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent'],
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const { passwordHash: _, ...safeUser } = user;

  logger.info({ userId: user.id }, 'User logged in');

  return success(res, { user: safeUser, accessToken, refreshToken });
}

export async function refreshToken(req: Request, res: Response) {
  const { refreshToken: token } = refreshSchema.parse({ body: req.body }).body;

  let payload: ReturnType<typeof verifyRefreshToken>;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token } });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    // Possible token reuse — revoke all tokens for this user (security)
    if (stored) {
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId },
        data: { revokedAt: new Date() },
      });
    }
    throw new UnauthorizedError('Refresh token invalid or expired');
  }

  // Rotate: revoke old, issue new
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const newAccessToken = signAccessToken({ sub: payload.sub, email: payload.email });
  const newRefreshToken = signRefreshToken({ sub: payload.sub, email: payload.email });

  await prisma.refreshToken.create({
    data: {
      token: newRefreshToken,
      userId: payload.sub,
      expiresAt: getRefreshTokenExpiry(),
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent'],
    },
  });

  return success(res, { accessToken: newAccessToken, refreshToken: newRefreshToken });
}

export async function logout(req: Request, res: Response) {
  const { refreshToken: token } = req.body;

  if (token) {
    await prisma.refreshToken.updateMany({
      where: { token, userId: req.user!.id },
      data: { revokedAt: new Date() },
    });
  }

  return success(res, { message: 'Logged out successfully' });
}

export async function me(req: Request, res: Response) {
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

// ─── Helpers ─────────────────────────────────────────────────

async function seedDefaultCategories(userId: string) {
  const defaults = [
    { name: 'Food & Dining', icon: '🍔', color: '#FF6B6B', type: 'EXPENSE' as const },
    { name: 'Transport', icon: '🚗', color: '#4ECDC4', type: 'EXPENSE' as const },
    { name: 'Shopping', icon: '🛍️', color: '#45B7D1', type: 'EXPENSE' as const },
    { name: 'Housing', icon: '🏠', color: '#96CEB4', type: 'EXPENSE' as const },
    { name: 'Entertainment', icon: '🎮', color: '#FFEAA7', type: 'EXPENSE' as const },
    { name: 'Health', icon: '💊', color: '#DDA0DD', type: 'EXPENSE' as const },
    { name: 'Education', icon: '📚', color: '#98D8C8', type: 'EXPENSE' as const },
    { name: 'Salary', icon: '💼', color: '#77DD77', type: 'INCOME' as const },
    { name: 'Freelance', icon: '💻', color: '#89CFF0', type: 'INCOME' as const },
    { name: 'Investment', icon: '📈', color: '#FFD700', type: 'INCOME' as const },
  ];

  await prisma.category.createMany({
    data: defaults.map(d => ({ ...d, userId, isDefault: true })),
  });
}
