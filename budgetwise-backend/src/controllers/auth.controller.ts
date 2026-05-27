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
import { verifyGoogleToken, verifyFacebookToken } from '../lib/socialAuth';
import { issueTokens, rotateRefreshToken as libRotateRefreshToken } from '../lib/tokenService';

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

  const tokens = await issueTokens(user.id, user.email);

  logger.info({ userId: user.id }, 'User registered');

  // Žetone vrneš nazaj aplikaciji z destrukturiranjem (...tokens)
  return created(res, { user, ...tokens });
}

export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse({ body: req.body }).body;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, passwordHash: true, firstName: true, lastName: true, currency: true, isActive: true },
  });

  if (!user || !user.isActive) throw new UnauthorizedError('Invalid email or password');

  if (!user.passwordHash) throw new UnauthorizedError('Invalid email or password');
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new UnauthorizedError('Invalid email or password');

  const tokens = await issueTokens(user.id, user.email);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const { passwordHash: _, ...safeUser } = user;
  logger.info({ userId: user.id }, 'User logged in');

  return success(res, { user: safeUser, ...tokens });
}

export async function refreshToken(req: Request, res: Response) {
  const { refreshToken: token } = refreshSchema.parse({ body: req.body }).body;

try {
    const tokens = await libRotateRefreshToken(token); 
    return success(res, tokens);
  } catch (error: any) {
    throw new UnauthorizedError(error.message || 'Refresh token invalid or expired');
  }
}

export async function logout(req: Request, res: Response) {
  const { refreshToken: token } = req.body;

  if (token) {
    // Revoke samo po refresh tokenu, brez da rabimo access token
    await prisma.refreshToken.updateMany({
      where: { token },
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

// ─── Helpers 

async function seedDefaultCategories(userId: string) {
  const defaults = [
    // Stroški (EXPENSE)
    { name: 'Hrana in pijača', icon: '🍔', color: '#FF6B6B', type: 'EXPENSE' as const },
    { name: 'Transport in avto', icon: '🚗', color: '#4ECDC4', type: 'EXPENSE' as const },
    { name: 'Nakupovanje', icon: '🛍️', color: '#45B7D1', type: 'EXPENSE' as const },
    { name: 'Stanovanje in stroški', icon: '🏠', color: '#96CEB4', type: 'EXPENSE' as const },
    { name: 'Zabava in prosti čas', icon: '🎮', color: '#FFEAA7', type: 'EXPENSE' as const },
    { name: 'Zdravje in oskrba', icon: '💊', color: '#DDA0DD', type: 'EXPENSE' as const },
    { name: 'Izobraževanje', icon: '📚', color: '#98D8C8', type: 'EXPENSE' as const },
    
    // Prihodki (INCOME)
    { name: 'Plača', icon: '💼', color: '#77DD77', type: 'INCOME' as const },
    { name: 'Dodatni zaslužek', icon: '💻', color: '#89CFF0', type: 'INCOME' as const },
    { name: 'Investicije', icon: '📈', color: '#FFD700', type: 'INCOME' as const },
  ];

  await prisma.category.createMany({
    data: defaults.map(d => ({ ...d, userId, isDefault: true })),
  });
}

// ─── Social Auth 

async function handleSocialLogin(
  req: Request,
  res: Response,
  provider: 'google' | 'facebook',
  providerData: {
    providerId: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  }
) {
  const { providerId, email, firstName, lastName, avatarUrl } = providerData;

  // 1. Poišči obstoječ socialni račun
  const socialAccount = await prisma.socialAccount.findUnique({
    where: { provider_providerId: { provider, providerId } },
    include: { user: true },
  });

  if (socialAccount) {
    const tokens = await issueTokens(socialAccount.userId, socialAccount.user.email);
    
    await prisma.user.update({ 
      where: { id: socialAccount.userId }, 
      data: { lastLoginAt: new Date() } 
    });
    
    return success(res, { user: socialAccount.user, ...tokens });
  }

  // 2. Poveži z obstoječim računom po emailu (VARNOSTNA PREVERBA)
  let user = null;
  if (email) {
    if (provider === 'google') {
      // Googlu popolnoma zaupamo, ker vaša koda preveri 'verifyIdToken' s strani Googla
      user = await prisma.user.findUnique({ where: { email } });
    } else {
      // Za Facebook: Če email že obstaja v bazi, NE dovoli avtomatske prijave.
      // S tem preprečimo, da bi napadalec z lažnim Facebook profilom vdrl v tuj račun.
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'Račun s to e-pošto že obstaja. Prijavite se z geslom ali Googlom.'
        });
      }
    }
  }

  // 3. Ustvari novega uporabnika, če sploh ne obstaja v bazi
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: email ?? `${provider}_${providerId}@noemail.budgetwise`,
        firstName: firstName ?? undefined,
        lastName:  lastName ?? undefined,
        avatarUrl: avatarUrl ?? undefined,
        isEmailVerified: provider === 'google', // Google emaili so potrjeni pod pokrovom, FB pa ne nujno
      },
    });
    await seedDefaultCategories(user.id);
  }

  // 4. Ustvari social account zapis
  await prisma.socialAccount.create({
    data: { userId: user.id, provider, providerId, email },
  });

 
  const tokens = await issueTokens(user.id, user.email);

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  logger.info({ userId: user.id, provider }, 'User logged in via social');

  const { passwordHash: _, ...safeUser } = user as any;
  return created(res, { user: safeUser, ...tokens });
}

export async function googleLogin(req: Request, res: Response) {
  const { idToken } = req.body;
  if (!idToken) throw new Error('idToken je zahtevan');
  const data = await verifyGoogleToken(idToken);
  return handleSocialLogin(req, res, 'google', data);
}

export async function facebookLogin(req: Request, res: Response) {
  const { accessToken } = req.body;
  if (!accessToken) throw new Error('accessToken je zahtevan');
  const data = await verifyFacebookToken(accessToken);
  return handleSocialLogin(req, res, 'facebook', data);
}

