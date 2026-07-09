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

  updatedAt: { type: Date, default: Date.now },
}, { collection: 'hanamimi_stats' });

hanamimiStatSchema.index({ totalSeconds: -1 });

module.exports = mongoose.model('HanamimiStat', hanamimiStatSchema);
