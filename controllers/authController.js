const authModel = require("../models/authModel");
const { generateApiKey } = require("../utils/generateApiKey");

exports.registerApp = async (req, res) => {
  try {
    const { app_id } = req.body;
    if (!app_id) return res.status(400).json({ message: "App ID is required" });

    const apiKey = generateApiKey();
    await authModel.createApiKey(app_id, apiKey);
    
    res.json({ app_id, api_key: apiKey });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
