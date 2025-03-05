const db = require("../db");

exports.createApiKey = (app_id, api_key) => {
  return db("api_keys").insert({ app_id, api_key });
};

exports.getApiKey = (app_id) => {
  return db("api_keys").where({ app_id }).select("api_key").first();
};
