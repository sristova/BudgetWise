// src/controllers/category.controller.ts
import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { success, created, noContent } from '../lib/response';
import { NotFoundError, ForbiddenError } from '../lib/errors';

const categorySchema = z.object({
  name: z.string().min(1).max(50),
  icon: z.string().max(10).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  type: z.enum(['INCOME', 'EXPENSE']),
});

export async function getCategories(req: Request, res: Response) {
  const { type } = req.query;
  const categories = await prisma.category.findMany({
    where: {
      userId: req.user!.id,
      ...(type && { type: type as 'INCOME' | 'EXPENSE' }),
    },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });
  return success(res, categories);
}

export async function createCategory(req: Request, res: Response) {
  const data = categorySchema.parse(req.body);
  const category = await prisma.category.create({
    data: { ...data, userId: req.user!.id },
  });
  return created(res, category);
}

export async function updateCategory(req: Request, res: Response) {
  const { id } = req.params;
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Category');
  if (existing.userId !== req.user!.id) throw new ForbiddenError();

  const data = categorySchema.partial().parse(req.body);
  const category = await prisma.category.update({ where: { id }, data });
  return success(res, category);
}

export async function deleteCategory(req: Request, res: Response) {
  const { id } = req.params;
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Category');
  if (existing.userId !== req.user!.id) throw new ForbiddenError();
  await prisma.category.delete({ where: { id } });
  return noContent(res);
}
