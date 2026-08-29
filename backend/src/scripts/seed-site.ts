import 'dotenv/config';
import mongoose from 'mongoose';
import { SiteSchema } from '../sites/schemas/site.schema';
import { SiteDomainSchema } from '../sites/schemas/site-domain.schema';
import { normalizeDomain } from '../sites/utils/normalize-domain';
import { SiteStatus } from '../common/enums/status.enum';

async function seedSite() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');

  const name = process.env.SEED_SITE_NAME || 'Shillong Homestay';
  const slug = process.env.SEED_SITE_SLUG || 'shillong';
  const domain = normalizeDomain(
    process.env.SEED_SITE_DOMAIN || 'shillong.localhost',
  );
  if (!domain) throw new Error('SEED_SITE_DOMAIN is invalid');

  await mongoose.connect(uri, { dbName: 'guwahati_homestay' });
  const Site = mongoose.model('SiteSeed', SiteSchema);
  const SiteDomain = mongoose.model('SiteDomainSeed', SiteDomainSchema);
  const existing = await Site.findOne({ $or: [{ slug }, { domains: domain }] });
  if (existing) {
    console.log(`Site ${existing.name} already exists; no changes made.`);
    await mongoose.disconnect();
    return;
  }

  const domainOwner = await SiteDomain.findOne({ normalizedDomain: domain });
  if (domainOwner) throw new Error(`Domain ${domain} is already assigned`);

  const site = await Site.create({
    name,
    slug,
    domain,
    domains: [domain],
    city: process.env.SEED_SITE_CITY || 'Shillong',
    state: process.env.SEED_SITE_STATE || 'Meghalaya',
    country: process.env.SEED_SITE_COUNTRY || 'India',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    status: SiteStatus.ACTIVE,
    logo: process.env.SEED_SITE_LOGO || '/logo.png',
    favicon: process.env.SEED_SITE_FAVICON || '/favicon.ico',
    theme: {
      primaryColor: process.env.SEED_SITE_PRIMARY_COLOR || '#235347',
      secondaryColor: process.env.SEED_SITE_SECONDARY_COLOR || '#111315',
      themeVariant: 'default',
      headerStyle: 'default',
      heroStyle: 'mountain',
      cardStyle: 'default',
      buttonStyle: 'default',
      footerStyle: 'default',
      layoutStyle: 'default',
    },
    seo: {
      title: `${name} | Book Homestays in Shillong`,
      description: 'Discover verified homestays and hotels in Shillong.',
      canonicalUrl: `http://${domain}`,
    },
    contact: {},
    social: {},
    pageConfig: {},
  });
  await SiteDomain.create({
    siteId: site._id,
    domain,
    normalizedDomain: domain,
    isPrimary: true,
    active: true,
  });
  console.log(`Created test site ${name} (${domain}).`);
  await mongoose.disconnect();
}

seedSite().catch(async (error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Site seed failed');
  await mongoose.disconnect();
  process.exit(1);
});
