const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

// --- Database Reading ---
let knowledgeBaseData = null;
const dbPath = path.join(__dirname, 'db.json');

// Read the database once on startup and cache it.
try {
  const dbRaw = fs.readFileSync(dbPath, 'utf8');
  knowledgeBaseData = JSON.parse(dbRaw);
  console.log('✅ Knowledge base loaded successfully.');
} catch (err) {
  console.error('❌ CRITICAL: Failed to read or parse db.json on startup.', err);
}


// --- API Endpoints ---

// Endpoint to serve the initial knowledge base configuration.
app.get('/api/knowledge', (req, res) => {
  if (!knowledgeBaseData) {
     return res.status(500).json({ error: 'Failed to read knowledge base configuration from server.' });
  }
  res.json(knowledgeBaseData);
});


// New, robust file proxy endpoint using a query parameter to correctly handle filenames.
app.get('/api/files', async (req, res) => {
  const { filename } = req.query;

  if (!filename || typeof filename !== 'string') {
    return res.status(400).send('Error: A "filename" query parameter is required.');
  }

  if (!knowledgeBaseData || !knowledgeBaseData.generalKnowledge) {
     return res.status(500).send('Error: Knowledge base not loaded on the server.');
  }

  // Find the file in our cached knowledge base.
  const fileToProxy = knowledgeBaseData.generalKnowledge.find(f => f.name === filename);

  if (!fileToProxy) {
    console.warn(`File not found in db.json: ${filename}`);
    return res.status(404).send(`Error: File "${filename}" not found in the knowledge base.`);
  }

  const fileUrl = fileToProxy.path;

  try {
    console.log(`Proxying request for: ${filename} -> ${fileUrl}`);
    const response = await axios({
      method: 'get',
      url: fileUrl,
      responseType: 'stream',
    });

    // Pass through the content-type and content-length from the original source.
    res.setHeader('Content-Type', response.headers['content-type']);
    if(response.headers['content-length']) {
        res.setHeader('Content-Length', response.headers['content-length']);
    }
    
    response.data.pipe(res);

  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error(`Proxy Error: Failed to fetch ${fileUrl}. Status: ${error.response.status}`);
      res.status(error.response.status).send(`Failed to fetch the file from the source. Status: ${error.response.status}`);
    } else {
      console.error(`Proxy Error: Unknown error for ${fileUrl}`, error);
      res.status(500).send('An internal error occurred while trying to proxy the file.');
    }
  }
});


app.listen(PORT, () => {
  console.log(`✅ Backend server is running on port ${PORT}`);
});