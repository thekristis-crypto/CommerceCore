const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

// The only remaining API endpoint is to serve the knowledge base configuration.
// All file serving and uploading is now handled by a dedicated cloud service (Cloudinary).
app.get('/api/knowledge', (req, res) => {
  const dbPath = path.join(__dirname, 'db.json');
  fs.readFile(dbPath, 'utf8', (err, data) => {
    if (err) {
      console.error("Error reading db.json:", err);
      return res.status(500).json({ error: 'Failed to read knowledge base' });
    }
    res.setHeader('Content-Type', 'application/json');
    res.send(data);
  });
});

app.listen(PORT, () => {
  console.log(`✅ Backend server is running on port ${PORT}`);
});
