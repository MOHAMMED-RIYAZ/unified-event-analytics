const db = require("../config/db");

exports.storeEvent = (eventData) => {
  return db("events").insert(eventData);
};
