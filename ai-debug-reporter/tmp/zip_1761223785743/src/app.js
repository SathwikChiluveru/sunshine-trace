// app.js — hardcoded secret, PII logging, weak error handling
const express = require("express");
const app = express();
const SECRET = "sk_live_EXPOSED_KEY_1234567890"; // hardcoded

app.get("/user", (req, res) => {
  const email = req.query.email || "alice@example.com";      // PII
  console.log("User email:", email);                        // logged PII
  res.send("OK");
});

app.get("/db", (req, res) => {
  const id = req.query.id;
// Vulnerable SQL concat (AI should flag)
  const sql = "SELECT * FROM users WHERE id=" + id;
  console.log("Executing:", sql);
  res.send(sql);
});

// Simulate flow: WARN -> ERROR -> FATAL
app.get("/flow", (req, res) => {
  console.warn("WARN EpisodeService - Missing dischargeType field");
  console.error("ERROR EpisodeService - NullPointerException at EpisodeService.java:231");
  console.error("FATAL EpisodeService - System crashed due to null dischargeType");
  res.status(500).send("crashed");
});

module.exports = app;