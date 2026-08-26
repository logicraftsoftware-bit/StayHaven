# Guwahati Homestay Super Admin API

NestJS 11 REST API for one Super Admin controlling multiple location-specific marketplace sites. Requires Node.js 20+ and MongoDB Atlas.

## Setup

```bash
cd backend
npm install
copy .env.example .env
npm run seed:admin
npm run start:dev
```

Configure `.env` with an Atlas connection string whose database user has access to `guwahati_homestay`. Set a long random `JWT_SECRET`, strong `SUPER_ADMIN_PASSWORD`, and comma-separated trusted origins in `FRONTEND_URL`. Never commit `.env`.

All application collections use the `gw_` prefix: `gw_admins`, `gw_audit_logs`, `gw_owners`, `gw_properties`, and `gw_sites`. Existing unprefixed collections are not migrated automatically.

Swagger: `http://localhost:5000/api/docs`

Health: `GET http://localhost:5000/api/health`

Login:

```http
POST /api/v1/admin/auth/login
Content-Type: application/json

{"email":"admin@guwahatihomestay.com","password":"your-password"}
```

Copy the returned access token into Swagger's Bearer authorization or send `Authorization: Bearer <token>`. All `/api/v1/admin/*` management endpoints require a valid `SUPER_ADMIN` token.

## Commands

```bash
npm run start:dev
npm run build
npm run start:prod
npm run seed:admin
npm run lint
npm run test
npm run test:e2e
```

## API surface

- `POST /api/v1/admin/auth/login`
- `GET|PATCH /api/v1/admin/me`
- `PATCH /api/v1/admin/me/password`
- `GET /api/v1/admin/dashboard`
- `POST|GET /api/v1/admin/sites`
- `GET|PATCH /api/v1/admin/sites/:id`
- `PATCH /api/v1/admin/sites/:id/status`
- `GET /api/v1/admin/properties`
- `GET /api/v1/admin/properties/:id`
- `PATCH /api/v1/admin/properties/:id/{approve|reject|request-changes|suspend}`
- `GET /api/v1/admin/owners`
- `GET /api/v1/admin/owners/:id`
- `PATCH /api/v1/admin/owners/:id/status`

## Deployment preparation

Build with `npm ci && npm run build`, set production environment variables outside the repository, run `npm run start:prod` under a process manager, and reverse-proxy port `5000` through Nginx with HTTPS. Restrict Atlas network access to the VPS and set `FRONTEND_URL` to trusted public domains. Do not expose MongoDB directly.

This phase intentionally excludes customer, booking, payment, owner registration/dashboard, and admin UI implementation.
