module.exports.config = {
    name: "resetmoneyuser",
    version: "2.0.0",
    hasPermssion: 2,
    credits: "manhIT mod by Trung",
    description: "Reset tiền của 1 người được tag về 0",
    commandCategory: "Kiếm Tiền",
    usages: "@tag",
    cooldowns: 5
};

module.exports.run = async ({ api, event, Currencies }) => {
    const mention = Object.keys(event.mentions);

    // nếu không tag ai thì báo lỗi
    if (mention.length === 0) {
        return api.sendMessage("⚠️ Cậu cần tag người muốn reset tiền!", event.threadID, event.messageID);
    }

    const targetID = mention[0];
    const name = event.mentions[targetID];

    // reset tiền người đó
    await Currencies.setData(targetID, { money: 0 });

    return api.sendMessage(`💰 Đã reset tiền của ${name} về 0!`, event.threadID, event.messageID);
};
