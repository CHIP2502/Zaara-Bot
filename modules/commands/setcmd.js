module.exports.config = {
    name: "setcmd",
    version: "1.0.0",
    hasPermssion: 3,
    credits: "Satoru",
    description: "Thiết lập tên lệnh tùy chỉnh cho nhóm",
    commandCategory: "Admin",
    usages: "[add/remove/list] [tên lệnh gốc] [tên lệnh mới]",
    cooldowns: 5
};

const fs = require("fs");
const path = require("path");

const customCommandsFile = path.join(__dirname, "./data/custom_commands.json");

function loadCustomCommands() {
    if (fs.existsSync(customCommandsFile)) {
        return JSON.parse(fs.readFileSync(customCommandsFile, "utf8"));
    }
    return {};
}

function saveCustomCommands(data) {
    fs.writeFileSync(customCommandsFile, JSON.stringify(data, null, 2));
}

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID } = event;
    const customCommands = loadCustomCommands();

    if (!customCommands[threadID]) {
        customCommands[threadID] = {};
    }

    switch (args[0]) {
        case "add":
            if (args.length !== 3) return api.sendMessage("Sử dụng: setcmd add [tên lệnh gốc] [tên lệnh mới]", threadID, messageID);
            customCommands[threadID][args[2]] = args[1];
            saveCustomCommands(customCommands);
            return api.sendMessage(`Đã thêm lệnh tùy chỉnh: "${args[2]}" sẽ thực thi lệnh "${args[1]}"`, threadID, messageID);

        case "remove":
            if (args.length !== 2) return api.sendMessage("Sử dụng: setcmd remove [tên lệnh tùy chỉnh]", threadID, messageID);
            if (customCommands[threadID][args[1]]) {
                delete customCommands[threadID][args[1]];
                saveCustomCommands(customCommands);
                return api.sendMessage(`Đã xóa lệnh tùy chỉnh "${args[1]}"`, threadID, messageID);
            }
            return api.sendMessage(`Không tìm thấy lệnh tùy chỉnh "${args[1]}"`, threadID, messageID);

        case "list":
            const cmdList = Object.entries(customCommands[threadID])
                .map(([custom, original]) => `${custom} => ${original}`)
                .join('\n');
            return api.sendMessage(cmdList ? `Danh sách lệnh tùy chỉnh:\n${cmdList}` : "Không có lệnh tùy chỉnh nào cho nhóm này.", threadID, messageID);

        default:
            return api.sendMessage("Sử dụng: setcmd [add/remove/list] [tên lệnh gốc] [tên lệnh mới]", threadID, messageID);
    }
};