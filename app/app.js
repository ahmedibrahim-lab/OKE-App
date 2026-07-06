const express = require('express');
const os = require('os');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

// Track pod startup time
const podStartTime = Date.now();

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

// Format uptime in human-readable format
function formatUptime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

// API Endpoint for pod health metrics
app.get('/api/health-metrics', (req, res) => {
  const now = Date.now();
  const uptime = Math.floor((now - podStartTime) / 1000);

  // Memory usage
  const memUsage = process.memoryUsage();
  const usedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const limitMB = parseInt(process.env.MEMORY_LIMIT || 256);
  const memPercentage = ((usedMB / limitMB) * 100).toFixed(1);

  // Health status logic
  const isHealthy = usedMB < limitMB * 0.9;
  const memoryOk = usedMB < limitMB * 0.9;
  const uptimeOk = uptime > 30;

  res.json({
    status: isHealthy ? 'healthy' : 'warning',
    pod: {
      name: process.env.POD_NAME || os.hostname(),
      namespace: process.env.POD_NAMESPACE || 'default',
      ip: process.env.POD_IP || '127.0.0.1',
      nodeName: process.env.NODE_NAME || 'Unknown'
    },
    memory: {
      usedMB,
      limitMB,
      percentage: parseFloat(memPercentage)
    },
    uptime: {
      seconds: uptime,
      formatted: formatUptime(uptime)
    },
    health: {
      status: isHealthy ? 'healthy' : 'warning',
      checks: [
        {
          name: 'memory',
          status: memoryOk ? 'ok' : 'warning',
          value: `${usedMB}MB / ${limitMB}MB`
        },
        {
          name: 'uptime',
          status: uptimeOk ? 'ok' : 'starting',
          value: formatUptime(uptime)
        }
      ]
    }
  });
});

// Fallback to index.html for single page application styling
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Application is running on port ${port}`);
});
