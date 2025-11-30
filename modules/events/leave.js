const { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } = global.nodemodule["fs-extra"];
const { join } = global.nodemodule["path"];
const moment = require("moment-timezone");

module.exports.config = {
    name: "leave",
    eventType: ["log:unsubscribe"],
    version: "1.0.4",
    credits: "HĐGN & Modified by Satoru",
    description: "Thông báo Bot hoặc người dùng rời khỏi nhóm có random gif/ảnh/video",
    dependencies: {
        "fs-extra": "",
        "path": ""
    }
};

const checkttPath = __dirname + '/../commands/_checktt/';
const leavePath = __dirname + '/../commands/data/leave';

module.exports.onLoad = function () {
    const cachePath = join(__dirname, "cache", "leaveGif");
    if (!existsSync(cachePath)) mkdirSync(cachePath, { recursive: true });
    if (!existsSync(leavePath)) mkdirSync(leavePath, { recursive: true });
};

module.exports.run = async function ({ api, event, Users, Threads }) {
    const { threadID, logMessageData, author } = event;
    const leftUID = logMessageData.leftParticipantFbId;

    // Respect per-thread toggle from memory or DB
    try {
        const threadRecord = await Threads.getData(threadID);
        const disabled = threadRecord?.data?.leaveNoti === false;
        if (disabled) return;
    } catch (_) {}

    // Nếu bot rời nhóm thì xóa dữ liệu tương tác
    if (leftUID == api.getCurrentUserID()) {
        const interactionPath = checkttPath + threadID + '.json';
        if (existsSync(interactionPath)) unlinkSync(interactionPath);
        console.log(`Đã xóa dữ liệu tương tác của nhóm: ${threadID} do bot rời khỏi nhóm`, "[ UPDATE DATA ]");
        return;
    }

    // Lấy thông tin thời gian
    const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss - DD/MM/YYYY");
    const weekdayMap = {
        Sunday: 'Chủ Nhật', Monday: 'Thứ Hai', Tuesday: 'Thứ Ba',
        Wednesday: 'Thứ Tư', Thursday: 'Thứ Năm', Friday: 'Thứ Sáu', Saturday: 'Thứ Bảy'
    };
    const thu = weekdayMap[moment.tz('Asia/Ho_Chi_Minh').format('dddd')];

    // Lấy dữ liệu nhóm và người rời
    const threadData = global.data.threadData.get(parseInt(threadID)) || (await Threads.getData(threadID)).data;
    const name = global.data.userName.get(leftUID) || await Users.getNameUser(leftUID);
    const type = (author == leftUID) ? "Đã tự động rời khỏi nhóm." : "Đã bị Quản trị viên xóa khỏi nhóm.";

    // Shortcut leave
    const shortcutData = global.moduleData.shortcut.get(threadID) || [];
    const leaveShortcut = shortcutData.find(e => e.input_type === 'leave');

    let msg, attachment;

    if (leaveShortcut) {
        msg = leaveShortcut.output;
        if (leaveShortcut.uri) {
            if (/^https:\/\//.test(leaveShortcut.uri)) {
                attachment = await global.utils.getStreamFromURL(leaveShortcut.uri);
            } else if (leaveShortcut.uri === 'girl' && global.girl.length) {
                attachment = global.girl.splice(0, 1);
            } else if (leaveShortcut.uri === 'boy' && global.boy.length) {
                attachment = global.boy.splice(0, 1);
            }
        }
    } else {
        msg = threadData.customLeave
            ? threadData.customLeave
            : `[ Thành Viên Thoát Nhóm ]\n─────────────────\n👤 Thành viên: {name}\n📌 Lý do: {type}\n📝 Profile: {link}\n📆 Thoát nhóm vào {thu}\n⏰ Thời gian: {time}`;
        try {
            if (global.anime?.length) attachment = global.anime.splice(0, 1);
        } catch (e) {
            console.error("Error getting default attachment:", e);
        }
    }

    msg = msg
        .replace(/\{name}/g, name)
        .replace(/\{type}/g, type)
        .replace(/\{link}/g, `https://www.facebook.com/profile.php?id=${leftUID}`)
        .replace(/\{thu}/g, thu)
        .replace(/\{time}/g, time);

    // Ghi log người rời nhóm
    const leaveLogPath = join(leavePath, `${threadID}.json`);
    let leaveLog = [];

    if (existsSync(leaveLogPath)) {
        leaveLog = JSON.parse(readFileSync(leaveLogPath));
    }

    const leaveInfo = {
        name: name,
        uid: leftUID,
        time: time,
        reason: type,
        facebook: `https://www.facebook.com/${leftUID}`
    };

    const existingIndex = leaveLog.findIndex(user => user.uid === leftUID);
    if (existingIndex === -1) {
        leaveLog.push(leaveInfo);
    } else {
        leaveLog[existingIndex] = leaveInfo;
    }

    writeFileSync(leaveLogPath, JSON.stringify(leaveLog, null, 2));

    // Cập nhật file tương tác (checktt)
    const checkttFilePath = checkttPath + threadID + '.json';
    if (existsSync(checkttFilePath)) {
        const threadStats = JSON.parse(readFileSync(checkttFilePath));
        const uidStr = String(leftUID);

        ['total', 'week', 'day'].forEach(key => {
            const index = threadStats[key].findIndex(e => e.id == uidStr);
            if (index !== -1) threadStats[key].splice(index, 1);
        });

        writeFileSync(checkttFilePath, JSON.stringify(threadStats, null, 4));
    }

    // Gửi tin nhắn hoặc lưu để shortcut xử lý
    const messageData = {
        body: msg,
        attachment
    };

    if (!global.shortcutData) global.shortcutData = {};
    if (!global.shortcutData[threadID]) global.shortcutData[threadID] = {};
    global.shortcutData[threadID].leaveMessage = messageData;

    if (!leaveShortcut) {
        return api.sendMessage(messageData, threadID);
    } else {
        console.log(`Shortcut leave found for thread ${threadID}. Message prepared for shortcut handler.`);
    }
};
