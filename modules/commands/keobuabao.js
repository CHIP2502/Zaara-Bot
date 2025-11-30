const path = require("path");
const fs = require("fs-extra");
const moment = require("moment-timezone");

const getStream = (fp) => (fs.existsSync(fp) ? fs.createReadStream(fp) : null);

// 3 ảnh người chơi (theo thứ tự: kéo, búa, bao)
const a = [
  path.join(__dirname, "cache", "kbb_user_keo.png"),
  path.join(__dirname, "cache", "kbb_user_bua.png"),
  path.join(__dirname, "cache", "kbb_user_bao.png")
];

// 3 ảnh bot (theo thứ tự: kéo, búa, bao)
const b = [
  path.join(__dirname, "cache", "kbb_bot_keo.png"),
  path.join(__dirname, "cache", "kbb_bot_bua.png"),
  path.join(__dirname, "cache", "kbb_bot_bao.png")
];

// ảnh kết quả
const wPath = path.join(__dirname, "cache", "kbb_result_win.png");
const lPath = path.join(__dirname, "cache", "kbb_result_lose.png");
const dPath = path.join(__dirname, "cache", "kbb_result_draw.png");

module.exports.config = {
  name: "keobuabao",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "quất • cache by Trung",
  description: "kéo búa bao (ảnh local)",
  commandCategory: "Trò Chơi",
  usages: "[kéo|búa|bao] [tiền|all]",
  cooldowns: 0
};

module.exports.run = async function ({ api: ap, event: e, args: ar, Currencies: C, Users: U }) {
  const { threadID: tid, senderID: sid } = e;
  const { sendMessage: send } = ap;
  const { increaseMoney: inc, getData: getData } = C;
  const { getNameUser: getName } = U;

  const choice = (ar[0] || "").toLowerCase();
  const kbb = ["kéo", "búa", "bao"];
  if (!kbb.includes(choice) || (!ar[1] && ar[1] !== 'all')) {
    return send("Vui lòng nhập: keobuabao [kéo|búa|bao] [tiền|all]", tid);
  }

  const userData = await getData(sid);
  const balance = userData?.money || 0;
  const bet = ar[1] === "all" ? balance : parseFloat(ar[1]);
  if (!bet || isNaN(bet) || bet <= 0) return send("Số tiền cược không hợp lệ!", tid);
  if (bet > balance) return send("Bạn không đủ tiền để cược!", tid);

  const now = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss || DD/MM/YYYY");
  const name = await getName(sid);

  // map lựa chọn -> index
  const ra = choice === "kéo" ? 0 : choice === "búa" ? 1 : 2;

  // random của bot
  const botChoice = kbb[Math.floor(Math.random() * kbb.length)];
  const rb = botChoice === "kéo" ? 0 : botChoice === "búa" ? 1 : 2;

  // tính kết quả
  let result; // 'thắng' | 'thua' | 'hòa'
  if (choice === botChoice) {
    result = "hòa";
  } else if (
    (choice === "kéo" && botChoice === "bao") ||
    (choice === "búa" && botChoice === "kéo") ||
    (choice === "bao" && botChoice === "búa")
  ) {
    result = "thắng";
  } else {
    result = "thua";
  }

  // tiền sau ván
  const winBalance = balance + bet + 1000; // theo công thức cũ của bạn
  const loseBalance = balance - bet + 1000;
  const drawBalance = balance + 1000;

  const dn =
    result === "thắng"
      ? `nhận: ${bet}$\n> Hiện bạn còn: ${winBalance}$`
      : result === "thua"
      ? `mất: ${bet}$\n> Hiện bạn còn: ${loseBalance}$`
      : `giữ lại: ${bet}$\n> Hiện bạn còn: ${drawBalance}$`;

  // cập nhật tiền
  const delta = result === "thắng" ? bet : result === "thua" ? -bet : 0;
  await inc(sid, delta);

  // attachments: [ảnh người chơi, ảnh kết quả, ảnh bot]
  const midUser = getStream(a[ra]);
  const midRes =
    result === "thắng" ? getStream(wPath) : result === "thua" ? getStream(lPath) : getStream(dPath);
  const midBot = getStream(b[rb]);

  const attachments = [midUser, midRes, midBot].filter(Boolean);

  return send(
    {
      body:
        `> Người chơi: ${name}\n` +
        `> Lúc: ${now}\n` +
        `> Kết quả: ${result}\n` +
        `> Bạn đưa ra: ${choice}\n` +
        `> Bot đưa ra: ${botChoice}\n` +
        `> Bạn ${dn}`,
      attachment: attachments.length ? attachments : undefined
    },
    tid
  );
};
