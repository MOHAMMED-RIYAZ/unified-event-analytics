require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");
const swaggerJsDoc = require("swagger-jsdoc");
const router = express.Router();
const pool = require("./db"); // Import MySQL database connection
const app = express();
app.use(express.json());
app.use(cors());

// 🔹 Rate Limiting (Prevents abuse)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 100, // Limit each IP to 100 requests per window
});
app.use(limiter);

// 🔹 MySQL Database Connection
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "riyaz",
  database: "event_analytics",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// 🔹 Swagger Documentation Setup
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Unified Event Analytics API",
      version: "1.0.0",
      description: "API for event tracking and analytics",
    },
    servers: [{ url: "http://localhost:5000" }],
  },
  apis: ["./server.js"],
};
const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// 🔹 API Key Management Router
const authRouter = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new app and generate an API key
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - app_name
 *               - email
 *               - password
 *             properties:
 *               app_name:
 *                 type: string
 *                 example: "MyApp"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "riyaz@gmail.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "mypassword123"
 *     responses:
 *       201:
 *         description: Successfully registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Registered successfully"
 *                 apiKey:
 *                   type: string
 *                   example: "abcd1234efgh5678"
 */



authRouter.post("/register", async (req, res) => {
  try {
    const { app_name, email, password } = req.body;
    if (!app_name || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const apiKey = crypto.randomBytes(16).toString("hex");

    await db.execute(
      "INSERT INTO apps (app_name, email, password_hash, api_key) VALUES (?, ?, ?, ?)",
      [app_name, email, hashedPassword, apiKey]
    );

    res.status(201).json({ message: "Registered successfully", apiKey });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

/**
 * @swagger
 * /api/auth/api-key:
 *   get:
 *     summary: Retrieve API key for a registered app
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           example: "riyaz@gmail.com"
 *     responses:
 *       200:
 *         description: API key retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 apiKey:
 *                   type: string
 *                   example: "abcd1234efgh5678"
 */

authRouter.get("/api-key", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const [rows] = await db.execute(
      "SELECT api_key FROM apps WHERE email = ?",
      [email]
    );

    if (rows.length === 0) return res.status(404).json({ error: "App not found" });

    res.status(200).json({ apiKey: rows[0].api_key });
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
});

/**
 * @swagger
 * /api/auth/revoke:
 *   post:
 *     summary: Revoke an API key
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: "riyaz@gmail.com"
 *     responses:
 *       200:
 *         description: API key revoked successfully
 */




app.post('/api/auth/revoke', async (req, res) => {
  try {
      const { email } = req.body;

      if (!email) {
          return res.status(400).json({ error: "Email is required" });
      }

      const result = await db.query("DELETE FROM api_keys WHERE email = ?", [email]);

      if (result.affectedRows === 0) {
          return res.status(404).json({ error: "Email not found" });
      }

      res.status(200).json({ message: "API key revoked successfully" });
  } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Database error" });
  }
});


// 🔹 Event Data Router
const analyticsRouter = express.Router();
/**
 * @swagger
 * /api/analytics/collect:
 *   post:
 *     summary: Collect analytics events
 *     tags: [Analytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - event
 *               - url
 *               - device
 *               - ipAddress
 *             properties:
 *               event:
 *                 type: string
 *                 example: "page_view"
 *               url:
 *                 type: string
 *                 example: "https://example.com"
 *               referrer:
 *                 type: string
 *                 example: "https://google.com"
 *               device:
 *                 type: string
 *                 example: "mobile"
 *               ipAddress:
 *                 type: string
 *                 example: "192.168.1.1"
 *               timestamp:
 *                 type: string
 *                 example: "2025-03-04T05:30:00Z"
 *               metadata:
 *                 type: object
 *                 example: { "browser": "Chrome", "OS": "Windows" }
 *     responses:
 *       200:
 *         description: Event collected successfully
 */



analyticsRouter.post("/collect", async (req, res) => {
  try {
    const { event, url, referrer, device, ipAddress, timestamp, metadata } = req.body;
    if (!event || !url || !device || !ipAddress) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await db.execute(
      "INSERT INTO events (event_name, url, referrer, device, ip_address, timestamp, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [event, url, referrer, device, ipAddress, timestamp, JSON.stringify(metadata)]
    );

    res.status(200).json({ message: "Event collected successfully" });
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
});

/**
 * @swagger
 * /api/analytics/event-summary:
 *   get:
 *     summary: Retrieve analytics summary for a specific event type
 *     description: Fetches aggregated analytics data for a given event type within a specified date range.
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: event
 *         schema:
 *           type: string
 *         required: true
 *         description: Type of event to filter by (e.g., "page_view").
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: Start date for the analytics summary (YYYY-MM-DD).
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: End date for the analytics summary (YYYY-MM-DD).
 *     responses:
 *       200:
 *         description: Successfully retrieved analytics summary.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 event:
 *                   type: string
 *                 startDate:
 *                   type: string
 *                 endDate:
 *                   type: string
 *                 totalOccurrences:
 *                   type: integer
 *                 uniqueUsers:
 *                   type: integer
 *       400:
 *         description: Invalid request parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       404:
 *         description: Event type not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get("/event-summary", async (req, res) => {
  try {
    const { event, startDate, endDate } = req.query;

    // ✅ Validate input parameters
    if (!event || !startDate || !endDate) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    if (isNaN(startDateObj) || isNaN(endDateObj) || startDateObj > endDateObj) {
      return res.status(400).json({ error: "Invalid date range" });
    }

    // ✅ Check if event type exists
    const [eventCheck] = await pool.execute(
      "SELECT COUNT(*) AS count FROM events WHERE type = ?",
      [event]
    );

    if (eventCheck[0].count === 0) {
      return res.status(404).json({ error: "Event type not found" });
    }

    // ✅ Retrieve event summary data
    const [analyticsData] = await pool.execute(
      `SELECT COUNT(*) AS totalOccurrences, COUNT(DISTINCT user_id) AS uniqueUsers 
       FROM events 
       WHERE type = ? AND timestamp BETWEEN ? AND ?`,
      [event, startDate, endDate]
    );

    return res.status(200).json({
      event,
      startDate,
      endDate,
      totalOccurrences: analyticsData[0].totalOccurrences,
      uniqueUsers: analyticsData[0].uniqueUsers,
    });
  } catch (error) {
    console.error("Database error:", error);
    return res.status(500).json({ error: "Database connection error" });
  }
});

module.exports = router;

analyticsRouter.get("/user-stats", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "User ID is required" });

    const [rows] = await db.execute(
      "SELECT user_id, COUNT(*) as totalEvents FROM events WHERE user_id = ? GROUP BY user_id",
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found or no events recorded" });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = analyticsRouter;

/**
 * @swagger
 * /api/analytics/user-stats:
 *   get:
 *     summary: Retrieve event statistics for a specific user
 *     description: Fetches the total number of events recorded for a given user.
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           example: "1"
 *         required: true
 *         description: Unique identifier of the user.
 *     responses:
 *       200:
 *         description: Successfully retrieved user event statistics.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user_id:
 *                   type: string
 *                   example: "1"
 *                 totalEvents:
 *                   type: integer
 *                   example: 50
 *       400:
 *         description: Missing required parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "User ID is required"
 *       404:
 *         description: User not found or no events recorded.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "User not found or no events recorded"
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Database error"
 */


// 🔹 Use Routes
app.use("/api/auth", authRouter);
app.use("/api/analytics", analyticsRouter);

// 🔹 Start Server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
