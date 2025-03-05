const express = require("express");
const router = express.Router();
const db = require("../config/db");
const redisClient = require("../config/redis");

// 📌 Get Event Summary
router.get("/event-summary", async (req, res) => {
  const { event } = req.query;
  
  const cacheKey = `summary_${event}`;
  const cachedData = await redisClient.get(cacheKey);
  if (cachedData) return res.json(JSON.parse(cachedData));

  db.query("SELECT COUNT(*) as count, COUNT(DISTINCT ipAddress) as uniqueUsers FROM events WHERE event = ?", [event], (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });

    const response = { event, count: results[0].count, uniqueUsers: results[0].uniqueUsers };
    redisClient.setEx(cacheKey, 60, JSON.stringify(response));
    res.json(response);
  });
});

module.exports = router;
