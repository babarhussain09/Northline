# Authentication

Passwords are hashed with Argon2id.

| Token | Where it lives | Lifetime |
| --- | --- | --- |
| Access JWT | API response, then memory in the React app | 15 minutes (`JWT_ACCESS_TTL`) |
| Refresh token | HttpOnly cookie `refreshToken`, path `/api/v1/auth` | 7 days |

The access token is not written to localStorage. The refresh token is stored only as a hash in `RefreshToken`. Each refresh rotates it. Presenting a revoked refresh token revokes the rest of that user’s sessions.

Endpoints:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `POST /api/v1/auth/verify-email`
- `GET /api/v1/auth/me`

Checkout requires a verified email. Login is allowed before verification so the person can request the email again.

In development the API and the Vite app are different ports. The Vite dev server proxies `/api` to the API, so the browser treats them as one site and the cookie is sent. In production, Nginx does the same on one host.

Set `COOKIE_SECURE=false` only when you are serving production mode over plain HTTP. Leave it unset in a real HTTPS deployment so the cookie is marked Secure.
