const fs = require('node:fs');
const path = require('node:path');

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

function readRuntimeConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`Missing config file at ${CONFIG_PATH}. Create it from config.example.json`);
  }

  const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const token = parsed?.bot?.token;
  const clientId = parsed?.bot?.clientId;

  if (!token || !clientId) {
    throw new Error('config.json is missing bot.token or bot.clientId');
  }

  return parsed;
}

module.exports = {
  readRuntimeConfig,
  CONFIG_PATH,
};
