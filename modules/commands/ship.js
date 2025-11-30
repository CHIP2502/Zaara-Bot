module.exports.config = {
  name: "ship",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "TrungMedia",
  description: "Tính phần trăm hợp đôi giữa 2 người",
  commandCategory: "Fun",
  usages: "ship @tag1 @tag2 | ship @tag | ship (reply)",
  cooldowns: 3
};

const moment = require("moment-timezone");

// tạo % “cố định theo ngày” để vui hơn
function dailyPercent(idA, idB) {
  const dayKey = moment().tz("Asia/Ho_Chi_Minh").format("YYYYMMDD");
  const str = `${idA}-${idB}-${dayKey}`;
  let h = 0;
  for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) % 101;
  return h; // 0..100
}

// thanh tiến trình tim
function loveBar(pct) {
  const total = 10;
  const fill = Math.round((pct / 100) * total);
  return "│" + "❤️".repeat(fill) + "🖤".repeat(total - fill) + "│";
}

// ghép tên vui vui
function shipName(n1, n2) {
  const a = n1.trim();
  const b = n2.trim();
  const midA = Math.max(1, Math.floor(a.length / 2));
  const midB = Math.max(1, Math.floor(b.length / 2));
  return (a.slice(0, midA) + b.slice(midB)).replace(/\s+/g, "");
}

module.exports.run = async function ({ api, event, Users }) {
  try {
    const { threadID, messageID, senderID, mentions, messageReply } = event;

    let idA, idB;

    const mentionIDs = Object.keys(mentions || {});
    if (mentionIDs.length >= 2) {
      idA = mentionIDs[0];
      idB = mentionIDs[1];
    } else if (mentionIDs.length === 1) {
      idA = senderID;
      idB = mentionIDs[0];
    } else if (messageReply) {
      idA = senderID;
      idB = messageReply.senderID;
    } else {
      return api.sendMessage(
        "Cách dùng: /ship @tag1 @tag2\n• Hoặc /ship @tag để ship bạn với người đó\n• Hoặc reply 1 người rồi gõ /ship",
        threadID,
        messageID
      );
    }

    // tránh ship chính mình với chính mình
    if (idA === idB)
      return api.sendMessage("Tự yêu bản thân là đúng, nhưng ship 2 lần thì hơi… 😳", threadID, messageID);

    const nameA = await Users.getNameUser(idA);
    const nameB = await Users.getNameUser(idB);

    // để % ổn định trong ngày, sắp xếp id để không đảo chiều làm thay đổi kết quả
    const [x, y] = idA < idB ? [idA, idB] : [idB, idA];
    const percent = dailyPercent(x, y);

    const bar = loveBar(percent);
    const combo = shipName(nameA, nameB);

    let note;
    if (percent >= 90) note = "Định mệnh rồi! 💍 Tới luôn bạn ơi!";
    else if (percent >= 75) note = "Quá hợp! Chờ gì nữa mà không tấn công! 💞";
    else if (percent >= 55) note = "Tương đối hợp, chăm thả thính thêm nha 😉";
    else if (percent >= 35) note = "Cần cố gắng… nhưng biết đâu đó chỉ thiếu 1 cái nhìn 🥺";
    else note = "Như dầu với nước… nhưng phép màu luôn tồn tại 😅";

    const body =
      `💘 Ship hôm nay\n` +
      `• Cặp đôi: ${nameA} ❤️ ${nameB}\n` +
      `• Độ hợp đôi: ${percent}%\n` +
      `${bar}\n` +
      `• Tên ghép: ${combo}\n` +
      `• Lời nhắn: ${note}\n` +
      `• (kết quả thay đổi theo từng ngày)`;

    return api.sendMessage(
      { body, mentions: [{ tag: nameA, id: idA }, { tag: nameB, id: idB }] },
      threadID,
      messageID
    );
  } catch (e) {
    console.log(e);
    return api.sendMessage("Lỗi không xác định khi ship, thử lại nhé!", event.threadID, event.messageID);
  }
};
