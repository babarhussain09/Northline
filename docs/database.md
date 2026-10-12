# Database

PostgreSQL is the system of record. Prisma schema: `backend/prisma/schema.prisma`.

Main records:

- `User` and `ClientProfile` — login identity and the billing profile. Roles are `CLIENT` and `ADMIN`.
- `Service` and `ServiceCategory` — the catalog. Features, benefits, and use cases are JSON blocks on the service.
- `Cart` / `CartItem` — one cart per client.
- `Order` / `OrderItem` — prices copied at purchase time, including setup fee.
- `Payment` / `Refund` — Stripe references only. Card data is never stored.
- `Invoice` / `InvoiceItem` — created when a payment is confirmed.
- `Project` / `ProjectMilestone` / `ProjectNote` / `ProjectActivity` — delivery work.
- `ClientService` — the service a client currently holds, including a Stripe subscription id when billing is recurring.
- `WebhookEvent` — Stripe event id, used so a delivery is not applied twice.
- `Review`, `Faq`, `DemoRequest`, `ContactRequest`, `Notification`, `AuditLog`, `Setting`.

Apply changes with:

```bash
cd backend
npx prisma migrate dev
```

Production containers run `prisma migrate deploy` on startup.
