const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");

const DB_PATH = path.join(__dirname, "cache", "thuchi_data.json");

if (!fs.existsSync(path.join(__dirname, "cache"))) fs.mkdirSync(path.join(__dirname, "cache"));

module.exports.config = {
    name: "thuchi",
    version: "5.0.0",
    hasPermssion: 0,
    credits: "Gemini Finance AI",
    description: "Quản lý thu chi + AI Tư vấn tài chính",
    commandCategory: "Tiện ích",
    usages: "[thu/chi] | [xem] | [tuvan] | [reset]",
    cooldowns: 0
};

function getDB() {
    if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({}), 'utf-8');
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function saveDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 4), 'utf-8');
}

function fmtNum(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function parseMoney(input) {
    if (!input) return 0;
    let str = input.toString().toLowerCase();
    if (str.endsWith('k')) str = str.replace('k', '000');
    if (str.endsWith('m')) str = str.replace('m', '000000');
    str = str.replace(/[.,]/g, '');
    const num = parseInt(str);
    return isNaN(num) ? 0 : num;
}

function pad(str, width, align = 'right') {
    str = String(str);
    if (str.length >= width) return str;
    const padding = ' '.repeat(width - str.length);
    return align === 'right' ? padding + str : str + padding;
}

function getMonthlyStats(userData) {
    const currentMonth = moment().tz("Asia/Ho_Chi_Minh").format("MM/YYYY");
    let thu = 0, chi = 0;

    userData.history.forEach(h => {
        const transMonth = moment(h.timestamp).tz("Asia/Ho_Chi_Minh").format("MM/YYYY");
        if (transMonth === currentMonth) {
            if (h.type === "THU") thu += h.amount;
            else chi += h.amount;
        }
    });

    return { thu, chi, saving: thu - chi, month: currentMonth };
}

function generateAdvice(stats) {
    const { thu, chi, saving, month } = stats;
    const ratio = thu > 0 ? chi / thu : (chi > 0 ? 1 : 0);
    const percentChi = (ratio * 100).toFixed(1);

    let advice = `🤖 PHÂN TÍCH TÀI CHÍNH THÁNG ${month} (AI by Zaara)\n`;
    advice += `================================\n`;
    advice += `Tổng thu:      ${pad(fmtNum(thu) + 'đ', 15)}\n`;
    advice += `Tổng chi:      ${pad(fmtNum(chi) + 'đ', 15)} (${percentChi}% thu nhập)\n`;
    advice += `Tiết kiệm:     ${pad(fmtNum(saving) + 'đ', 15)}\n\n`;
    advice += `📢 LỜI KHUYÊN TỪ AI:\n`;

    if (thu === 0 && chi === 0) {
        advice += "💤 Tháng này chưa làm gì cả. Dậy đi kiếm tiền đi đại ca!";
    } else if (saving >= thu * 0.5) {
        advice += "👑 TIẾT KIỆM ĐỈNH CAO! Mày đang ở top 1% người trẻ biết giữ tiền.\n👉 Cân nhắc: Mua vàng, gửi tiết kiệm hoặc đầu tư chứng khoán ngay.";
    } else if (saving >= thu * 0.3) {
        advice += "🔥 Rất tốt! Mày đang ở top 5% người trẻ Việt Nam.\n👉 Giữ vững phong độ này là cuối năm đổi xe được rồi.";
    } else if (saving >= thu * 0.2) {
        advice += "✅ Tốt! Đang đi đúng hướng.\n👉 Giữ vững kỷ luật, hạn chế mua sắm linh tinh là cuối năm có iPhone 18 Pro Max.";
    } else if (saving > 0) {
        advice += "⚠️ Cảnh báo: Tiết kiệm dưới 20%.\n👉 Cắt bớt trà sữa, cà phê, Shopee đi. Tháng sau phải để dành được trên 2 triệu nhé!";
    } else {
        advice += `🚨 ÂM ${fmtNum(Math.abs(saving))}đ – NGUY HIỂM VCL!\n👉 Mày đang sống vượt khả năng rồi. Cắt ngay chi tiêu giải trí, ăn ngoài. Tập trung cày cuốc kiếm thêm (làm thêm bot, chạy grab, freelance) ngay lập tức!`;
    }

    advice += `\n\n💡 Gợi ý tháng tới:\n- Ăn uống: tối đa 3 củ\n- Đi chơi: 1 củ\n- Tiết kiệm bắt buộc: ít nhất 30% thu nhập`;
    
    return advice;
}

module.exports.onLoad = function () {
    setInterval(() => {
        const db = getDB();
        const now = moment().tz("Asia/Ho_Chi_Minh");
        const todayStr = now.format("YYYY-MM-DD");
        const currentMonth = now.format("MM/YYYY");
        let hasChange = false;

        Object.keys(db).forEach(userID => {
            const userData = db[userID];
            if (!userData.history) return;

            // 1. BÁO CÁO CUỐI THÁNG (20:00 ngày cuối tháng)
            const lastDayOfMonth = now.clone().endOf('month').format("DD");
            if (now.format("DD") === lastDayOfMonth && now.hour() === 20 && now.minute() === 0) {
                if (userData.lastReportDate !== todayStr) {
                    const stats = getMonthlyStats(userData);
                    let msg = generateAdvice(stats);
                    
                    if (global.client && global.client.api) global.client.api.sendMessage(msg, userID);
                    userData.lastReportDate = todayStr;
                    hasChange = true;
                }
            }

            // 2. RESET ĐẦU THÁNG (08:00 ngày 1)
            if (now.format("DD") === "01" && now.hour() === 8 && now.minute() === 0) {
                if (userData.lastResetMonth !== currentMonth) {
                    const oldBalance = userData.balance;
                    userData.balance = 0;
                    userData.history = [];
                    userData.lastResetMonth = currentMonth;

                    let msg = `🌞 CHÀO THÁNG ${currentMonth}!\nSổ thu chi đã được reset.\nTiết kiệm tháng trước: ${fmtNum(oldBalance)}đ\nHôm nay cố gắng kiếm tiền nào đại ca!`;
                    if (global.client && global.client.api) global.client.api.sendMessage(msg, userID);
                    hasChange = true;
                }
            }
        });
        if (hasChange) saveDB(db);
    }, 60 * 1000);
};

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const command = args[0] ? args[0].toLowerCase() : "";
    const db = getDB();

    if (!db[senderID]) db[senderID] = { balance: 0, history: [] };
    const userData = db[senderID];

    if (command === "thu" || command === "+") {
        const money = parseMoney(args[1]);
        const reason = args.slice(2).join(" ") || "Không có ghi chú";
        if (money <= 0) return api.sendMessage("⚠️ Số tiền sai!", threadID, messageID);

        userData.balance += money;
        userData.history.push({ type: "THU", amount: money, reason, timestamp: Date.now() });
        if (userData.history.length > 50) userData.history.shift();
        
        saveDB(db);
        return api.sendMessage(`✅ Đã thêm: +${fmtNum(money)}đ\n📝 Lý do: ${reason}`, threadID, messageID);
    }

    else if (command === "chi" || command === "-") {
        const money = parseMoney(args[1]);
        const reason = args.slice(2).join(" ") || "Không có ghi chú";
        if (money <= 0) return api.sendMessage("⚠️ Số tiền sai!", threadID, messageID);

        userData.balance -= money;
        userData.history.push({ type: "CHI", amount: money, reason, timestamp: Date.now() });
        if (userData.history.length > 50) userData.history.shift();

        saveDB(db);
        return api.sendMessage(`💸 Đã trừ: -${fmtNum(money)}đ\n📝 Lý do: ${reason}`, threadID, messageID);
    }

    else if (command === "xem" || command === "check") {
        let tongThu = 0, tongChi = 0;
        userData.history.forEach(h => { h.type === "THU" ? tongThu += h.amount : tongChi += h.amount; });
        const currentMonth = moment().tz("Asia/Ho_Chi_Minh").format("MM/YYYY");
        
        let msg = `BÁO CÁO VÍ CÁ NHÂN (Tổng hợp)\n================\n`;
        msg += `💰 Dư hiện tại: ${fmtNum(userData.balance)}đ\n`;
        msg += `📈 Tổng Thu:    ${fmtNum(tongThu)}đ\n`;
        msg += `📉 Tổng Chi:    ${fmtNum(tongChi)}đ\n\n`;
        msg += `Lịch sử 5 giao dịch gần nhất:\n`;
        userData.history.slice().reverse().slice(0, 5).forEach(h => {
            const sign = h.type === "THU" ? "+" : "-";
            msg += `${sign} ${fmtNum(h.amount)}đ | ${h.reason}\n`;
        });
        return api.sendMessage(msg, threadID, messageID);
    }

    else if (command === "tuvan" || command === "advice" || command === "adv") {
        const stats = getMonthlyStats(userData);
        const adviceMsg = generateAdvice(stats);
        return api.sendMessage(adviceMsg, threadID, messageID);
    }

    else if (command === "reset") {
        db[senderID] = { balance: 0, history: [] };
        saveDB(db);
        return api.sendMessage("♻️ Ví đã về 0.", threadID, messageID);
    }
    
    else return api.sendMessage("Dùng: .thuchi [thu/chi/xem/tuvan]", threadID, messageID);
};