// modules/events/_probeJoin.js
module.exports.config = {
  name: "_probeJoin",
  eventType: ["log:subscribe"],
  version: "1.1.1",
  credits: "Trung Media x GPT",
  description: "Thông báo khi có thành viên vào nhóm (probe)"
};

const moment = require("moment-timezone");

module.exports.run = async function ({ api, event, Users }) {
  const { threadID, author, logMessageData } = event;
  const added = (logMessageData && logMessageData.addedParticipants) || [];
  const botID = api.getCurrentUserID();

  // Time info
  const now = moment().tz("Asia/Ho_Chi_Minh");
  const thuMap = { Sunday:"Chủ Nhật", Monday:"Thứ Hai", Tuesday:"Thứ Ba", Wednesday:"Thứ Tư", Thursday:"Thứ Năm", Friday:"Thứ Sáu", Saturday:"Thứ Bảy" };
  const thu = thuMap[now.format("dddd")];
  const timeStr = now.format("HH:mm:ss - DD/MM/YYYY");

  // Bot vừa được add
  if (added.some(p => String(p.userFbId) === String(botID))) {
    const prefix = (global.data.threadData.get(threadID) || {}).PREFIX || global.config.PREFIX || "/";
    return api.sendMessage(
      `🌐 Kết nối thành công!\n• Prefix: ${prefix}\n• Gõ ${prefix}help để xem lệnh\n⏰ ${timeStr} (${thu})`,
      threadID
    );
  }

  // Tên người thêm
  let authorName = "Người dùng";
  try {
    // ưu tiên getNameUser, fallback getData
    authorName = (await Users.getNameUser(author)) || authorName;
  } catch {
    try {
      const u = await Users.getData(author);
      if (u?.name) authorName = u.name;
    } catch {}
  }

  // Danh sách người mới
  const mentions = [];
  const lines = [];
  for (const p of added) {
    const uid = String(p.userFbId);
    let name = p.fullName || "Người dùng Facebook";
    try { name = (await Users.getNameUser(uid)) || name; } catch {}
    mentions.push({ id: uid, tag: name });
    lines.push(`• ${name} → https://www.facebook.com/profile.php?id=${uid}`);
  }

  const body =
`[ Thành Viên Vào Nhóm ]
────────────────────
👤 Thành viên: ${logMessageData.addedParticipants.map(p => p.fullName).join(", ")}
👤 Người thêm: ${authorName}
🔗 Profile: https://www.facebook.com/profile.php?id=${author}
🆕 Thành viên:
${lines.join("\n")}
🗓️ Thời gian: ${timeStr} (${thu})
`;

  return api.sendMessage({ body, mentions }, threadID);
};
