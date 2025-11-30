const path = require('path');
const fs = require('fs');
const moment = require("moment-timezone");
const thuebotDataPath = path.join(__dirname, './../commands/data', 'thuebot.json');
let data = fs.existsSync(thuebotDataPath) ? require(thuebotDataPath) : [];

module.exports.config = {
    name: "joinNoti",
    eventType: ["log:subscribe"],
    version: "1.0.5",
    credits: "Mirai Team & Modified by Satoru",
    description: "Thông báo bot hoặc người vào nhóm có random gif/ảnh/video",
    dependencies: {
        "fs-extra": "",
        "path": "",
        "pidusage": ""
    }
};

module.exports.run = async function ({ api, event, Users, Threads }) {
    const { threadID, logMessageData, author } = event;
    const { PREFIX } = global.config;
    const thread = global.data.threadData.get(threadID) || {};
    // Respect per-thread toggle from memory or DB
    try {
        const threadRecord = await Threads.getData(threadID);
        const disabled = thread.joinNoti === false || threadRecord?.data?.joinNoti === false;
        if (disabled) return;
    } catch (_) {}

    const isBotJoin = logMessageData.addedParticipants.some(i => i.userFbId == api.getCurrentUserID());

    // Nếu là bot được thêm vào nhóm
    if (isBotJoin) {
        const rentalData = data.find(r => r.t_id === threadID);
        const hsd = rentalData ? rentalData.time_end : "Chưa thuê bot";
        const prefix = thread.PREFIX || PREFIX;

        api.changeNickname(
            `[ ${prefix} ] • ${global.config.BOTNAME || "Made by LocDev"} | HSD: ${hsd}`,
            threadID,
            api.getCurrentUserID()
        );

        const mlg = `🌐 Kết Nối Thành Công!
🎊 Hãy bắt đầu dùng những lệnh dưới đây để làm quen!
─────────────────
👉 ${prefix}menu (xem danh sách toàn bộ lệnh)
👉 ${prefix}check (kiểm tra tin nhắn)
👉 ${prefix}setname để đặt biệt danh
👉 ${prefix}anti bật bảo vệ nhóm.
─────────────────
💥 dùng lệnh chậm thôi nhé.
Liên hệ facebook Admin bên dưới để được duyệt bot !`;

        return api.shareContact(mlg, 100081853790019, threadID);
    }

    // Nếu là thành viên khác được thêm vào nhóm
    try {
        const thread_data = await Threads.getData(threadID);
        const autoSet = thread_data?.data?.auto_set_nickname;

        // Tự động set biệt danh
        if (autoSet?.all) {
            const time_join = moment().tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY - HH:mm:ss");
            for (let { fullName, firstName, userFbId: id } of logMessageData.addedParticipants) {
                const nickname = autoSet.all
                    .replace(/\${full_name}/g, fullName)
                    .replace(/\${short_name}/g, firstName)
                    .replace(/\${time_join}/g, time_join);
                try {
                    await new Promise(resolve => api.changeNickname(nickname, threadID, id, () => resolve()));
                } catch (e) {
                    console.error("Error setting nickname:", e);
                }
            }
            api.sendMessage("Đã set biệt danh cho thành viên mới", threadID);
        }

        // Xử lý tin nhắn chào mừng
        const { threadName, participantIDs } = await api.getThreadInfo(threadID);
        const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss - DD/MM/YYYY");
        const hours = moment.tz("Asia/Ho_Chi_Minh").format("HH");
        const weekdayMap = {
            Sunday: 'Chủ Nhật', Monday: 'Thứ Hai', Tuesday: 'Thứ Ba',
            Wednesday: 'Thứ Tư', Thursday: 'Thứ Năm', Friday: 'Thứ Sáu', Saturday: 'Thứ Bảy'
        };
        const thu = weekdayMap[moment.tz('Asia/Ho_Chi_Minh').format('dddd')];

        const mentions = [], nameArray = [], iduser = [];
        for (let participant of logMessageData.addedParticipants) {
            const userName = participant.fullName;
            nameArray.push(userName);
            iduser.push(participant.userFbId.toString());
            mentions.push({ tag: userName, id: participant.userFbId });
        }

        const memLength = [participantIDs.length - iduser.length + 1];

        // Kiểm tra shortcut join
        const shortcutData = global.moduleData.shortcut.get(threadID) || [];
        const joinShortcut = shortcutData.find(e => e.input_type === 'join');
        let msg, attachment;

        if (joinShortcut) {
            msg = joinShortcut.output;
            if (joinShortcut.uri) {
                if (/^https:\/\//.test(joinShortcut.uri)) {
                    attachment = await global.utils.getStreamFromURL(joinShortcut.uri);
                } else if (joinShortcut.uri === 'girl' && global.girl.length) {
                    attachment = global.girl.splice(0, 1);
                } else if (joinShortcut.uri === 'boy' && global.boy.length) {
                    attachment = global.boy.splice(0, 1);
                }
            }
        } else {
            msg = thread_data.data.customJoin ?? 
                "‎🎊 Chào mừng {name} đến với {threadName}\n─────────────────\n👤 {type} là thành viên thứ {soThanhVien} của nhóm\n🎀 {type} được thêm bởi: {author} vào {time} - ( buổi {session} {thu} )";

            if (global.girl?.length) {
                attachment = global.girl.splice(0, 1);
            }
        }

        let nameAuthor = "Người dùng tự vào";
        try {
            const getData = await Users.getData(author);
            nameAuthor = getData?.name || nameAuthor;
        } catch (e) {
            console.warn("Không lấy được tên author:", e);
        }

        msg = msg
            .replace(/\{iduser}/g, iduser.join(', '))
            .replace(/\{name}/g, nameArray.join(', '))
            .replace(/\{type}/g, (iduser.length > 1) ? 'Các bạn' : 'Bạn')
            .replace(/\{soThanhVien}/g, memLength.join(', '))
            .replace(/\{author}/g, nameAuthor)
            .replace(/\{authorId}/g, author)
            .replace(/\{threadName}/g, threadName)
            .replace(/\{thu}/g, thu)
            .replace(/\{session}/g,
                hours <= 10 ? "sáng" :
                hours <= 12 ? "trưa" :
                hours <= 18 ? "chiều" : "tối"
            )
            .replace(/\{time}/g, time);

        const messageData = {
            body: msg,
            attachment,
            mentions
        };

        // Lưu lại để shortcut handler có thể dùng
        if (!global.shortcutData) global.shortcutData = {};
        if (!global.shortcutData[threadID]) global.shortcutData[threadID] = {};
        global.shortcutData[threadID].joinMessage = messageData;

       if (!joinShortcut) {
         return api.sendMessage(messageData, threadID);
        } else {
           console.log(`Shortcut join found for thread ${threadID}. Message prepared for shortcut handler.`);
        }
 


    } catch (e) {
        console.error("Error in joinNoti:", e);
    }
};
