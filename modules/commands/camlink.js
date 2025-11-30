const fs = require("fs");

const dataPath = __dirname + "/cache/linkWarns.json";
if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, JSON.stringify({}));

function saveData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

module.exports = {
  config: {
    name: "camlink",
    version: "1.0.0",
    hasPermssion: 2,
    credits: "LocDev",
    description: "Cấm gửi link MXH, xử lý bằng cảm xúc xác nhận",
    commandCategory: 'admin',
    usages: '[]',
    cooldowns: 3
  },

  run() {},

  handleEvent: async function ({ event, api }) {
    const linkRegex = /(facebook\.com|tiktok\.com)/gi;
    const data = JSON.parse(fs.readFileSync(dataPath));
    const { threadID, senderID, messageID, body } = event;

    if (!body || !linkRegex.test(body)) return;

    if (!data[senderID]) data[senderID] = [];

    // Nếu đã đủ 3 cảnh báo thì kick
    if (data[senderID].length >= 3) {
      try {
        await api.removeUserFromGroup(senderID, threadID);
        api.sendMessage(`❌ Thành viên ${senderID} đã bị kick do gửi link và nhận 3/3 cảnh báo.`, threadID);
        delete data[senderID];
        saveData(data);
        return;
      } catch (err) {
        return api.sendMessage(`⚠️ Không thể kick người dùng ${senderID}. Có thể bot không có quyền.`, threadID);
      }
    }

    const warnMessage = await api.sendMessage(
      {
        body: `⚠️ [Cảnh báo link MXH]\n\nHành vi gửi link mạng xã hội bị phát hiện từ thành viên: ${senderID}\n\n🛡️ Quản trị viên, vui lòng thả cảm xúc vào tin nhắn này để xác nhận cảnh báo.\nCảnh báo hiện tại: ${data[senderID].length}/3`,
        mentions: [{ tag: "Admin", id: senderID }]
      },
      threadID
    );

    // Lưu messageID để xử lý cảm xúc
    data[senderID].push({
      warnMessageID: warnMessage.messageID,
      reactedBy: []
    });

    saveData(data);
  },

  handleReaction: async function ({ event, api }) {
    const { messageID, userID, threadID } = event;
    const data = JSON.parse(fs.readFileSync(dataPath));

    // Lấy danh sách quản trị viên trong nhóm
    let threadInfo;
    try {
      threadInfo = await api.getThreadInfo(threadID);
    } catch (err) {
      return;
    }

    const adminIDs = threadInfo.adminIDs.map(admin => admin.id);

    if (!adminIDs.includes(userID)) {
      return api.sendMessage("⚠️ Bạn không có quyền xác nhận cảnh báo. Chỉ quản trị viên mới được phép.", threadID, undefined, messageID);
    }

    // Tìm messageID tương ứng trong cảnh báo
    for (const [warnedUserID, warns] of Object.entries(data)) {
      for (const warn of warns) {
        if (warn.warnMessageID === messageID) {
          if (warn.reactedBy.includes(userID)) return; // tránh lặp

          warn.reactedBy.push(userID);

          const warnCount = data[warnedUserID].length;

          if (warnCount >= 3) {
            try {
              await api.removeUserFromGroup(warnedUserID, threadID);
              api.sendMessage(`❌ Thành viên ${warnedUserID} đã bị kick do nhận 3/3 cảnh báo.`, threadID);
              delete data[warnedUserID];
              saveData(data);
            } catch (err) {
              return api.sendMessage(`⚠️ Không thể kick người dùng.`, threadID);
            }
          } else {
            api.sendMessage(`✅ Cảnh báo cho thành viên ${warnedUserID} đã được quản trị viên xác nhận (${warnCount}/3).`, threadID);
          }

          saveData(data);
          return;
        }
      }
    }
  }
};
