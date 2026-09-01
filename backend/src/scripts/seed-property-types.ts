import 'dotenv/config';
import mongoose from 'mongoose';
import { PropertyTypeSchema } from '../property-types/schemas/property-type.schema';

const defaults = [
  ['Hotel', 15, 10],
  ['Villa', 12, 20],
  ['Resort', 15, 30],
  ['Homestay', 10, 40],
  ['Guest House', 10, 50],
] as const;

async function seed() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: 'guwahati_homestay',
  });
  const model = mongoose.model('PropertyTypeSeed', PropertyTypeSchema);
  for (const [name, commissionPercent, sortOrder] of defaults) {
    const slug = name.toLowerCase().replaceAll(' ', '-');
    await model.updateOne(
      { slug },
      {
        $setOnInsert: {
          name,
          slug,
          commissionPercent,
          sortOrder,
          status: 'active',
          description: '',
        },
      },
      { upsert: true },
    );
    const master = await model.findOne({ slug }).lean();
    if (master) {
      await mongoose.connection.collection('gw_properties').updateMany(
        {
          propertyTypeId: { $exists: false },
          propertyType: { $regex: `^${name}$`, $options: 'i' },
        },
        { $set: { propertyTypeId: master._id } },
      );
    }
  }
  console.log(
    `Property type master contains ${await model.countDocuments()} record(s).`,
  );
  await mongoose.disconnect();
}
seed().catch(async (error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Property type seed failed',
  );
  await mongoose.disconnect();
  process.exit(1);
});
