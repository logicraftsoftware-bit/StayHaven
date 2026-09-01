import 'dotenv/config';
import { readdir } from 'node:fs/promises';
import { extname, join, parse, resolve } from 'node:path';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import mongoose from 'mongoose';

const legacyPrefix = '/api/uploads/site-media/';
const allowedCollections = ['gw_sites', 'gw_page_configs', 'gw_properties'];

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function collectReplacements(
  value: unknown,
  path: string,
  urls: Map<string, string>,
  updates: Record<string, string>,
) {
  if (typeof value === 'string') {
    const replacement = urls.get(value);
    if (replacement && path) updates[path] = replacement;
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (key === '_id') continue;
    collectReplacements(child, path ? `${path}.${key}` : key, urls, updates);
  }
}

async function migrate() {
  const uri = requireEnv('MONGODB_URI');
  const folder = process.env.CLOUDINARY_FOLDER || 'stayhaven';
  cloudinary.config({
    cloud_name: requireEnv('CLOUDINARY_CLOUD_NAME'),
    api_key: requireEnv('CLOUDINARY_API_KEY'),
    api_secret: requireEnv('CLOUDINARY_API_SECRET'),
    secure: true,
  });

  const directory = join(
    resolve(process.env.UPLOAD_DIR || './uploads'),
    'site-media',
  );
  const files = await readdir(directory, { withFileTypes: true });
  const urls = new Map<string, string>();

  for (const entry of files.filter((item) => item.isFile())) {
    const extension = extname(entry.name).toLowerCase();
    const resourceType = ['.mp4', '.webm'].includes(extension)
      ? 'video'
      : 'image';
    const publicId = `${folder}/site-media/${parse(entry.name).name}`;
    let uploaded: UploadApiResponse;
    try {
      uploaded = await cloudinary.uploader.upload(join(directory, entry.name), {
        resource_type: resourceType,
        public_id: publicId,
        overwrite: false,
        unique_filename: false,
      });
    } catch {
      uploaded = (await cloudinary.api.resource(publicId, {
        resource_type: resourceType,
      })) as UploadApiResponse;
    }
    urls.set(`${legacyPrefix}${entry.name}`, uploaded.secure_url);
    console.log(`Uploaded ${entry.name}`);
  }

  await mongoose.connect(uri, { dbName: 'guwahati_homestay' });
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB connection is unavailable');
  let changedDocuments = 0;
  let changedUrls = 0;
  for (const collectionName of allowedCollections) {
    const collection = db.collection(collectionName);
    for await (const document of collection.find({})) {
      const updates: Record<string, string> = {};
      collectReplacements(document, '', urls, updates);
      if (!Object.keys(updates).length) continue;
      await collection.updateOne({ _id: document._id }, { $set: updates });
      changedDocuments += 1;
      changedUrls += Object.keys(updates).length;
    }
  }
  console.log(
    `Migrated ${urls.size} file(s); updated ${changedUrls} URL(s) in ${changedDocuments} document(s).`,
  );
  console.log('Original VPS files were retained as rollback backups.');
  await mongoose.disconnect();
}

migrate().catch(async (error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Media migration failed',
  );
  await mongoose.disconnect();
  process.exit(1);
});
