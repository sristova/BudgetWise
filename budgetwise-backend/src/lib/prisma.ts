// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

if (process.env.NODE_ENV === 'development') {
  prisma.$on('query' as never, (e: any) => {
    logger.debug({ query: e.query, duration: e.duration + 'ms' }, 'Prisma Query');
  });
}

prisma.$on('error' as never, (e: any) => {
  logger.error(e, 'Prisma Error');
});

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}
