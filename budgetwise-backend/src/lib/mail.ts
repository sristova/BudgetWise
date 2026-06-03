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
  } catch (err) {
    logger.error(`Failed to send email to ${to}:`, err);
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
