This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Phase 3 — Multi-site theme engine

One shared Next.js application resolves each marketplace theme from its Site configuration. Phase 3 supports theme presets; dynamic header, hero, property-card and footer variants; site colors, typography, radii, spacing and container width; image/video hero slides; safe legacy fallbacks; and a live preview in the Super Admin site wizard. Values remain isolated by resolved hostname and configuration changes do not require a frontend code deployment.

The site editor uses six modal steps: Basic information, Domain & location, Branding, Theme, Hero banners, and SEO & contact. Completed steps are green, the current step is amber, and future steps are gray.

## Phase 4 — Controlled page configuration

StayHaven remains one frontend, one backend and one MongoDB database serving multiple domains. Site configuration controls identity, theme configuration controls how a site looks, and page configuration controls what each page shows. Level 4 custom code is not enabled.

Page definitions live in `gw_page_configs` and are uniquely scoped by `siteId + pageSlug`. Each record has independent draft and published content, page SEO, a preset and an ordered list of allowlisted sections. The public API reads only published content; Super Admin edits drafts and explicitly publishes them. Publishing invalidates the affected in-process page cache and creates an entry in `gw_audit_logs`.

The page registry covers home, listing/search, informational, account and owner entry pages. The section registry is allowlisted in the backend and frontend; database values are never used as imports or executable code. Supported configuration fields are filtered per section, unknown sections are rejected by admin APIs and ignored safely by the renderer. Missing configurations use a non-destructive default homepage, so no database migration is required. Saving a page in Super Admin creates its record lazily and is safe for existing production sites.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
