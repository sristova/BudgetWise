// src/server.ts
import 'dotenv/config';
import 'express-async-errors';
import { app } from './app';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

async function main() {
  // Test DB connection
  await prisma.$connect();
  logger.info('✅ PostgreSQL connected');

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 BudgetWise API running on port ${PORT}`);
    logger.info(`📡 Environment: ${process.env.NODE_ENV}`);
    logger.info(`🔗 API: http://localhost:${PORT}/api/v1`);
  });
}

main().catch((err) => {
  logger.error(err, 'Fatal startup error');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});
