const fs = require('node:fs');
const path = require('node:path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'guild-config.json');

function ensureStore() {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_PATH)) fs.writeFileSync(DATA_PATH, JSON.stringify({}, null, 2));
}

function readStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}

function writeStore(data) {
  ensureStore();
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

function getGuildConfig(guildId) {
  const store = readStore();
  return store[guildId] || {};
}

function setGuildConfig(guildId, updater) {
  const store = readStore();
  const previous = store[guildId] || {};
  store[guildId] = typeof updater === 'function' ? updater(previous) : updater;
  writeStore(store);
  return store[guildId];
}

module.exports = {
  getGuildConfig,
  setGuildConfig,
};
