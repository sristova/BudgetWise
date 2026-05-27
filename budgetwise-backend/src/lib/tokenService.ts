import { prisma } from './prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken, getRefreshTokenExpiry } from './jwt';

export async function issueTokens(userId: string, email: string) {
  const accessToken  = signAccessToken({ sub: userId, email });
  const refreshToken = signRefreshToken({ sub: userId, email });

  await prisma.refreshToken.create({
    data: {
      userId,
      token:     refreshToken,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  return { accessToken, refreshToken };
}

export async function rotateRefreshToken(rawToken: string) {
  // Preveri JWT podpis
  const payload = verifyRefreshToken(rawToken); // vrže napako če neveljaven

  // Preveri v bazi (ali je bil preklican)
  const stored = await prisma.refreshToken.findUnique({ where: { token: rawToken } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new Error('Invalid refresh token');
  }

  // Revoke star token
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data:  { revokedAt: new Date() },
  });

  // Izdaj nove
  return issueTokens(payload.sub, payload.email);
}