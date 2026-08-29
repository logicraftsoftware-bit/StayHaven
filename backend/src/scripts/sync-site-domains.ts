import 'dotenv/config';
import mongoose from 'mongoose';
import { SiteSchema } from '../sites/schemas/site.schema';
import { SiteDomainSchema } from '../sites/schemas/site-domain.schema';
import { normalizeDomains } from '../sites/utils/normalize-domain';

async function syncSiteDomains() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');

  await mongoose.connect(uri, { dbName: 'guwahati_homestay' });
  const Site = mongoose.model('SiteDomainMigrationSite', SiteSchema);
  const SiteDomain = mongoose.model('SiteDomainMigration', SiteDomainSchema);
  const sites = await Site.find().lean();

  for (const site of sites) {
    const domains = normalizeDomains(site.domain, site.domains || []);
    for (const [index, domain] of domains.entries()) {
      const conflict = await SiteDomain.findOne({
        normalizedDomain: domain,
        siteId: { $ne: site._id },
      }).lean();
      if (conflict) {
        throw new Error(`Domain ${domain} is already assigned to another site`);
      }
      await SiteDomain.updateOne(
        { normalizedDomain: domain },
        {
          $set: {
            siteId: site._id,
            domain,
            normalizedDomain: domain,
            isPrimary: index === 0,
            active: true,
          },
          $setOnInsert: {
            verified: false,
            verificationMethod: 'dns',
            verificationStatus: 'pending',
            sslStatus: 'pending',
          },
        },
        { upsert: true },
      );
    }
    console.log(`Synchronized ${domains.length} domain(s) for ${site.name}`);
  }
  await mongoose.disconnect();
}

syncSiteDomains().catch(async (error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Domain sync failed');
  await mongoose.disconnect();
  process.exit(1);
});
