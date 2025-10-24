const express = require('express');
const app = express();

function logInfo(msg, fields={}) {
  console.log(JSON.stringify({ level: "info", message: msg, correlationId: "req-123", ...fields }))
}

function logError(msg, fields={}) {
  console.log(JSON.stringify({ level: "error", message: msg, errorCode: "APP_500", correlationId: "req-123", ...fields }))
}

app.get('/health', (req, res) => {
  logInfo("Health check requested", { endpoint: "/health" });
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

module.exports = app;