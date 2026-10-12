import type { InvoiceStatus, OrderStatus, PaymentStatus } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, paginated } from '../utils/response';
import { parsePagination } from '../utils/pagination';
import { requestMeta } from '../services/audit.service';
import * as analytics from '../services/analytics.service';
import * as account from '../services/account.service';
import * as refunds from '../services/refund.service';
import * as settings from '../services/settings.service';
import { listAuditLogs } from '../services/site.service';
import { renderInvoicePdf } from '../services/invoicePdf';
import { clientUpdateSchema, invoiceStatusSchema, refundSchema, settingsSchema } from '../validators/schemas';
import { writeAudit } from '../services/audit.service';

export const overview = asyncHandler(async (_req, res) => ok(res, await analytics.analytics()));

export const clients = asyncHandler(async (req, res) => {
  const query = parsePagination(req.query);
  const result = await analytics.listClients(query);
  return paginated(res, result.data, result.pagination);
});

export const clientDetail = asyncHandler(async (req, res) => ok(res, await analytics.getClientDetail(String(req.params.id))));

export const updateClient = asyncHandler(async (req, res) => {
  return ok(res, await analytics.updateClient(String(req.params.id), clientUpdateSchema.parse(req.body), req.user!.id, requestMeta(req)));
});

export const orders = asyncHandler(async (req, res) => {
  const query = parsePagination(req.query);
  const result = await account.listOrders({
    ...query,
    clientId: typeof req.query.clientId === 'string' ? req.query.clientId : undefined,
    status: typeof req.query.status === 'string' && req.query.status ? (req.query.status as OrderStatus) : undefined,
  });
  return paginated(res, result.data, result.pagination);
});

export const orderDetail = asyncHandler(async (req, res) => ok(res, await account.getOrder(String(req.params.id))));

export const payments = asyncHandler(async (req, res) => {
  const query = parsePagination(req.query);
  const result = await account.listPayments({
    ...query,
    clientId: typeof req.query.clientId === 'string' ? req.query.clientId : undefined,
    status: typeof req.query.status === 'string' && req.query.status ? (req.query.status as PaymentStatus) : undefined,
  });
  return paginated(res, result.data, result.pagination);
});

export const paymentDetail = asyncHandler(async (req, res) => ok(res, await account.getPayment(String(req.params.id))));

export const invoices = asyncHandler(async (req, res) => {
  const query = parsePagination(req.query);
  const result = await account.listInvoices({
    ...query,
    clientId: typeof req.query.clientId === 'string' ? req.query.clientId : undefined,
    status: typeof req.query.status === 'string' && req.query.status ? (req.query.status as InvoiceStatus) : undefined,
  });
  return paginated(res, result.data, result.pagination);
});

export const invoiceDetail = asyncHandler(async (req, res) => ok(res, await account.getInvoice(String(req.params.id))));

export const invoicePdf = asyncHandler(async (req, res) => {
  const invoice = await account.getInvoice(String(req.params.id));
  const current = await settings.getSettings();
  const pdf = await renderInvoicePdf(invoice, current.companyName);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
  res.send(pdf);
});

export const updateInvoice = asyncHandler(async (req, res) => {
  const invoice = await account.updateInvoiceStatus(String(req.params.id), invoiceStatusSchema.parse(req.body).status);
  await writeAudit({
    userId: req.user!.id,
    action: 'INVOICE_CREATED',
    entityType: 'Invoice',
    entityId: invoice.id,
    newValue: { status: invoice.status, invoiceNumber: invoice.invoiceNumber },
    ...requestMeta(req),
  });
  return ok(res, invoice);
});

export const listRefunds = asyncHandler(async (req, res) => {
  const result = await refunds.listRefunds(parsePagination(req.query));
  return paginated(res, result.data, result.pagination);
});

export const createRefund = asyncHandler(async (req, res) => {
  return ok(res, await refunds.requestRefund(refundSchema.parse(req.body), req.user!.id, requestMeta(req)));
});

export const getSettings = asyncHandler(async (_req, res) => ok(res, await settings.getSettings()));

export const updateSettings = asyncHandler(async (req, res) => {
  const result = await settings.updateSettings(settingsSchema.parse(req.body));
  await writeAudit({
    userId: req.user!.id,
    action: 'SETTINGS_UPDATED',
    entityType: 'Setting',
    oldValue: result.previous,
    newValue: result.settings,
    ...requestMeta(req),
  });
  return ok(res, result.settings);
});

export const auditLogs = asyncHandler(async (req, res) => {
  const result = await listAuditLogs({
    ...parsePagination(req.query),
    action: typeof req.query.action === 'string' ? req.query.action : undefined,
    entityType: typeof req.query.entityType === 'string' ? req.query.entityType : undefined,
  });
  return paginated(res, result.data, result.pagination);
});
