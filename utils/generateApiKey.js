const { v4: uuidv4 } = require("uuid");

exports.generateApiKey = () => {
  return uuidv4();
};
