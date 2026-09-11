const appJson = require("./app.json");

module.exports = ({ config }) => ({
  ...appJson.expo,
  ...config,
});

