# Deployment

Development:

```bash
cp .env.example .env
# fill JWT secrets, seed passwords, and Stripe keys
docker compose up --build
```

The site is at http://localhost:5173 and the API at http://localhost:4000.

Production Compose adds Nginx, the production image targets, and the backup scheduler:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

Set `NODE_ENV=production`, real JWT secrets of at least 32 characters, explicit `ALLOWED_ORIGINS`, `FRONTEND_URL`, Stripe keys, and SMTP. Nginx listens on port 80 and proxies `/api`, `/health`, `/ready`, `/sitemap.xml`, and `/robots.txt` to the API. Put TLS in front of Nginx before you expose it.

The API container runs migrations, then starts as the `app` user. Postgres and Redis have health checks. `GET /health` is process liveness. `GET /ready` checks Postgres and Redis.

Do not commit `.env`.
