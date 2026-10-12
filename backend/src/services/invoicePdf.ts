import PDFDocument from 'pdfkit';
import type { Invoice, InvoiceItem, ClientProfile } from '@prisma/client';

type InvoicePdfInput = Invoice & {
  items: InvoiceItem[];
  client: ClientProfile & { user: { firstName: string; lastName: string; email: string } };
  order: { orderNumber: string } | null;
};

export function renderInvoicePdf(invoice: InvoicePdfInput, companyName: string) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fillColor('#123044').fontSize(22).text(companyName, { continued: false });
    doc.moveDown(0.2);
    doc.fillColor('#0F766E').fontSize(12).text('Invoice');
    doc.moveDown();
    doc.fillColor('#122033').fontSize(11);
    doc.text(`Invoice number: ${invoice.invoiceNumber}`);
    doc.text(`Date: ${invoice.invoiceDate.toISOString().slice(0, 10)}`);
    doc.text(`Due: ${invoice.dueDate.toISOString().slice(0, 10)}`);
    doc.text(`Status: ${invoice.status}`);
    if (invoice.order) doc.text(`Order: ${invoice.order.orderNumber}`);
    doc.moveDown();
    const client = invoice.client;
    doc.fontSize(12).text('Billed to', { underline: true });
    doc.fontSize(11).text(`${client.user.firstName} ${client.user.lastName}`);
    doc.text(client.user.email);
    if (client.companyName) doc.text(client.companyName);
    if (client.address) doc.text(client.address);
    if (client.country) doc.text(client.country);
    doc.moveDown();

    doc.fontSize(12).text('Items', { underline: true });
    doc.moveDown(0.4);
    for (const item of invoice.items) {
      doc.fontSize(11).text(`${item.description}  × ${item.quantity}`, { continued: true });
      doc.text(`  ${item.totalPrice.toString()} ${invoice.currency}`, { align: 'right' });
    }
    doc.moveDown();
    doc.text(`Subtotal: ${invoice.subtotal.toString()} ${invoice.currency}`, { align: 'right' });
    doc.text(`Discount: ${invoice.discount.toString()} ${invoice.currency}`, { align: 'right' });
    doc.text(`Tax: ${invoice.tax.toString()} ${invoice.currency}`, { align: 'right' });
    doc.fontSize(13).text(`Total: ${invoice.total.toString()} ${invoice.currency}`, { align: 'right' });
    doc.end();
  });
}
