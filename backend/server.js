const express = require('express');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB Connection Utility
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');
  } catch (err) {
    console.error('MongoDB Connection Error:', err);
  }
};

// Initial connection attempt (optional, but good for local dev)
connectDB();

// Enable CORS for frontend access
app.use(cors());
// 6mb: Hanamimi's encrypted backup blobs ride JSON as base64 (the
// Vercel function request cap is ~4.5MB of raw body anyway).
app.use(express.json({ limit: '6mb' }));

// ====================================
// API ROUTES MUST COME BEFORE STATIC FILES
// ====================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/projects', async (req, res) => { // Made async just in case
  // ... existing code ...
  const projects = [];
  const csvPath = path.join(__dirname, 'projects.csv');

  if (!fs.existsSync(csvPath)) {
    return res.status(404).json({ error: 'Projects CSV not found' });
  }

  fs.createReadStream(csvPath)
    .pipe(csv())
    .on('data', (row) => {
      projects.push({
        ProjName: row.ProjName || '',
        ProjSummary: row.ProjSummary || '',
        ProjImageLink: row.ProjImageLink || 'https://via.placeholder.com/400x300?text=Project',
        ProjLink: row.ProjLink || '#',
        Tags: row.Tags ? row.Tags.split(';').map(t => t.trim()).filter(Boolean) : []
      });
    })
    .on('end', () => {
      res.json(projects);
    })
    .on('error', (err) => {
      console.error('Error reading CSV:', err);
      res.status(500).json({ error: 'Failed to read projects' });
    });
});

app.get('/api/webapps', async (req, res) => {
  const webapps = [];
  const csvPath = path.join(__dirname, 'webapps.csv');

  if (!fs.existsSync(csvPath)) {
    return res.status(404).json({ error: 'Web Apps CSV not found' });
  }

  fs.createReadStream(csvPath)
    .pipe(csv())
    .on('data', (row) => {
      webapps.push({
        AppName: row.AppName || '',
        AppSummary: row.AppSummary || '',
        AppImageLink: row.AppImageLink || 'https://via.placeholder.com/400x300?text=WebApp',
        AppLink: row.AppLink || '#'
      });
    })
    .on('end', () => {
      res.json(webapps);
    })
    .on('error', (err) => {
      console.error('Error reading Web Apps CSV:', err);
      res.status(500).json({ error: 'Failed to read web apps' });
    });
});

// API endpoint to fetch and increment visitor count
const PortfolioHit = require('./models/PortfolioHit');

app.get('/api/hits', async (req, res) => {
  try {
    await connectDB(); // Ensure DB is connected before query

    let hitCounter = await PortfolioHit.findOne();

    if (!hitCounter) {
      // Create initial counter if it doesn't exist
      hitCounter = new PortfolioHit({ hits: 1 });
    } else {
      // Increment hits
      hitCounter.hits += 1;
    }

    await hitCounter.save();
    res.json({ count: hitCounter.hits });
  } catch (err) {
    console.error('Error updating hits:', err);
    res.status(500).json({ error: 'Failed to update hits' });
  }
});


// ====================================
// GAME LEADERBOARD API ENDPOINTS
// ====================================
const GameScore = require('./models/GameScore');

// Sanitize player name: alphanumeric, spaces only, max 20 chars
const sanitizeName = (name) => {
  if (!name || typeof name !== 'string') return 'Anonymous';
  return name.replace(/[^a-zA-Z0-9 ]/g, '').trim().slice(0, 20) || 'Anonymous';
};

