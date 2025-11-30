// modules/commands/chucmungsinhnhat.js
module.exports.config = {
  name: "chucmungsinhnhat",
  version: "2.2.0",
  hasPermssion: 2,
  credits: "Trung x GPT (idea từ ping hidden-mention)",
  description: "Chúc mừng sinh nhật: auto tìm người + mention ẩn + spam N tin",
  commandCategory: "Fun",
  usages: "chucmungsinhnhat [@tag | reply | tên | UID] [số_tin=10] [lời_chúc_tùy_chỉnh...]",
  cooldowns: 5,
  aliases: ["sn"]
};

// bỏ dấu để so khớp tên
function normalizeVN(str = "") {
  return str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ").trim();
}

// tìm user theo tên/UID trong thread
async function resolveTarget({ api, threadID, raw }) {
  if (/^\d{6,}$/.test(raw || "")) {
    const ui = await api.getUserInfo(raw).catch(() => ({}));
    return { id: raw, name: ui?.[raw]?.name || raw };
  }
  const info = await api.getThreadInfo(threadID);
  const ids = info.participantIDs || [];
  const userInfo = await api.getUserInfo(ids);
  const q = normalizeVN(raw || "");

  let best = null, bestScore = -1;
  for (const id of ids) {
    const n = userInfo[id]?.name || "";
    const nn = normalizeVN(n);
    let score = -1;
    if (nn === q) score = 3;
    else if (nn.startsWith(q)) score = 2;
    else if (nn.includes(q)) score = 1;
    if (score > bestScore) { bestScore = score; best = { id, name: n }; }
  }
  return best;
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, mentions, messageReply, senderID } = event;

  // --- xác định người cần chúc ---
  let targetID = null, targetName = null;

  if (mentions && Object.keys(mentions).length) {
    targetID = Object.keys(mentions)[0];
    targetName = mentions[targetID].replace("@", "");
  } else if (messageReply?.senderID) {
    targetID = String(messageReply.senderID);
    const ui = await api.getUserInfo(targetID); targetName = ui[targetID]?.name || targetID;
  } else {
    if (!args.length) {
      return api.sendMessage("🎂 Dùng: /sn [@tag|reply|tên|UID] [số_tin=10] [lời_chúc...]",
        threadID, messageID);
    }
    // đọc số lần spam (ở cuối) nếu có
    let count = 10;
    const last = args[args.length - 1];
    if (/^\d+$/.test(last)) { count = Math.max(1, Math.min(20, parseInt(last))); args.pop(); }

    // phần còn lại là tên/UID + (tùy chọn) lời chúc custom
    // format hỗ trợ: sn Nguyen Huu Thuong 12 Chúc sinh nhật vui vẻ
    // => để chắc ăn, ta resolve người trước, lời chúc custom sẽ lấy sau khi tìm ra người
    const rawAll = args.join(" ").trim();
    // thử tách: ưu tiên tìm tên ở đầu, còn lại là lời chúc
    // ví dụ "Nguyen Huu Thuong Chúc sinh nhật dzui" -> sẽ thử tìm dài dần đến khi match tốt
    // đơn giản: thử toàn chuỗi làm tên
    let found = await resolveTarget({ api, threadID, raw: rawAll });
    let customMsg = "";
    if (!found) {
      // fallback: tách từ, giảm dần
      for (let i = args.length; i >= 1; i--) {
        const tryName = args.slice(0, i).join(" ");
        found = await resolveTarget({ api, threadID, raw: tryName });
        if (found) { customMsg = args.slice(i).join(" ").trim(); break; }
      }
    } else {
      // nếu resolve cả chuỗi, không còn custom
      customMsg = "";
    }
    if (!found) return api.sendMessage("❗ Không tìm thấy người phù hợp trong nhóm.", threadID, messageID);

    targetID = found.id; targetName = found.name;

    // đính kèm vào context để xài bên dưới
    event.__sn_count = count;
    event.__sn_custom = customMsg;
  }

  // số lần spam
  const count = event.__sn_count ?? 10;
  const custom = (event.__sn_custom ?? "").trim();

  // --- nội dung lời chúc ---
  const emojis = ["🎂","🎉","🎁","💐","✨","🥳","🎊","💖","💫","🍰","🎈"];
  const wishes = [
    `Chúc ${targetName} sinh nhật thật hạnh phúc và ý nghĩa!`,
    `Happy Birthday ${targetName}! Tuổi mới rực rỡ nha!`,
    `Chúc ${targetName} luôn vui vẻ, nhiều may mắn và thành công!`,
    `Sinh nhật zui zẻ nha ${targetName}, ăn bánh kem ngập mặt 😝`,
    `Tuổi mới – niềm vui mới – thành công mới! Chúc ${targetName} mọi điều tốt đẹp.`,
    `${targetName} ơi, chúc ngày đặc biệt tràn ngập yêu thương và bất ngờ dễ thương!`,
    `Thêm một tuổi, thêm muôn điều tuyệt vời. Chúc ${targetName} luôn toả sáng!`
  ];

  // --- mention ẩn (gợi ý từ code ping) ---
  const zchar = "‎"; // zero-width char (U+200E/hoặc tương tự)
  const makeBody = (msg) => `${zchar}${msg}`;

  // --- bắn tin ---
  const total = Math.max(1, Math.min(20, count));
  for (let i = 0; i < total; i++) {
    const wish = custom || wishes[Math.floor(Math.random() * wishes.length)];
    const emo  = emojis[Math.floor(Math.random() * emojis.length)];
    await new Promise(r => setTimeout(r, 800)); // delay chống chặn spam
    api.sendMessage({
      body: makeBody(`${wish} ${emo}`),
      mentions: [{ id: targetID, tag: zchar, fromIndex: 0 }]
    }, threadID);
  }
};
