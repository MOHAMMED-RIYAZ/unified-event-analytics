const mysql = require("mysql2/promise");

// Create MySQL Connection Pool
const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "riyaz", // Add your password if needed
    database: "event_analytics"
});

// Store data in MySQL cache table
async function setCache(key, value, ttl) {
    const expiresAt = new Date(Date.now() + ttl * 1000);
    await pool.query(
        "REPLACE INTO cache (id, value, expires_at) VALUES (?, ?, ?)",
        [key, JSON.stringify(value), expiresAt]
    );
}

// Retrieve cached data
async function getCache(key) {
    const [rows] = await pool.query(
        "SELECT value FROM cache WHERE id = ? AND expires_at > NOW()",
        [key]
    );
    return rows.length ? JSON.parse(rows[0].value) : null;
}

module.exports = { setCache, getCache };
