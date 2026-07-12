const mongoose = require('mongoose');

// Long-Distance Date rooms (Hanamimi 3.0 #6): two players, one queue,
// lockstep playback over a 6-char code. No accounts, no chat, no
// message history — the room document IS the entire shared state, and
// clients poll it (~2.5s) because Vercel serverless can't hold sockets.
//
// expiresAt + the TTL index below make Mongo garbage-collect dead rooms
// on its own; every sync pushes expiry 24h out.
const memberSchema = new mongoose.Schema({
  id: { type: String, required: true, maxlength: 64 },
  lastSeen: { type: Date, default: Date.now },
  positionMs: { type: Number, default: 0 },
  isPlaying: { type: Boolean, default: false },
  bufferedMs: { type: Number, default: 0 },
  stalled: { type: Boolean, default: false },
  trackKey: { type: String, default: '', maxlength: 128 },
}, { _id: false });

const roomTrackSchema = new mongoose.Schema({
  title: { type: String, default: '', maxlength: 300 },
  artist: { type: String, default: '', maxlength: 300 },
  album: { type: String, default: '', maxlength: 300 },
  source: { type: String, default: 'youtube', maxlength: 16 },
  sourceId: { type: String, default: '', maxlength: 128 },
  durationMs: { type: Number, default: 0 },
  artUrl: { type: String, default: '', maxlength: 600 },
}, { _id: false });

const hanamimiRoomSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  members: { type: [memberSchema], default: [] },

  queue: { type: [roomTrackSchema], default: [] },
  queueRev: { type: Number, default: 0 },

  currentIndex: { type: Number, default: 0 },
  positionMs: { type: Number, default: 0 },
  positionAt: { type: Date, default: Date.now }, // server clock anchor
  isPlaying: { type: Boolean, default: false },
  controlRev: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 3600 * 1000) },
}, { collection: 'hanamimi_rooms' });

hanamimiRoomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Lives in the dedicated 'hanamimi' database (see HanamimiStat.js).
module.exports = mongoose.connection
  .useDb('hanamimi', { useCache: true })
  .model('HanamimiRoom', hanamimiRoomSchema);
