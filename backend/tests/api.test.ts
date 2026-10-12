import { execSync } from 'child_process';
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const stripeMock = vi.hoisted(() => {
  let customers = 0;
  let sessions = 0;
  return {
    customers: { create: vi.fn(async () => ({ id: `cus_test_${++customers}` })) },
    checkout: {
      sessions: {
        create: vi.fn(async () => ({ id: `cs_test_${++sessions}`, url: 'https://checkout.stripe.test/session' })),
        expire: vi.fn(async () => ({})),
      },
    },
    refunds: { create: vi.fn(async () => ({ id: 're_test', status: 'succeeded' })) },
  };
});

vi.mock('../src/integrations/stripe/client', () => ({
  isStripeConfigured: () => true,
  getStripe: () => stripeMock,
  constructStripeEvent: (payload: Buffer | string | Record<string, unknown>) => {
    if (typeof payload === 'string') return JSON.parse(payload);
    if (Buffer.isBuffer(payload)) return JSON.parse(payload.toString());
    return payload;
  },
}));

import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';
import { hashPassword } from '../src/utils/password';
import { hashToken, randomToken } from '../src/utils/tokens';

const app = createApp();
const password = 'Password123!';

async function ensureDatabase() {
  const url = new URL(process.env.DATABASE_URL as string);
  const database = url.pathname.replace(/^\//, '');
  const adminUrl = new URL(url.toString());
  adminUrl.pathname = '/postgres';
  const client = new pg.Client({ connectionString: adminUrl.toString() });
  await client.connect();
  const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
  if (existing.rowCount === 0) {
    await client.query(`CREATE DATABASE "${database}"`);
  }
  await client.end();
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    stdio: 'inherit',
    env: process.env,
  });
}

