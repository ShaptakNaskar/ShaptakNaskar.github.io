const mongoose = require('mongoose');

// Zero-knowledge encrypted backup blobs from Hanamimi+ (3.0 #8).
// blobId is derived client-side from the user's passphrase (separate
// hash domain from the encryption key), and `data` is AES-GCM
// ciphertext — the server can't tell whose blob is whose and can't
// decrypt anything. No linkage to HanamimiStat rows by design.
const hanamimiBackupSchema = new mongoose.Schema({
  blobId: { type: String, required: true, unique: true, index: true },
  data: { type: String, required: true }, // base64 ciphertext
  size: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'hanamimi_backups' });

// Lives in the dedicated 'hanamimi' database (see HanamimiStat.js).
module.exports = mongoose.connection
  .useDb('hanamimi', { useCache: true })
  .model('HanamimiBackup', hanamimiBackupSchema);
