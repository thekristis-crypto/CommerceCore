// --- Imports: We are adding 'multer' ---
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer'); // Import multer

const app = express();
const PORT = process.env.PORT || 3001;

// --- Multer Configuration: The "Bouncer" for our files ---
// This tells multer where to save the files and how to name them.
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Save files to the 'uploads' folder
  },
  filename: function (req, file, cb) {
    // Keep the original filename
    cb(null, file.originalname);
  }
});
const upload = multer({ storage: storage });


// --- Middleware ---
app.use(cors());
// This tells Express to make the 'uploads' folder public
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// --- API Endpoint to GET knowledge (This is your existing code) ---
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


// --- NEW API Endpoint to UPLOAD knowledge ---
// This endpoint will listen for 'POST' requests at the URL '/api/upload'
// 'upload.single('knowledgeFile')' tells multer to expect one file named 'knowledgeFile'.
app.post('/api/upload', upload.single('knowledgeFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  // The file was successfully saved by multer. Now, let's record it in our db.json.
  const dbPath = path.join(__dirname, 'db.json');
  
  // Create a record for the new file
  const newFileRecord = {
    type: req.file.mimetype,
    name: req.file.originalname,
    path: `/uploads/${req.file.filename}` // The public URL to access the file
  };

  // Read the existing database file
  fs.readFile(dbPath, 'utf8', (err, data) => {
    if (err) {
      console.error("Error reading db.json:", err);
      return res.status(500).json({ error: 'Failed to read knowledge base' });
    }

    const db = JSON.parse(data);
    
    // Initialize the generalKnowledge array if it doesn't exist
    if (!db.generalKnowledge) {
      db.generalKnowledge = [];
    }

    // Add the new file record
    db.generalKnowledge.push(newFileRecord);
    
    // Write the updated data back to the file
    fs.writeFile(dbPath, JSON.stringify(db, null, 2), (err) => {
      if (err) {
        console.error("Error writing to db.json:", err);
        return res.status(500).json({ error: 'Failed to update knowledge base' });
      }

      // Send a success response back to the app
      res.status(200).json({
        message: 'File uploaded and knowledge base updated successfully!',
        file: newFileRecord
      });
    });
  });
});


// --- Start the server ---
app.listen(PORT, () => {
  console.log(`✅ Backend server is running on port ${PORT}`);
});