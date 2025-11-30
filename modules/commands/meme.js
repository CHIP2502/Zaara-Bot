module.exports.config = {
  name: "meme",
  version: "1.1.0",
  hasPermssion: 0,
  credits: "Tuấn | fix by GPT",
  description: "Random ảnh memevn",
  commandCategory: "Ảnh",
  usages: "memevn",
  cooldowns: 2,
  dependencies: {
    "fs-extra": "",
    "axios": ""
  }
};

module.exports.run = async ({ api, event }) => {
  // ưu tiên lấy từ global.nodemodule (chuẩn Mirai), fallback require thường
  const axios = (global.nodemodule && global.nodemodule["axios"]) || require("axios");
  const fs = (global.nodemodule && global.nodemodule["fs-extra"]) || require("fs-extra");
  const path = require("path");

  const links = [
    "https://i.imgur.com/Jy5bCx2.jpg",
    "https://i.imgur.com/yAtQUQu.jpg",
    "https://i.imgur.com/MdhUHdV.jpg",
    "https://i.imgur.com/KKmkIop.jpg",
    "https://i.imgur.com/Adr4be1.jpg",
    "https://i.imgur.com/s2giVqG.jpg",
    "https://i.imgur.com/OLp3vhz.png",
    "https://i.imgur.com/W2VGWqb.jpg",
    "https://i.imgur.com/EBJcGFf.jpg",
    "https://i.imgur.com/WYchdJG.jpg",
    "https://i.imgur.com/dwVGQD6.jpg",
    "https://i.imgur.com/3MbRb7U.jpg",
    "https://i.imgur.com/cpzJeWp.jpg",
    "https://i.imgur.com/D281oqO.jpg",
    "https://i.imgur.com/JNKZA8P.jpg",
    "https://i.imgur.com/5Nl04oP.jpg",
    "https://i.imgur.com/wMxv9qa.jpg",
    "https://i.imgur.com/UmfVLiD.jpg",
    "https://i.imgur.com/fIpWNOy.jpg",
    "https://i.imgur.com/GtcFh2Y.jpg",
    "https://i.imgur.com/1HFEzu0.jpg",
    "https://i.imgur.com/qSuCJzj.jpg",
    "https://i.imgur.com/AZpbUsz.png",
    "https://i.imgur.com/JtGE76p.jpg",
    "https://i.imgur.com/ZJYI9pQ.jpg",
    "https://i.imgur.com/nC9aCJZ.jpg",
    "https://i.imgur.com/BI9eFuS.jpg",
    "https://i.imgur.com/ZPUguG2.jpg",
    "https://i.imgur.com/IA8Dl6W.jpg",
    "https://i.imgur.com/xYvvgIS.jpg",
    "https://i.imgur.com/P8Cuobo.jpg",
    "https://i.imgur.com/ZB3G2XY.jpg",
    "https://i.imgur.com/X8dyJFy.jpg",
    "https://i.imgur.com/DXbEYs5.jpg",
    "https://i.imgur.com/Kp4oBzH.jpg"
  ];

  const cacheDir = path.join(__dirname, "cache");
  const outPath = path.join(cacheDir, "meme.jpg");
  try {
    fs.ensureDirSync(cacheDir);

    const url = encodeURI(links[Math.floor(Math.random() * links.length)]);
    const res = await axios.get(url, { responseType: "stream" });

    await new Promise((resolve, reject) => {
      const ws = fs.createWriteStream(outPath);
      res.data.pipe(ws);
      ws.on("finish", resolve);
      ws.on("error", reject);
    });

    await api.sendMessage(
      { body: "", attachment: fs.createReadStream(outPath) },
      event.threadID,
      () => fs.unlink(outPath, () => {})
    );
  } catch (err) {
    console.log("meme.js error:", err?.message || err);
    return api.sendMessage("Lỗi tải meme rồi bro 😭", event.threadID, event.messageID);
  }
};
