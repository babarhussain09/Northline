# Architecture

Northline is one Express API and one React application. They share a Postgres database and Redis. There is no service mesh and no extra role system.

```
Browser
  → Vite (development) or Nginx (production)
    → /api/v1  Express
         → route
         → authenticate / requireAdmin / requireClient
         → controller
         → service
         → Prisma
    → PostgreSQL
    → Redis (rate limits)
    → Stripe
    → SMTP
```

Clients and admins use the same API. A client request never accepts a client id from the browser. The API reads `clientId` from the authenticated user. Admin routes live under `/api/v1/admin` and require `role === ADMIN`.

Payments become real only after a verified Stripe webhook. The browser return URL shows “confirming payment” and polls the order.

Public pages are the marketing site. `/dashboard` is the client account. `/admin` is the operator console.
