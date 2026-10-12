import { asyncHandler } from '../utils/asyncHandler';
import { created, ok, paginated } from '../utils/response';
import { parsePagination } from '../utils/pagination';
import { clientIdFromRequest } from '../middleware/authenticate';
import * as cart from '../services/cart.service';
import * as checkout from '../services/checkout.service';
import * as account from '../services/account.service';
import { renderInvoicePdf } from '../services/invoicePdf';
import { getSettings } from '../services/settings.service';
import { cartItemSchema, cartQuantitySchema } from '../validators/schemas';
import type { InvoiceStatus, OrderStatus, PaymentStatus } from '@prisma/client';

export const getCart = asyncHandler(async (req, res) => ok(res, await cart.presentCart(clientIdFromRequest(req))));

export const addItem = asyncHandler(async (req, res) => {
  const body = cartItemSchema.parse(req.body);
  return created(res, await cart.addCartItem(clientIdFromRequest(req), body.serviceId, body.quantity));
});

export const updateItem = asyncHandler(async (req, res) => {
  const body = cartQuantitySchema.parse(req.body);
  return ok(res, await cart.updateCartItem(clientIdFromRequest(req), String(req.params.id), body.quantity));
});

export const removeItem = asyncHandler(async (req, res) => {
  return ok(res, await cart.removeCartItem(clientIdFromRequest(req), String(req.params.id)));
});

export const clear = asyncHandler(async (req, res) => ok(res, await cart.clearCart(clientIdFromRequest(req))));

export const startCheckout = asyncHandler(async (req, res) => {
  return ok(res, await checkout.createCheckout(req.user!.id));
});

export const listOrders = asyncHandler(async (req, res) => {
  const query = parsePagination(req.query);
  const result = await account.listOrders({
    ...query,
    clientId: clientIdFromRequest(req),
    status: typeof req.query.status === 'string' && req.query.status ? (req.query.status as OrderStatus) : undefined,
  });
  return paginated(res, result.data, result.pagination);
});

export const getOrder = asyncHandler(async (req, res) => ok(res, await account.getOrder(String(req.params.id), clientIdFromRequest(req))));

export const listPayments = asyncHandler(async (req, res) => {
  const query = parsePagination(req.query);
  const result = await account.listPayments({
    ...query,
    clientId: clientIdFromRequest(req),
    status: typeof req.query.status === 'string' && req.query.status ? (req.query.status as PaymentStatus) : undefined,
  });
  return paginated(res, result.data, result.pagination);
});

export const getPayment = asyncHandler(async (req, res) => ok(res, await account.getPayment(String(req.params.id), clientIdFromRequest(req))));

export const listInvoices = asyncHandler(async (req, res) => {
  const query = parsePagination(req.query);
  const result = await account.listInvoices({
    ...query,
    clientId: clientIdFromRequest(req),
    status: typeof req.query.status === 'string' && req.query.status ? (req.query.status as InvoiceStatus) : undefined,
  });
  return paginated(res, result.data, result.pagination);
});

export const getInvoice = asyncHandler(async (req, res) => ok(res, await account.getInvoice(String(req.params.id), clientIdFromRequest(req))));

export const downloadInvoice = asyncHandler(async (req, res) => {
  const invoice = await account.getInvoice(String(req.params.id), clientIdFromRequest(req));
  const settings = await getSettings();
  const pdf = await renderInvoicePdf(invoice, settings.companyName);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
  res.send(pdf);
});

export const listServices = asyncHandler(async (req, res) => {
  const result = await account.listClientServices({ ...parsePagination(req.query), clientId: clientIdFromRequest(req) });
  return paginated(res, result.data, result.pagination);
});

export const summary = asyncHandler(async (req, res) => ok(res, await account.clientSummary(clientIdFromRequest(req))));

export const listNotifications = asyncHandler(async (req, res) => {
  const result = await account.listNotifications(req.user!.id, parsePagination(req.query));
  return res.json({ success: true, data: result.data, pagination: result.pagination, unread: result.unread });
});

export const readNotification = asyncHandler(async (req, res) => ok(res, await account.markNotificationRead(req.user!.id, String(req.params.id))));

export const readAllNotifications = asyncHandler(async (req, res) => {
  await account.markAllNotificationsRead(req.user!.id);
  return ok(res, { updated: true });
});
