const fs = require("fs");
module.exports.config = {
  name: "game",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "VanHung (mod by Trung)",
  description: "Tự động rep khi có tin nhắn liên quan đến game",
  commandCategory: "Không cần dấu lệnh",
  usages: "Chỉ cần chat có chữ 'game' là bot rep liền",
  cooldowns: 5,
};

module.exports.handleEvent = function({ api, event }) {
  const { threadID, messageID, body } = event;
  if (!body) return;

  // Tất cả trường hợp liên quan đến "game"
  const keywords = ["game", "Game", "GAME", "chơi game", "chơi gaem", "zô game", "vô game", "vào game", "ra game","game không","game k","Game k"];
  if (keywords.some(word => body.includes(word))) {
    const msg = {
      body: "Hehe zô game lẹ babi nhoa 🎮🔥",
      attachment: fs.createReadStream(__dirname + `/noprefix/game.gif`) // nhớ bỏ video vào thư mục /noprefix/
    };
    api.sendMessage(msg, threadID, messageID);
  }
};

module.exports.run = function() {};
