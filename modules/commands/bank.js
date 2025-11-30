const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
  name: "bank",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "ntkiendz",
  description: "Ngân hàng Mirai Bank",
  commandCategory: "Bank",
  usages: "",
  cooldowns: 0,
  dependencies: { "fs-extra": "" }
};

// Lưu thời gian cộng lãi
global.bankLastInterest = Date.now();

// ==== Hàm tiện ích ====

// Format số tiền với dấu phẩy và đơn vị cuối cùng
function formatFullAmount(amount) {
  const units = [
    { unit: "g", value: 36n },
    { unit: "gb", value: 27n },
    { unit: "mb", value: 24n },
    { unit: "kb", value: 21n },
    { unit: "b", value: 18n },
    { unit: "m", value: 15n },
    { unit: "k", value: 12n }
  ];

  for (let u of units) {
    let unitValue = 10n ** u.value;
    if (amount >= unitValue) {
      return `${amount.toLocaleString("en-US")}$ (${u.unit})`;
    }
  }
  return `${amount.toLocaleString("en-US")}$`;
}

// Parse số tiền có đơn vị
function parseAmount(str) {
  str = str.toLowerCase();
  const units = { 'k': 12n, 'm': 15n, 'b': 18n, 'kb': 21n, 'mb': 24n, 'gb': 27n, 'g': 36n };
  for (let u in units) {
    if (str.endsWith(u)) {
      let num = str.replace(u, "");
      if (isNaN(num)) return null;
      return BigInt(num) * (10n ** units[u]);
    }
  }
  if (!isNaN(str)) return BigInt(str);
  return null;
}

// Thời gian còn lại đến lần cộng lãi tiếp theo
function getTimeRemaining() {
  const fiveHours = 5 * 60 * 60 * 1000;
  let elapsed = Date.now() - global.bankLastInterest;
  let remaining = fiveHours - elapsed;
  if (remaining < 0) remaining = 0;
  let hours = Math.floor(remaining / (60 * 60 * 1000));
  let minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  let seconds = Math.floor((remaining % (60 * 1000)) / 1000);
  return `${hours}h ${minutes}m ${seconds}s`;
}

