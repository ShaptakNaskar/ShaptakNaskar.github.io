const express = require('express');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

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

// API endpoint to fetch projects from CSV
app.get('/api/projects', (req, res) => {
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
  res.setHeader('Content-Disposition', 'attachment; filename="ShaptakCV.pdf"');
  
  // Stream the file
  const fileStream = fs.createReadStream(cvPath);
  fileStream.on('error', (err) => {
    console.error('Error streaming CV:', err);
    res.status(500).json({ error: 'Failed to download CV' });
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

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📂 Backend directory: ${__dirname}`);
  console.log(`📄 Public directory: ${path.join(__dirname, '../public')}`);
});

module.exports = app;
