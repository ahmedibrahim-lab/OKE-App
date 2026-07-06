const express = require('express');
const os = require('os');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

// Serve static assets from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// API Endpoint to fetch pod and cluster metadata
app.get('/api/info', (req, res) => {
  res.json({
    status: 'healthy',
    hostname: os.hostname(),
    podName: process.env.POD_NAME || os.hostname(),
    podNamespace: process.env.POD_NAMESPACE || 'default',
    podIp: process.env.POD_IP || '127.0.0.1',
    nodeName: process.env.NODE_NAME || 'Unknown Node',
    platform: 'Oracle Container Engine for Kubernetes (OKE)',
    framework: `Node.js (${process.version})`
  });
});

// Fallback to index.html for single page application styling
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Application is running on port ${port}`);
});
