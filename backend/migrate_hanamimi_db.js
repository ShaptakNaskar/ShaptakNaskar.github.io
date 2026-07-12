// One-time migration (Hanamimi 3.0): hanamimi_* collections move out of
// the cluster-default 'test' database into their own 'hanamimi'
// database (the models now register on useDb('hanamimi')).
//
// Copy → verify counts → drop the old collections. Idempotent: re-runs
// upsert by the collections' natural keys and find nothing left to drop.
//
// Run: node backend/migrate_hanamimi_db.js
require('dotenv').config();
const mongoose = require('mongoose');

const COLLECTIONS = [
  { name: 'hanamimi_stats', key: 'clientId' },
  { name: 'hanamimi_backups', key: 'blobId' },
  { name: 'hanamimi_rooms', key: 'code' },
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const oldDb = mongoose.connection.db; // cluster default ('test')
  const newDb = mongoose.connection.useDb('hanamimi').db;
  console.log(`migrating ${oldDb.databaseName} → hanamimi`);

  for (const { name, key } of COLLECTIONS) {
    const source = oldDb.collection(name);
    const target = newDb.collection(name);
    const docs = await source.find().toArray();
    for (const doc of docs) {
      const { _id, ...rest } = doc;
      await target.updateOne(
        { [key]: doc[key] },
        { $set: rest },
        { upsert: true }
      );
    }
    const before = docs.length;
    const after = await target.countDocuments();
    console.log(`  ${name}: copied ${before}, target now has ${after}`);
    if (after < before) {
      throw new Error(`${name}: target has fewer docs than source — NOT dropping`);
    }
    await source.drop().catch((e) => {
      if (e.codeName !== 'NamespaceNotFound') throw e;
    });
    console.log(`  ${name}: old collection dropped from ${oldDb.databaseName}`);
  }

  console.log('done');
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
