// src/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const passwordHash = await bcrypt.hash('Demo1234!', 12);
  const user = await prisma.user.upsert({
    where: { email: 'demo@budgetwise.app' },
    update: {},
    create: {
      email: 'demo@budgetwise.app',
      passwordHash,
      firstName: 'Ana',
      lastName: 'Novak',
      currency: 'EUR',
    },
  });

  console.log(`✅ Demo user: ${user.email}`);

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { id: 'cat-food' },
      update: {},
      create: { id: 'cat-food', userId: user.id, name: 'Hrana', icon: '🍔', color: '#FF6B6B', type: 'EXPENSE', isDefault: true },
    }),
    prisma.category.upsert({
      where: { id: 'cat-transport' },
      update: {},
      create: { id: 'cat-transport', userId: user.id, name: 'Prevoz', icon: '🚗', color: '#4ECDC4', type: 'EXPENSE', isDefault: true },
    }),
    prisma.category.upsert({
      where: { id: 'cat-salary' },
      update: {},
      create: { id: 'cat-salary', userId: user.id, name: 'Plača', icon: '💼', color: '#77DD77', type: 'INCOME', isDefault: true },
    }),
  ]);

  console.log(`✅ ${categories.length} categories created`);

  // Create sample transactions
  const now = new Date();
  await prisma.transaction.createMany({
    skipDuplicates: true,
    data: [
      { userId: user.id, categoryId: 'cat-salary', type: 'INCOME', amount: 1800, description: 'Mesečna plača', date: new Date(now.getFullYear(), now.getMonth(), 1) },
      { userId: user.id, categoryId: 'cat-food', type: 'EXPENSE', amount: 45.50, description: 'Mercator nakup', date: new Date(now.getFullYear(), now.getMonth(), 3) },
      { userId: user.id, categoryId: 'cat-transport', type: 'EXPENSE', amount: 32.00, description: 'Gorivo', date: new Date(now.getFullYear(), now.getMonth(), 5) },
      { userId: user.id, categoryId: 'cat-food', type: 'EXPENSE', amount: 12.80, description: 'Kosilo', date: new Date(now.getFullYear(), now.getMonth(), 7) },
    ],
  });

  console.log('✅ Sample transactions created');

  // Create sample goal
  await prisma.goal.upsert({
    where: { id: 'goal-vacation' },
    update: {},
    create: {
      id: 'goal-vacation',
      userId: user.id,
      name: 'Počitnice v Italiji',
      icon: '🏖️',
      targetAmount: 1500,
      currentAmount: 450,
      deadline: new Date(now.getFullYear(), 6, 1),
    },
  });

  console.log('✅ Sample goal created');
  console.log('🎉 Seed complete!');
  console.log('📧 Login: demo@budgetwise.app / Demo1234!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
