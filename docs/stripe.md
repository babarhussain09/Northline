# Stripe

Set these in the environment:

```
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

## Checkout

1. The client adds published services to the cart.
2. `POST /api/v1/orders/checkout` reloads those services, calculates the total, and creates an order in `PENDING_PAYMENT`.
3. The API opens a Stripe Checkout Session. Recurring services use subscription mode. One-time, project, and custom services use payment mode. A custom service with a zero price cannot be checked out.
4. The browser is redirected to Stripe. Coming back to `/checkout/success` does not mark the order paid.

## Webhook

`POST /api/v1/webhooks/stripe` checks the Stripe signature and stores the event id. If that id already exists, the API returns 200 and does nothing. If processing throws, the event row is removed so Stripe can retry.

Handled events:

- `checkout.session.completed` and `payment_intent.succeeded` fulfill a pending order: payment succeeded, project and milestones created, client service activated, invoice created, cart lines removed, email sent.
- `payment_intent.payment_failed` marks the order failed.
- `charge.refunded` updates the payment, and a full refund closes the order, project, and client service.
- `invoice.paid` records a later subscription renewal. The first subscription invoice is ignored because checkout already fulfilled it.
- `invoice.payment_failed` notifies the client.
- `customer.subscription.created`, `updated`, and `deleted` update the client service status.

Local forwarding:

```bash
stripe listen --forward-to localhost:4000/api/v1/webhooks/stripe
```

Put the signing secret from that command in `STRIPE_WEBHOOK_SECRET`.

Refunds are started by an admin at `POST /api/v1/admin/refunds`. Stripe remains the source of truth for the final refunded state.
