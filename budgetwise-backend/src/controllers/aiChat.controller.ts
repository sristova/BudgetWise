// src/controllers/aiChat.controller.ts
import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { success, noContent } from '../lib/response';

const GROQ_API_KEY = process.env.GROQ_API_KEY!;

if (!GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY is not set in environment variables');
}

const SYSTEM_PROMPT = `Si finančni asistent v aplikaciji BudgetWise. Govoriš slovensko, si prijazen in koncizen.
Pomagaš uporabnikom z vprašanji o osebnih financah, varčevanju in proračunu.
Odgovarjaj kratko (2-4 stavki) in praktično.`;

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

  // Call Groq — ključ je SAMO tukaj na backendu
  const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 512,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
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
  const aiMessage = await prisma.aiChat.create({
    data: { userId, role: 'assistant', content: aiText, tokens },
  });

  return success(res, { message: aiMessage });
}

export async function clearHistory(req: Request, res: Response) {
  await prisma.aiChat.deleteMany({ where: { userId: req.user!.id } });
  return noContent(res);
}

// ─── GROQ VISION — skeniranje računov ────────────────────────────────────────
const RECEIPT_CATEGORIES = ['Hrana', 'Restavracije', 'Kavarne', 'Prevoz', 'Zabava', 'Zdravje', 'Oblačila', 'Sport', 'Potovanje', 'Ostalo'] as const;

const ParseReceiptSchema = z.object({
  imageBase64: z.string().min(1),
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
    // Strip possible markdown code fences
    const cleaned = raw.replace(/```json|```/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Groq vrnil neveljaven JSON za račun');
  }

  return success(res, parsed);
}
