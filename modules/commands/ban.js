const fs = require('fs-extra');
const moment = require("moment-timezone");
const path = require('path');
const banPath = path.join(__dirname, '../../modules/commands/data/commands-banned.json');

module.exports.config = {
  name: "ban",
  version: "1.0.2",
  hasPermssion: 1,
  credits: "Gojo",
  description: "Cấm lệnh/thành viên/nhóm trong một thời gian",
  commandCategory: "QTV",
  usages: "[cmd/all/user/thread/usercmd] [tên/tag] [lý do]",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args, Users, Threads }) {
  const { threadID, messageID, mentions, senderID } = event;
  const threadInfo = await Threads.getInfo(threadID);
  const isAdmin = global.config.ADMINBOT.includes(senderID);
  const isQTV = threadInfo.adminIDs.some(item => item.id == senderID);
  const nameUser = await Users.getNameUser(senderID);

  if (!fs.existsSync(banPath)) fs.writeFileSync(banPath, JSON.stringify({}, null, 2));
  let data = require(banPath);
  if (!data[threadID]) data[threadID] = { users: {}, cmds: [] };

  const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY");
  const prefix = global.config.PREFIX;

  const sendMessage = (msg) => api.sendMessage(msg, threadID, messageID);

  if (!args[0]) {
    return sendMessage(`╭─────────────────╮
  📌 HƯỚNG DẪN SỬ DỤNG
╰─────────────────╯
${prefix}ban cmd [tên lệnh] [lý do]
${prefix}ban all [lý do]
${prefix}ban user [@tag] [lý do]
${prefix}ban thread [ID nhóm] [lý do]
${prefix}ban usercmd [@tag] [tên lệnh] [lý do]

╭─────────────────╮
  📝 VÍ DỤ
╰─────────────────╯
${prefix}ban cmd help Spam lệnh
${prefix}ban user @name Phá bot
${prefix}ban thread 123456789 Spam bot`);
  }

  const type = args[0].toLowerCase();
  const reason = args.slice(2).join(" ") || "Không có lý do";

  try {
    switch (type) {
      case "cmd": {
        const cmd = args[1];
        if (!cmd) return sendMessage("⚠️ Vui lòng nhập tên lệnh cần cấm!");

        // Kiểm tra lệnh có tồn tại
        const command = [...global.client.commands.values()].find(c => c.config.name === cmd);
        if (!command) return sendMessage(`❌ Lệnh "${cmd}" không tồn tại!`);

        // Kiểm tra quyền hạn
        if (!isAdmin && !isQTV) return sendMessage("⚠️ Chỉ ADMIN bot và Quản trị viên nhóm mới được sử dụng lệnh này!");

        const existingBan = data[threadID].cmds.find(item => item.cmd === cmd);
        if (existingBan) return sendMessage(`❌ Lệnh "${cmd}" đã bị cấm từ trước!`);

        data[threadID].cmds.push({
          cmd,
          author: senderID,
          reason,
          time
        });

        fs.writeFileSync(banPath, JSON.stringify(data, null, 2));
        return sendMessage(
          `✅ Đã cấm lệnh "${cmd}"\n` +
          `👤 Người cấm: ${nameUser}\n` +
          `💼 Chức vụ: ${isAdmin ? "Admin Bot" : "Quản trị viên"}\n` +
          `📝 Lý do: ${reason}\n` +
          `⏰ Thời gian: ${time}`
        );
      }

      case "user": {
        const mentionID = Object.keys(mentions)[0];
        if (!mentionID) return sendMessage("⚠️ Vui lòng tag người cần cấm!");

        if (!isAdmin && !isQTV) return sendMessage("⚠️ Chỉ ADMIN bot và Quản trị viên nhóm mới được sử dụng lệnh này!");

        const targetName = await Users.getNameUser(mentionID);

        // Không thể cấm Admin và QTV
        if (global.config.ADMINBOT.includes(mentionID))
          return sendMessage("❌ Không thể cấm Admin bot!");
        if (threadInfo.adminIDs.some(item => item.id == mentionID))
          return sendMessage("❌ Không thể cấm Quản trị viên nhóm!");

        data[threadID].users[mentionID] = {
          status: true,
          author: senderID,
          reason,
          time,
          cmds: []
        };

        fs.writeFileSync(banPath, JSON.stringify(data, null, 2));
        return sendMessage(
          `✅ Đã cấm người dùng: ${targetName}\n` +
          `👤 Người cấm: ${nameUser}\n` +
          `💼 Chức vụ: ${isAdmin ? "Admin Bot" : "Quản trị viên"}\n` +
          `📝 Lý do: ${reason}\n` +
          `⏰ Thời gian: ${time}`
        );
      }

      case "usercmd": {
        const mentionID = Object.keys(mentions)[0];
        const cmd = args[1];
        if (!mentionID) return sendMessage("⚠️ Vui lòng tag người cần cấm lệnh!");
        if (!cmd) return sendMessage("⚠️ Vui lòng nhập tên lệnh cần cấm!");

        if (!isAdmin && !isQTV) return sendMessage("⚠️ Chỉ ADMIN bot và Quản trị viên nhóm mới được sử dụng lệnh này!");

        const command = [...global.client.commands.values()].find(c => c.config.name === cmd);
        if (!command) return sendMessage(`❌ Lệnh "${cmd}" không tồn tại!`);

        const targetName = await Users.getNameUser(mentionID);

        if (!data[threadID].users[mentionID]) {
          data[threadID].users[mentionID] = {
            status: false,
            author: senderID,
            time,
            cmds: []
          };
        }

        if (data[threadID].users[mentionID].cmds.some(item => item.cmd === cmd))
          return sendMessage(`❌ Người dùng đã bị cấm lệnh "${cmd}" từ trước!`);

        data[threadID].users[mentionID].cmds.push({
          cmd,
          author: senderID,
          reason,
          time
        });

        fs.writeFileSync(banPath, JSON.stringify(data, null, 2));
        return sendMessage(
          `✅ Đã cấm lệnh "${cmd}" cho người dùng: ${targetName}\n` +
          `👤 Người cấm: ${nameUser}\n` +
          `💼 Chức vụ: ${isAdmin ? "Admin Bot" : "Quản trị viên"}\n` +
          `📝 Lý do: ${reason}\n` +
          `⏰ Thời gian: ${time}`
        );
      }

      case "thread": {
        if (!isAdmin) return sendMessage("⚠️ Chỉ ADMIN bot mới được sử dụng lệnh này!");

        const targetThreadID = args[1];
        if (!targetThreadID) return sendMessage("⚠️ Vui lòng nhập ID nhóm cần cấm!");

        try {
          const threadInfo = await Threads.getInfo(targetThreadID);
          if (!threadInfo) return sendMessage("❌ ID nhóm không hợp lệ!");

          if (!data.threads) data.threads = [];
          if (data.threads.includes(targetThreadID))
            return sendMessage(`❌ Nhóm "${threadInfo.threadName}" đã bị cấm từ trước!`);

          data.threads.push(targetThreadID);
          if (!data.threadInfo) data.threadInfo = {};
          data.threadInfo[targetThreadID] = {
            author: senderID,
            reason,
            time
          };

          fs.writeFileSync(banPath, JSON.stringify(data, null, 2));
          return sendMessage(
            `✅ Đã cấm nhóm: ${threadInfo.threadName}\n` +
            `🆔 Thread ID: ${targetThreadID}\n` +
            `👤 Người cấm: ${nameUser}\n` +
            `💼 Chức vụ: Admin Bot\n` +
            `📝 Lý do: ${reason}\n` +
            `⏰ Thời gian: ${time}`
          );
        } catch (err) {
          return sendMessage("❌ ID nhóm không hợp lệ!");
        }
      }

      case "all": {
        if (!isAdmin && !isQTV) return sendMessage("⚠️ Chỉ ADMIN bot và Quản trị viên nhóm mới được sử dụng lệnh này!");

        const commands = [...global.client.commands.values()];
        data[threadID].cmds = commands.map(cmd => ({
          cmd: cmd.config.name,
          author: senderID,
          reason,
          time
        }));

        fs.writeFileSync(banPath, JSON.stringify(data, null, 2));
        return sendMessage(
          `✅ Đã cấm tất cả ${commands.length} lệnh\n` +
          `👤 Người cấm: ${nameUser}\n` +
          `💼 Chức vụ: ${isAdmin ? "Admin Bot" : "Quản trị viên"}\n` +
          `📝 Lý do: ${reason}\n` +
          `⏰ Thời gian: ${time}`
        );
      }

      default:
        return sendMessage("⚠️ Lựa chọn không hợp lệ! Vui lòng chọn: cmd, user, thread, usercmd hoặc all");
    }
  } catch (error) {
    console.error(error);
    return sendMessage("❌ Đã xảy ra lỗi, vui lòng thử lại sau!");
  }
};