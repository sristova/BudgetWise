// src/lib/mail.ts
import nodemailer from "nodemailer";
import { logger } from "./logger";

// Транспортер за праќање мејлови преку SMTP (Gmail).
// Се чита од .env, така што нема тајни во кодот.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // true за порта 465, false за 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Праќа мејл. Не фрла грешка нагоре - само логира,
 * за да не ја сруши главната операција ако мејлот не успее.
 */
export async function sendMail({
  to,
  subject,
  html,
}: SendMailOptions): Promise<void> {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"BudgetWise" <no-reply@budgetwise.app>',
      to,
      subject,
      html,
    });
    logger.info(`Email sent to ${to}: ${subject}`);
   } catch (err: any) {
  logger.error(`Failed to send email to ${to}: ${err?.message ?? String(err)}`);
  logger.error(JSON.stringify(err, Object.getOwnPropertyNames(err)));
}
}

/**
 * Готов темплејт за кога корисникот ќе ја исполни целта за штедење.
 */
export function goalCompletedEmail(params: {
  firstName?: string | null;
  goalName: string;
  targetAmount: number;
  currency: string;
}): { subject: string; html: string } {
  const name = params.firstName || "there";
  const amount = `${params.targetAmount.toFixed(2)} ${params.currency}`;

  return {
    subject: `🎯 Goal reached: ${params.goalName}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #A0263A;">Congratulations, ${name}! 🎉</h2>
        <p>You've reached your savings goal:</p>
        <div style="background: #f7f7f7; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="font-size: 18px; font-weight: bold; margin: 0;">${params.goalName}</p>
          <p style="font-size: 24px; color: #A0263A; margin: 8px 0 0;">${amount}</p>
        </div>
        <p>Time to celebrate — you did it! 🥳</p>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">
          — The BudgetWise team
        </p>
      </div>
    `,
  };
}

export function weeklyReportEmail(params: {
  firstName?: string | null;
  currency: string;
  income: number;
  expenses: number;
  topCategories: { name: string; icon: string; amount: number }[];
  weekStart: string;
  weekEnd: string;
}): { subject: string; html: string } {
  const name = params.firstName || 'there';
  const balance = params.income - params.expenses;
  const balanceColor = balance >= 0 ? '#22c55e' : '#A0263A';

  const categoryRows = params.topCategories.map(c => `
    <tr>
      <td style="padding: 6px 0;">${c.icon} ${c.name}</td>
      <td style="padding: 6px 0; text-align: right; font-weight: bold;">
        ${c.amount.toFixed(2)} ${params.currency}
      </td>
    </tr>
  `).join('');

  return {
    subject: `📊 Tedensko poročilo BudgetWise (${params.weekStart} – ${params.weekEnd})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #A0263A;">Zdravo, ${name}! 👋</h2>
        <p style="color: #666;">Tukaj je tvoje poročilo za teden <strong>${params.weekStart} – ${params.weekEnd}</strong>.</p>

        <div style="background: #f7f7f7; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 6px 0; color: #22c55e;">💚 Prihodki</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #22c55e;">
                +${params.income.toFixed(2)} ${params.currency}
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #A0263A;">💸 Stroški</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #A0263A;">
                -${params.expenses.toFixed(2)} ${params.currency}
              </td>
            </tr>
            <tr style="border-top: 1px solid #ddd;">
              <td style="padding: 10px 0 0; font-weight: bold;">Bilanca</td>
              <td style="padding: 10px 0 0; text-align: right; font-weight: bold; color: ${balanceColor};">
                ${balance >= 0 ? '+' : ''}${balance.toFixed(2)} ${params.currency}
              </td>
            </tr>
          </table>
        </div>

        ${params.topCategories.length > 0 ? `
          <h3 style="color: #333; margin-top: 24px;">Top kategorije stroškov</h3>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${categoryRows}
          </table>
        ` : ''}

        <p style="color: #888; font-size: 12px; margin-top: 24px;">— Ekipa BudgetWise</p>
      </div>
    `,
  };
}

export function budgetAlertEmail(params: {
  firstName?: string | null;
  budgetName: string;
  categoryName: string;
  categoryIcon: string;
  spent: number;
  limit: number;
  percentage: number;
  currency: string;
}): { subject: string; html: string } {
  const name = params.firstName || 'there';
  const isOver = params.percentage >= 100;

  return {
    subject: isOver
      ? `🚨 Prekoračen proračun: ${params.budgetName}`
      : `⚠️ Opozorilo proračuna: ${params.budgetName} (${params.percentage}%)`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #A0263A;">${isOver ? '🚨' : '⚠️'} Zdravo, ${name}!</h2>
        <p>${isOver ? 'Prekoračili ste' : 'Bližate se limitu'} proračuna:</p>

        <div style="background: #f7f7f7; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="font-size: 18px; font-weight: bold; margin: 0;">
            ${params.categoryIcon} ${params.categoryName}
          </p>
          <p style="margin: 8px 0 0; color: #666;">${params.budgetName}</p>
          <div style="background: #ddd; border-radius: 4px; height: 8px; margin: 12px 0;">
            <div style="background: #A0263A; border-radius: 4px; height: 8px; width: ${Math.min(params.percentage, 100)}%;"></div>
          </div>
          <p style="font-size: 14px; color: #A0263A; font-weight: bold;">
            ${params.spent.toFixed(2)} / ${params.limit.toFixed(2)} ${params.currency} (${params.percentage}%)
          </p>
        </div>

        <p style="color: #888; font-size: 12px; margin-top: 24px;">— Ekipa BudgetWise</p>
      </div>
    `,
  };
}