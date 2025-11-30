const fs = require('fs-extra');
const path = require('path');
const filePath = path.join(__dirname, '../../modules/commands/data/commands-banned.json');

module.exports.config = {
  name: "dsban",
  version: "1.0.5",
  hasPermssion: 1,
  credits: "Gojo",
  description: "Xem danh sách các lệnh, người dùng và nhóm bị cấm (có thông tin chi tiết)",
  commandCategory: "QTV",
  usages: "[all/cmd/user/thread] | Reply số thứ tự để gỡ đơn lẻ hoặc 'all' để gỡ tất cả",
  cooldowns: 5
};

const getRoleName = (permission) => {
  switch (permission) {
    case 0: return "Thành viên";
    case 1: return "Quản trị viên";
    case 2: return "Admin bot";
    case 3: return "Admin tối cao";
    default: return "Không xác định";
  }
};

module.exports.run = async ({ api, event, args, Users, Threads }) => {
  try {
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify({}, null, 4));
    let data = JSON.parse(fs.readFileSync(filePath));
    const threadID = event.threadID;
    const type = args[0]?.toLowerCase();

    if (!data[threadID]) return api.sendMessage("⚠️ Không có lệnh cấm nào trong nhóm này.", threadID);

    let msg = "";
    let index = 1;
    let banList = [];

    // Lấy thông tin thread từ Mirai
    const threadInfo = await Threads.getInfo(threadID);
    const isAdmin = threadInfo.adminIDs.includes(event.senderID);

    switch (type) {
      case "cmd":
        if (!data[threadID].cmds || data[threadID].cmds.length === 0) {
          return api.sendMessage("📋 Không có lệnh nào bị cấm trong nhóm này.", threadID);
        }
        msg = "📋 DANH SÁCH LỆNH BỊ CẤM:\n─────────────────\n\n";
        for (const cmd of data[threadID].cmds) {
          const authorInfo = await Users.getInfo(cmd.author);
          const authorName = authorInfo?.name || cmd.author;
          const authorRole = isAdmin ? "Quản trị viên" : "Thành viên";
          
          msg += `${index}. Lệnh: ${cmd.cmd}\n`;
          msg += `👤 Người cấm: ${authorName}\n`;
          msg += `💼 Chức vụ: ${authorRole}\n`;
          msg += `📝 Lý do: ${cmd.reason || "Không có lý do"}\n`;
          msg += `⏰ Thời gian: ${cmd.time}\n`;
          msg += "─────────────────\n";
          
          banList.push({ type: 'cmd', data: cmd });
          index++;
        }
        msg += "\nReply 'all' để gỡ tất cả lệnh bị cấm";
        break;

      case "user":
        if (!data[threadID].users || Object.keys(data[threadID].users).length === 0) {
          return api.sendMessage("👥 Không có người dùng nào bị cấm trong nhóm này.", threadID);
        }
        msg = "👥 DANH SÁCH NGƯỜI DÙNG BỊ CẤM:\n─────────────────\n\n";
        for (const user in data[threadID].users) {
          const banInfo = data[threadID].users[user];
          const authorInfo = await Users.getInfo(banInfo.author);
          const authorName = authorInfo?.name || banInfo.author;
          const authorRole = isAdmin ? "Quản trị viên" : "Thành viên";
          const bannedInfo = await Users.getInfo(user);
          const bannedName = bannedInfo?.name || user;
          
          msg += `${index}. Người dùng: ${bannedName}\n`;
          msg += `🆔 ID: ${user}\n`;
          msg += `👤 Người cấm: ${authorName}\n`;
          msg += `💼 Chức vụ: ${authorRole}\n`;
          msg += `📝 Lý do: ${banInfo.reason || "Không có lý do"}\n`;
          msg += `⏰ Thời gian: ${banInfo.time}\n`;
          
          if (banInfo.cmds && banInfo.cmds.length > 0) {
            msg += "🚫 Các lệnh bị cấm:\n";
            for (const cmd of banInfo.cmds) {
              const cmdAuthorInfo = await Users.getInfo(cmd.author);
              msg += `  - ${cmd.cmd}\n`;
              msg += `    • Bởi: ${cmdAuthorInfo?.name || cmd.author}\n`;
              msg += `    • Lý do: ${cmd.reason || "Không có lý do"}\n`;
              msg += `    • Thời gian: ${cmd.time}\n`;
            }
          }
          msg += "─────────────────\n";
          
          banList.push({ type: 'user', data: { user, ...banInfo } });
          index++;
        }
        msg += "\nReply 'all' để gỡ tất cả người dùng bị cấm";
        break;

      case "thread":
        if (!data.threads || data.threads.length === 0) {
          return api.sendMessage("💬 Không có nhóm nào bị cấm.", threadID);
        }
        msg = "💬 DANH SÁCH NHÓM BỊ CẤM:\n─────────────────\n\n";
        for (const thread of data.threads) {
          const threadData = await Threads.getInfo(thread);
          msg += `${index}. Nhóm: ${threadData?.threadName || thread}\n`;
          msg += `🆔 Thread ID: ${thread}\n`;
          if (data.threadInfo?.[thread]) {
            const banInfo = data.threadInfo[thread];
            const authorInfo = await Users.getInfo(banInfo.author);
            msg += `👤 Người cấm: ${authorInfo?.name || banInfo.author}\n`;
            msg += `📝 Lý do: ${banInfo.reason || "Không có lý do"}\n`;
            msg += `⏰ Thời gian: ${banInfo.time}\n`;
          }
          msg += "─────────────────\n";
          banList.push({ type: 'thread', data: thread });
          index++;
        }
        msg += "\nReply 'all' để gỡ tất cả nhóm bị cấm";
        break;

      default:
        msg = "📊 TỔNG QUAN DANH SÁCH CẤM:\n─────────────────\n\n";
        
        // Phần lệnh bị cấm
        msg += "📋 LỆNH BỊ CẤM:\n";
        if (data[threadID].cmds && data[threadID].cmds.length > 0) {
          msg += `Số lượng: ${data[threadID].cmds.length} lệnh\n`;
          msg += "3 lệnh gần đây nhất:\n";
          for (const cmd of data[threadID].cmds.slice(-3)) {
            const authorInfo = await Users.getInfo(cmd.author);
            msg += `• ${cmd.cmd}\n`;
            msg += `  - Bởi: ${authorInfo?.name || cmd.author}\n`;
            msg += `  - Lý do: ${cmd.reason || "Không có lý do"}\n`;
          }
          banList = banList.concat(data[threadID].cmds.map(cmd => ({ type: 'cmd', data: cmd })));
        } else {
          msg += "Không có lệnh nào bị cấm.\n";
        }
        msg += "─────────────────\n";

        // Phần người dùng bị cấm
        msg += "\n👥 NGƯỜI DÙNG BỊ CẤM:\n";
        const userCount = Object.keys(data[threadID].users || {}).length;
        if (userCount > 0) {
          msg += `Số lượng: ${userCount} người dùng\n`;
          msg += "3 người dùng gần đây nhất:\n";
          const recentUsers = Object.entries(data[threadID].users || {}).slice(-3);
          for (const [userID, userData] of recentUsers) {
            const bannedInfo = await Users.getInfo(userID);
            const authorInfo = await Users.getInfo(userData.author);
            msg += `• ${bannedInfo?.name || userID}\n`;
            msg += `  - Bị cấm bởi: ${authorInfo?.name || userData.author}\n`;
            msg += `  - Lý do: ${userData.reason || "Không có lý do"}\n`;
          }
          banList = banList.concat(Object.entries(data[threadID].users || {}).map(([user, userData]) => ({
            type: 'user',
            data: { user, ...userData }
          })));
        } else {
          msg += "Không có người dùng nào bị cấm.\n";
        }
        msg += "─────────────────\n";

        // Phần nhóm bị cấm
        msg += "\n💬 NHÓM BỊ CẤM:\n";
        if (data.threads && data.threads.length > 0) {
          msg += `Số lượng: ${data.threads.length} nhóm\n`;
          msg += "3 nhóm gần đây nhất:\n";
          for (const thread of data.threads.slice(-3)) {
            const threadData = await Threads.getInfo(thread);
            msg += `• ${threadData?.threadName || thread}\n`;
            if (data.threadInfo?.[thread]) {
              const authorInfo = await Users.getInfo(data.threadInfo[thread].author);
              msg += `  - Bị cấm bởi: ${authorInfo?.name || data.threadInfo[thread].author}\n`;
              msg += `  - Lý do: ${data.threadInfo[thread].reason || "Không có lý do"}\n`;
            }
          }
          banList = banList.concat(data.threads.map(thread => ({ type: 'thread', data: thread })));
        } else {
          msg += "Không có nhóm nào bị cấm.\n";
        }
        msg += "─────────────────\n";
        msg += "\n➡️ Sử dụng:\n• dsban cmd: xem chi tiết lệnh bị cấm\n• dsban user: xem chi tiết người bị cấm\n• dsban thread: xem chi tiết nhóm bị cấm";
        msg += "\n\nReply 'all' để gỡ tất cả các mục bị cấm";
        break;
    }

    if (msg) {
      return api.sendMessage(msg, threadID, (err, info) => {
        if (err) return console.error(err);
        if (banList.length > 0) {
          global.client.handleReply.push({
            name: this.config.name,
            messageID: info.messageID,
            author: event.senderID,
            banList,
            threadID: event.threadID,
            type: type || 'all'
          });
        }
      });
    }
  } catch (error) {
    console.error(error);
    return api.sendMessage("❌ Đã xảy ra lỗi khi xử lý yêu cầu.", threadID);
  }
};
module.exports.handleReply = async ({ api, event, handleReply, Users, Threads }) => {
  try {
    const { banList, threadID, type } = handleReply;
    const reply = event.body.toLowerCase();

    // Kiểm tra quyền của người dùng
    const threadInfo = await Threads.getInfo(threadID);
    const isAdmin = threadInfo.adminIDs.includes(event.senderID);
    const permission = global.config.ADMINBOT.includes(event.senderID) ? 2 : isAdmin ? 1 : 0;
    
    if (permission < 1) {
      return api.sendMessage("❌ Bạn không có quyền sử dụng tính năng này.", threadID);
    }

    // Xử lý reply 'all'
    if (reply === 'all') {
      let data = JSON.parse(fs.readFileSync(filePath));
      let removedCount = {
        cmd: 0,
        user: 0,
        thread: 0
      };
      let removedItems = {
        cmd: [],
        user: [],
        thread: []
      };
      
      // Lưu thông tin các mục bị xóa trước khi xóa
      if (type === 'cmd' || type === 'all') {
        if (data[threadID].cmds) {
          removedCount.cmd = data[threadID].cmds.length;
          removedItems.cmd = [...data[threadID].cmds];
          data[threadID].cmds = [];
        }
      }
      
      if (type === 'user' || type === 'all') {
        if (data[threadID].users) {
          removedCount.user = Object.keys(data[threadID].users).length;
          removedItems.user = Object.entries(data[threadID].users).map(([id, info]) => ({id, ...info}));
          data[threadID].users = {};
        }
      }
      
      if (type === 'thread' || type === 'all') {
        if (data.threads) {
          removedCount.thread = data.threads.length;
          removedItems.thread = [...data.threads];
          data.threads = [];
        }
      }

      fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
      
      // Tạo thông báo chi tiết
      let msg = "✅ Đã gỡ bỏ thành công:\n─────────────────\n\n";
      
      if (type === 'all' || type === 'cmd') {
        if (removedItems.cmd.length > 0) {
          msg += "📋 Các lệnh đã gỡ cấm:\n";
          for (const cmd of removedItems.cmd) {
            msg += `• ${cmd.cmd}\n`;
          }
          msg += `\nTổng cộng: ${removedCount.cmd} lệnh\n`;
          msg += "─────────────────\n";
        }
      }
      
      if (type === 'all' || type === 'user') {
        if (removedItems.user.length > 0) {
          msg += "\n👥 Các người dùng đã gỡ cấm:\n";
          for (const user of removedItems.user) {
            const userName = await Users.getNameUser(user.id);
            msg += `• ${userName} (${user.id})\n`;
          }
          msg += `\nTổng cộng: ${removedCount.user} người dùng\n`;
          msg += "─────────────────\n";
        }
      }
      
      if (type === 'all' || type === 'thread') {
        if (removedItems.thread.length > 0) {
          msg += "\n💬 Các nhóm đã gỡ cấm:\n";
          for (const threadId of removedItems.thread) {
            const threadData = await Threads.getInfo(threadId);
            msg += `• ${threadData.threadName || threadId}\n`;
          }
          msg += `\nTổng cộng: ${removedCount.thread} nhóm\n`;
          msg += "─────────────────\n";
        }
      }
      
      // Thêm thông tin người thực hiện
      const authorName = await Users.getNameUser(event.senderID);
      const authorRole = permission === 2 ? "Admin Bot" : "Quản trị viên";
      msg += `\n👤 Thực hiện bởi: ${authorName}\n`;
      msg += `💼 Chức vụ: ${authorRole}\n`;
      msg += `⏰ Thời gian: ${new Date().toLocaleString('vi-VN')}`;
      
      return api.sendMessage(msg, threadID);
    }

    // Xử lý reply số thứ tự
    const index = parseInt(reply) - 1;
    if (isNaN(index) || index < 0 || index >= banList.length) {
      return api.sendMessage("❌ Số không hợp lệ, vui lòng thử lại.", threadID);
    }

    const bannedItem = banList[index];
    let data = JSON.parse(fs.readFileSync(filePath));
    const authorName = await Users.getNameUser(event.senderID);
    const authorRole = permission === 2 ? "Admin Bot" : "Quản trị viên";
    let successMsg = "✅ Đã gỡ cấm thành công:\n─────────────────\n\n";

    switch (bannedItem.type) {
      case 'cmd': {
        const cmdName = bannedItem.data.cmd;
        data[threadID].cmds = data[threadID].cmds.filter(cmd => cmd.cmd !== cmdName);
        successMsg += `Lệnh: ${cmdName}\n`;
        successMsg += `📝 Lý do ban đầu: ${bannedItem.data.reason || "Không có"}\n`;
        successMsg += `⏰ Thời gian ban đầu: ${bannedItem.data.time}\n`;
        const originalBanner = await Users.getNameUser(bannedItem.data.author);
        successMsg += `👤 Người cấm ban đầu: ${originalBanner}\n`;
        break;
      }
      case 'user': {
        const userID = bannedItem.data.user;
        const userName = await Users.getNameUser(userID);
        delete data[threadID].users[userID];
        successMsg += `Người dùng: ${userName}\n`;
        successMsg += `🆔 ID: ${userID}\n`;
        successMsg += `📝 Lý do ban đầu: ${bannedItem.data.reason || "Không có"}\n`;
        successMsg += `⏰ Thời gian ban đầu: ${bannedItem.data.time}\n`;
        const originalBanner = await Users.getNameUser(bannedItem.data.author);
        successMsg += `👤 Người cấm ban đầu: ${originalBanner}\n`;
        break;
      }
      case 'thread': {
        const threadId = bannedItem.data;
        const threadInfo = await Threads.getInfo(threadId);
        data.threads = data.threads.filter(thread => thread !== threadId);
        successMsg += `Nhóm: ${threadInfo.threadName || threadId}\n`;
        successMsg += `🆔 Thread ID: ${threadId}\n`;
        if (data.threadInfo?.[threadId]) {
          successMsg += `📝 Lý do ban đầu: ${data.threadInfo[threadId].reason || "Không có"}\n`;
          successMsg += `⏰ Thời gian ban đầu: ${data.threadInfo[threadId].time}\n`;
          const originalBanner = await Users.getNameUser(data.threadInfo[threadId].author);
          successMsg += `👤 Người cấm ban đầu: ${originalBanner}\n`;
        }
        break;
      }
      default:
        return api.sendMessage("❌ Có lỗi xảy ra khi gỡ cấm.", threadID);
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));

    // Thêm thông tin về người thực hiện gỡ cấm
    successMsg += "─────────────────\n";
    successMsg += `\n👤 Gỡ cấm bởi: ${authorName}\n`;
    successMsg += `💼 Chức vụ: ${authorRole}\n`;
    successMsg += `⏰ Thời gian: ${new Date().toLocaleString('vi-VN')}`;

    return api.sendMessage(successMsg, threadID);

  } catch (error) {
    console.error(error);
    api.sendMessage("❌ Đã xảy ra lỗi khi xử lý yêu cầu.", threadID);
  }
};