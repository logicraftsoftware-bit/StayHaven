import 'dotenv/config';
import { setServers } from 'node:dns';
import mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import { AdminSchema } from '../admins/schemas/admin.schema';
import { Role } from '../common/enums/role.enum';
import { AdminStatus } from '../common/enums/status.enum';
async function seed() {
  const dnsServers = (process.env.DNS_SERVERS || '')
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean);
  if (dnsServers.length) setServers(dnsServers);

  const uri = process.env.MONGODB_URI,
    name = process.env.SUPER_ADMIN_NAME,
    email = process.env.SUPER_ADMIN_EMAIL,
    password = process.env.SUPER_ADMIN_PASSWORD;
  if (!uri || !name || !email || !password)
    throw new Error('MONGODB_URI and SUPER_ADMIN_* variables are required');
  if (password.length < 8)
    throw new Error('SUPER_ADMIN_PASSWORD must contain at least 8 characters');
  await mongoose.connect(uri, { dbName: 'guwahati_homestay' });
  const Admin = mongoose.model('Admin', AdminSchema);
  if (await Admin.exists({ email: email.toLowerCase() })) {
    console.log('Super Admin already exists; no changes made.');
    await mongoose.disconnect();
    return;
  }
  await Admin.create({
    name,
    email: email.toLowerCase(),
    passwordHash: await bcrypt.hash(password, 12),
    role: Role.SUPER_ADMIN,
    status: AdminStatus.ACTIVE,
  });
  console.log('Super Admin created successfully.');
  await mongoose.disconnect();
}
seed().catch(async () => {
  console.error(
    'Unable to seed Super Admin. Check configuration and database access.',
  );
  await mongoose.disconnect();
  process.exit(1);
});