// ==== Load dữ liệu và tự động cộng lãi ====
module.exports.onLoad = async () => {
  const dir = path.join(__dirname, "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const pathData = path.join(dir, "bank.json");
  if (!fs.existsSync(pathData)) return fs.writeFileSync(pathData, "[]", "utf-8");

  const interestRate = 0.00025;
  const fiveHours = 5 * 60 * 60 * 1000;

  setInterval(() => {
    try {
      let users = JSON.parse(fs.readFileSync(pathData, "utf-8"));
      let updated = false;

      users.forEach(user => {
        let balance = BigInt(user.money || "0");
        if (balance > 0n) {
          let interest = BigInt(Math.floor(Number(balance) * interestRate));
          if (interest > 0n) {
            user.money = String(balance + interest);
            if (!user.history) user.history = [];
            const time = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
            user.history.unshift({ type: "Cộng lãi suất 0,025%", amount: `+${formatFullAmount(interest)}`, time });
            if (user.history.length > 20) user.history.pop();
            updated = true;
          }
        }
      });

      if (updated) {
        fs.writeFileSync(pathData, JSON.stringify(users, null, 2), "utf-8");
        global.bankLastInterest = Date.now();
        console.log(`[BANK] Đã cộng lãi vào ${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`);
      }
    } catch (err) { console.error("[BANK] Lỗi khi cộng lãi:", err); }
  }, fiveHours);
};

// ==== Module chính ====
module.exports.run = async function({ api, event, args, Currencies }) {
  const { threadID, messageID, senderID } = event;
  const pathData = path.join(__dirname, "data", "bank.json");
  let users = JSON.parse(fs.readFileSync(pathData, "utf-8"));
  let findUser = users.find(u => u.senderID === senderID);

  const saveData = () => fs.writeFileSync(pathData, JSON.stringify(users, null, 2), "utf-8");

  const logTransaction = (type, amount) => {
    const time = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
    if (!findUser.history) findUser.history = [];
    findUser.history.unshift({ type, amount: formatFullAmount(amount), time });
    if (findUser.history.length > 20) findUser.history.pop();
    saveData();
  };

  try {
    const command = args[0];

    if (new Date().getDay() === 0 && command !== "check" && command !== "history") {
      return api.sendMessage("🚫 Ngân hàng nghỉ Chủ Nhật, vui lòng quay lại sau.", threadID, messageID);
    }

    // Đăng ký
    if (command === "register" || command === "tạo") {
      if (!findUser) { users.push({ senderID, money: "0", history: [] }); saveData(); return api.sendMessage(`[✅] Đăng ký thành công`, threadID, messageID); }
      else return api.sendMessage(`[⚠️] Bạn đã có tài khoản rồi!`, threadID, messageID);
    }

    // Check số dư
    if (command === "check") {
      let targetID = senderID;
      if (Object.keys(event.mentions).length > 0) targetID = Object.keys(event.mentions)[0];
      else if (event.messageReply) targetID = event.messageReply.senderID;

      const targetUser = users.find(u => u.senderID === targetID);
      if (!targetUser) {
        const targetName = (await api.getUserInfo(targetID))[targetID].name;
        return api.sendMessage(`[⚠️] ${targetName} chưa có tài khoản.`, threadID, messageID);
      }

      const balance = BigInt(targetUser.money);
      const displayBalance = formatFullAmount(balance);
      const targetName = (await api.getUserInfo(targetID))[targetID].name;

      return api.sendMessage(
        `[✅ SUCCESS] » Tài khoản ${targetName} trong MiraiBank:\n` +
        `💰 Số dư: ${displayBalance}\n` +
        `♻️ Lãi suất: 0,025% mỗi 5 tiếng\n` +
        `⏳ Lần cộng lãi tiếp theo: ${getTimeRemaining()}\n` +
        `📌 Trạng thái tài khoản: Tốt`,
        threadID, messageID
      );
    }

    // Gửi tiền
    if (command === "gửi" || command === "send") {
      if (!findUser) return api.sendMessage(`[⚠️] Bạn chưa có tài khoản`, threadID, messageID);
      if (!args[1]) return api.sendMessage("[⚠️] Nhập số tiền", threadID, messageID);
      let balances = (await Currencies.getData(senderID)).money;
      let rawAmount = args[1] !== "all" ? parseAmount(args[1]) : BigInt(balances);
      if (rawAmount === null) return api.sendMessage("[⚠️] Số tiền không hợp lệ!", threadID, messageID);
      if (rawAmount < 100n) return api.sendMessage("[⚠️] Tối thiểu gửi 100$", threadID, messageID);
      if (rawAmount > BigInt(balances)) return api.sendMessage(`[⚠️] Không đủ tiền`, threadID, messageID);
      let fee = rawAmount * 15n / 1000n;
      let amountAfterFee = rawAmount - fee;
      findUser.money = String(BigInt(findUser.money) + amountAfterFee);
      await Currencies.decreaseMoney(senderID, String(rawAmount));
      logTransaction("Gửi tiền (trừ phí 1.5%)", amountAfterFee);
      return api.sendMessage(`[✅] Gửi thành công ${formatFullAmount(amountAfterFee)} (phí ${formatFullAmount(fee)})`, threadID, messageID);
    }

    // Rút tiền
    if (command === "rút" || command === "lấy") {
      if (!findUser) return api.sendMessage(`[⚠️] Bạn chưa có tài khoản`, threadID, messageID);
      if (!args[1]) return api.sendMessage("[⚠️] Nhập số tiền", threadID, messageID);
      let rawAmount = args[1] !== "all" ? parseAmount(args[1]) : BigInt(findUser.money);
      if (rawAmount === null) return api.sendMessage("[⚠️] Số tiền không hợp lệ!", threadID, messageID);
      if (rawAmount < 10000n) return api.sendMessage("[⚠️] Tối thiểu rút 10,000$", threadID, messageID);
      if (rawAmount > BigInt(findUser.money)) return api.sendMessage(`[⚠️] Số dư không đủ`, threadID, messageID);
      let fee = rawAmount * 15n / 1000n;
      let amountAfterFee = rawAmount - fee;
      findUser.money = String(BigInt(findUser.money) - rawAmount);
      await Currencies.increaseMoney(senderID, String(amountAfterFee));
      logTransaction("Rút tiền (trừ phí 1.5%)", amountAfterFee);
      return api.sendMessage(`[✅] Rút thành công ${formatFullAmount(amountAfterFee)} (phí ${formatFullAmount(fee)})`, threadID, messageID);
    }

    // Lịch sử
    // ==== Lịch sử giao dịch (nâng cấp) ====
if (command === "history" || command === "lịch") {
  if (!findUser) return api.sendMessage(`[⚠️] Bạn chưa có tài khoản`, threadID, messageID);
  const history = findUser.history || [];
  if (history.length === 0) return api.sendMessage("📜 Chưa có giao dịch nào.", threadID, messageID);

  // Nếu chỉ gõ bank history -> hiển thị danh sách ngày
  if (!args[1]) {
    // Lấy ra danh sách các ngày có trong lịch sử
    let days = [...new Set(history.map(h => h.time.split(",")[0]))]; 
    let msg = `📅 [DANH SÁCH NGÀY CÓ GIAO DỊCH]\n\n`;
    days.forEach((day, index) => {
      msg += `${index + 1}. ${day}\n`;
    });
    msg += `\n👉 Dùng lệnh: bank history <ngày> để xem chi tiết\nVí dụ: bank history 07/09/2025`;
    return api.sendMessage(msg, threadID, messageID);
  }

  // Nếu có thêm ngày (vd: bank history 07/09/2025)
  const queryDay = args[1];
  const transactions = history.filter(h => h.time.startsWith(queryDay));
  if (transactions.length === 0) {
    return api.sendMessage(`❌ Không có giao dịch nào trong ngày ${queryDay}`, threadID, messageID);
  }

  let msg = `📜 [LỊCH SỬ GIAO DỊCH NGÀY ${queryDay}]\n\n`;
  transactions.forEach((item, index) => {
    msg += `${index + 1}. [${item.type}] - ${item.amount} vào ${item.time}\n`;
  });
  return api.sendMessage(msg, threadID, messageID);
}


    // Menu mặc định
    return api.sendMessage(`🏦 MIRAI BANK MENU 🏦

-bank register -> Đăng ký tài khoản
-bank check -> Xem số dư + lãi suất (hỗ trợ tag/reply)
-bank gửi <số tiền> -> Gửi tiền
-bank rút <số tiền> -> Rút tiền
-bank history -> Lịch sử giao dịch

💵 Gửi >= 100$, Rút >= 10,000$
💸 Phí giao dịch: 1.5%
💹 Lãi suất: 0,025% mỗi 5 tiếng
⛔ Chủ Nhật: Ngân hàng nghỉ.`, threadID, messageID);

  } catch (e) {
    console.error(e);
    return api.sendMessage("❌ Có lỗi xảy ra.", threadID, messageID);
  }
};
