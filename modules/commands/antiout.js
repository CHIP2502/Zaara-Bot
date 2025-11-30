const fs = require("fs");

module.exports.config = {
  name: "antiout",
  version: "1.0.0",
  hasPermssion: 1, // admin bot/NDH; muốn cho QTV box dùng thì đổi thành 0 rồi tự check bên dưới
  credits: "Trung x GPT",
  description: "Chặn tự out nhóm, bot tự add lại",
  commandCategory: "Box",
  usages: "antiout on | off | status",
  cooldowns: 3
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, senderID } = event;

  // quyền: ADMINBOT/NDH hoặc QTV box
  const botAdmins = (global.config.ADMINBOT || []);
  const ndh = (global.config.NDH || []);
  const isBotAdmin = botAdmins.includes(senderID) || ndh.includes(senderID);

  // check QTV box
  let isThreadAdmin = false;
  try {
    const info = await api.getThreadInfo(threadID);
    isThreadAdmin = info.adminIDs?.some(a => String(a.id) === String(senderID));
  } catch {}

  if (!isBotAdmin && !isThreadAdmin) {
    return api.sendMessage("⚠️ Cần quyền Admin bot/NDH hoặc QTV nhóm để dùng lệnh này.", threadID);
  }

  // đọc file anti.json (đường dẫn đã có sẵn ở global.anti trong code của bạn)
  let data;
  try {
    data = JSON.parse(fs.readFileSync(global.anti, "utf8"));
  } catch {
    data = {};
  }
  data.antiout = data.antiout || {};

  const sub = (args[0] || "").toLowerCase();

  if (["on", "enable", "1"].includes(sub)) {
    data.antiout[threadID] = true;
    fs.writeFileSync(global.anti, JSON.stringify(data, null, 4));
    return api.sendMessage("✅ Đã BẬT antiout. Ai tự out sẽ bị add lại (nếu bot có quyền admin).", threadID);
  }

  if (["off", "disable", "0"].includes(sub)) {
    delete data.antiout[threadID];
    fs.writeFileSync(global.anti, JSON.stringify(data, null, 4));
    return api.sendMessage("✅ Đã TẮT antiout. Người rời nhóm sẽ không bị add lại.", threadID);
  }

  if (sub === "status") {
    const on = !!data.antiout[threadID];
    return api.sendMessage(`ℹ️ Trạng thái antiout: ${on ? "ĐANG BẬT ✅" : "ĐANG TẮT ❌"}`, threadID);
  }

  // help
  return api.sendMessage(
    "Cách dùng:\n" +
    "• /antiout on — Bật chặn tự out\n" +
    "• /antiout off — Tắt chặn tự out\n" +
    "• /antiout status — Xem trạng thái",
    threadID
  );
};
