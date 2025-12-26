const axios = require("axios");
const fs = require("fs");
const path = require("path");

// --- REGEX DEFINITIONS ---
const FB_REGEX = /(https?:\/\/)?(www\.|web\.|m\.)?(facebook|fb)\.(com|watch)\/.+/i;
const SC_REGEX = /(https?:\/\/)?(www\.)?(on\.)?soundcloud\.com\/[\w\-\.]+(\/[\w\-\.]+)?/i;
const IG_REGEX = /(https?:\/\/)?(www\.)?(instagram\.com)\/.+/i;

exports.config = {
    name: 'autodown',
    version: '2.0.0',
    hasPermssion: 0,
    credits: 'Zaara', // Merged by Gemini
    description: 'Tự động tải Facebook, SoundCloud, Instagram (All-in-One)',
    commandCategory: 'Tiện ích',
    usages: [],
    cooldowns: 3
};

exports.handleEvent = async function (o) {
    try {
        const str = o.event.body;
        if (!str) return;

        // Phân loại và xử lý dựa trên link
        if (FB_REGEX.test(str)) {
            await processFacebook(o, str.match(FB_REGEX)[0]);
        } else if (SC_REGEX.test(str)) {
            await processSoundCloud(o, str.match(SC_REGEX)[0]);
        } else if (IG_REGEX.test(str)) {
            await processInstagram(o, str.match(IG_REGEX)[0]);
        }
    } catch (e) {
        console.error("Autodown Error:", e);
    }
};

exports.run = () => {};

// --- XỬ LÝ REACTION (Lấy ảnh bìa cho cả 3 nền tảng) ---
exports.handleReaction = async function (o) {
    const { threadID: t, messageID: m, reaction: r } = o.event;
    const { handleReaction: _ } = o;
    const data = _.data;

    if (r != "☁️") return;

    o.api.sendMessage({
        body: `      ====『 𝐂𝐎𝐕𝐄𝐑 𝐀𝐑𝐓 』====
▱▱▱▱▱▱▱▱▱▱▱▱▱▱
📸 𝐓𝐢𝐞̂𝐮 đ𝐞̂̀: ${data.title}
🔗 𝐋𝐢𝐧𝐤 𝐆𝐨̂́𝐜: ${data.keyword}
▱▱▱▱▱▱▱▱▱▱▱▱▱▱`,
        attachment: await streamURL(data.thumbnail, "jpg")
    }, t, m);
}

// ============================================================
//                  CÁC HÀM XỬ LÝ RIÊNG BIỆT
// ============================================================

// 1. XỬ LÝ FACEBOOK
async function processFacebook(o, url) {
    const setIcon = (icon) => o.api.setMessageReaction(icon, o.event.messageID, () => {}, true);
    setIcon("⏳");

    try {
        const json = await callAPI(url);
        if (!json || !json.links || !json.links.video) return setIcon("❌");

        // Ưu tiên HD
        const videoData = json.links.video;
        const targetVideo = videoData.hd ? videoData.hd : videoData.sd;

        if (!targetVideo || !targetVideo.url) return setIcon("❌");

        const msgBody = formatMessage("𝐅𝐚𝐜𝐞𝐛𝐨𝐨𝐤", json.title, videoData.hd ? "HD" : "SD", targetVideo.size);
        const attachment = await streamURL(targetVideo.url, 'mp4');

        sendMessage(o, msgBody, attachment, json, setIcon);
    } catch (e) {
        console.error(e);
        setIcon("❌");
    }
}

// 2. XỬ LÝ SOUNDCLOUD
async function processSoundCloud(o, url) {
    const setIcon = (icon) => o.api.setMessageReaction(icon, o.event.messageID, () => {}, true);
    setIcon("⏳");

    try {
        const json = await callAPI(url);
        if (!json || !json.links || !json.links.audio) return setIcon("❌");

        // Lấy link số 2 (Index 1) theo yêu cầu
        const audioArray = json.links.audio;
        const targetAudio = audioArray[1] ? audioArray[1] : audioArray[0];

        if (!targetAudio || !targetAudio.url) return setIcon("❌");

        const author = json.author || "SoundCloud User";
        const msgBody = `      ====『 𝐒𝐨𝐮𝐧𝐝𝐂𝐥𝐨𝐮𝐝 𝐀𝐮𝐭𝐨 』====
▱▱▱▱▱▱▱▱▱▱▱▱▱▱
•👤 𝐍𝐠𝐡𝐞̣̂ 𝐬𝐢̃: ${author}
•💬 𝐓𝐢𝐞̂𝐮 Đ𝐞̂̀: ${json.title}
•💾 𝐃𝐮𝐧𝐠 𝐥𝐮̛𝐨̛̣𝐧𝐠: ${targetAudio.size || "Unknown"}
•☁️ 𝐓𝐡𝐚̉ ☁️ 𝐧𝐞̂́𝐮 𝐦𝐮𝐨̂́𝐧 𝐥𝐚̂́𝐲 𝐚̉𝐧𝐡 𝐛𝐢̀𝐚
▱▱▱▱▱▱▱▱▱▱▱▱▱▱`;

        const attachment = await streamURL(targetAudio.url, 'mp3');
        sendMessage(o, msgBody, attachment, json, setIcon);

    } catch (e) {
        console.error(e);
        setIcon("❌");
    }
}

