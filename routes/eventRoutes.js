const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authenticateApiKey = require("../middleware/authMiddleware");

// 📌 Collect Event Data
router.post("/collect", authenticateApiKey, (req, res) => {
  const { event, url, referrer, device, ipAddress, timestamp, metadata } = req.body;

  if (!event || !url || !device) return res.status(400).json({ message: "Missing required fields" });

  db.query(
    "INSERT INTO events (appId, event, url, referrer, device, ipAddress, timestamp, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [req.appId, event, url, referrer, device, ipAddress, timestamp, JSON.stringify(metadata)],
    (err) => {
      if (err) return res.status(500).json({ message: "Database error" });
      res.json({ message: "Event recorded successfully" });
    }
  );
});

module.exports = router;
