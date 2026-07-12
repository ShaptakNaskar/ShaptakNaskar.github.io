const mongoose = require('mongoose');

// Opt-in listening stats submitted from Hanamimi+ (the music player).
// Keyed by a client-generated id so re-submissions update in place;
// nickname is user-chosen (we ask people NOT to use their real name).
const hanamimiStatSchema = new mongoose.Schema({
  clientId: { type: String, required: true, unique: true, index: true },
  nickname: { type: String, required: true, maxlength: 24 },
  device: { type: String, default: '', maxlength: 60 },

  localSeconds: { type: Number, default: 0 },
  youtubeSeconds: { type: Number, default: 0 },
  saavnSeconds: { type: Number, default: 0 },
  localSongs: { type: Number, default: 0 },
  youtubeSongs: { type: Number, default: 0 },
  saavnSongs: { type: Number, default: 0 },

  totalSeconds: { type: Number, default: 0, index: true },
  totalSongs: { type: Number, default: 0 },

  // Taste-compatibility MinHash (Hanamimi 3.0 #5): 128 × 32-bit mins
  // over the user's top artists, computed client-side. Irreversible —
  // the server can estimate overlap between two users but never
  // recover an artist name. Optional (its own consent line in-app).
  signature: { type: [Number], default: undefined },

  updatedAt: { type: Date, default: Date.now },
}, { collection: 'hanamimi_stats' });

hanamimiStatSchema.index({ totalSeconds: -1 });

// Hanamimi data lives in its own 'hanamimi' database, not the cluster
// default ('test') where the portfolio/zendrive collections live.
// useDb shares the existing connection pool — no second connection.
module.exports = mongoose.connection
  .useDb('hanamimi', { useCache: true })
  .model('HanamimiStat', hanamimiStatSchema);
