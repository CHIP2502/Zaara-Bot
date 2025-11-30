const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "mocki",
  version: "2.0.0",
  hasPermssion: 2,
  credits: "LocDev",
  description: "Mock nội dung một file từ modules/commands lên mocki.io (v1)",
  commandCategory: "Tiện ích",
  usages: "mocki <filename.js>",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;

  if (args.length === 0) {
    return api.sendMessage("❌ Vui lòng nhập tên file, ví dụ: `mocki sing.js`", threadID, messageID);
  }

  const fileName = args[0];
  const filePath = path.join(__dirname, fileName);

  if (!fs.existsSync(filePath)) {
    return api.sendMessage(`❌ File không tồn tại: ${fileName}`, threadID, messageID);
  }

  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");

    const mockData = {
      name: `Mock for ${fileName}`,
      response: {
        status: 200,
        body: fileContent // <-- Trả về raw nội dung
      }
    };

    const response = await axios.post("https://api.mocki.io/public/mocks", mockData, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const mockUrl = response.data?.url;

    if (mockUrl) {
      return api.sendMessage(
        `✅ Mock thành công file "${fileName}":\n🔗 ${mockUrl}`,
        threadID,
        messageID
      );
    } else {
      return api.sendMessage("❌ Không thể tạo mock từ mocki.io v1", threadID, messageID);
    }
  } catch (err) {
    return api.sendMessage(
      `❌ Lỗi khi tạo mock:\n${err.message}`,
      threadID,
      messageID
    );
  }
};
