const axios = require("axios");
const fs = require("fs");
const path = require("path");

const SC_REGEX = /(https?:\/\/)?(www\.)?(on\.)?soundcloud\.com\/[\w\-\.]+(\/[\w\-\.]+)?/i;

module.exports.config = {
    name: "scl",
    version: "2.1.0",
    hasPermssion: 0,
    credits: "Zaara",
    description: "Tự động phát hiện và tải nhạc SoundCloud khi có người gửi link",
    commandCategory: "Tiện ích",
    usages: "Chỉ cần gửi link soundcloud vào nhóm",
    cooldowns: 0
};

module.exports.handleEvent = async function ({ api, event }) {
    const { body, threadID, messageID } = event;

    if (!body || !SC_REGEX.test(body)) return;

    const match = body.match(SC_REGEX);
    const scUrl = match[0];

    console.log(`[SCL Auto] Phát hiện link: ${scUrl}`);

    api.sendMessage("⏳", threadID, async (err, info) => {
        if (err) return;
        
        const waitingMessageID = info.messageID;

        try {
            const apiUrl = `https://buda-juoe.onrender.com/downr?url=${encodeURIComponent(scUrl)}`;
            
            const res = await axios.get(apiUrl);
            const data = res.data;

            if (!data || !data.medias || data.medias.length === 0) {
                console.log("[SC Auto] API không trả về link tải.");
                api.unsendMessage(waitingMessageID);
                return api.sendMessage("❌ Không thể lấy link tải từ bài này.", threadID, messageID);
            }

            const downloadUrl = data.medias[0].url;
            const title = data.title || "Unknown Track";
            const author = data.author || "Unknown Artist";
            const duration = data.duration || "??:??";

            const cacheDir = path.join(__dirname, "cache");
            if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
            
            const safeTitle = title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 50);
            const filePath = path.join(cacheDir, `${safeTitle}_${Date.now()}.mp3`);

            const audioStream = await axios({
                url: downloadUrl,
                method: 'GET',
                responseType: 'stream'
            });

            const writer = fs.createWriteStream(filePath);
            audioStream.data.pipe(writer);

            writer.on('finish', () => {
                const msgBody = {
                    body: `☁️ SoundCloud Auto\n\n🎵 Bài: ${title}\n👤 Nghệ sĩ: ${author}\n⏱ Thời lượng: ${duration}`,
                    attachment: fs.createReadStream(filePath)
                };

                api.sendMessage(msgBody, threadID, () => {
                    fs.unlinkSync(filePath);
                    api.unsendMessage(waitingMessageID);
                }, messageID);
            });

            writer.on('error', (err) => {
                console.error("[SCL Auto] Lỗi ghi file:", err);
                api.unsendMessage(waitingMessageID);
                api.sendMessage("❌ Lỗi khi lưu file nhạc.", threadID, messageID);
            });

        } catch (err) {
            console.error("[SCL Auto] Lỗi API:", err.message);
            api.unsendMessage(waitingMessageID);
        }
    }, messageID);
};

module.exports.run = async function ({ api, event }) {
    api.sendMessage("Module này chạy tự động. Bạn chỉ cần gửi link SoundCloud vào nhóm!", event.threadID, event.messageID);
};