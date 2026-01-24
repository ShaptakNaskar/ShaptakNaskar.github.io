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
app.use(express.json());

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
        ProjLink: row.ProjLink || '#'
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
    const validGames = ['paddles', 'wordguess', '2048', 'breakout', 'cosmic-lander', 'space-defender'];

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
    const validGames = ['paddles', 'wordguess', '2048', 'breakout', 'cosmic-lander', 'space-defender'];

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
