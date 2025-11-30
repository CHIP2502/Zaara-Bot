// modules/commands/go.js
module.exports.config = {
  name: "gỡ",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "TrungMedia",
  description: "Reply vào tin nhắn của bot để gỡ tin đó",
  commandCategory: "Tiện ích",
  usages: "Reply vào tin nhắn bot rồi dùng /gỡ",
  cooldowns: 3
};

module.exports.run = async function ({ api, event }) {
  const { threadID, messageID, messageReply } = event;

  // Nếu không reply tin nhắn nào
  if (!messageReply) {
    return api.sendMessage("⚠️ Cậu phải reply vào tin nhắn mà muốn bot gỡ nha!", threadID, messageID);
  }

  // Nếu tin nhắn không phải do bot gửi
  if (messageReply.senderID !== api.getCurrentUserID()) {
    return api.sendMessage("❌ Tin này không phải do bot gửi nên mình không thể gỡ được!", threadID, messageID);
  }

  try {
    await api.unsendMessage(messageReply.messageID);
    return api.sendMessage("✅ Đã gỡ tin nhắn thành công!", threadID, messageID);
  } catch (err) {
    return api.sendMessage(`❌ Lỗi khi gỡ tin nhắn: ${err.message}`, threadID, messageID);
  }
};
