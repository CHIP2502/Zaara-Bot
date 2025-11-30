/**
* @author ProCoderMew
* @warn Do not edit code or edit credits
*/

module.exports.config = {
  name: "tromcho",
  version: "2.0.1",
  hasPermssion: 0,
  credits: "HĐGN (fix by Trung)",
  description: "",
  commandCategory: "general",
  usages: "[tag]",
  cooldowns: 5,
  dependencies: {
    "axios": "",
    "fs-extra": "",
    "path": "",
    "jimp": ""
  }
};

module.exports.onLoad = async () => {
  const path = require("path");
  const fs = require("fs-extra");
  const { downloadFile } = global.utils;

  const dir = path.resolve(__dirname, "cache", "canvas");              // ✅ đúng folder
  const file = path.resolve(dir, "tromcho.png");

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(file)) {
    await downloadFile("https://i.imgur.com/ubFLgcc.png", file);
  }
};

async function makeImage({ one, two }) {
  const fs = require("fs-extra");
  const path = require("path");
  const axios = require("axios");            // ✅ dùng require trực tiếp, khỏi global
  const Jimp = require("jimp");              // ✅ Jimp chắc chắn có

  const root = path.resolve(__dirname, "cache", "canvas");

  // Base
  const basePath = path.join(root, "tromcho.png");
  const tromchoImg = await Jimp.read(basePath);             // ✅ có file chắc chắn

  // Paths
  const pathImg   = path.join(root, `tromcho_${one}_${two}.png`);
  const avatarOne = path.join(root, `avt_${one}.png`);
  const avatarTwo = path.join(root, `avt_${two}.png`);

  // Download avatars (binary)
  const a1 = (await axios.get(
    `https://graph.facebook.com/${one}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
    { responseType: "arraybuffer", headers: { "User-Agent": "Mozilla/5.0" } }
  )).data;
  await fs.outputFile(avatarOne, a1);        // ✅ không set 'utf-8'

  const a2 = (await axios.get(
    `https://graph.facebook.com/${two}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
    { responseType: "arraybuffer", headers: { "User-Agent": "Mozilla/5.0" } }
  )).data;
  await fs.outputFile(avatarTwo, a2);

  // Circle helper (local)
  const circleBuf = async (p) => {
    const img = await Jimp.read(p);
    img.circle();
    return await img.getBufferAsync(Jimp.MIME_PNG);
  };

  const circleOne = await Jimp.read(await circleBuf(avatarOne));
  const circleTwo = await Jimp.read(await circleBuf(avatarTwo));

  // Composite
  tromchoImg
    .composite(circleOne.resize(50, 50), 234, 38)
    .composite(circleTwo.resize(90, 90), 50, 234);

  // Save + cleanup
  const raw = await tromchoImg.getBufferAsync(Jimp.MIME_PNG);
  await fs.outputFile(pathImg, raw);
  await fs.remove(avatarOne);
  await fs.remove(avatarTwo);

  return pathImg;
}

module.exports.run = async function ({ event, api, args }) {
  try {
    const fs = require("fs-extra");
    const { threadID, messageID, senderID } = event;

    const mention = Object.keys(event.mentions || {})[0];
    if (!mention) {
      return api.sendMessage("Vui lòng tag 1 người", threadID, messageID);
    }
    const tagName = event.mentions[mention]?.replace?.("@", "") || "bạn";

    const path = await makeImage({ one: senderID, two: mention });
    return api.sendMessage({
      body: `M coi chừng t ${tagName} xích m lại nhé sủa cl! 😈😈`,
      mentions: [{ tag: tagName, id: mention }],
      attachment: fs.createReadStream(path)
    }, threadID, () => fs.remove(path), messageID);

  } catch (e) {
    console.error("[tromcho]", e?.stack || e);
    return api.sendMessage("⚠️ Lỗi: " + (e.message || e), event.threadID, event.messageID);
  }
};
