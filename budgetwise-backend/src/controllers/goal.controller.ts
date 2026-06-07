// src/controllers/goal.controller.ts
import { Request, Response } from "express";
import { z } from "zod";
import { ForbiddenError, NotFoundError } from "../lib/errors";
import { goalCompletedEmail, sendMail } from "../lib/mail";
import { prisma } from "../lib/prisma";
import { created, noContent, success } from "../lib/response";

const goalSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(10).optional(),
  targetAmount: z.number().positive(),
  currency: z
    .enum(["EUR", "USD", "GBP", "CHF", "HRK", "RSD", "BAM"])
    .optional(),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export async function getGoals(req: Request, res: Response) {
  const { status } = req.query;
  const goals = await prisma.goal.findMany({
    where: {
      userId: req.user!.id,
      ...(status && { status: status as any }),
    },
    orderBy: [{ status: "asc" }, { deadline: "asc" }],
  });
  return success(res, goals);
}

export async function createGoal(req: Request, res: Response) {
  const data = goalSchema.parse(req.body);
  const goal = await prisma.goal.create({
    data: {
      ...data,
      userId: req.user!.id,
      ...(data.deadline && { deadline: new Date(data.deadline) }),
    },
  });
  return created(res, goal);
}

export async function updateGoal(req: Request, res: Response) {
  const { id } = req.params;
  const existing = await prisma.goal.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Goal");
  if (existing.userId !== req.user!.id) throw new ForbiddenError();

  const data = goalSchema
    .partial()
    .extend({
      status: z.enum(["ACTIVE", "COMPLETED", "PAUSED", "CANCELLED"]).optional(),
    })
    .parse(req.body);

  const goal = await prisma.goal.update({
    where: { id },
    data: {
      ...data,
      ...(data.deadline && { deadline: new Date(data.deadline) }),
    },
  });
  return success(res, goal);
}

export async function addContribution(req: Request, res: Response) {
  const { id } = req.params;
  const { amount } = z
    .object({ amount: z.number().positive() })
    .parse(req.body);

  const existing = await prisma.goal.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Goal");
  if (existing.userId !== req.user!.id) throw new ForbiddenError();

  const newAmount = Number(existing.currentAmount) + amount;
  const isCompleted = newAmount >= Number(existing.targetAmount);
  const justCompleted = isCompleted && existing.status !== "COMPLETED";

  const goal = await prisma.goal.update({
    where: { id },
    data: {
      currentAmount: newAmount,
      ...(isCompleted && { status: "COMPLETED" }),
    },
  });

  if (justCompleted) {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        currency: true,
        notifyGoal: true,  // ← preference
      },
    });

    if (user) {
      // Vedno shrani in-app notifikacijo
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: "ACHIEVEMENT",
          title: "Goal reached! 🎯",
          body: `You've reached your goal "${goal.name}" of ${Number(goal.targetAmount).toFixed(2)} ${goal.currency}.`,
          sentAt: new Date(),
        },
      });

      // Pošlji email SAMO če je notifyGoal vklopljen
      if (user.notifyGoal) {
        const { subject, html } = goalCompletedEmail({
          firstName: user.firstName,
          goalName: goal.name,
          targetAmount: Number(goal.targetAmount),
          currency: goal.currency,
        });
        await sendMail({ to: user.email, subject, html });
      }
    }
  }

  return success(res, { goal, completed: isCompleted });
}

export async function deleteGoal(req: Request, res: Response) {
  const { id } = req.params;
  const existing = await prisma.goal.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Goal");
  if (existing.userId !== req.user!.id) throw new ForbiddenError();
  await prisma.goal.delete({ where: { id } });
  return noContent(res);
}
