const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
    name: "listout",
    version: "1.0.0",
    hasPermssion: 1,
    credits: "Gojo",
    description: "Kiểm tra và xóa danh sách người đã rời nhóm",
    commandCategory: "QTV",
    usages: "[del]",
    cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
    const { threadID } = event;
    const leavePath = __dirname + `/data/leave/${threadID}.json`;

    if (args[0] === 'del') {
        if (!fs.existsSync(leavePath)) {
            return api.sendMessage("Không có danh sách để xóa.", threadID);
        }
        fs.unlinkSync(leavePath);
        return api.sendMessage("Đã xóa danh sách người rời nhóm thành công.", threadID);
    }

    if (!fs.existsSync(leavePath)) {
        return api.sendMessage("Chưa có ai rời khỏi nhóm.", threadID);
    }

    const leaveData = JSON.parse(fs.readFileSync(leavePath));
    
    if (leaveData.length === 0) {
        return api.sendMessage("Chưa có ai rời khỏi nhóm.", threadID);
    }

    let msg = "❎ Danh sách người đã rời nhóm:\n\n";
    leaveData.forEach((user, index) => {
        msg += `${index + 1}. ${user.name} (ID: ${user.uid})\n`;
        msg += `📅 Thời gian: ${user.time}\n`;
        msg += `🧾 Lý do: ${user.reason}\n`;
        msg += `🔗 Profile: ${user.facebook}\n\n`;
    });

    return api.sendMessage(msg, threadID);
};
