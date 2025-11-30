module.exports.config = {
  name: "newboxuid",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "NTKhang (mod by Trung)",
  description: "Tạo nhóm chat mới bằng UID hoặc tag",
  commandCategory: "group",
  usages: '"/newboxuid [uid1] [uid2] ... | [tên nhóm mới]"',
  cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
  try {
    // Nếu có "me" ở đầu thì thêm chính người gọi vào group
    let id = [];
    if (args[0] == "me") {
      id.push(event.senderID);
      args.shift();
    }

    // Lấy phần tên nhóm sau dấu "|"
    const main = event.body;
    if (!main.includes("|")) {
      return api.sendMessage('⚠️ Sai cú pháp!\nVí dụ: /newboxuid 10001 10002 | Nhóm test', event.threadID, event.messageID);
    }
    const groupTitle = main.slice(main.indexOf("|") + 2).trim();

    // Lấy danh sách UID trước dấu "|"
    const uidPart = main.split("|")[0].replace("$newbox", "").trim();
    const uidList = uidPart.split(/\s+/).filter(u => /^\d+$/.test(u));

    id = id.concat(uidList);

    if (id.length == 0) {
      return api.sendMessage("❌ Không tìm thấy UID hợp lệ để thêm vào nhóm!", event.threadID, event.messageID);
    }

    // Tạo nhóm mới
    api.createNewGroup(id, groupTitle, (err, info) => {
      if (err) return api.sendMessage("⚠️ Lỗi khi tạo nhóm: " + err.message, event.threadID);
      api.sendMessage(`✅ Đã tạo nhóm “${groupTitle}” thành công!\n👥 Thành viên: ${id.join(", ")}`, event.threadID);
    });

  } catch (e) {
    api.sendMessage("❌ Lỗi xảy ra: " + e.message, event.threadID);
  }
};
