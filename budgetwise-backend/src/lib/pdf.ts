import PDFDocument from 'pdfkit';
import { Response } from 'express';

interface Transaction {
  date: Date;
  description: string;
  category?: { name: string; icon: string } | null;
  type: string;
  amount: number;
  currency: string;
}

export function generateTransactionsPdf(
  res: Response,
  transactions: Transaction[],
  user: { firstName?: string | null; lastName?: string | null; currency: string },
  month: string
) {
  const doc = new PDFDocument({ margin: 40 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=transakcije-${month}.pdf`);
  doc.pipe(res);

  // ─── Glava ───────────────────────────────────────────────────────────────
  doc.fontSize(20).fillColor('#A0263A').text('BudgetWise', { align: 'center' });
  doc.fontSize(13).fillColor('#333').text(`Transakcije za ${month}`, { align: 'center' });
  doc.fontSize(11).fillColor('#888').text(`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(), { align: 'center' });
  doc.moveDown(1.5);

  // ─── Povzetek ─────────────────────────────────────────────────────────────
  const income = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const balance = income - expenses;

  doc.roundedRect(40, doc.y, 515, 70, 8).fill('#f7f7f7');
  const summaryY = doc.y - 65;
  doc.fontSize(11).fillColor('#22c55e').text(`Prihodki: +${income.toFixed(2)} ${user.currency}`, 60, summaryY + 10);
  doc.fillColor('#A0263A').text(`Stroški: -${expenses.toFixed(2)} ${user.currency}`, 60, summaryY + 28);
  doc.fillColor(balance >= 0 ? '#22c55e' : '#A0263A')
     .fontSize(12).font('Helvetica-Bold')
     .text(`Bilanca: ${balance >= 0 ? '+' : ''}${balance.toFixed(2)} ${user.currency}`, 60, summaryY + 46);
  doc.font('Helvetica');
  doc.moveDown(3);

  // ─── Tabela ───────────────────────────────────────────────────────────────
  const colX = { date: 40, description: 110, category: 270, amount: 460 };

  // Header
  doc.fontSize(9).fillColor('#888');
  doc.text('DATUM', colX.date, doc.y);
  doc.text('OPIS', colX.description, doc.y - doc.currentLineHeight());
  doc.text('KATEGORIJA', colX.category, doc.y - doc.currentLineHeight());
  doc.text('ZNESEK', colX.amount, doc.y - doc.currentLineHeight(), { align: 'right', width: 95 });
  doc.moveDown(0.3);
  doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#ddd').stroke();
  doc.moveDown(0.3);

  // Vrstice
  for (const tx of transactions) {
    if (doc.y > 720) doc.addPage();

    const isIncome = tx.type === 'INCOME';
    const dateStr = new Date(tx.date).toLocaleDateString('sl-SI');
    const y = doc.y;

    doc.fontSize(10).fillColor('#333').text(dateStr, colX.date, y, { width: 65 });
    doc.text(tx.description, colX.description, y, { width: 155 });
    doc.fillColor('#888').fontSize(9)
       .text(tx.category?.name ?? (isIncome ? 'Prihodek' : 'Nekategorizirano'), colX.category, y, { width: 180 });
    doc.fontSize(10).fillColor(isIncome ? '#22c55e' : '#A0263A')
       .text(`${isIncome ? '+' : '-'}${tx.amount.toFixed(2)} ${tx.currency}`, colX.amount, y, { align: 'right', width: 95 });

    doc.moveDown(0.2);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#f0f0f0').stroke();
    doc.moveDown(0.2);
  }

  // ─── Noga ─────────────────────────────────────────────────────────────────
  doc.moveDown(1);
  doc.fontSize(9).fillColor('#bbb').text(
    `Generirano: ${new Date().toLocaleDateString('sl-SI')} — BudgetWise`,
    { align: 'center' }
  );

  doc.end();
}