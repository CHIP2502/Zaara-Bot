const axios = require("axios");

async function streamUrl(url, options = {}) {
    const res = await axios({
        url,
        method: "GET",
        responseType: "stream",
        ...options
    });
    return res.data;
}

module.exports.config = {
    name: "autodown",
    version: "1.0.1",
    hasPermssion: 0,
    credits: "LocDev",
    description: "Tự động tải video/ảnh từ các nền tảng",
    commandCategory: "Tiện ích",
    usages: "[link]",
    cooldowns: 5
};

module.exports.run = async function () { };

module.exports.handleEvent = async function ({ api, event }) {
    const { threadID, messageID, body } = event;
    if (!body) return;

    const match = body.match(/https?:\/\/[^\s]+/g);
    if (!match) return;

    const url = match[0].replace(/[^\w\d:\/?&=%.~-]/g, "");
    const supported = [
        "v.douyin.com",
        "instagram.com",
        "threads.net",
        "threads.com",
        "capcut.com",
        "x.com",
        "twitter.com",
        "tiktok.com",
        "facebook.com",
        "youtube.com",
        "youtu.be"
    ];
    if (!supported.some(domain => url.includes(domain))) return;

    try {
        const { data: result } = await axios.get(
            `https://buda-juoe.onrender.com/downr?url=${encodeURIComponent(url)}`,
            {
                headers: {
                    "User-Agent": "Mozilla/5.0"
                }
            }
        );

        const { author, title, source } = result;
        const medias = result.medias || result.media || result.links || [];

        if (!Array.isArray(medias) || medias.length === 0) {
            return api.sendMessage("⚠️ Không tìm thấy nội dung media hợp lệ.", threadID, messageID);
        }

        const header = `[${(source || "unknown").toUpperCase()}] - Tự Động Tải`;
        const info = `👤 Tác giả: ${author || "Không rõ"}\n💬 Tiêu đề: ${title || "Không rõ"}`;

        const firstMedia = medias[0];
        if (firstMedia.type === "image") {
            const results = await Promise.allSettled(
                medias.filter(m => m.type === "image" && m.url).map(m => streamUrl(m.url))
            );

            const attachments = results
                .filter(r => r.status === "fulfilled" && r.value)
                .map(r => r.value);

            if (!attachments.length) return;
            await api.sendMessage({
                body: `${header}\n\n${info}`,
                attachment: attachments
            }, threadID, messageID);
            return;
        }

        const stream = await streamUrl(firstMedia.url);
        await api.sendMessage({
            body: `${header}\n\n${info}`,
            attachment: stream
        }, threadID, messageID);

    } catch (err) {
        console.error(err);
    }
};
