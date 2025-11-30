const fs = global.nodemodule["fs-extra"];

module.exports.config = {
    name: "rankup",
    version: "1.0.2",
    hasPermssion: 1,
    credits: "Mirai Team",
    description: "Thông báo rankup kèm theo cảnh giới tu tiên cho từng nhóm",
    commandCategory: "QTV",
    dependencies: { "fs-extra": "" },
    cooldowns: 5,
    envConfig: {
        autoUnsend: true,
        unsendMessageAfter: 15
    }
};

module.exports.handleEvent = async function({ api, event, Currencies, Users, getText }) {
    let { threadID, senderID } = event;
    threadID = String(threadID);
    senderID = String(senderID);

    const thread = global.data.threadData.get(threadID) || {};
    let exp = (await Currencies.getData(senderID)).exp;
    exp += 1;

    if (isNaN(exp)) return;

    if (typeof thread["rankup"] !== "undefined" && thread["rankup"] === false) {
        await Currencies.setData(senderID, { exp });
        return;
    }

    const curLevel = Math.floor((Math.sqrt(1 + (4 * exp / 3) + 1) / 2));
    const level = Math.floor((Math.sqrt(1 + (4 * (exp + 1) / 3) + 1) / 2));

    if (level > curLevel && level !== 1) {
        const name = global.data.userName.get(senderID) || await Users.getNameUser(senderID);
        const { main: newMainRealm, sub: newSubRealm } = getCultivationRealm(level);

        let message = typeof thread.customRankup === "undefined" ? getText("levelup") : thread.customRankup;

        message = message
            .replace(/\{name}/g, name)
            .replace(/\{level}/g, level)
            .replace(/\{mainRealm}/g, newMainRealm)
            .replace(/\{subRealm}/g, newSubRealm);

        const arrayContent = {
            body: message,
            mentions: [{ tag: name, id: senderID }]
        };

        // Nếu muốn gửi tin nhắn rankup tự động thì bỏ comment đoạn dưới
        /*
        const moduleName = this.config.name;
        api.sendMessage(arrayContent, threadID, async function (error, info) {
            if (global.configModule[moduleName].autoUnsend) {
                await new Promise(resolve => setTimeout(resolve, global.configModule[moduleName].unsendMessageAfter * 1000));
                return api.unsendMessage(info.messageID);
            }
        });
        */
    }

    await Currencies.setData(senderID, { exp });
    return;
};

function getCultivationRealm(level) {
    const realms = [
        { name: "Luyện Khí", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Trúc Cơ", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Khai Quang", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Kim Đan", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Nguyên Anh", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Hóa Thần", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Phản Hư", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Luyện Hư", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Hợp Thể", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Đại Thừa", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Độ Kiếp", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Thiên Tiên", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Chân Tiên", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Kim Tiên", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Thánh Nhân", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Đại Thánh", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Tiên Đế", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Tiên Tôn", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Hỗn Độn", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Vô Cực", levels: 1, subRealms: ["Viên Mãn"] }
    ];

    let currentLevel = 0;
    for (let realm of realms) {
        if (level > currentLevel && level <= currentLevel + realm.levels) {
            const subIndex = Math.floor((level - currentLevel - 1) / (realm.levels / realm.subRealms.length));
            return {
                main: realm.name,
                sub: realm.subRealms[subIndex]
            };
        }
        currentLevel += realm.levels;
    }

    return {
        main: "Vô Cực",
        sub: "Viên Mãn"
    };
}

module.exports.languages = {
    "vi": {
        "on": "bật",
        "off": "tắt",
        "successText": "thành công thông báo rankup!",
        "levelup": "Chúc mừng {name}! Bạn đã đạt đến cảnh giới {mainRealm} {subRealm} với level {level}"
    },
    "en": {
        "on": "on",
        "off": "off",
        "successText": "success notification rankup!",
        "levelup": "Congratulations {name}! You have reached the {mainRealm} realm, {subRealm} stage at level {level}"
    }
};

module.exports.run = async function({ api, event, Threads, getText }) {
    const { threadID, messageID } = event;
    let data = (await Threads.getData(threadID)).data;

    data["rankup"] = !(data["rankup"] ?? false);
    
    await Threads.setData(threadID, { data });
    global.data.threadData.set(threadID, data);

    return api.sendMessage(
        `${data["rankup"] ? getText("on") : getText("off")} ${getText("successText")}`,
        threadID,
        messageID
    );
};