// 3. XỬ LÝ INSTAGRAM
async function processInstagram(o, url) {
    const setIcon = (icon) => o.api.setMessageReaction(icon, o.event.messageID, () => {}, true);
    setIcon("⏳");

    try {
        const json = await callAPI(url);
        if (!json || !json.links || !json.links.video) return setIcon("❌");

        // Lấy key "HD video"
        const videoData = json.links.video;
        const targetVideo = videoData["HD video"] || Object.values(videoData)[0];

        if (!targetVideo || !targetVideo.url) return setIcon("❌");

        const authorName = json.author ? json.author.full_name : "Unknown";
        const msgBody = `      ====『 𝐈𝐧𝐬𝐭𝐚𝐠𝐫𝐚𝐦 𝐀𝐮𝐭𝐨 』====
▱▱▱▱▱▱▱▱▱▱▱▱▱▱
•👤 𝐀𝐮𝐭𝐡𝐨𝐫: ${authorName}
•📝 𝐓𝐢𝐞̂𝐮 Đ𝐞̂̀: ${json.title || "Instagram Post"}
•💾 𝐊𝐢́𝐜𝐡 𝐭𝐡𝐮̛𝐨̛́𝐜: ${targetVideo.size || "Unknown"}
▱▱▱▱▱▱▱▱▱▱▱▱▱▱`;

        const attachment = await streamURL(targetVideo.url, 'mp4');
        sendMessage(o, msgBody, attachment, json, setIcon);

    } catch (e) {
        console.error(e);
        setIcon("❌");
    }
}

// ============================================================
//                  HELPER FUNCTIONS (DÙNG CHUNG)
// ============================================================

// Hàm định dạng tin nhắn chung cho FB/IG
function formatMessage(platform, title, quality, size) {
    return `      ====『 ${platform} 𝐀𝐮𝐭𝐨 』====
▱▱▱▱▱▱▱▱▱▱▱▱▱▱
•💬 𝐓𝐢𝐞̂𝐮 Đ𝐞̂̀: ${title}
•🎞️ 𝐂𝐡𝐚̂́𝐭 𝐥𝐮̛𝐨̛̣𝐧𝐠: ${quality || "N/A"}
•💾 𝐊𝐢́𝐜𝐡 𝐭𝐡𝐮̛𝐨̛́𝐜: ${size || "Unknown"}
•☁️ 𝐓𝐡𝐚̉ ☁️ 𝐧𝐞̂́𝐮 𝐦𝐮𝐨̂́𝐧 𝐥𝐚̂́𝐲 𝐚̉𝐧𝐡 𝐛𝐢̀𝐚
▱▱▱▱▱▱▱▱▱▱▱▱▱▱`;
}

// Hàm gửi tin nhắn và đăng ký Reaction
function sendMessage(o, body, attachment, json, setIcon) {
    o.api.sendMessage({ body, attachment }, o.event.threadID, (err, info) => {
        if (!err) {
            setIcon("✔");
            global.client.handleReaction.push({
                name: exports.config.name,
                messageID: info.messageID,
                author: o.event.senderID,
                data: json
            });
        } else {
            setIcon("❌");
        }
    }, o.event.messageID);
}

// Hàm gọi API
async function callAPI(url) {
    try {
        const res = await axios.get(`https://buda-juoe.onrender.com/downall?url=${encodeURIComponent(url)}`);
        return res.data ? res.data.data : null;
    } catch (e) { return null; }
}

// Hàm tải file stream (Tự xóa cache)
function streamURL(url, type) {
    return axios.get(url, { responseType: 'arraybuffer' })
        .then(res => {
            const filePath = path.join(__dirname, "cache", `${Date.now()}.${type}`);
            fs.writeFileSync(filePath, res.data);
            setTimeout(() => { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }, 60 * 1000);
            return fs.createReadStream(filePath);
        });
}