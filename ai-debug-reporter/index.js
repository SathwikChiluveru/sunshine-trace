const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 5000;
const cors = require('cors');

const corsOptions = {
  origin: 'https://sunshine-trace.vercel.app', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'], 
  credentials: true, 
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));


// Define paths to the JSON files
const findingsFilePath = path.join(__dirname, '/reports/findings.json');
const summaryFilePath = path.join(__dirname, '/reports/summary.json');

// Endpoint to get findings.json
app.get('/api/findings', (req, res) => {
  fs.readFile(findingsFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error("Error reading findings.json:", err);
      return res.status(500).send('Error reading findings file');
    }
    res.json(JSON.parse(data));
  });
});

// Endpoint to get summary.json
app.get('/api/summary', (req, res) => {
  fs.readFile(summaryFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error("Error reading summary.json:", err);
      return res.status(500).send('Error reading summary file');
    }
    res.json(JSON.parse(data));
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});