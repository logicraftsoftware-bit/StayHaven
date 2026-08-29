# Guwahati Homestay API

NestJS 11 API foundation for a multi-site hotel marketplace. Production runs as a persistent Node.js process on a VPS behind PM2 and Nginx, with MongoDB Atlas as the shared database.

The production foundation contains Super Admin, sites, domains, owners, properties, audit logs, authentication, health checks, Swagger, and hostname-based public site resolution. Bookings, payments, customer accounts, and the owner mobile app remain later phases.

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
| `UPLOAD_DIR` | `uploadDir` |

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
UPLOAD_DIR=./uploads
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
- Site image upload: `POST /api/v1/admin/media/images`
- Public uploaded images: `GET /api/uploads/*`

All management routes require a valid `SUPER_ADMIN` Bearer token. Collections retain the `gw_` prefix, including `gw_admins`, `gw_audit_logs`, `gw_owners`, `gw_properties`, and `gw_sites`.

Logo and favicon uploads accept verified PNG, JPG, WEBP, GIF, or ICO files up to 5 MB. In production, `UPLOAD_DIR` must point to persistent storage outside the Git checkout; the deployment workflow uses `/var/www/guwahati-homestay-data/uploads`.

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

## Phase 2 production domain management

Domains are registered in the dedicated `gw_site_domains` collection while the legacy `domain` and `domains` fields in `gw_sites` remain synchronized for backward compatibility. Each domain record stores its normalized hostname, owning `siteId`, primary/alias state, verification status, SSL status, active state, and timestamps. A unique normalized-domain index prevents one hostname from being assigned to two sites.

Run the safe, idempotent migration after deploying the Phase 2 code:

```bash
cd /var/www/guwahati-homestay/backend
npm run migrate:site-domains
```

The command creates or updates registry records from existing sites. It never deletes a site or domain, and it stops if a hostname is already owned by another site.

For local multi-site testing, create the Shillong test site without overwriting any existing record:

```bash
npm run seed:site
```

Optional `SEED_SITE_NAME`, `SEED_SITE_SLUG`, `SEED_SITE_DOMAIN`, `SEED_SITE_CITY`, `SEED_SITE_STATE`, `SEED_SITE_COUNTRY`, `SEED_SITE_LOGO`, `SEED_SITE_FAVICON`, and `SEED_SITE_PRIMARY_COLOR` environment variables customize that seed.

### Domain onboarding workflow

1. Create the site in `/super-admin`, or edit an existing site.
2. Add the primary hostname and any aliases. The backend normalizes protocols, casing, paths, ports, trailing slashes, and `www` consistently.
3. Point the domain's DNS A records to the VPS. Preserve MX/TXT email records.
4. Add the hostname to the shared Nginx `server_name`; keep forwarding `Host`, `X-Forwarded-Host`, and `X-Forwarded-Proto` from the trusted local reverse proxy.
5. Verify DNS, issue the TLS certificate with Certbot, and confirm HTTPS.
6. In Super Admin, mark the domain verified and SSL active only after those external checks succeed. Domain state is operational metadata; the application does not modify DNS or issue certificates automatically.
7. Test the public site endpoint, scoped property endpoint, frontend, SEO metadata, and inactive-site behavior.

Phase 2 management endpoints (Super Admin token required):

- `GET /api/v1/admin/sites/:siteId/domains`
- `POST /api/v1/admin/sites/:siteId/domains`
- `PATCH /api/v1/admin/sites/:siteId/domains/:domainId`

Public hostname-scoped endpoints:

- `GET /api/v1/sites/current`
- `GET /api/v1/properties`
- `GET /api/v1/properties/:slug`

Public properties are always filtered by the resolved active `siteId` and approved status. The hostname selects public marketplace context only; it never grants owner or administrator authorization. Owner accounts remain global, while each property independently stores its `ownerId` and selected `siteId`.

### Phase 2 verification

```bash
curl -H "Host: guwahatihomestay.com" http://127.0.0.1:5001/api/v1/sites/current
curl -H "Host: www.guwahatihomestay.com" http://127.0.0.1:5001/api/v1/sites/current
curl -H "Host: shillong.localhost" http://127.0.0.1:5001/api/v1/sites/current
curl -H "Host: shillong.localhost" http://127.0.0.1:5001/api/v1/properties
```

Open `guwahati.localhost:3001` and `shillong.localhost:3001` after adding the local host mappings. Confirm that branding, theme variables, contact details, page configuration, favicon, and SEO differ by site. Change only Shillong in Super Admin and confirm Guwahati is unaffected. Finally, set the test site inactive and verify its public endpoints return not found. Do not use the production Guwahati record for destructive testing.
