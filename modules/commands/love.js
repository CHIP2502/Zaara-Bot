// modules/commands/love.js
module.exports.config = {
  name: "love",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "TrungMedia",
  description: "Đo % độ hợp đôi giữa bạn và người được tag (ổn định theo từng ngày)",
  commandCategory: "Fun",
  usages: "[tag | reply]",
  cooldowns: 5
};

function dailyPercent(id1, id2) {
  // kết quả ổn định trong ngày: phụ thuộc 2 id + yyyy-mm-dd
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const seed = [String(id1), String(id2)].sort().join("|") + "|" + today;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % 101; // 0..100
}

function bar(percent, size = 20) {
  const filled = Math.round((percent / 100) * size);
  const empty = size - filled;
  return "❤️".repeat(filled) + "🖤".repeat(empty);
}

function verdict(p) {
  if (p >= 95) return "Định mệnh gặp nhau rồi! 💍";
  if (p >= 80) return "Rất xứng đôi, cưới được đó! 😻";
  if (p >= 65) return "Khá hợp nè, chịu khó quan tâm nhau nhé. 💞";
  if (p >= 45) return "Cũng tạm ổn, cần cố gắng thêm! 🙂";
  if (p >= 25) return "Hơi khắc khẩu, mềm mỏng chút nha. 😅";
  return "Khó đấy… nhưng biết đâu phép màu xuất hiện? 💔";
}

module.exports.run = async function ({ api, event, args, Users }) {
  const { threadID, messageID, senderID, messageReply, mentions } = event;

  // Lấy target ID: ưu tiên reply, sau đó là tag
  let targetID = null;
  if (messageReply && messageReply.senderID) {
    targetID = messageReply.senderID;
  } else if (Object.keys(mentions).length >= 1) {
    targetID = Object.keys(mentions)[0];
  }

  if (!targetID) {
    return api.sendMessage(
      "Cách dùng: /love @tag (hoặc reply người đó).",
      threadID,
      messageID
    );
  }

  // Tên hiển thị
  const nameA = await Users.getNameUser(senderID) || "Bạn";
  const nameB = await Users.getNameUser(targetID) || "Người kia";

  // Tính phần trăm theo ngày
  const percent = senderID === targetID ? 100 : dailyPercent(senderID, targetID);
  const meter = bar(percent, 20);
  const note = senderID === targetID ? "Yêu bản thân là đỉnh nhất! 😎" : verdict(percent);

  const body =
`💘 Chỉ số hợp đôi hôm nay
${nameA}  ❤️  ${nameB}

❤️‍🔥 Điểm: ${percent}%
${meter}

${note}`;

  return api.sendMessage(
    {
      body,
      mentions: [
        { id: senderID, tag: nameA },
        { id: targetID, tag: nameB }
      ]
    },
    threadID,
    messageID
  );
};
