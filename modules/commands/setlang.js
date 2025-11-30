const fs = require('fs');
const path = require('path');

module.exports.config = {
  name: "setlang",
  version: "1.0.0",
  hasPermssion: 2,
  credits: "GPT-5",
  description: "Đổi ngôn ngữ bot (vi/en)",
  commandCategory: "Admin",
  usages: "setlang <vi|en>",
  cooldowns: 3
};

module.exports.languages = {
  vi: {
    invalidUsage: "Cách dùng: setlang <vi|en>",
    unsupported: "Ngôn ngữ không hỗ trợ. Chỉ hỗ trợ vi hoặc en.",
    success: "Đã đặt ngôn ngữ: %1"
  },
  en: {
    invalidUsage: "Usage: setlang <vi|en>",
    unsupported: "Unsupported language. Only vi or en are supported.",
    success: "Language set to: %1"
  }
};

function loadLangFile(lang) {
  const filePath = path.join(process.cwd(), 'languages', `${lang}.lang`);
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n|\r/).filter(l => l && !l.startsWith('#'));
  const map = {};
  for (const line of lines) {
    const sep = line.indexOf('=');
    const headAndKey = line.slice(0, sep);
    const value = line.slice(sep + 1).replace(/\\n/gi, '\n');
    const [head, ...keyParts] = headAndKey.split('.');
    const key = keyParts.join('.');
    map[head] = map[head] || {};
    map[head][key] = value;
  }
  return map;
}

module.exports.run = async function ({ api, event, args, getText }) {
  const { threadID, messageID } = event;
  const lang = (args[0] || '').toLowerCase();
  if (!lang) return api.sendMessage(getText('invalidUsage'), threadID, messageID);
  if (!['vi', 'en'].includes(lang)) return api.sendMessage(getText('unsupported'), threadID, messageID);

  try {
    // Persist to config.json
    const configPath = global.client.configPath;
    const current = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    current.language = lang;
    fs.writeFileSync(configPath, JSON.stringify(current, null, 4), 'utf8');

    // Reload language map in-memory for immediate effect
    const newMap = loadLangFile(lang);
    global.language = newMap;
    global.config.language = lang;

    return api.sendMessage(getText('success', lang), threadID, messageID);
  } catch (e) {
    return api.sendMessage(`Error: ${e.message || e}`, threadID, messageID);
  }
};


