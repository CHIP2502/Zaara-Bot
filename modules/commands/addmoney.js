// modules/commands/addmoney.js
module.exports.config = {
  name: "addmoney",
  version: "1.1.0",
  hasPermssion: 1,       // chỉ admin
  credits: "Trung x GPT",
  description: "Cộng/Trừ tiền cho user dùng Currencies",
  commandCategory: "Bank",
  usages: "addmoney <uid|@tag|reply|me> <số tiền> [lý do]",
  cooldowns: 3
};

function pickTarget({ args, mentions, messageReply, senderID }) {
  if (mentions && Object.keys(mentions).length) return Object.keys(mentions)[0];
  if (messageReply?.senderID) return String(messageReply.senderID);
  if (args[0]?.toLowerCase?.() === "me") return String(senderID);
  if (/^\d{6,}$/.test(args[0] || "")) return args[0];
  return null;
}

module.exports.run = async function ({ api, event, args, Currencies, Users }) {
  const { threadID, messageID, senderID, mentions, messageReply } = event;

  // check admin theo config.json
  const admins = (global.config?.ADMINBOT || []).map(String);
  if (!admins.includes(String(senderID)))
    return api.sendMessage("❌ Chỉ admin mới dùng lệnh này.", threadID, messageID);

  const targetID = pickTarget({ args, mentions, messageReply, senderID });
  if (!targetID)
    return api.sendMessage(
      "⚙️ Dùng: addmoney <uid|@tag|reply|me> <số tiền> [lý do]\nVí dụ: addmoney @Tên 500 thưởng tuần",
      threadID, messageID
    );

  // lấy số tiền (âm để trừ)
  const amtArg = args.find(x => /^-?\d+$/.test(x));
  if (!amtArg) return api.sendMessage("❗ Nhập số tiền hợp lệ (vd: 1000 hoặc -500).", threadID, messageID);
  const delta = parseInt(amtArg, 10);

  // đọc – ghi vào Currencies
  const cur = await Currencies.getData(targetID);
  const now = Number(cur?.money || 0);
  const next = now + delta;

  await Currencies.setData(targetID, { money: next });

  const name = await Users.getNameUser(targetID).catch(() => targetID);
  const reason = args.slice(args.indexOf(amtArg) + 1).join(" ");

  return api.sendMessage(
    `✅ Đã ${delta >= 0 ? "cộng" : "trừ"} ${Math.abs(delta)} cho ${name}` +
    (reason ? `\n📝 Lý do: ${reason}` : "") +
    `\n💰 Số dư mới: ${next.toLocaleString("en-US")}$`,
    threadID, messageID
  );
};
