const delay = (ms) => new Promise(res => setTimeout(res, ms));

module.exports.config = {
  name: "addlist",
  version: "4.0.0",
  hasPermssion: 0, // ai cũng có thể gọi, nhưng lọc theo UID ở dưới
  credits: "Đỗ Văn Hậu",
  description: "Thêm nhiều thành viên vào nhóm theo danh sách UID",
  commandCategory: "Quản lý nhóm",
  usages: "addlist [uid1,uid2,...] | [tid hoặc link nhóm]\nHoặc reply file .txt chứa UID",
  cooldowns: 5
};

module.exports.run = async ({ api, event, args }) => {
  const axios = require("axios");
  const fs = require("fs-extra");

  // ✅ UID admin cứng
  const ADMIN_UID = "100081853790019";

  // ✅ Chỉ admin UID mới được dùng
  if (event.senderID !== ADMIN_UID) {
    return api.sendMessage("⚠️ Bạn không có quyền dùng lệnh này.", event.threadID, event.messageID);
  }

  if (!args[0]) {
    return api.sendMessage(
      "⚙️ Cách dùng:\n/addlist [uid1,uid2,...] | [tid hoặc link nhóm]\n\nHoặc reply file .txt chứa UID mỗi dòng 1 ID và ghi:\n/addlist [tid hoặc link]",
      event.threadID,
      event.messageID
    );
  }

  let idList = [];
  let tid = null;

  try {
    // ✅ Nếu có dấu |
    if (args.join(" ").includes("|")) {
      const [uidsPart, tidPart] = args.join(" ").split("|").map(p => p.trim());
      idList = uidsPart.split(",").map(u => u.trim()).filter(Boolean);
      tid = tidPart.replace(/\D/g, "");
    } 
    // ✅ Nếu reply file txt
    else if (event.messageReply && event.messageReply.attachments.length > 0) {
      const fileUrl = event.messageReply.attachments[0].url;
      const res = await axios.get(fileUrl, { responseType: "arraybuffer" });
      const filePath = __dirname + "/cache/uidlist.txt";
      fs.writeFileSync(filePath, Buffer.from(res.data, "binary"));
      const content = fs.readFileSync(filePath, "utf-8");
      idList = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      fs.unlinkSync(filePath);
      tid = args[0]?.replace(/\D/g, "");
    }

    if (!tid) return api.sendMessage("⚠️ Bạn chưa nhập TID hoặc link nhóm cần thêm!", event.threadID, event.messageID);
    if (idList.length === 0) return api.sendMessage("⚠️ Không tìm thấy UID hợp lệ.", event.threadID, event.messageID);

    api.sendMessage(`🔄 Đang thêm ${idList.length} thành viên vào nhóm ${tid}...`, event.threadID, event.messageID);

    let success = 0, fail = 0;

    for (const uid of idList) {
      try {
        await api.addUserToGroup(uid, tid);
        success++;
        await delay(1500);
      } catch (e) {
        fail++;
        console.log(`❌ Không thể thêm ${uid}: ${e.message}`);
      }
    }

    api.sendMessage(
      `✅ Hoàn tất thêm thành viên!\n📥 Thành công: ${success}\n❌ Thất bại: ${fail}\n👥 Nhóm: ${tid}`,
      event.threadID,
      event.messageID
    );

  } catch (err) {
    console.error(err);
    return api.sendMessage(`⚠️ Lỗi: ${err.message}`, event.threadID, event.messageID);
  }
};
