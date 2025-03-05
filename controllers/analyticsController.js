const analyticsModel = require("../models/analyticsModel");

exports.collectEvent = async (req, res) => {
  try {
    const eventData = req.body;
    await analyticsModel.storeEvent(eventData);
    res.json({ message: "Event collected successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
