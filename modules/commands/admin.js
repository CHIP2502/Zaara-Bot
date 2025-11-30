const { readdirSync, readFileSync, writeFileSync, existsSync } = require("fs-extra");
const { resolve } = require("path");

module.exports.config = {
    name: "admin",
    version: "1.0.6",
    hasPermssion: 1,
    credits: "Mirai Team - Modified by Satoru",
    description: "Quản lý và cấu hình ADMIN BOT",
    commandCategory: "Hệ thống",
    usages: "< add/remove | Super Admin & Admin > | < list/only/ibrieng >",
    cooldowns: 2,
    dependencies: {
        "fs-extra": ""
    }
};

module.exports.languages = {
    "vi": {
        "listAdmin": `=== [ DANH SÁCH ADMIN & NGƯỜI HỖ TRỢ ] ===\n━━━━━━━━━━━━━━━━━━\n=== [ ADMIN BOT ] ===\n%1\n\n=== [ NGƯỜI HỖ TRỢ ] ===\n%2\n\nReply số thứ tự để xóa đối tượng tương ứng.`,
        "notHavePermssion": '[ ADMIN ] → Bạn không đủ quyền hạn để có thể sử dụng chức năng "%1"',
        "addedSuccess": '[ ADMIN ] → Đã thêm %1 người dùng trở thành %2:\n\n%3',
        "removedSuccess": '[ ADMIN ] → Đã gỡ vai trò %1 của %2 người dùng:\n\n%3',
        "removedByIndex": '[ ADMIN ] → Đã gỡ thành công %1:\n%2',
        "invalidIndex": '[ ADMIN ] → Số thứ tự không hợp lệ!'
    }
};

module.exports.onLoad = function() {
    const pathData = resolve(__dirname, 'data', 'dataAdbox.json');
    if (!existsSync(pathData)) {
        const obj = {
            adminOnly: {},
            privateChat: {}
        };
        writeFileSync(pathData, JSON.stringify(obj, null, 4));
    }
};

module.exports.handleReply = async function({ api, event, handleReply, getText, Users }) {
    if (event.senderID != handleReply.author) return;
    const { threadID, messageID, body } = event;
    const { configPath } = global.client;

    delete require.cache[require.resolve(configPath)];
    const config = require(configPath);

    const index = parseInt(body);
    if (isNaN(index)) return api.sendMessage(getText("invalidIndex"), threadID, messageID);

    let targetArray, targetIndex, roleText;
    const adminLength = config.ADMINBOT.length;

    if (index <= adminLength) {
        targetArray = config.ADMINBOT;
        targetIndex = index - 1;
        roleText = "ADMIN BOT";
    } else {
        targetArray = config.NDH;
        targetIndex = index - adminLength - 1;
        roleText = "NGƯỜI HỖ TRỢ";
    }

    if (targetIndex < 0 || targetIndex >= targetArray.length) {
        return api.sendMessage(getText("invalidIndex"), threadID, messageID);
    }

    const removedUID = targetArray[targetIndex];
    const name = await Users.getNameUser(removedUID);

    targetArray.splice(targetIndex, 1);
    writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
    global.config = config;

    return api.sendMessage(
        getText("removedByIndex", roleText, `${removedUID} - ${name}`),
        threadID,
        messageID
    );
};

