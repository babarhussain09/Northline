# Security

- Helmet sets the usual API headers. Nginx adds a second set on the public site.
- CORS allows only the origins in `ALLOWED_ORIGINS`. A wildcard is rejected when `NODE_ENV=production`.
- Redis backs the rate limits: 100 requests per minute in general, 5 logins per 15 minutes, and 5 per hour for registration, password reset, contact, and demo requests. The API returns HTTP 429.
- Zod validates request bodies. Prisma sends parameterized queries.
- `authenticate` loads the user from the access token. `requireAdmin` checks `role === ADMIN`. `requireClient` checks the client role and profile.
- Client queries always filter by the profile id on the session. A missing record returns 404, including when it belongs to someone else.
- Audit logs store admin changes to services, clients, projects, refunds, invoices, and settings. Passwords, tokens, and secrets are removed before the JSON is saved.
- Request logs include request id, user id, route, status, and duration. They do not include passwords, JWTs, Stripe secrets, or card data.
- Production error responses do not include stack traces.
- JSON bodies are limited to 1 MB.
