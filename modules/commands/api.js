// Required modules
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const pathApi = path.join(__dirname, "../../bot/datajson/");

module.exports.config = {
  name: "api",
  version: "1.0.0",
  hasPermssion: 3,
  credits: "Vtuan + LocDev",
  description: "no",
  commandCategory: "Admin",
  usages: "[]",
  cooldowns: 1,
};

const CL = (filePath) => fs.readFileSync(filePath, "utf-8").split(/\r\n|\r|\n/).length;

module.exports.run = async function ({ api, event, args }) {
  try {
    const send = (msg) => api.sendMessage(msg, event.threadID);
    const setReact = (icon) => api.setMessageReaction(icon, event.messageID, () => { }, true);

    if (args.length > 0) {
      const subCommand = args[0].toLowerCase();

      switch (subCommand) {
        case "add": {
          setReact("⌛");
          const replyMessage = event.messageReply;
          let fileName = args.length > 1 ? args.slice(1).join("_") + ".json" : "api.json";
          const filePath = pathApi + fileName;
          if (!replyMessage) return send(`Vui lòng reply ảnh hoặc video + tên file api hoặc để trống để lưu vào file ${fileName}`);
          if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, "[]", "utf-8");

          let msg = "";
          for (let i of replyMessage.attachments) {
            try {
              const { data } = await axios.get(`https://niio-team.onrender.com/catbox?url=${encodeURIComponent(i.url)}`);
              msg += `${data.url}\n`;
            } catch (e) {
              console.error(e);
            }
          }

          let existingData = [];
          try {
            existingData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
          } catch (e) {
            console.error("Error reading file:", e);
          }

          existingData = existingData.concat(msg.split("\n").filter(Boolean));
          fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2), "utf-8");
          setReact("✅");
          return send("✅Thêm thành công");
        }

        case "cr": {
          if (args.length === 1) return send("➣ Bạn cần nhập tên file để tạo!");
          const fileName = args.slice(1).join("_") + ".json";
          const filePath = pathApi + fileName;
          if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, "[]", "utf-8");
            setReact("✅");
            return send(`➣ Đã tạo file ${fileName}`);
          }
          return send(`➣ File ${fileName} đã tồn tại`);
        }

        case "rm": {
          if (args.length === 1) return send("➣ Bạn cần nhập tên file để xóa!");
          const fileName = args.slice(1).join("_") + ".json";
          const filePath = pathApi + fileName;
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            setReact("✅");
            return send(`➣ Đã xóa file ${fileName}`);
          }
          setReact("❎");
          return send(`➣ File ${fileName}.json không tồn tại`);
        }

        case "gf": {
          if (args.length === 1) return send("➣ Bạn cần nhập tên file để share!");
          const fileName = args[1].toLowerCase() + ".json";
          const filePath = pathApi + fileName;

          if (fs.existsSync(filePath)) {
            try {
              const fileContent = fs.readFileSync(filePath, "utf-8");
              const { data } = await axios.post("https://api.mocky.io/api/mock", {
                status: 200,
                content: fileContent,
                content_type: "application/json",
                charset: "UTF-8",
                secret: "NguyenMinhHuy",
                expiration: "never",
              });
              setReact("✅");
              return send(`➣ ${fileName}: ${data.link}`);
            } catch (e) {
              console.error(e);
              return send(`Đã xảy ra lỗi khi xử lý file ${fileName}`);
            }
          }
          return send(`➣ File ${fileName} không tồn tại`);
        }

        case "check": {
          if (args.length < 2) {
            const files = fs.readdirSync(pathApi).filter(f => f.endsWith(".json"));
            if (!files.length) return send("➣ Thư mục rỗng");

            const fileListArray = files.map((f, i) => ({
              index: i + 1,
              fileName: path.basename(f, ".json"),
              filePath: pathApi + f,
              lineCount: CL(pathApi + f)
            }));

            const listText = fileListArray.map(f => `${f.index}. ${f.fileName} (${f.lineCount} lines)`).join("\n");
            const msg = `➣ Danh sách các link api:\n${listText}\n\nReply tin nhắn này: rm/cr/gf/check + stt`;

            setReact("✅");
            const messageInfo = await api.sendMessage(msg, event.threadID);

            global.client.handleReply.push({
              name: module.exports.config.name,
              messageID: messageInfo.messageID,
              author: event.senderID,
              fileListArray,
              type: "list"
            });
            return;
          }
        }

        default:
          return send("Lệnh không hợp lệ hoặc chưa hỗ trợ.");
      }
    } else {
      const files = fs.readdirSync(pathApi).filter(f => f.endsWith(".json"));
      const tong = files.length;
      const tsdong = files.reduce((acc, f) => acc + CL(pathApi + f), 0);

      const help = `
➣ check: xem toàn bộ danh sách api
➣ check + tên file muốn kiểm tra
➣ rm + tên file json muốn xóa
➣ cr + tên file json để tạo file mới
➣ gf + tên file để share file api
➣ add: reply ảnh/video/audio muốn làm api!
   ➛ add + tên file cụ thể
   ➛ add + để trống
      `;

      const info = `\n${help}\n➣ Tổng số file api hiện có: ${tong}\n➣ Tổng số dòng: ${tsdong}\n➣ Reply tin nhắn này: cr + tên file để tạo file json mới`;
      setReact("✅");

      const messageInfo = await send(info);
      global.client.handleReply.push({
        name: module.exports.config.name,
        messageID: messageInfo.messageID,
        author: event.senderID,
        type: "api"
      });
    }
  } catch (error) {
    console.error("Error in run function:", error);
    api.setMessageReaction("❎", event.messageID, () => { }, true);
    return api.sendMessage("Đã xảy ra lỗi trong quá trình xử lý!", event.threadID);
  }
};