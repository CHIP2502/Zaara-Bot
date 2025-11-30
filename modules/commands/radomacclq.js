const axios = require("axios");
const moment = require("moment-timezone");

module.exports = {
    config: {
        name: "radomacclq",
        version: "1.1.0",
        hasPermssion: 0,
        credits: "tnt mod by Trung",
        description: "Random Capcut Liên Quân (tốn 100$ mỗi lần dùng)",
        commandCategory: "Liên Quân",
        usages: "/radomacclq",
        cooldowns: 5
    },

    run: async ({ api, event, Currencies }) => {
        const { threadID, senderID, messageID } = event;
        const cost = 100; // phí 100$

        try {
            // lấy dữ liệu tiền người dùng
            const userData = await Currencies.getData(senderID);
            const money = userData.money || 0;

            if (money < cost) {
                return api.sendMessage(
                    `❌ Bạn không đủ tiền!\n💰 Cần 100$ để dùng lệnh này.\n💵 Số dư hiện tại: ${money}$`,
                    threadID,
                    messageID
                );
            }

            // trừ tiền
            await Currencies.decreaseMoney(senderID, cost);

            // gọi API random
            const res = await axios.get("https://api-7izq.onrender.com/randomcc?apikey=randomtnt");
            const { title, description, usage, video } = res.data;

            const stream = (await axios.get(video, { responseType: "stream" })).data;

            api.sendMessage({
                body: `🎮 Random Acc Liên Quân\n━━━━━━━━━━━━━━\n📌 Tiêu đề: ${title}\n📝 Mô tả: ${description}\n📈 Lượt dùng: ${usage}\n💸 Đã trừ 100$ phí sử dụng.`,
                attachment: stream
            }, threadID, messageID);
        } catch (error) {
            console.error(error);
            api.sendMessage("⚠️ Có lỗi khi kết nối API hoặc xử lý dữ liệu.", threadID, messageID);
        }
    }
};