// GET top 5 scores for a specific game
app.get('/api/leaderboard/:game', async (req, res) => {
  try {
    await connectDB();

    const { game } = req.params;
    const validGames = ['paddles', 'wordguess', '2048', 'breakout', 'cosmic-lander', 'space-defender', 'wild-cards', 'packet-rush'];

    if (!validGames.includes(game)) {
      return res.status(400).json({ error: 'Invalid game name' });
    }

    const scores = await GameScore.find({ game })
      .sort({ score: -1 })
      .limit(5)
      .select('playerName score achievement createdAt')
      .lean();

    res.json(scores);
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// POST a new score
app.post('/api/leaderboard', async (req, res) => {
  try {
    await connectDB();

    const { game, playerName, score, achievement } = req.body;
    const validGames = ['paddles', 'wordguess', '2048', 'breakout', 'cosmic-lander', 'space-defender', 'wild-cards', 'packet-rush'];

    if (!validGames.includes(game)) {
      return res.status(400).json({ error: 'Invalid game name' });
    }

    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({ error: 'Invalid score' });
    }

    // Check if score qualifies for top 5
    const topScores = await GameScore.find({ game })
      .sort({ score: -1 })
      .limit(5)
      .select('score')
      .lean();

    const qualifies = topScores.length < 5 || score > topScores[topScores.length - 1].score;

    if (!qualifies) {
      return res.json({ qualified: false, message: 'Score does not qualify for leaderboard' });
    }

    const newScore = new GameScore({
      game,
      playerName: sanitizeName(playerName),
      score,
      achievement: achievement ? String(achievement).slice(0, 50) : ''
    });

    await newScore.save();

    // If we now have more than 5 scores, remove the lowest
    const allScores = await GameScore.find({ game }).sort({ score: -1 });
    if (allScores.length > 5) {
      await GameScore.deleteOne({ _id: allScores[allScores.length - 1]._id });
    }

    res.json({ qualified: true, score: newScore });
  } catch (err) {
    console.error('Error saving score:', err);
    res.status(500).json({ error: 'Failed to save score' });
  }
});


// API endpoint to fetch blogs from CSV
app.get('/api/blogs', (req, res) => {
  const blogs = [];
  const csvPath = path.join(__dirname, 'blogs.csv');

  if (!fs.existsSync(csvPath)) {
    return res.status(404).json({ error: 'Blogs CSV not found' });
  }

  fs.createReadStream(csvPath)
    .pipe(csv())
    .on('data', (row) => {
      blogs.push({
        Title: row.Title || 'Untitled',
        CoverImage: row.CoverImage || 'https://via.placeholder.com/800x400',
        Preview: row.Preview || '',
        Slug: row.Slug || '',
        ContentFile: row.ContentFile || ''
      });
    })
    .on('end', () => {
      res.json(blogs);
    })
    .on('error', (err) => {
      console.error('Error reading Blogs CSV:', err);
      res.status(500).json({ error: 'Failed to read blogs' });
    });
});

// API endpoint to fetch a single blog post content
app.get('/api/blogs/:slug', (req, res) => {
  const { slug } = req.params;
  const csvPath = path.join(__dirname, 'blogs.csv');

  if (!fs.existsSync(csvPath)) {
    return res.status(404).json({ error: 'Blogs database not found' });
  }

  // First find the filename associated with the slug
  let foundFile = null;

  fs.createReadStream(csvPath)
    .pipe(csv())
    .on('data', (row) => {
      if (row.Slug === slug) {
        foundFile = row.ContentFile;
      }
    })
    .on('end', () => {
      if (!foundFile) {
        return res.status(404).json({ error: 'Blog post not found' });
      }

      const blogPath = path.join(__dirname, 'blogs', foundFile);

      if (!fs.existsSync(blogPath)) {
        return res.status(404).json({ error: 'Blog content file not found' });
      }

      fs.readFile(blogPath, 'utf8', (err, data) => {
        if (err) {
          console.error('Error reading blog file:', err);
          return res.status(500).json({ error: 'Failed to read blog content' });
        }
        res.send(data);
      });
    })
    .on('error', (err) => {
      console.error('Error processing CSV:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
});

// CV Download endpoint - CRITICAL: Must be before wildcard route
app.get('/api/download-cv', (req, res) => {
  const cvPath = path.join(__dirname, 'ShaptakCV.pdf');

  console.log('CV download requested. Path:', cvPath);

  if (!fs.existsSync(cvPath)) {
    console.error('CV file not found at:', cvPath);
    return res.status(404).json({ error: 'CV not found' });
  }

  // Set proper headers for PDF download
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="ShaptakCV.pdf"');

  // Stream the file
  const fileStream = fs.createReadStream(cvPath);
  fileStream.on('error', (err) => {
    console.error('Error streaming CV:', err);
    res.status(500).json({ error: 'Failed to download CV' });
  });

  fileStream.pipe(res);
});


// Profile Picture endpoint
app.get('/api/pfp', (req, res) => {
  const pfpPath = path.join(__dirname, 'pfp.png');

  if (!fs.existsSync(pfpPath)) {
    return res.status(404).json({ error: 'Profile picture not found' });
  }

  // Set proper headers
  res.setHeader('Content-Type', 'image/png');

  // Stream the file
  const fileStream = fs.createReadStream(pfpPath);
  fileStream.on('error', (err) => {
    console.error('Error streaming profile picture:', err);
    res.status(500).json({ error: 'Failed to retrieve profile picture' });
  });

  fileStream.pipe(res);
});

// WebApp Images endpoint
app.get('/api/webapp_img/:filename', (req, res) => {
  const { filename } = req.params;
  const imgPath = path.join(__dirname, 'webapp_img', filename);

  if (!fs.existsSync(imgPath)) {
    return res.status(404).json({ error: 'Image not found' });
  }

  // Set proper headers (guessing png/jpeg based on extension)
  const ext = path.extname(filename).toLowerCase();
  let contentType = 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
  else if (ext === '.svg') contentType = 'image/svg+xml';
  else if (ext === '.webp') contentType = 'image/webp';
  else if (ext === '.gif') contentType = 'image/gif';

  res.setHeader('Content-Type', contentType);

  const fileStream = fs.createReadStream(imgPath);
  fileStream.on('error', (err) => {
    console.error('Error streaming image:', err);
    res.status(500).json({ error: 'Failed to retrieve image' });
  });

  fileStream.pipe(res);
});

// ====================================
// HANAMIMI+ LISTENING STATS + LEADERBOARD
// ====================================
const HanamimiStat = require('./models/HanamimiStat');

const clampInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
};

// Opt-in stats upload from Hanamimi+. Upserts by clientId so a user's
// row updates rather than duplicating. Nickname is sanitized; we never
// store anything the app didn't explicitly send with consent.
app.post('/api/hanamimi/stats', async (req, res) => {
  try {
    await connectDB();
    const b = req.body || {};
    const clientId = String(b.clientId || '').trim().slice(0, 64);
    if (!clientId) return res.status(400).json({ error: 'clientId required' });

    const nickname = sanitizeName(b.nickname).slice(0, 24) || 'Anonymous';
    const localSeconds = clampInt(b.localSeconds);
    const youtubeSeconds = clampInt(b.youtubeSeconds);
    const saavnSeconds = clampInt(b.saavnSeconds);
    const localSongs = clampInt(b.localSongs);
    const youtubeSongs = clampInt(b.youtubeSongs);
    const saavnSongs = clampInt(b.saavnSongs);

    const doc = {
      nickname,
      device: String(b.device || '').replace(/[^\w .\-()+]/g, '').slice(0, 60),
      localSeconds, youtubeSeconds, saavnSeconds,
      localSongs, youtubeSongs, saavnSongs,
      totalSeconds: localSeconds + youtubeSeconds + saavnSeconds,
      totalSongs: localSongs + youtubeSongs + saavnSongs,
      updatedAt: new Date(),
    };

    // Taste fingerprint (3.0 #5): 128 × 32-bit MinHash mins, or an
    // explicit null to withdraw a previously shared one. Anything
    // malformed is ignored rather than rejected — the stats update
    // must never fail over the optional extra.
    const update = { $set: doc, $setOnInsert: { clientId } };
    if (Array.isArray(b.signature) && b.signature.length === 128 &&
        b.signature.every((n) => Number.isFinite(n) && n >= 0)) {
      update.$set.signature = b.signature.map((n) => Math.floor(n));
    } else if (b.signature === null) {
      update.$unset = { signature: 1 };
    }

    await HanamimiStat.findOneAndUpdate(
      { clientId },
      update,
      { upsert: true, new: true }
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Error saving hanamimi stats:', err);
    res.status(500).json({ error: 'Failed to save stats' });
  }
});

// Top 10 listeners by total time. Nicknames only — no device/ids leak.
// With ?clientId= the rows are annotated with taste compatibility vs
// the caller (3.0 #5): percent of matching MinHash positions. Percent
// only — raw signatures never leave the server.
app.get('/api/hanamimi/leaderboard', async (req, res) => {
  try {
    await connectDB();
    const top = await HanamimiStat.find()
      .sort({ totalSeconds: -1 })
      .limit(10)
      // device is optional (users may share name only); shown when present.
      .select('clientId nickname device totalSeconds totalSongs localSeconds youtubeSeconds saavnSeconds signature -_id')
      .lean();

    const callerId = String(req.query.clientId || '').trim().slice(0, 64);
    let mySig = null;
    if (callerId) {
      const me = await HanamimiStat.findOne({ clientId: callerId })
        .select('signature -_id').lean();
      if (me && Array.isArray(me.signature) && me.signature.length === 128) {
        mySig = me.signature;
      }
    }

    res.json(top.map((row) => {
      const out = {
        nickname: row.nickname,
        device: row.device || '',
        totalSeconds: row.totalSeconds,
        totalSongs: row.totalSongs,
        localSeconds: row.localSeconds,
        youtubeSeconds: row.youtubeSeconds,
        saavnSeconds: row.saavnSeconds,
      };
      if (callerId && row.clientId === callerId) {
        out.self = true;
      } else if (mySig && Array.isArray(row.signature) &&
                 row.signature.length === 128) {
        let matches = 0;
        for (let i = 0; i < 128; i++) {
          if (row.signature[i] === mySig[i]) matches++;
        }
        out.compat = Math.round((matches / 128) * 100);
      }
      return out;
    }));
  } catch (err) {
    console.error('Error fetching hanamimi leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

const HanamimiBackup = require('./models/HanamimiBackup');
const HanamimiRoom = require('./models/HanamimiRoom');

// ---- Long-Distance Date rooms (Hanamimi 3.0 #6) ----

// No 0/O/1/I/L — codes get read out loud over voice calls.
const ROOM_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const makeRoomCode = () => Array.from({ length: 6 },
  () => ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)]).join('');

const roomView = (room, memberId, sinceQueueRev) => {
  const partner = (room.members || []).find((m) => m.id !== memberId);
  const online = partner &&
    (Date.now() - new Date(partner.lastSeen).getTime()) < 10000;
  return {
    ok: true,
    code: room.code,
    controlRev: room.controlRev,
    queueRev: room.queueRev,
    // The queue only rides along when the client is behind — it's the
    // bulky part of the document and it rarely changes.
    queue: room.queueRev > sinceQueueRev ? room.queue : undefined,
    currentIndex: room.currentIndex,
    positionMs: room.positionMs,
    positionAgeMs: Date.now() - new Date(room.positionAt).getTime(),
    isPlaying: room.isPlaying,
    partner: partner ? {
      online: !!online,
      stalled: !!partner.stalled && online,
      bufferedMs: partner.bufferedMs,
      positionMs: partner.positionMs,
      trackKey: partner.trackKey,
    } : null,
  };
};

app.post('/api/hanamimi/room', async (req, res) => {
  try {
    await connectDB();
    const memberId = String((req.body || {}).memberId || '').trim().slice(0, 64);
    if (!memberId) return res.status(400).json({ error: 'memberId required' });
    // Collisions are astronomically unlikely at this scale but cheap
    // to retry anyway.
    for (let attempt = 0; attempt < 4; attempt++) {
      const code = makeRoomCode();
      try {
        const room = await HanamimiRoom.create({
          code,
          members: [{ id: memberId, lastSeen: new Date() }],
        });
        return res.json(roomView(room, memberId, -1));
      } catch (e) {
        if (e.code !== 11000) throw e; // 11000 = duplicate code, retry
      }
    }
    res.status(500).json({ error: 'could not mint a room code' });
  } catch (err) {
    console.error('Error creating hanamimi room:', err);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

app.post('/api/hanamimi/room/:code/join', async (req, res) => {
  try {
    await connectDB();
    const code = String(req.params.code || '').trim().toUpperCase();
    const memberId = String((req.body || {}).memberId || '').trim().slice(0, 64);
    if (!memberId) return res.status(400).json({ error: 'memberId required' });
    const room = await HanamimiRoom.findOne({ code });
    if (!room) return res.status(404).json({ error: 'room not found' });
    const already = room.members.some((m) => m.id === memberId);
    if (!already && room.members.length >= 2) {
      return res.status(409).json({ error: 'room is full' });
    }
    if (!already) {
      room.members.push({ id: memberId, lastSeen: new Date() });
      await room.save();
    }
    res.json(roomView(room, memberId, -1));
  } catch (err) {
    console.error('Error joining hanamimi room:', err);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

// The one endpoint that does everything: presence heartbeat, partner
// status, and (optionally) a control write — queue/index/position/
// play state, last-write-wins via controlRev.
app.post('/api/hanamimi/room/:code/sync', async (req, res) => {
  try {
    await connectDB();
    const code = String(req.params.code || '').trim().toUpperCase();
    const b = req.body || {};
    const memberId = String(b.memberId || '').trim().slice(0, 64);
    if (!memberId) return res.status(400).json({ error: 'memberId required' });
    const room = await HanamimiRoom.findOne({ code });
    if (!room) return res.status(404).json({ error: 'room not found' });
    const member = room.members.find((m) => m.id === memberId);
    if (!member) return res.status(403).json({ error: 'not in this room' });

    member.lastSeen = new Date();
    member.positionMs = Math.max(0, Number(b.positionMs) || 0);
    member.isPlaying = !!b.isPlaying;
    member.bufferedMs = Math.max(0, Number(b.bufferedMs) || 0);
    member.stalled = !!b.stalled;
    member.trackKey = String(b.trackKey || '').slice(0, 128);

    const control = b.control;
    if (control && typeof control === 'object') {
      if (Array.isArray(control.queue)) {
        room.queue = control.queue.slice(0, 200).map((t) => ({
          title: String(t.title || '').slice(0, 300),
          artist: String(t.artist || '').slice(0, 300),
          album: String(t.album || '').slice(0, 300),
          source: String(t.source || 'youtube').slice(0, 16),
          sourceId: String(t.sourceId || '').slice(0, 128),
          durationMs: Math.max(0, Number(t.durationMs) || 0),
          artUrl: String(t.artUrl || '').slice(0, 600),
        }));
        room.queueRev += 1;
      }
      if (Number.isFinite(Number(control.currentIndex))) {
        room.currentIndex = Math.max(0, Math.floor(Number(control.currentIndex)));
      }
      if (Number.isFinite(Number(control.positionMs))) {
        room.positionMs = Math.max(0, Number(control.positionMs));
        room.positionAt = new Date();
      }
      if (typeof control.isPlaying === 'boolean') {
        room.isPlaying = control.isPlaying;
      }
      room.controlRev += 1;
    }

    room.expiresAt = new Date(Date.now() + 24 * 3600 * 1000);
    await room.save();
    res.json(roomView(room, memberId,
      Number.isFinite(Number(b.sinceQueueRev)) ? Number(b.sinceQueueRev) : -1));
  } catch (err) {
    console.error('Error syncing hanamimi room:', err);
    res.status(500).json({ error: 'Failed to sync' });
  }
});

// Ably token vending (3.0 LDD realtime transport). The API key must
// never ship inside the app binary — a Flutter "env var" is just a
// string in the APK — so room members trade their membership for a
// short-lived token scoped to exactly their room's two channels
// (hanamimi:st:CODE carries queue/control state, hanamimi:hb:CODE the
// presence heartbeats). Everything realtime then flows client↔Ably;
// Mongo keeps the room doc as the late-join/reconnect snapshot.
let ablyRest = null;
const getAbly = () => {
  if (!process.env.ABLY_API_KEY) return null;
  if (!ablyRest) {
    const Ably = require('ably');
    ablyRest = new Ably.Rest(process.env.ABLY_API_KEY);
  }
  return ablyRest;
};

app.post('/api/hanamimi/room/:code/token', async (req, res) => {
  try {
    await connectDB();
    const code = String(req.params.code || '').trim().toUpperCase();
    const memberId = String((req.body || {}).memberId || '').trim().slice(0, 64);
    if (!memberId) return res.status(400).json({ error: 'memberId required' });
    const room = await HanamimiRoom.findOne({ code });
    if (!room) return res.status(404).json({ error: 'room not found' });
    if (!room.members.some((m) => m.id === memberId)) {
      return res.status(403).json({ error: 'not in this room' });
    }
    const ably = getAbly();
    if (!ably) return res.status(503).json({ error: 'realtime not configured' });
    const token = await ably.auth.requestToken({
      clientId: memberId,
      ttl: 60 * 60 * 1000,
      capability: JSON.stringify({
        [`hanamimi:st:${code}`]: ['publish', 'subscribe'],
        [`hanamimi:hb:${code}`]: ['publish', 'subscribe'],
      }),
    });
    res.json({ ok: true, token: token.token, expires: token.expires });
  } catch (err) {
    console.error('Error minting hanamimi ably token:', err);
    res.status(500).json({ error: 'Failed to mint token' });
  }
});

app.post('/api/hanamimi/room/:code/leave', async (req, res) => {
  try {
    await connectDB();
    const code = String(req.params.code || '').trim().toUpperCase();
    const memberId = String((req.body || {}).memberId || '').trim().slice(0, 64);
    const room = await HanamimiRoom.findOne({ code });
    if (room) {
      room.members = room.members.filter((m) => m.id !== memberId);
      if (room.members.length === 0) {
        await room.deleteOne();
      } else {
        await room.save();
      }
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Error leaving hanamimi room:', err);
    res.status(500).json({ error: 'Failed to leave' });
  }
});

// Zero-knowledge backup blobs (Hanamimi 3.0 #8). The server stores
// ciphertext under a phrase-derived id and hands it back — that's the
// whole contract. Upsert so re-backups replace the previous blob.
app.post('/api/hanamimi/backup', async (req, res) => {
  try {
    await connectDB();
    const b = req.body || {};
    const blobId = String(b.blobId || '').trim().toLowerCase();
    const data = typeof b.data === 'string' ? b.data : '';
    if (!/^[0-9a-f]{64}$/.test(blobId)) {
      return res.status(400).json({ error: 'bad blobId' });
    }
    if (!data || data.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'bad or oversized data' });
    }
    await HanamimiBackup.findOneAndUpdate(
      { blobId },
      { $set: { data, size: data.length, updatedAt: new Date() },
        $setOnInsert: { blobId } },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Error saving hanamimi backup:', err);
    res.status(500).json({ error: 'Failed to save backup' });
  }
});

app.get('/api/hanamimi/backup/:blobId', async (req, res) => {
  try {
    await connectDB();
    const blobId = String(req.params.blobId || '').trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(blobId)) {
      return res.status(400).json({ error: 'bad blobId' });
    }
    const doc = await HanamimiBackup.findOne({ blobId })
      .select('data -_id').lean();
    if (!doc) return res.status(404).json({ error: 'not found' });
    res.json({ data: doc.data });
  } catch (err) {
    console.error('Error fetching hanamimi backup:', err);
    res.status(500).json({ error: 'Failed to fetch backup' });
  }
});

// Hidden leaderboard admin (Hanamimi 3.0). Password lives in .env
// (HANAMIMI_ADMIN_PASSWORD) — no accounts, no sessions: the password
// rides each data request and is checked server-side.
app.post('/api/hanamimi/admin', async (req, res) => {
  try {
    const expected = process.env.HANAMIMI_ADMIN_PASSWORD;
    if (!expected) {
      return res.status(503).json({ error: 'Admin password not configured' });
    }
    const given = String((req.body || {}).password || '');
    if (given !== expected) {
      return res.status(401).json({ error: 'Wrong password' });
    }
    await connectDB();
    const rows = await HanamimiStat.find()
      .sort({ totalSeconds: -1 })
      .select('-_id -__v')
      .lean();
    res.json(rows.map((r) => ({
      ...r,
      // Raw MinHash values are noise to a human — show presence only.
      signature: undefined,
      hasSignature: Array.isArray(r.signature) && r.signature.length > 0,
    })));
  } catch (err) {
    console.error('Error in hanamimi admin:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

// The page itself: a self-contained HTML shell that asks for the
// password and renders the full table. Deliberately unlinked from the
// portfolio — you have to know the URL.
app.get('/hanamimi-leaderboards', (req, res) => {
  res.type('html').send(`<!doctype html>
<html><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hanamimi — leaderboard admin</title>
<style>
  body{font-family:system-ui,sans-serif;background:#16121a;color:#eee;margin:0;padding:2rem}
  h1{font-size:1.2rem;color:#ff9eb5}
  input,button{font:inherit;padding:.5rem .8rem;border-radius:8px;border:1px solid #444;background:#241e2b;color:#eee}
  button{cursor:pointer;background:#ff9eb5;color:#241e2b;border:none;font-weight:600}
  table{border-collapse:collapse;margin-top:1.5rem;width:100%;font-size:.85rem}
  th,td{padding:.45rem .6rem;border-bottom:1px solid #333;text-align:left;white-space:nowrap}
  th{color:#ff9eb5;position:sticky;top:0;background:#16121a}
  .wrap{overflow-x:auto}
  .err{color:#ff7a7a;margin-top:.8rem}
  .muted{color:#888}
</style></head><body>
<h1>Hanamimi leaderboard — admin 🌸</h1>
<form id="f"><input type="password" id="p" placeholder="password" autofocus>
<button>Peek</button></form>
<div id="out"></div>
<script>
const f=document.getElementById('f'),out=document.getElementById('out');
const fmt=(s)=>{const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h>0?h+'h '+m+'m':m+'m'};
f.addEventListener('submit',async(e)=>{
  e.preventDefault();out.innerHTML='<p class="muted">loading…</p>';
  try{
    const r=await fetch('/api/hanamimi/admin',{method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({password:document.getElementById('p').value})});
    if(!r.ok){const j=await r.json().catch(()=>({}));
      out.innerHTML='<p class="err">'+(j.error||('HTTP '+r.status))+'</p>';return}
    const rows=await r.json();
    if(!rows.length){out.innerHTML='<p class="muted">no rows</p>';return}
    let h='<div class="wrap"><table><tr><th>#</th><th>nickname</th><th>device</th><th>total</th><th>songs</th><th>local</th><th>yt</th><th>saavn</th><th>taste</th><th>clientId</th><th>updated</th></tr>';
    rows.forEach((x,i)=>{h+='<tr><td>'+(i+1)+'</td><td>'+x.nickname+'</td><td>'+(x.device||'—')
      +'</td><td>'+fmt(x.totalSeconds)+'</td><td>'+x.totalSongs
      +'</td><td>'+fmt(x.localSeconds)+'</td><td>'+fmt(x.youtubeSeconds)+'</td><td>'+fmt(x.saavnSeconds)
      +'</td><td>'+(x.hasSignature?'✓':'—')
      +'</td><td class="muted">'+x.clientId+'</td><td class="muted">'
      +new Date(x.updatedAt).toISOString().slice(0,16).replace('T',' ')+'</td></tr>'});
    out.innerHTML=h+'</table></div>';
  }catch(err){out.innerHTML='<p class="err">'+err+'</p>'}
});
</script></body></html>`);
});

// ====================================
// STATIC FILES AND WILDCARD ROUTE COME LAST
// ====================================

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Serve frontend for all other routes (MUST BE LAST)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📂 Backend directory: ${__dirname}`);
    console.log(`📄 Public directory: ${path.join(__dirname, '../public')}`);
  });
}

module.exports = app;
