const fs = require('fs-extra');
const path = require('path');

module.exports.config = {
    name: "setname",
    version: "5.0.0",
    hasPermssion: 0,
    Rent: 1,
    credits: "Vtuan | Cthinh | Satoru",
    description: "Đổi biệt danh trong nhóm của bạn hoặc của người bạn tag",
    commandCategory: "Box",
    usages: "[trống/reply/tag/all] + [name]",
    cooldowns: 0,
    dependencies: {
        "fs-extra": ""
    }
};

/*module.exports.events = async function({ api, event }) {
    const { threadID, logMessageType, logMessageData } = event;
    const fs = require("fs-extra");
    const path = require("path");

    if (logMessageType !== 'log:subscribe' || !logMessageData?.addedParticipants) return;

    try {
        const filePath = path.join(__dirname, 'data', 'setname.json');
        if (!fs.existsSync(filePath)) return;

        const jsonData = fs.readJsonSync(filePath);
        const groupData = jsonData.find(data => data.id_Nhóm === threadID);
        if (!groupData || !groupData.kí_tự) return;

        const currentDate = new Date();
        const day = currentDate.getDate().toString().padStart(2, '0');
        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');

        for (const participant of logMessageData.addedParticipants) {
            const userID = participant.userFbId;
            if (userID === api.getCurrentUserID()) continue;

            try {
                const userName = await global.data.userName.get(userID) || participant.fullName;
                if (!userName) continue;
                const shortName = userName.split(' ').pop();
                const newNickname = `${groupData.kí_tự} ${shortName} ${day}/${month}`;
                await new Promise(resolve => setTimeout(resolve, 1000));
                await api.changeNickname(newNickname, threadID, userID);
            } catch (e) {
                console.error(`[AUTOSETNAME] Lỗi khi đặt biệt danh cho ${userID}:`, e);
            }
        }
    } catch (error) {
        console.error('[AUTOSETNAME] Lỗi:', error);
    }
};
*/
module.exports.run = async function({ api, event, args, Users }) {
    const { threadID, messageID, messageReply, senderID, mentions } = event;
    const mention = Object.keys(event.mentions)[0];
    
    const filePath = path.join(__dirname, 'data', 'setname.json');
    if (!fs.existsSync(filePath)) {
        fs.writeJsonSync(filePath, []);
        api.sendMessage('⚡️ Đã tạo dữ liệu. vui lòng sử dụng lại lệnh!', threadID, messageID);
        return;
    }

    const jsonData = fs.readJsonSync(filePath);
    const existingData = jsonData.find(data => data.id_Nhóm === threadID);

    if (args[0]?.toLowerCase() === 'add') {
        if (args.length < 2) {
            api.sendMessage('⚠️ Vui lòng nhập kí tự.', threadID, messageID);
            return;
        }
        const newData = { id_Nhóm: threadID, kí_tự: args.slice(1).join(' ') || '' };
        if (existingData) existingData.kí_tự = newData.kí_tự;
        else jsonData.push(newData);
        fs.writeJsonSync(filePath, jsonData);
        api.sendMessage(`✅ Đã cập nhật kí tự setname. `, threadID, messageID);
        return;
    }

    if (args[0]?.toLowerCase() === 'help') {
        api.sendMessage(
            "📝 Cách sử dụng:\n\n" +
            "⚡️ Thêm kí tự setname:\n → setname add [kí_tự]\n" +
            "👤 Đổi biệt danh cá nhân:\n → setname + [tên]\n" +
            "📋 Xem người chưa có biệt danh:\n → setname check\n" +
            "🔍 Tag người chưa có biệt danh:\n → setname call\n" +
            "⚠️ Xóa người chưa có biệt danh (QTV):\n → setname del\n" +
            "👥 Đặt biệt danh cho tất cả:\n → setname all\n" +
            "🔄 Tự động thêm kí tự cho người chưa có:\n → setname auto\n\n" +
            "📌 LƯU Ý: Bot sẽ tự động đặt biệt danh cho thành viên mới nếu nhóm đã thêm kí tự setname với format:\n → kí_tự + tên + ngày_vào",
            threadID, messageID
        );
        return;
    }

    if (args[0]?.toLowerCase() === 'check') {
        try {
            let threadInfo = await api.getThreadInfo(threadID);
            let { nicknames } = threadInfo;
            const botID = api.getCurrentUserID();
            let noNickname = threadInfo.participantIDs.filter(id => !nicknames[id] && id !== botID);

            if (noNickname.length === 0) {
                api.sendMessage('✅ Tất cả thành viên đã có biệt danh.', threadID, messageID);
                return;
            }

            let msg = '😌 Danh sách người chưa có biệt danh:\n\n';
            for (let i = 0; i < noNickname.length; i++) {
                const name = await Users.getNameUser(noNickname[i]);
                msg += `${i + 1}. ${name}\n`;
            }
            api.sendMessage(msg, threadID, messageID);
        } catch (error) {
            api.sendMessage('❌ Đã xảy ra lỗi khi kiểm tra biệt danh.', threadID, messageID);
        }
        return;
    }

    if (args[0]?.toLowerCase() === 'call') {
        try {
            let threadInfo = await api.getThreadInfo(threadID);
            let { nicknames } = threadInfo;
            const botID = api.getCurrentUserID();
            let noNickname = threadInfo.participantIDs.filter(id => !nicknames[id] && id !== botID);

            if (noNickname.length === 0) {
                api.sendMessage('✅ Tất cả thành viên đã có biệt danh.', threadID, messageID);
                return;
            }

            let mentions = [];
            for (let id of noNickname) {
                const name = await Users.getNameUser(id);
                mentions.push({
                    tag: `@${name}`,
                    id: id
                });
            }

            api.sendMessage({ 
                body: 'dậy đặt biệt danh đi :<', 
                mentions 
            }, threadID, messageID);
        } catch (error) {
            api.sendMessage('❌ Đã xảy ra lỗi khi tag thành viên.', threadID, messageID);
        }
        return;
    }

    if (args[0]?.toLowerCase() === 'del') {
        try {
            const threadInfo = await api.getThreadInfo(threadID);
            const isAdmin = threadInfo.adminIDs.some(item => item.id == senderID);
            
            if (!isAdmin) {
                api.sendMessage('⚠️ Bạn không có quyền xóa thành viên.', threadID, messageID);
                return;
            }

            let { nicknames } = threadInfo;
            const botID = api.getCurrentUserID();
            let noNickname = threadInfo.participantIDs.filter(id => !nicknames[id] && id !== botID);

            if (noNickname.length === 0) {
                api.sendMessage('✅ Tất cả thành viên đã có biệt danh.', threadID, messageID);
                return;
            }

            for (let userID of noNickname) {
                await api.removeUserFromGroup(userID, threadID);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            api.sendMessage('✅ Đã xóa những người chưa có biệt danh.', threadID, messageID);
        } catch (error) {
            api.sendMessage('❌ Đã xảy ra lỗi khi xóa thành viên.', threadID, messageID);
        }
        return;
    }

    if (args[0]?.toLowerCase() === 'all') {
        try {
            const threadInfo = await api.getThreadInfo(threadID);
            const botID = api.getCurrentUserID();
            const nameToChange = args.slice(1).join(" ");

            for (let participantID of threadInfo.participantIDs) {
                if (participantID === botID) continue;

                let newName = nameToChange;
                if (existingData) {
                    const userName = await Users.getNameUser(participantID);
                    newName = `${existingData.kí_tự} ${userName}`;
                }

                await api.changeNickname(newName, threadID, participantID);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            api.sendMessage('✅ Đã thay đổi biệt danh cho tất cả thành viên.', threadID, messageID);
        } catch (error) {
            api.sendMessage('❌ Đã xảy ra lỗi khi đổi biệt danh hàng loạt.', threadID, messageID);
        }
        return;
    }

    if (args[0]?.toLowerCase() === 'auto') {
        try {
            if (!existingData || !existingData.kí_tự) {
                api.sendMessage('⚠️ Vui lòng cài đặt kí tự prefix trước: setname add [kí tự]', threadID, messageID);
                return;
            }

            const threadInfo = await api.getThreadInfo(threadID);
            const botID = api.getCurrentUserID();
            let updated = 0;
            let skipped = 0;
            
            for (let member of threadInfo.participantIDs) {
                if (member === botID) {
                    skipped++;
                    continue;
                }

                const currentNickname = threadInfo.nicknames[member] || "";
                
                if (!currentNickname.startsWith(existingData.kí_tự)) {
                    try {
                        const newNickname = currentNickname 
                            ? `${existingData.kí_tự} ${currentNickname}`
                            : `${existingData.kí_tự} ${await Users.getNameUser(member)}`;
                            
                        await api.changeNickname(newNickname, threadID, member);
                        updated++;
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } catch (e) {
                        console.error(`Lỗi khi đổi biệt danh cho ${member}:`, e);
                        skipped++;
                    }
                } else {
                    skipped++;
                }
            }

            api.sendMessage(
                `✅ Đã xử lý xong:\n` +
                `→ Số người được cập nhật: ${updated}\n` +
                `→ Số người được bỏ qua: ${skipped}\n` +
                `→ Kí tự prefix: ${existingData.kí_tự}`,
                threadID, messageID
            );
        } catch (error) {
            api.sendMessage('❌ Đã xảy ra lỗi khi tự động cập nhật biệt danh.', threadID, messageID);
        }
        return;
    }

    try {
        if (existingData) {
            const userName = await Users.getNameUser(senderID);
            const names = args.length > 0 ? args.join(' ') : userName;
            
            if (mention) {
                const newName = `${existingData.kí_tự} ${names.replace(mentions[mention], '')}`;
                await api.changeNickname(newName, threadID, mention);
            } else {
                const targetID = messageReply ? messageReply.senderID : senderID;
                const newName = `${existingData.kí_tự} ${names}`;
                await api.changeNickname(newName, threadID, targetID);
            }
            
            api.sendMessage(`✅ ${!args[0] ? 'Gỡ' : 'Thay đổi'} biệt danh thành công!\n💡 Dùng "setname help" để xem hướng dẫn.`, threadID, messageID);
        } else {
            if (mention) {
                const name = args.join(' ');
                await api.changeNickname(name.replace(mentions[mention], ''), threadID, mention);
            } else {
                const targetID = messageReply ? messageReply.senderID : senderID;
                await api.changeNickname(args.join(' '), threadID, targetID);
            }
            
            api.sendMessage(`✅ ${!args[0] ? 'Gỡ' : 'Thay đổi'} biệt danh thành công!\n💡 Dùng "setname help" để xem hướng dẫn.`, threadID, messageID);
        }
    } catch (error) {
        api.sendMessage('⚠️ Hiện tại nhóm đang bật liên kết mời nên không thể đổi biệt danh.\n💡 Hãy tắt liên kết mời để sử dụng lệnh này!', threadID, messageID);
    }
};