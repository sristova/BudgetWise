// src/lib/scheduler.ts
import cron from 'node-cron';
import { prisma } from './prisma';
import { sendMail } from './mail';
import { weeklyReportEmail, budgetAlertEmail } from './mail';

// ─── Tedensko poročilo — vsak ponedeljek ob 8:00 ──────────────────────────────
cron.schedule('0 8 * * 1', async () => {
  console.log('[Scheduler] Pošiljam tedenska poročila...');

  // Samo uporabniki z notifyWeekly === true
  const users = await prisma.user.findMany({
    where: { isActive: true, isEmailVerified: true, notifyWeekly: true },
    select: { id: true, email: true, firstName: true, currency: true },
  });

  const now = new Date();
  const startOfLastWeek = new Date(now);
  startOfLastWeek.setDate(now.getDate() - 7);

  for (const user of users) {
    try {
      const [income, expenses, topCategories] = await Promise.all([
        prisma.transaction.aggregate({
          where: { userId: user.id, type: 'INCOME', date: { gte: startOfLastWeek } },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { userId: user.id, type: 'EXPENSE', date: { gte: startOfLastWeek } },
          _sum: { amount: true },
        }),
        prisma.transaction.groupBy({
          by: ['categoryId'],
          where: { userId: user.id, type: 'EXPENSE', date: { gte: startOfLastWeek } },
          _sum: { amount: true },
          orderBy: { _sum: { amount: 'desc' } },
          take: 3,
        }),
      ]);

      const categoryIds = topCategories.map(c => c.categoryId).filter(Boolean) as string[];
      const categories = await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true, icon: true },
      });

      const topWithNames = topCategories.map(t => ({
        name: categories.find(c => c.id === t.categoryId)?.name ?? 'Nekategorizirano',
        icon: categories.find(c => c.id === t.categoryId)?.icon ?? '💸',
        amount: Number(t._sum.amount ?? 0),
      }));

      const { subject, html } = weeklyReportEmail({
        firstName: user.firstName,
        currency: user.currency,
        income: Number(income._sum.amount ?? 0),
        expenses: Number(expenses._sum.amount ?? 0),
        topCategories: topWithNames,
        weekStart: startOfLastWeek.toLocaleDateString('sl-SI'),
        weekEnd: now.toLocaleDateString('sl-SI'),
      });

      await sendMail({ to: user.email, subject, html });

      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'WEEKLY_REPORT',
          title: 'Tedensko poročilo',
          body: `Tvoje poročilo za teden ${startOfLastWeek.toLocaleDateString('sl-SI')} – ${now.toLocaleDateString('sl-SI')} je bilo poslano.`,
          sentAt: new Date(),
        },
      });
    } catch (err) {
      console.error(`[Scheduler] Napaka za ${user.email}:`, err);
    }
  }
}, { timezone: 'Europe/Ljubljana' });

// ─── Opozorila proračuna — vsako uro ─────────────────────────────────────────
cron.schedule('0 * * * *', async () => {
  console.log('[Scheduler] Preverjam proračune...');

  // Samo proračuni uporabnikov z notifyBudget === true
  const budgets = await prisma.budget.findMany({
    where: { isActive: true, user: { notifyBudget: true } },
    include: {
      user: { select: { id: true, email: true, firstName: true, currency: true } },
      category: { select: { name: true, icon: true } },
    },
  });

  for (const budget of budgets) {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const spent = await prisma.transaction.aggregate({
        where: {
          userId: budget.userId,
          type: 'EXPENSE',
          categoryId: budget.categoryId ?? undefined,
          date: { gte: startOfMonth },
        },
        _sum: { amount: true },
      });

      const spentAmount = Number(spent._sum.amount ?? 0);
      const budgetAmount = Number(budget.amount);
      const percentage = (spentAmount / budgetAmount) * 100;
      const alertThreshold = Number(budget.alertAt);

      if (percentage >= alertThreshold) {
        const alreadySent = await prisma.notification.findFirst({
          where: {
            userId: budget.userId,
            type: 'BUDGET_ALERT',
            data: { path: ['budgetId'], equals: budget.id },
            createdAt: { gte: startOfMonth },
          },
        });

        if (!alreadySent) {
          const { subject, html } = budgetAlertEmail({
            firstName: budget.user.firstName,
            budgetName: budget.name,
            categoryName: budget.category?.name ?? 'Splošno',
            categoryIcon: budget.category?.icon ?? '💰',
            spent: spentAmount,
            limit: budgetAmount,
            percentage: Math.round(percentage),
            currency: budget.user.currency,
          });

          await sendMail({ to: budget.user.email, subject, html });

          await prisma.notification.create({
            data: {
              userId: budget.userId,
              type: 'BUDGET_ALERT',
              title: `Opozorilo: ${budget.name}`,
              body: `Porabili ste ${Math.round(percentage)}% proračuna za ${budget.category?.name ?? 'Splošno'}.`,
              data: { budgetId: budget.id, percentage: Math.round(percentage) },
              sentAt: new Date(),
            },
          });
        }
      }
    } catch (err) {
      console.error(`[Scheduler] Napaka za budget ${budget.id}:`, err);
    }
  }
}, { timezone: 'Europe/Ljubljana' });

console.log('[Scheduler] Cron jobi so aktivni.');