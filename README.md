# Northline

Northline sells AI agents, automation, software services, and custom projects. Clients browse a catalog, pay with Stripe, and follow the project. Admins run the catalog, delivery, and refunds.

The stack is Express, Prisma, PostgreSQL, Redis, React, Material UI, and Docker.

## Installation

Requirements: Node.js 22, Docker, and a Stripe account for payments.

```bash
cp .env.example .env
cd backend && npm install
cd ../frontend && npm install
```

Edit `.env` before you migrate or seed. `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must be changed. `SEED_ADMIN_PASSWORD` and `SEED_DEMO_CLIENT_PASSWORD` must be set before seeding. Do not reuse the example values in production.

## Environment variables

See `.env.example`.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Signing secrets |
| `FRONTEND_URL` | Public site URL, used in email links |
| `ALLOWED_ORIGINS` | Comma-separated browser origins. No wildcard in production |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Outbound mail |
| `ADMIN_NOTIFY_EMAIL` | Inbox for demo and contact requests |
| `BACKUP_DIR`, `BACKUP_RETENTION_DAYS` | Backup location and retention |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | First admin, read at seed time |
| `COOKIE_SECURE` | Set to `false` only for HTTP production tests |

If SMTP is empty, the API logs the email in development and continues. Payment fulfillment does not depend on mail delivery.

## Docker

```bash
docker compose up --build
```

This starts Postgres, Redis, the API, and the Vite app. Open http://localhost:5173.

Production, including Nginx and the weekly backup container:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

## Database migration

```bash
cd backend
npx prisma migrate dev
```

Or `make migrate`. Production containers run `prisma migrate deploy` when they start.

## Seed

Put admin and demo-client passwords in `.env`, then:

```bash
cd backend
npm run seed
```

The seed creates categories, six services, FAQs, the admin user, and published reviews for the demo client. It refuses to run when `NODE_ENV=production` unless `SEED_ALLOW_PRODUCTION=true`.

## Development

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

Useful scripts in each package: `dev`, `build`, `test` (API), `lint`, `format`. Root shortcuts:

```bash
make dev
make build
make test
make migrate
make seed
make backup
make restore FILE=subscription_portal_YYYYMMDD_HHMMSS.sql.gz
```

## Testing

API tests use a separate database named with a `_test` suffix. Start Postgres first (`docker compose up postgres redis -d`), then:

```bash
cd backend
npm test
```

The suite covers registration, login, bad passwords, refresh, logout, password reset, admin authorization, client isolation, catalog publish, checkout, a successful webhook, a failed payment, a duplicate webhook, refunds, and project milestones.

## Stripe setup

1. Create a Stripe secret key and publishable key.
2. Point the webhook endpoint at `https://<your-host>/api/v1/webhooks/stripe`.
3. Subscribe to checkout, payment intent, charge, invoice, and customer subscription events.
4. For local work: `stripe listen --forward-to localhost:4000/api/v1/webhooks/stripe`.

Details are in [docs/stripe.md](docs/stripe.md). An order is paid only after the webhook is verified.

## SMTP setup

Any SMTP server Nodemailer can reach will do. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM`. Demo and contact forms also mail `ADMIN_NOTIFY_EMAIL`.

Templates cover welcome, verification, password reset, payment success, payment failure, invoice, project created, project completed, demo request, contact request, and refund.

## Backup

Production Compose keeps dumps on the `backup_data` volume, outside the Postgres container. The scheduler runs every Sunday at 02:00 and deletes files older than `BACKUP_RETENTION_DAYS` (default 30). `make backup` runs a dump now. See [docs/backups.md](docs/backups.md) for restore and the S3 hook.

## Production deployment

Set production secrets, explicit CORS origins, and Stripe live keys. Put TLS in front of Nginx. Confirm `GET /health` and `GET /ready`. Then seed only if you intend to, with `SEED_ALLOW_PRODUCTION=true`. See [docs/deployment.md](docs/deployment.md).
