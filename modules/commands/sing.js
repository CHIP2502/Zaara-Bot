const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "sing6",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "Locdev, Shikaki Van D, nvh fix format",
  description: "Phát nhạc hoặc video từ YouTube",
  commandCategory: "media",
  usages: "[tên bài hát / link YouTube]",
  cooldowns: 5
};

const API = "http://theone-api-3416.ddnsgeek.com:3040";

module.exports.handleReply = async function ({ api, event, handleReply }) {
  try {
    if (handleReply.type === "search") {
      const choice = parseInt(event.body.trim());
      if (isNaN(choice) || choice < 1 || choice > handleReply.results.length) {
        return api.sendMessage("❌ Số không hợp lệ!", event.threadID, event.messageID);
      }
      const video = handleReply.results[choice - 1];
      const res = await axios.get(`${API}/?url=https://youtu.be/${video.videoId}`);
      const data = res.data;

      let msg = `🎶 Đã chọn: ${data.title}\n📺 Kênh: ${data.channel}\n\n`;
      msg += "👉 Reply số để chọn chất lượng:\n";

      const list = [];
      data.media.forEach((m, i) => {
        const type = m.quality.includes("kbps") ? "Audio" : "Video";
        list.push(m);
        msg += `${i + 1}. ${type} ${m.quality} | ${m.codec} | ${m.size}\n`;
      });

      api.sendMessage(msg, event.threadID, (err, info) => {
        global.client.handleReply.push({
          type: "format",
          name: module.exports.config.name,
          author: event.senderID,
          messageID: info.messageID,
          formats: list,
          title: data.title,
          channel: data.channel,
          expires: data.expires
        });
      });
    }

    else if (handleReply.type === "format") {
      const choice = parseInt(event.body.trim());
      if (isNaN(choice) || choice < 1 || choice > handleReply.formats.length) {
        return api.sendMessage("❌ Số không hợp lệ!", event.threadID, event.messageID);
      }
      const format = handleReply.formats[choice - 1];

      const filePath = path.join(__dirname, "cache", format.filename);
      const writer = fs.createWriteStream(filePath);

      const response = await axios({
        url: format.url,
        method: "GET",
        responseType: "stream"
      });

      response.data.pipe(writer);

      writer.on("finish", () => {
        api.sendMessage({
          body: `🎶 ${handleReply.title}\n📺 ${handleReply.channel}\n📦 ${format.quality} (${format.codec}, ${format.size})\n⌛ ${handleReply.expires}`,
          attachment: fs.createReadStream(filePath)
        }, event.threadID, () => fs.unlinkSync(filePath));
      });

      writer.on("error", () => {
        api.sendMessage("❌ Tải file thất bại!", event.threadID, event.messageID);
      });
    }
  } catch (e) {
    console.error(e);
    api.sendMessage("❌ Lỗi xử lý!", event.threadID, event.messageID);
  }
};

module.exports.run = async function ({ api, event, args }) {
  try {
    const query = args.join(" ");
    if (!query) return api.sendMessage("👉 Nhập từ khoá hoặc link YouTube!", event.threadID, event.messageID);

    let searchUrl = query.includes("youtube.com") || query.includes("youtu.be")
      ? `${API}/?url=${encodeURIComponent(query)}`
      : `${API}/search?q=${encodeURIComponent(query)}&num=5`;

    const res = await axios.get(searchUrl);
    const data = res.data;

    // Nếu user nhập link thì trả thẳng danh sách format
    if (query.includes("youtube.com") || query.includes("youtu.be")) {
      let msg = `🎶 ${data.title}\n📺 ${data.channel}\n\n👉 Reply số để chọn chất lượng:\n`;
      const list = [];
      data.media.forEach((m, i) => {
        const type = m.quality.includes("kbps") ? "Audio" : "Video";
        list.push(m);
        msg += `${i + 1}. ${type} ${m.quality} | ${m.codec} | ${m.size}\n`;
      });

      api.sendMessage(msg, event.threadID, (err, info) => {
        global.client.handleReply.push({
          type: "format",
          name: module.exports.config.name,
          author: event.senderID,
          messageID: info.messageID,
          formats: list,
          title: data.title,
          channel: data.channel,
          expires: data.expires
        });
      });
    }

    // Nếu user search thì trả danh sách video
    else {
      let msg = "🔎 Kết quả tìm kiếm:\n";
      data.results.forEach((v, i) => {
        msg += `${i + 1}. ${v.title} (${v.duration})\n`;
      });
      msg += "\n👉 Reply số để chọn video.";

      api.sendMessage(msg, event.threadID, (err, info) => {
        global.client.handleReply.push({
          type: "search",
          name: module.exports.config.name,
          author: event.senderID,
          messageID: info.messageID,
          results: data.results
        });
      });
    }

  } catch (e) {
    console.error(e);
    api.sendMessage("❌ Không lấy được dữ liệu!", event.threadID, event.messageID);
  }
};
