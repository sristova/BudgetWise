// src/controllers/aiChat.controller.ts
import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { noContent, success } from '../lib/response';

const GROQ_API_KEY = process.env.GROQ_API_KEY!;

if (!GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY is not set in environment variables');
}

const BASE_SYSTEM_PROMPT = `Si finančni asistent v aplikaciji BudgetWise. Govoriš slovensko, si prijazen in koncizen.
Pomagaš uporabnikom z vprašanji o osebnih financah, varčevanju in proračunu.
Odgovarjaj kratko (2-4 stavki) in praktično.`;

async function buildSystemPrompt(userId: string): Promise<string> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [transactions, budgets, goals] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, date: { gte: startOfMonth, lte: endOfMonth } },
      include: { category: true },
      orderBy: { date: 'desc' },
      take: 50,
    }),
    prisma.budget.findMany({
      where: { userId, isActive: true },
      include: { category: true },
    }),
    prisma.goal.findMany({
      where: { userId, status: 'ACTIVE' },
    }),
  ]);

  const expenses = transactions.filter(t => t.type === 'EXPENSE');
  const income = transactions.filter(t => t.type === 'INCOME');

  const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalIncome = income.reduce((sum, t) => sum + Number(t.amount), 0);

  // Group expenses by category
  const byCategory = expenses.reduce<Record<string, number>>((acc, t) => {
    const name = t.category?.name ?? 'Ostalo';
    acc[name] = (acc[name] ?? 0) + Number(t.amount);
    return acc;
  }, {});

  const topCategories = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, total]) => `${name}: ${total.toFixed(2)}€`)
    .join(', ') || 'Ni stroškov ta mesec.';

  const recentTransactions = transactions
    .slice(0, 8)
    .map(t => `${t.description} (${t.type === 'EXPENSE' ? '-' : '+'}${Number(t.amount).toFixed(2)}€)`)
    .join(', ') || 'Ni transakcij ta mesec.';

  const budgetSummary = budgets.length > 0
    ? budgets.map(b => {
        const spent = b.category ? (byCategory[b.category.name] ?? 0) : 0;
        const limit = Number(b.amount);
        const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
        return `${b.name}: ${spent.toFixed(2)}€ / ${limit.toFixed(2)}€ (${pct}%)`;
      }).join(', ')
    : 'Ni nastavljenih proračunov.';

  const goalsSummary = goals.length > 0
    ? goals.map(g => {
        const current = Number(g.currentAmount);
        const target = Number(g.targetAmount);
        const pct = target > 0 ? Math.round((current / target) * 100) : 0;
        const deadline = g.deadline ? `, rok: ${g.deadline.toLocaleDateString('sl-SI')}` : '';
        return `${g.name}: ${current.toFixed(2)}€ / ${target.toFixed(2)}€ (${pct}%${deadline})`;
      }).join(', ')
    : 'Ni aktivnih ciljev.';

  const monthLabel = now.toLocaleString('sl-SI', { month: 'long', year: 'numeric' });

  return `${BASE_SYSTEM_PROMPT}

## Uporabnikovi finančni podatki za ${monthLabel}:
- Skupni prihodki: ${totalIncome.toFixed(2)}€
- Skupni stroški: ${totalExpenses.toFixed(2)}€
- Prihranki: ${(totalIncome - totalExpenses).toFixed(2)}€

### Top kategorije stroškov:
${topCategories}

### Aktivni proračuni:
${budgetSummary}

### Varčevalni cilji:
${goalsSummary}

### Zadnje transakcije:
${recentTransactions}

Ko odgovarjaš, upoštevaj zgornje podatke. Če te vprašajo o stroških, proračunu ali ciljih, odgovori na podlagi teh konkretnih podatkov.`;
}

export async function getChatHistory(req: Request, res: Response) {
  const { limit } = z.object({ limit: z.coerce.number().int().min(1).max(100).default(50) }).parse(req.query);

  const history = await prisma.aiChat.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
  return success(res, history);
}

export async function sendMessage(req: Request, res: Response) {
  const { message } = z.object({ message: z.string().min(1).max(1000) }).parse(req.body);
  const userId = req.user!.id;

  // Save user message
  await prisma.aiChat.create({
    data: { userId, role: 'user', content: message },
  });

  // Get last 20 messages for context
  const history = await prisma.aiChat.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });

  // Build system prompt with real financial data
  const systemPrompt = await buildSystemPrompt(userId);

  // Call Groq
  const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      max_tokens: 512,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history.map(m => ({ role: m.role, content: m.content })),
      ],
    }),
  });

  if (!groqResponse.ok) {
    const err = await groqResponse.text();
    throw new Error(`Groq API error: ${groqResponse.status} ${err}`);
  }

  const data = await groqResponse.json() as any;
  const aiText = data.choices?.[0]?.message?.content ?? 'Prišlo je do napake.';
  const tokens = data.usage?.total_tokens;

  // Save AI response
  await prisma.aiChat.create({
    data: { userId, role: 'assistant', content: aiText, tokens },
  });

  return success(res, { reply: aiText });
}

export async function clearHistory(req: Request, res: Response) {
  await prisma.aiChat.deleteMany({ where: { userId: req.user!.id } });
  return noContent(res);
}

// ─── GROQ VISION — skeniranje računov ────────────────────────────────────────
const RECEIPT_CATEGORIES = ['Hrana', 'Restavracije', 'Kavarne', 'Prevoz', 'Zabava', 'Zdravje', 'Oblačila', 'Sport', 'Potovanje', 'Ostalo'] as const;

const ParseReceiptSchema = z.object({
  imageBase64: z.string().min(1).max(14_000_000),
});

export async function parseReceipt(req: Request, res: Response) {
  const { imageBase64 } = ParseReceiptSchema.parse(req.body);

  const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature: 0,
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analiziraj sliko računa.

Vrni SAMO JSON brez dodatnega besedila.

Format:
{
  "merchant": "",
  "amount": "",
  "date": "",
  "category": ""
}

Pravila:
- amount brez €, samo število (npr. "24.80")
- date v formatu YYYY-MM-DD
- category mora biti ena od: ${RECEIPT_CATEGORIES.join(', ')}`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!groqResponse.ok) {
    const err = await groqResponse.text();
    throw new Error(`Groq Vision API error: ${groqResponse.status} ${err}`);
  }

  const data = await groqResponse.json() as any;
  const raw = data.choices?.[0]?.message?.content ?? '{}';

  let parsed: { merchant: string; amount: string; date: string; category: string };
  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Groq vrnil neveljaven JSON za račun');
  }

  return success(res, parsed);
}