module.exports.run = async function({ api, event, args, Users, permssion, getText }) {
    const { threadID, messageID, mentions, senderID } = event;
    const { configPath } = global.client;

    delete require.cache[require.resolve(configPath)];
    const config = require(configPath);
    global.config = config;

    const mention = Object.keys(mentions);

    if (!args[0]) {
        return api.sendMessage(
            `=== [ ADMIN PANEL ] ===\n━━━━━━━━━━━━━━━━━━\n\n` +
            `→ admin list: Xem danh sách quản lý\n` +
            `→ admin add: Thêm quản trị viên\n` +
            `→ admin remove: Gỡ quản trị viên\n` +
            `→ admin addndh: Thêm người hỗ trợ\n` +
            `→ admin removendh: Gỡ người hỗ trợ\n` +
            `→ admin ibrieng: Bật/tắt chat riêng\n` +
            `→ admin update: Bật/tắt chế độ bảo trì server\n\n` +
            `━━━━━━━━━━━━━━━━━━`,
            threadID, messageID
        );
    }

    const getUids = async () => {
        let uids = [];
        if (event.type === "message_reply") {
            uids.push(event.messageReply.senderID);
        } else if (mention.length > 0) {
            uids = mention;
        } else if (args[1] && !isNaN(args[1])) {
            uids.push(args[1]);
        }
        return uids;
    };

    const addUsers = async (uids, type) => {
        const added = [];
        for (const uid of uids) {
            const name = global.data.userName.get(uid) || await Users.getNameUser(uid);
            if (type === "ADMIN" && !config.ADMINBOT.includes(uid)) {
                config.ADMINBOT.push(uid);
                added.push(`${uid} - ${name}`);
            } else if (type === "NDH" && !config.NDH.includes(uid)) {
                config.NDH.push(uid);
                added.push(`${uid} - ${name}`);
            }
        }
        return added;
    };

    const removeUsers = async (uids, type) => {
        const removed = [];
        for (const uid of uids) {
            const name = global.data.userName.get(uid) || await Users.getNameUser(uid);
            if (type === "ADMIN") {
                const index = config.ADMINBOT.indexOf(uid);
                if (index !== -1) {
                    config.ADMINBOT.splice(index, 1);
                    removed.push(`${uid} - ${name}`);
                }
            } else if (type === "NDH") {
                const index = config.NDH.indexOf(uid);
                if (index !== -1) {
                    config.NDH.splice(index, 1);
                    removed.push(`${uid} - ${name}`);
                }
            }
        }
        return removed;
    };

    const pathData = resolve(__dirname, 'data', 'dataAdbox.json');
    const database = JSON.parse(readFileSync(pathData, 'utf8'));

    switch (args[0]) {
        case "list": {
            if (permssion < 2) return api.sendMessage(getText("notHavePermssion", "list"), threadID, messageID);

            let adminList = [], ndhList = [];
            let count = 1;

            for (const id of config.ADMINBOT) {
                const name = global.data.userName.get(id) || await Users.getNameUser(id);
                adminList.push(`${count++}. ${name}\n→ ID: ${id}`);
            }

            for (const id of config.NDH) {
                const name = global.data.userName.get(id) || await Users.getNameUser(id);
                ndhList.push(`${count++}. ${name}\n→ ID: ${id}`);
            }

            return api.sendMessage(
                getText("listAdmin", adminList.join("\n\n"), ndhList.join("\n\n")),
                threadID,
                (error, info) => {
                    global.client.handleReply.push({
                        name: this.config.name,
                        messageID: info.messageID,
                        author: senderID
                    });
                },
                messageID
            );
        }

        case "add": {
            if (permssion !== 3) return api.sendMessage(getText("notHavePermssion", "add"), threadID, messageID);
            const uids = await getUids();
            const added = await addUsers(uids, "ADMIN");
            if (added.length > 0) {
                writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
                global.config = config;
                return api.sendMessage(getText("addedSuccess", added.length, "ADMIN BOT", added.join("\n")), threadID, messageID);
            }
            break;
        }

        case "addndh": {
            if (permssion !== 3) return api.sendMessage(getText("notHavePermssion", "addndh"), threadID, messageID);
            const uids = await getUids();
            const added = await addUsers(uids, "NDH");
            if (added.length > 0) {
                writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
                global.config = config;
                return api.sendMessage(getText("addedSuccess", added.length, "NGƯỜI HỖ TRỢ", added.join("\n")), threadID, messageID);
            }
            break;
        }

        case "remove": {
            if (permssion !== 3) return api.sendMessage(getText("notHavePermssion", "remove"), threadID, messageID);
            const uids = await getUids();
            const removed = await removeUsers(uids, "ADMIN");
            if (removed.length > 0) {
                writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
                global.config = config;
                return api.sendMessage(getText("removedSuccess", "ADMIN BOT", removed.length, removed.join("\n")), threadID, messageID);
            }
            break;
        }

        case "removendh": {
            if (permssion !== 3) return api.sendMessage(getText("notHavePermssion", "removendh"), threadID, messageID);
            const uids = await getUids();
            const removed = await removeUsers(uids, "NDH");
            if (removed.length > 0) {
                writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
                global.config = config;
                return api.sendMessage(getText("removedSuccess", "NGƯỜI HỖ TRỢ", removed.length, removed.join("\n")), threadID, messageID);
            }
            break;
        }

        case "ibrieng": {
            if (permssion !== 3) return api.sendMessage("[ ADMIN ] → Cần quyền ADMIN để thực hiện", threadID, messageID);
            database.privateChat[threadID] = !(database.privateChat[threadID] === true);
            writeFileSync(pathData, JSON.stringify(database, null, 4));
            return api.sendMessage(`[ ADMIN ] → ${database.privateChat[threadID] ? "Bật" : "Tắt"} chế độ chat riêng thành công`, threadID, messageID);
        }

        case "update": {
            if (permssion !== 3) return api.sendMessage("[ ADMIN ] → Cần quyền ADMIN để thực hiện", threadID, messageID);
            
            const maintenancePath = resolve(__dirname, 'data', 'maintenance.json');
            let maintenance = { status: false, reason: "", startTime: "", adminID: "" };
            
            if (existsSync(maintenancePath)) {
                maintenance = JSON.parse(readFileSync(maintenancePath, 'utf8'));
            }

            const subCommand = args[1]?.toLowerCase();
            const reason = args.slice(2).join(" ") || "Server đang được bảo trì và cập nhật";

            if (!subCommand) {
                return api.sendMessage(
                    `=== [ ADMIN UPDATE PANEL ] ===\n━━━━━━━━━━━━━━━━━━\n\n` +
                    `→ admin update on [lý do]: Bật chế độ bảo trì server\n` +
                    `→ admin update off: Tắt chế độ bảo trì server\n` +
                    `→ admin update status: Xem trạng thái bảo trì\n\n` +
                    `━━━━━━━━━━━━━━━━━━\n` +
                    `Trạng thái hiện tại: ${maintenance.status ? "🔴 ĐANG BẢO TRÌ SERVER" : "🟢 HOẠT ĐỘNG BÌNH THƯỜNG"}\n` +
                    `${maintenance.status ? `Lý do: ${maintenance.reason}\nThời gian bắt đầu: ${maintenance.startTime}` : ""}`,
                    threadID, messageID
                );
            }

            switch (subCommand) {
                case "on": {
                    if (maintenance.status) {
                        return api.sendMessage("[ ADMIN UPDATE ] → Server đã đang trong chế độ bảo trì!", threadID, messageID);
                    }

                    const adminName = await Users.getNameUser(senderID);
                    const startTime = new Date().toLocaleString("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                    });

                    maintenance.status = true;
                    maintenance.reason = reason;
                    maintenance.startTime = startTime;
                    maintenance.adminID = senderID;

                    writeFileSync(maintenancePath, JSON.stringify(maintenance, null, 4));
                    global.maintenanceMode = true;

                    return api.sendMessage(
                        `[ ADMIN UPDATE ] → ✅ Đã bật chế độ bảo trì server!\n\n` +
                        `📝 Lý do: ${reason}\n` +
                        `⏰ Thời gian bắt đầu: ${startTime}\n` +
                        `👤 Admin: ${adminName}\n\n` +
                        `🔔 Tất cả người dùng sẽ nhận thông báo bảo trì khi sử dụng bot.`,
                        threadID, messageID
                    );
                }

                case "off": {
                    if (!maintenance.status) {
                        return api.sendMessage("[ ADMIN UPDATE ] → Server không đang trong chế độ bảo trì!", threadID, messageID);
                    }

                    const adminName = await Users.getNameUser(senderID);
                    const endTime = new Date().toLocaleString("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                    });

                    maintenance.status = false;
                    maintenance.reason = "";
                    maintenance.startTime = "";
                    maintenance.adminID = "";

                    writeFileSync(maintenancePath, JSON.stringify(maintenance, null, 4));
                    global.maintenanceMode = false;

                    return api.sendMessage(
                        `[ ADMIN UPDATE ] → ✅ Đã tắt chế độ bảo trì server!\n\n` +
                        `⏰ Thời gian kết thúc: ${endTime}\n` +
                        `👤 Admin: ${adminName}\n\n` +
                        `🔔 Server đã hoạt động bình thường trở lại.`,
                        threadID, messageID
                    );
                }

                case "status": {
                    const statusText = maintenance.status ? "🔴 ĐANG BẢO TRÌ SERVER" : "🟢 HOẠT ĐỘNG BÌNH THƯỜNG";
                    const adminName = maintenance.adminID ? await Users.getNameUser(maintenance.adminID) : "Không có";

                    return api.sendMessage(
                        `=== [ TRẠNG THÁI BẢO TRÌ SERVER ] ===\n━━━━━━━━━━━━━━━━━━\n\n` +
                        `📊 Trạng thái: ${statusText}\n` +
                        `${maintenance.status ? `📝 Lý do: ${maintenance.reason}\n` : ""}` +
                        `${maintenance.status ? `⏰ Thời gian bắt đầu: ${maintenance.startTime}\n` : ""}` +
                        `${maintenance.status ? `👤 Admin bật: ${adminName}\n` : ""}` +
                        `\n━━━━━━━━━━━━━━━━━━`,
                        threadID, messageID
                    );
                }

                default: {
                    return api.sendMessage("[ ADMIN UPDATE ] → Lệnh không hợp lệ! Gõ 'admin update' để xem hướng dẫn", threadID, messageID);
                }
            }
        }

        default: {
            return api.sendMessage("[ ADMIN ] → Lệnh không hợp lệ! Gõ 'admin' để xem hướng dẫn", threadID, messageID);
        }
    }
};