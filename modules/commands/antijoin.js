module.exports.config = {
 name: "antijoin",
 version: "1.0.0",
 credits: "D-Jukie",
 hasPermssion: 1,
 description: "Cấm thành viên mới vào nhóm",
 usages: "",
 commandCategory: "QTV",
 cooldowns: 0
};

module.exports.languages = {
  vi: {
    needAdmin: "[ ANTI JOIN ] → Cần quyền quản trị viên nhóm vui lòng thử lại.",
    onoff: "[ ANTI JOIN ] → Thực hiện %1 thành công cấm người dùng vào nhóm ✅"
  },
  en: {
    needAdmin: "[ ANTI JOIN ] → Bot requires group admin permission.",
    onoff: "[ ANTI JOIN ] → Successfully %1 join restriction ✅"
  }
};

module.exports.run = async({ api, event, Threads, getText}) => {
    const info = await api.getThreadInfo(event.threadID);
    if (!info.adminIDs.some(item => item.id == api.getCurrentUserID())) 
      return api.sendMessage(getText('needAdmin'), event.threadID, event.messageID);
    const data = (await Threads.getData(event.threadID)).data || {};
    if (typeof data.newMember == "undefined" || data.newMember == false) data.newMember = true;
    else data.newMember = false;
    await Threads.setData(event.threadID, { data });
      global.data.threadData.set(parseInt(event.threadID), data);
    return api.sendMessage(getText('onoff', (data.newMember == true) ? 'bật' : 'tắt'), event.threadID, event.messageID);
}