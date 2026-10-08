import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import mongoose from 'mongoose';

const fields = [
  'gatewayOrderId',
  'gatewayPaymentId',
  'razorpayOrderId',
  'razorpayPaymentId',
] as const;

function mongodbUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  try {
    const processes = JSON.parse(
      execFileSync('pm2', ['jlist'], { encoding: 'utf8' }),
    ) as Array<{
      name: string;
      pm2_env?: Record<string, unknown>;
    }>;
    const env = processes.find(
      (process) => process.name === 'guwahati-backend',
    )?.pm2_env;
    if (typeof env?.MONGODB_URI === 'string') return env.MONGODB_URI;
  } catch {
    /* The local environment need not have PM2. */
  }
  throw new Error('MONGODB_URI is unavailable for the booking index migration');
}

async function migrate() {
  await mongoose.connect(mongodbUri(), { dbName: 'guwahati_homestay' });
  try {
    const collection = mongoose.connection.db!.collection('gw_bookings');
    for (const field of fields) {
      const current = await collection.indexes();
      const name = `${field}_unique_string`;
      const replacement = current.find((index) => index.name === name);
      if (
        replacement &&
        (!replacement.unique ||
          replacement.key[field] !== 1 ||
          JSON.stringify(replacement.partialFilterExpression) !==
            JSON.stringify({ [field]: { $type: 'string' } }))
      )
        throw new Error(
          `Unexpected definition for ${name}; no legacy index was removed`,
        );
      if (!replacement) {
        await collection.createIndex(
          { [field]: 1 },
          {
            name,
            unique: true,
            partialFilterExpression: { [field]: { $type: 'string' } },
          },
        );
      }
      const legacyName = `${field}_1`;
      const legacy = current.find((index) => index.name === legacyName);
      if (legacy) {
        if (
          !legacy.unique ||
          legacy.key[field] !== 1 ||
          Object.keys(legacy.key).length !== 1
        )
          throw new Error(
            `Unexpected definition for ${legacyName}; index was not removed`,
          );
        await collection.dropIndex(legacyName);
        console.log(`Replaced ${legacyName} with ${name}`);
      }
    }
    console.log(
      'Booking gateway indexes allow multiple bookings without online payment IDs.',
    );
  } finally {
    await mongoose.disconnect();
  }
}

void migrate().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Booking index migration failed',
  );
  process.exitCode = 1;
});