async function reset() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "AuditLog", "Notification", "WebhookEvent", "Refund", "InvoiceItem", "Invoice",
      "Payment", "OrderItem", "Order", "CartItem", "Cart", "ClientService",
      "ProjectActivity", "ProjectNote", "ProjectMilestone", "Project", "Review",
      "DemoRequest", "ContactRequest", "AuthToken", "RefreshToken", "ClientProfile",
      "Faq", "Service", "ServiceCategory", "Setting", "Counter", "User"
    RESTART IDENTITY CASCADE
  `);
}

async function tokenFor(email: string) {
  const response = await request(app).post('/api/v1/auth/login').send({ email, password });
  expect(response.status).toBe(200);
  return response.body.data.accessToken as string;
}

describe('api', () => {
  const clientEmail = 'client@test.dev';
  const otherEmail = 'other@test.dev';
  const adminEmail = 'admin@test.dev';
  let clientToken = '';
  let otherToken = '';
  let adminToken = '';
  let serviceId = '';
  let orderId = '';
  let projectId = '';

  beforeAll(async () => {
    await ensureDatabase();
    await reset();
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await hashPassword(password),
        firstName: 'Ada',
        lastName: 'Admin',
        role: 'ADMIN',
        emailVerified: true,
      },
    });
    await prisma.user.create({
      data: {
        email: otherEmail,
        passwordHash: await hashPassword(password),
        firstName: 'Omar',
        lastName: 'Other',
        role: 'CLIENT',
        emailVerified: true,
        clientProfile: { create: { companyName: 'Other Co' } },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('registers a client and rejects a duplicate email', async () => {
    const created = await request(app).post('/api/v1/auth/register').send({
      email: clientEmail,
      password,
      firstName: 'Mina',
      lastName: 'Client',
      companyName: 'Mina Studio',
    });
    expect(created.status).toBe(201);
    expect(created.body.data.email).toBe(clientEmail);
    expect(created.body.data.passwordHash).toBeUndefined();

    const duplicate = await request(app).post('/api/v1/auth/register').send({
      email: clientEmail,
      password,
      firstName: 'Mina',
      lastName: 'Client',
    });
    expect(duplicate.status).toBe(409);
  });

  it('rejects an invalid login', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({ email: clientEmail, password: 'wrong-password' });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('verifies email, logs in, refreshes, and logs out', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: clientEmail } });
    const token = randomToken();
    await prisma.authToken.create({
      data: { userId: user.id, type: 'EMAIL_VERIFICATION', tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 3600_000) },
    });
    const verified = await request(app).post('/api/v1/auth/verify-email').send({ token });
    expect(verified.status).toBe(200);

    const agent = request.agent(app);
    const login = await agent.post('/api/v1/auth/login').send({ email: clientEmail, password });
    expect(login.status).toBe(200);
    expect(login.body.data.accessToken).toBeTruthy();
    clientToken = login.body.data.accessToken;

    const me = await agent.get('/api/v1/auth/me').set('Authorization', `Bearer ${clientToken}`);
    expect(me.body.data.emailVerified).toBe(true);

    const refreshed = await agent.post('/api/v1/auth/refresh');
    expect(refreshed.status).toBe(200);
    clientToken = refreshed.body.data.accessToken;

    await agent.post('/api/v1/auth/logout');
    const afterLogout = await agent.post('/api/v1/auth/refresh');
    expect(afterLogout.status).toBe(401);

    clientToken = await tokenFor(clientEmail);
    otherToken = await tokenFor(otherEmail);
    adminToken = await tokenFor(adminEmail);
  });

  it('resets a password with a single-use token', async () => {
    const unknown = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'missing@test.dev' });
    expect(unknown.status).toBe(200);

    const user = await prisma.user.findUniqueOrThrow({ where: { email: clientEmail } });
    const token = randomToken();
    await prisma.authToken.create({
      data: { userId: user.id, type: 'PASSWORD_RESET', tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 3600_000) },
    });
    const reset = await request(app).post('/api/v1/auth/reset-password').send({ token, password });
    expect(reset.status).toBe(200);
    const reused = await request(app).post('/api/v1/auth/reset-password').send({ token, password });
    expect(reused.status).toBe(400);
    clientToken = await tokenFor(clientEmail);
  });

  it('keeps clients out of admin APIs and out of each other’s projects', async () => {
    const forbidden = await request(app).get('/api/v1/admin/analytics').set('Authorization', `Bearer ${clientToken}`);
    expect(forbidden.status).toBe(403);

    const category = await prisma.serviceCategory.create({ data: { name: 'Agents', slug: 'agents' } });
    const service = await prisma.service.create({
      data: {
        name: 'Test Agent',
        slug: 'test-agent',
        shortDescription: 'A test agent',
        description: 'Does one job.',
        categoryId: category.id,
        billingType: 'ONE_TIME',
        price: 100,
        isPublished: true,
        isActive: true,
      },
    });
    serviceId = service.id;
    const other = await prisma.user.findUniqueOrThrow({ where: { email: otherEmail }, include: { clientProfile: true } });
    const hidden = await prisma.project.create({
      data: {
        projectNumber: 'PRJ-TEST-1',
        clientId: other.clientProfile!.id,
        serviceId: service.id,
        name: 'Hidden',
        status: 'PAID',
        totalAmount: 100,
      },
    });
    const denied = await request(app).get(`/api/v1/projects/${hidden.id}`).set('Authorization', `Bearer ${clientToken}`);
    expect(denied.status).toBe(404);

    const adminView = await request(app).get(`/api/v1/admin/projects/${hidden.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(adminView.status).toBe(200);
    const clientRecord = await request(app).get(`/api/v1/admin/clients/${other.clientProfile!.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(clientRecord.status).toBe(200);
  });

  it('lets an admin publish a service that the public site can read', async () => {
    const created = await request(app).post('/api/v1/admin/services').set('Authorization', `Bearer ${adminToken}`).send({
      name: 'Published Agent',
      slug: 'published-agent',
      shortDescription: 'Ready to buy',
      description: 'A published service.',
      categoryId: (await prisma.serviceCategory.findFirstOrThrow()).id,
      billingType: 'ONE_TIME',
      price: 150,
      isPublished: false,
    });
    expect(created.status).toBe(201);
    const hidden = await request(app).get('/api/v1/services/published-agent');
    expect(hidden.status).toBe(404);
    const published = await request(app).post(`/api/v1/admin/services/${created.body.data.id}/publish`).set('Authorization', `Bearer ${adminToken}`);
    expect(published.status).toBe(200);
    const updated = await request(app).patch(`/api/v1/admin/services/${created.body.data.id}`).set('Authorization', `Bearer ${adminToken}`).send({ shortDescription: 'Ready to buy today' });
    expect(updated.status).toBe(200);
    const visible = await request(app).get('/api/v1/services/published-agent');
    expect(visible.status).toBe(200);
    expect(visible.body.data.shortDescription).toBe('Ready to buy today');
  });

  it('checks out from server prices and fulfills only from the webhook', async () => {
    await request(app).post('/api/v1/cart/items').set('Authorization', `Bearer ${clientToken}`).send({ serviceId, quantity: 1 });
    const checkout = await request(app).post('/api/v1/orders/checkout').set('Authorization', `Bearer ${clientToken}`);
    expect(checkout.status).toBe(200);
    expect(checkout.body.data.url).toBe('https://checkout.stripe.test/session');
    orderId = checkout.body.data.orderId;

    const pending = await request(app).get(`/api/v1/orders/${orderId}`).set('Authorization', `Bearer ${clientToken}`);
    expect(pending.body.data.status).toBe('PENDING_PAYMENT');

    const event = {
      id: 'evt_paid_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { orderId },
          client_reference_id: orderId,
          payment_status: 'paid',
          payment_intent: 'pi_test',
          customer: 'cus_test',
        },
      },
    };
    const first = await request(app).post('/api/v1/webhooks/stripe').set('stripe-signature', 'test').send(event);
    expect(first.status).toBe(200);
    expect(first.body.data.duplicate).toBe(false);
    const second = await request(app).post('/api/v1/webhooks/stripe').set('stripe-signature', 'test').send(event);
    expect(second.body.data.duplicate).toBe(true);

    const projects = await request(app).get('/api/v1/projects').set('Authorization', `Bearer ${clientToken}`);
    expect(projects.body.data).toHaveLength(1);
    projectId = projects.body.data[0].id;
    const detail = await request(app).get(`/api/v1/projects/${projectId}`).set('Authorization', `Bearer ${clientToken}`);
    expect(detail.body.data.milestones.length).toBeGreaterThan(0);
    const services = await request(app).get('/api/v1/client-services').set('Authorization', `Bearer ${clientToken}`);
    expect(services.body.data[0].status).toBe('ACTIVE');
    const invoices = await request(app).get('/api/v1/invoices').set('Authorization', `Bearer ${clientToken}`);
    expect(invoices.body.data[0].status).toBe('PAID');

    const otherView = await request(app).get(`/api/v1/projects/${projectId}`).set('Authorization', `Bearer ${otherToken}`);
    expect(otherView.status).toBe(404);
  });

  it('marks a failed payment without creating a project', async () => {
    await request(app).post('/api/v1/cart/items').set('Authorization', `Bearer ${otherToken}`).send({ serviceId, quantity: 1 });
    const checkout = await request(app).post('/api/v1/orders/checkout').set('Authorization', `Bearer ${otherToken}`);
    const failedOrderId = checkout.body.data.orderId as string;
    const before = await prisma.project.count({ where: { orderId: failedOrderId } });
    const failed = await request(app).post('/api/v1/webhooks/stripe').set('stripe-signature', 'test').send({
      id: 'evt_failed_1',
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_failed', metadata: { orderId: failedOrderId } } },
    });
    expect(failed.status).toBe(200);
    const order = await prisma.order.findUniqueOrThrow({ where: { id: failedOrderId } });
    expect(order.status).toBe('FAILED');
    expect(before).toBe(0);
    expect(await prisma.project.count({ where: { orderId: failedOrderId } })).toBe(0);
  });

  it('refunds a payment and closes the project from the Stripe webhook', async () => {
    const payments = await request(app).get('/api/v1/payments').set('Authorization', `Bearer ${clientToken}`);
    const payment = payments.body.data[0];
    const refund = await request(app).post('/api/v1/admin/refunds').set('Authorization', `Bearer ${adminToken}`).send({ paymentId: payment.id, reason: 'Requested by client' });
    expect(refund.status).toBe(200);
    const cents = Math.round(Number(payment.amount) * 100);
    const event = await request(app).post('/api/v1/webhooks/stripe').set('stripe-signature', 'test').send({
      id: 'evt_refund_1',
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch_test',
          amount_refunded: cents,
          payment_intent: 'pi_test',
          refunds: { data: [{ id: 're_test', amount: cents, status: 'succeeded' }] },
        },
      },
    });
    expect(event.status).toBe(200);
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe('REFUNDED');
    const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    expect(project.status).toBe('REFUNDED');
    const duplicate = await request(app).post('/api/v1/webhooks/stripe').set('stripe-signature', 'test').send({
      id: 'evt_refund_1',
      type: 'charge.refunded',
      data: { object: { id: 'ch_test', amount_refunded: cents, payment_intent: 'pi_test', refunds: { data: [] } } },
    });
    expect(duplicate.body.data.duplicate).toBe(true);
  });

  it('lets an admin update project status and milestones', async () => {
    const category = await prisma.serviceCategory.findFirstOrThrow();
    const service = await prisma.service.findFirstOrThrow();
    const client = await prisma.user.findUniqueOrThrow({ where: { email: clientEmail }, include: { clientProfile: true } });
    const created = await request(app).post('/api/v1/admin/projects').set('Authorization', `Bearer ${adminToken}`).send({
      clientId: client.clientProfile!.id,
      serviceId: service.id,
      name: 'Manual project',
      totalAmount: 80,
      categoryId: category.id,
    });
    expect(created.status).toBe(201);
    const id = created.body.data.id as string;
    const milestoneId = created.body.data.milestones[0].id as string;
    const status = await request(app).patch(`/api/v1/admin/projects/${id}`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'IN_PROGRESS' });
    expect(status.body.data.status).toBe('IN_PROGRESS');
    const milestone = await request(app).patch(`/api/v1/admin/projects/${id}/milestones/${milestoneId}`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'COMPLETED' });
    expect(milestone.body.data.status).toBe('COMPLETED');
    const mine = await request(app).get(`/api/v1/projects/${id}`).set('Authorization', `Bearer ${clientToken}`);
    expect(mine.status).toBe(200);
    const notMine = await request(app).get(`/api/v1/projects/${id}`).set('Authorization', `Bearer ${otherToken}`);
    expect(notMine.status).toBe(404);
  });
});
