# Guwahati Homestay API

NestJS 11 API foundation for a multi-site hotel marketplace. Production runs as a persistent Node.js process on a VPS behind PM2 and Nginx, with MongoDB Atlas as the shared database.

This phase contains Super Admin, sites, owners, properties, audit logs, authentication, health checks, and Swagger. It intentionally does not implement bookings, payments, customer accounts, the owner app, or domain resolution.

## Configuration model

Environment variables are validated before NestJS starts. External variables map to internal `ConfigService` paths:

| Environment variable | Internal path |
| --- | --- |
| `NODE_ENV` | `nodeEnv` |
| `PORT` | `port` |
| `MONGODB_URI` | `mongodbUri` |
| `JWT_SECRET` | `jwt.secret` |
| `JWT_EXPIRES_IN` | `jwt.expiresIn` |
| `FRONTEND_URLS` | `frontendUrls` |

`MONGODB_URI` and `JWT_SECRET` are required. `JWT_SECRET` must contain at least 32 characters. `FRONTEND_URL` remains accepted as a backwards-compatible fallback, but new environments should use comma-separated `FRONTEND_URLS`.

## Local setup

Use Node.js 20 or newer.

```powershell
cd "D:\sourav\Client Work\hotel\stay_haven\backend"
npm install
Copy-Item .env.example .env
```

Replace every placeholder in `.env` with real local credentials. Never commit `.env`.

```dotenv
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=a-random-secret-with-at-least-32-characters
JWT_EXPIRES_IN=7d
FRONTEND_URLS=http://localhost:3000
```

Create the first administrator once:

```powershell
npm run seed:admin
```

If the local network refuses MongoDB SRV DNS queries, set `DNS_SERVERS=8.8.8.8,1.1.1.1`. The seed command and API will then resolve Atlas through those DNS servers. Leave it empty on a VPS with working system DNS.

## Verification commands

Development server:

```powershell
npm run start:dev
```

Expected final startup lines include:

```text
Nest application successfully started
API listening on http://0.0.0.0:5000 (development)
```

In another terminal:

```powershell
Invoke-RestMethod http://localhost:5000/api/health
```

Expected fields include:

```json
{
  "success": true,
  "status": "ok",
  "service": "guwahati-homestay-api",
  "environment": "development",
  "database": "connected",
  "uptimeSeconds": 1,
  "timestamp": "<ISO timestamp>"
}
```

Swagger UI: `http://localhost:5000/api/docs`

OpenAPI JSON: `http://localhost:5000/api/docs-json`

Production build and process:

```powershell
npm run build
$env:NODE_ENV="production"
npm run start:prod
```

Expected production startup line:

```text
API listening on http://0.0.0.0:5000 (production)
```

Quality checks:

```powershell
npm run format
npm run lint
npm run test -- --runInBand
npm run test:e2e -- --runInBand
```

## VPS process model

Install, build, and verify on the VPS:

```bash
cd /var/www/guwahati-homestay/backend
npm ci
npm run build
NODE_ENV=production npm run start:prod
```

After direct verification, run `dist/main.js` under PM2 and reverse-proxy the configured port through Nginx. Store production variables in a protected VPS environment file or PM2 configuration outside Git. Allow the VPS address in MongoDB Atlas Network Access and never expose MongoDB directly.

## API endpoints

- Health: `GET /api/health`
- Swagger: `GET /api/docs`
- Admin login: `POST /api/v1/admin/auth/login`
- Admin profile/dashboard: `/api/v1/admin/me`, `/api/v1/admin/dashboard`
- Sites: `/api/v1/admin/sites`
- Owners: `/api/v1/admin/owners`
- Properties: `/api/v1/admin/properties`

All management routes require a valid `SUPER_ADMIN` Bearer token. Collections retain the `gw_` prefix, including `gw_admins`, `gw_audit_logs`, `gw_owners`, `gw_properties`, and `gw_sites`.

## Multi-site frontend foundation

StayHaven uses one Next.js frontend, one NestJS API, and one MongoDB database for every marketplace domain. The incoming hostname is normalized and resolved against the active records in `gw_sites`; no domain requires a separate application deployment.

Public site endpoints:

- List active public sites: `GET /api/v1/sites`
- Resolve the current public site from the request hostname: `GET /api/v1/sites/current`

The public response includes only branding, theme, SEO, contact, social, and location configuration. Site management remains restricted to Super Admin routes.

Each property stores its global `ownerId` and selected `siteId`. Owners keep one platform-wide account and may manage properties across multiple sites. The hostname site is only the default when creating a property; owners may select another active marketplace.

### Configure Guwahati and a local Shillong test site

In `/super-admin`, edit the Guwahati site and configure both production hostnames:

```text
guwahatihomestay.com
www.guwahatihomestay.com
```

Create an active test site with values similar to:

```text
Name: Shillong Homestay
Slug: shillong
Primary domain: shillong.localhost
Primary color: #235347
SEO title: Shillong Homestay | Book Homestays in Shillong
```

On Windows, add these entries to `C:\Windows\System32\drivers\etc\hosts` from an Administrator editor:

```text
127.0.0.1 guwahati.localhost
127.0.0.1 shillong.localhost
```

For local development, configure the Guwahati record with `guwahati.localhost` as an additional alias, start both applications, and open the two hostnames using the frontend port. Normal `localhost` development continues to use the safe fallback site configuration.

API resolver checks can also be performed without changing the hosts file:

```bash
curl -H "Host: guwahatihomestay.com" http://127.0.0.1:5001/api/v1/sites/current
curl -H "Host: shillong.localhost" http://127.0.0.1:5001/api/v1/sites/current
```

The production Nginx configuration must continue forwarding the original `Host` header. Requests from `www.guwahatihomestay.com` and the root hostname resolve to the same normalized Guwahati site.
