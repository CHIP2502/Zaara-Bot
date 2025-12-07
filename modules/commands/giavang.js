const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, 'cache');
const DB_PATH = path.join(CACHE_DIR, 'giavang_data.json');
const RAW_PATH = path.join(CACHE_DIR, 'btmc_raw.json');
const API_URL = "http://api.btmc.vn/api/BTMCAPI/getpricebtmc?key=3kd8ub1llcg9t45hnoh8hmn7t5kc2v";

module.exports.config = {
    name: "giavang",
    version: "7.0.0",
    hasPermssion: 0,
    credits: "Zaara",
    description: "Báo giá vàng tự động vào 8:00 và 18:00 hàng ngày",
    commandCategory: "Tiện ích",
    usages: "[check/on/off]",
    cooldowns: 5
};

function ensureCacheDir() {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function getDB() {
    ensureCacheDir();
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify({ subscribers: [], oldPrices: {} }), 'utf-8');
        return { subscribers: [], oldPrices: {} };
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function saveDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function cleanupCache() {
    try { if (fs.existsSync(RAW_PATH)) fs.unlinkSync(RAW_PATH); } catch (e) {}
}

async function updateAndProcessGoldPrice() {
    try {
        ensureCacheDir();

        const res = await axios.get(API_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'application/json'
            },
            timeout: 15000 
        });
        fs.writeFileSync(RAW_PATH, JSON.stringify(res.data, null, 4), 'utf-8');
        
        let rawData = JSON.parse(fs.readFileSync(RAW_PATH, 'utf-8'));
        let dataList = null;

        if (rawData.DataList && rawData.DataList.Data) dataList = rawData.DataList.Data;
        else if (rawData.Data) dataList = rawData.Data;
        else if (Array.isArray(rawData)) dataList = rawData;

        if (!Array.isArray(dataList)) {
             if (dataList) dataList = [dataList];
             else {
                 console.log("[GiaVang] Lỗi: Không tìm thấy mảng DataList.Data");
                 return null;
             }
        }

        let prices = {};

        for (const item of dataList) {
            let rowId = item['@row'] || item['row'];
            if (!rowId) {
                const findKey = Object.keys(item).find(k => /n_\d+$/.test(k));
                if (findKey) rowId = findKey.match(/(\d+)$/)[1];
            }

            if (rowId) {
                const nameRaw = item[`@n_${rowId}`];
                const buy = item[`@pb_${rowId}`];
                const sell = item[`@ps_${rowId}`];
                const dateKey = item[`@d_${rowId}`];

                if (nameRaw && buy) {
                    const kVal = item[`@k_${rowId}`] ? `(${item[`@k_${rowId}`]})` : "";
                    const hVal = item[`@h_${rowId}`] ? `[${item[`@h_${rowId}`]}]` : "";
                    const fullName = `${nameRaw} ${kVal} ${hVal}`.replace(/\(Vàng.*?\)/g, '').trim().replace(/\s+/g, ' ');

                    prices[nameRaw] = {
                        displayName: fullName,
                        buy: parseInt(buy),
                        sell: parseInt(sell) || 0,
                        updatedAt: dateKey || "Mới nhất"
                    };
                }
            }
        }
        
        if (Object.keys(prices).length > 0) {
            cleanupCache();
            return prices;
        }
        return null;

    } catch (e) {
        console.error("[GiaVang] Lỗi:", e.message);
        return null;
    }
}

module.exports.onLoad = function () {

    setInterval(async () => {
        const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();

        if ((hours === 8 || hours === 18) && minutes === 0 && seconds === 0) {
            const db = getDB();
            if (db.subscribers.length === 0) return;

            const prices = await updateAndProcessGoldPrice();
            if (!prices) return;

            const firstKey = Object.keys(prices)[0];
            const updateTime = prices[firstKey].updatedAt;

            let session = hours === 8 ? "SÁNG" : "CHIỀU";
            let msg = `📅 BÁO CÁO GIÁ VÀNG ${session} (${hours}H00)\n`;
            msg += `🕒 Cập nhật: ${updateTime}\n`;
            msg += `━━━━━━━━━━━━━━━━━━\n`;

            for (const [key, price] of Object.entries(prices)) {
                msg += `🔸 ${price.displayName}\n`;
                msg += `   📥 Mua: ${price.buy.toLocaleString()} vnđ\n`;
                msg += `   📤 Bán: ${price.sell.toLocaleString()} vnđ\n`;
                msg += `──────────────────\n`;
            }
            msg += `💡 Bot tự động gửi tin này vào 8h và 18h hàng ngày.`;

            if (global.client && global.client.api) {
                db.subscribers.forEach(tid => global.client.api.sendMessage(msg, tid));
                console.log(`[GiaVang] Đã gửi báo cáo ${hours}h cho ${db.subscribers.length} nhóm.`);
            }
        }
    }, 1000);
};

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const command = args[0] ? args[0].toLowerCase() : "check";
    const db = getDB();

    if (command === "on") {
        if (!db.subscribers.includes(threadID)) {
            db.subscribers.push(threadID);
            saveDB(db);
            return api.sendMessage(`✅ Đã BẬT báo cáo định kỳ.\nBot sẽ gửi bảng giá vào 8:00 sáng và 18:00 chiều mỗi ngày.`, threadID, messageID);
        } else return api.sendMessage("⚠️ Nhóm này đã bật rồi.", threadID, messageID);
    }

    if (command === "off") {
        const index = db.subscribers.indexOf(threadID);
        if (index > -1) {
            db.subscribers.splice(index, 1);
            saveDB(db);
            return api.sendMessage("❎ Đã TẮT báo cáo định kỳ.", threadID, messageID);
        } else return api.sendMessage("⚠️ Nhóm này chưa bật.", threadID, messageID);
    }

    api.sendMessage("🔄 Đang cập nhật dữ liệu...", threadID, async (err, info) => {
        const prices = await updateAndProcessGoldPrice();
        if(info) api.unsendMessage(info.messageID).catch(e => {});

        if (!prices) return api.sendMessage("❌ Lỗi API hoặc file cache chưa hợp lệ.", threadID, messageID);

        const firstKey = Object.keys(prices)[0];
        const updateTime = prices[firstKey].updatedAt;

        let msg = `🏆 GIÁ VÀNG BẢO TÍN MINH CHÂU\n`;
        msg += `🕒 ${updateTime}\n`;
        msg += `━━━━━━━━━━━━━━━━━━\n`;

        for (const [key, price] of Object.entries(prices)) {
            msg += `🔸 ${price.displayName}\n`;
            msg += `   📥 Mua: ${price.buy.toLocaleString()} vnđ\n`;
            msg += `   📤 Bán: ${price.sell.toLocaleString()} vnđ\n`;
            msg += `──────────────────\n`;
        }
        return api.sendMessage(msg, threadID, messageID);
    });
};