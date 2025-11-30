const moment = require("moment-timezone");

module.exports.config = {
  name: "prefix",
  version: "2.0.0",
  hasPermission: 0,
  credits: "DongDev",
  description: "Xem prefix bot",
  commandCategory: "Thành Viên",
  usages: "[]",
  cooldowns: 0
};

module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, body } = event;
  if (!body) return;

  const { PREFIX } = global.config;
  const gio = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss || DD/MM/YYYY");

  let threadSetting = global.data.threadData.get(threadID) || {};
  let prefix = threadSetting.PREFIX || PREFIX;

  if (
    body.toLowerCase() === "prefix" ||
    body.toLowerCase() === "dùng bot kiểu gì" ||
    body.toLowerCase() === "dùng bot như nào" ||
    body.toLowerCase() === "dùng bot làm sao" ||
    body.toLowerCase() === "dùng sao"
  ) {
    api.sendMessage(
      `==== [ PREFIX BOT ] ====
──────────────────
✏️ Prefix của nhóm: ${prefix}
📎 Prefix hệ thống: ${global.config.PREFIX}
📝 Tổng có: ${global.client.commands.size} lệnh
👥 Tổng người dùng bot: ${global.data.allUserID.length}
🏘️ Tổng nhóm: ${global.data.allThreadID.length}
──────────────────
⏰ Time: ${gio}`,
      threadID,
      event.messageID
    );
  }
};

module.exports.run = async function () {};
