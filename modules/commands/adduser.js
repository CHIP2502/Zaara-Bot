module.exports.config = {
    name: "adduser",
    version: "1.0.0",
    hasPermssion: 1,
    credits: "D-Jukie",
    description: "Thêm người dùng vào nhóm bằng link hoặc uid",
    commandCategory: "QTV",
    usages: "[args]",
    cooldowns: 5
};

module.exports.languages = {
    vi: {
        missing: "Vui lòng nhập link hoặc id người dùng muốn thêm vào nhóm!",
        exists: "Thành viên đã có mặt trong nhóm",
        cannotAdd: "Không thể thêm thành viên vào nhóm",
        addedToApproval: "Đã thêm người dùng vào danh sách phê duyệt",
        success: "Thêm thành viên vào nhóm thành công"
    },
    en: {
        missing: "Please provide a profile link or UID to add!",
        exists: "Member already in the group",
        cannotAdd: "Cannot add member to the group",
        addedToApproval: "Added user to approval list",
        success: "Successfully added member to the group"
    }
};
module.exports.run = async function ({ api, event, args, Threads, Users, getText }) {
const { threadID, messageID } = event;
const axios = require('axios')
const link = args.join(" ")
if(!args[0]) return api.sendMessage(getText('missing'), threadID, messageID);
var { participantIDs, approvalMode, adminIDs } = await api.getThreadInfo(threadID);
if(link.indexOf(".com/")!==-1) {
    const res = await api.getUID(args[0] || event.messageReply.body);
    var uidUser = res
    api.addUserToGroup(uidUser, threadID, (err) => {
    if (participantIDs.includes(uidUser)) return api.sendMessage(getText('exists'), threadID, messageID);
    if (err) return api.sendMessage(getText('cannotAdd'), threadID, messageID);
    else if (approvalMode && !adminIDs.some(item => item.id == api.getCurrentUserID())) return api.sendMessage(getText('addedToApproval'), threadID, messageID);
    else return api.sendMessage(getText('success'), threadID, messageID);
    });
    }
  else { 
    var uidUser = args[0] 
    api.addUserToGroup(uidUser, threadID, (err) => {
    if (participantIDs.includes(uidUser)) return api.sendMessage(getText('exists'), threadID, messageID);
    if (err) return api.sendMessage(getText('cannotAdd'), threadID, messageID);
    else if (approvalMode && !adminIDs.some(item => item.id == api.getCurrentUserID())) return api.sendMessage(getText('addedToApproval'), threadID, messageID);
    else return api.sendMessage(getText('success'), threadID, messageID);
    });
  }
}