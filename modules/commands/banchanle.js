const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
  name: "banchanle",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "Thiệu Trung Kiên • patch by TrungSky+GPT",
  description: "Chẵn lẻ nhiều người (anti-429, dùng ảnh local)",
  commandCategory: "Trò Chơi",
  usages: "[create/join/start/end]",
  cooldowns: 5
};

function p(...args) { console.log("[banchanle]", ...args); }

// Helpers ────────────────────────────────────────────────────────────────────
const assets = (...pSegs) => path.join(__dirname, "assets", ...pSegs);

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function fileOrNull(fp) {
  try { return fs.existsSync(fp) ? fp : null; } catch { return null; }
}
function attachmentIfExists(fp) {
  const ok = fileOrNull(fp);
  return ok ? fs.createReadStream(ok) : null;
}

const COVER_IMAGE = assets("LClPl36.jpeg");     // ảnh cover hướng dẫn
const CHECKING_GIF = assets("checking.gif");   // gif "đang kiểm tra"

const EVEN_IMAGES = [
  assets("0.jpeg"),
  assets("2.jpeg"),
  assets("4.jpeg"),
  assets("6.png"),
  assets("8.png")
].filter(fileOrNull);

const ODD_IMAGES = [
  assets("1.png"),
  assets("3.png"),
  assets("5.jpeg"),
  assets("7.jpeg"),
  assets("9.png")
].filter(fileOrNull);

// ────────────────────────────────────────────────────────────────────────────

module.exports.run = async function ({
  api: api,
  event: event,
  Currencies: Currencies,
  Threads: ThreadsModel,
  Users: Users,
  args: args
}) {
  try {
    if (!global.chanle) global.chanle = new Map();

    const { threadID: tid, messageID: mid, senderID: uid } = event;
    let room = global.chanle.get(tid);

    switch ((args[0] || "").toLowerCase()) {
      case "create":
      case "new":
      case "-c": {
        if (!args[1] || isNaN(args[1])) {
          return api.sendMessage("Bạn cần nhập số tiền đặt cược!", tid, mid);
        }
        const bet = parseInt(args[1]);
        if (bet < 50) {
          return api.sendMessage("Số tiền phải lớn hơn hoặc bằng 50", tid, mid);
        }

        const me = await Currencies.getData(event.senderID);
        if (me.money < bet) {
          return api.sendMessage(`Bạn không có đủ ${bet} để tạo bàn game mới!!`, tid, mid);
        }
        if (global.chanle.has(tid)) {
          return api.sendMessage("Nhóm này đã được mở bàn game!", tid, mid);
        }

        const myName = await Users.getNameUser(uid);
        global.chanle.set(tid, {
          box: tid,
          start: false,
          author: uid,
          player: [{
            name: myName,
            userID: uid,
            choose: { status: false, msg: null }
          }],
          money: bet
        });

        return api.sendMessage("Tạo thành công phòng chẵn lẻ với số tiền cược là: " + bet, tid);
      }

      case "join":
      case "-j": {
        if (!global.chanle.has(tid)) {
          return api.sendMessage("Nhóm này hiện chưa có bàn game nào!\n=> Vui lòng hãy tạo bàn game mới để tham gia!", tid, mid);
        }
        if (room.start === true) {
          return api.sendMessage("Hiện tại bàn game này đã bắt đầu từ trước!", tid, mid);
        }

        const you = await Currencies.getData(event.senderID);
        if (you.money < room.money) {
          return api.sendMessage(`Bạn không có đủ $ để tham gia bàn game này! ${room.money}$`, tid, mid);
        }
        if (room.player.find(p => p.userID == uid)) {
          return api.sendMessage("Hiện tại bạn đã tham gia bàn game này!", tid, mid);
        }

        const name = await Users.getNameUser(uid);
        room.player.push({
          name,
          userID: uid,
          choose: { status: false, msg: null } // ✅ fix typo: stats -> status
        });
        global.chanle.set(tid, room);

        return api.sendMessage(`Bạn đã tham gia bàn game!\n=> Số thành viên hiện tại là: ${room.player.length}`, tid, mid);
      }

      case "start":
      case "-s": {
        if (!room) {
          return api.sendMessage("Nhóm này hiện chưa có bàn game nào!\n=> Vui lòng hãy tạo bàn game mới để tham gia!", tid, mid);
        }
        if (room.author != uid) {
          return api.sendMessage("Bạn không phải là người tạo ra bàn game này nên không thể bắt đầu game", tid, mid);
        }
        if (room.player.length <= 1) {
          return api.sendMessage("Bàn game của bạn không có đủ thành viên để có thể bắt đầu!", tid, mid);
        }
        if (room.start === true) {
          return api.sendMessage("Hiện tại bàn game này đã bắt đầu từ trước!", tid, mid);
        }

        room.start = true;
        global.chanle.set(tid, room);
        return api.sendMessage(
          `Game bắt đầu\n\nSố thành viên: ${room.player.length}\n\nVui lòng chat "Chẵn" hoặc "Lẻ"`,
          tid
        );
      }

      case "end":
      case "-e": {
        if (!room) {
          return api.sendMessage("Nhóm này hiện chưa có bàn game nào!\n=> Vui lòng hãy tạo bàn game mới để tham gia!", tid, mid);
        }
        if (room.author != uid) {
          return api.sendMessage("Bạn không phải là người tạo ra bàn game nên không thể xóa bàn game", tid, mid);
        }
        global.chanle.delete(tid);
        return api.sendMessage("Đã xóa bàn game!", tid, mid);
      }

      default: {
        // Gửi hướng dẫn + ảnh cover từ local (không axios)
        const cover = attachmentIfExists(COVER_IMAGE);
        return api.sendMessage({
          body:
            "Chơi Chẵn Lẻ Nhiều Người\n" +
            "1. => banchanle -c/create <price> để tạo phòng\n" +
            "2. => banchanle join để vào phòng\n" +
            "3. => banchanle start để bắt đầu trò chơi\n" +
            "4. => banchanle end để xóa phòng",
          attachment: cover ? cover : undefined
        }, tid, mid);
      }
    }
  } catch (err) {
    p("run error:", err);
  }
};

module.exports.handleEvent = async function ({
  api: api,
  event: event,
  Currencies: Currencies
}) {
  const { threadID: tid, messageID: mid, body: body, senderID: uid } = event;

  // chỉ nhận khi người chơi chat "chẵn" hoặc "lẻ"
  if (!body) return;
  const choice = body.toLowerCase();
  if (choice !== "chẵn" && choice !== "lẻ") return;

  const room = global.chanle.get(tid);
  if (!room) return;
  if (room.start !== true) return;
  if (!room.player.find(p => p.userID == uid)) return;

  // random kết quả (chẵn/lẻ)
  const outcomes = ["chẵn", "lẻ"];
  // đọc tiền để tránh warning (như code cũ), nhưng không dùng
  await Currencies.getData(event.senderID);
  const result = pick(outcomes);

  // cập nhật lựa chọn người chơi
  const idx = room.player.findIndex(p => p.userID == uid);
  const me = room.player[idx];
  if (me.choose.status === true) {
    return api.sendMessage("Bạn đã chọn rồi không thể chọn lại!", tid, mid);
  }

  const normalized = (choice === "chẵn") ? "chẵn" : "lẻ";
  room.player.splice(idx, 1);
  room.player.push({
    name: me.name,
    userID: uid,
    choose: { status: true, msg: normalized }
  });
  global.chanle.set(tid, room);

  api.sendMessage(`${me.name} đã chọn ${normalized}`, tid, mid);

  // kiểm tra đủ người đã chọn hết chưa
  let chosen = 0;
  for (const p of room.player) if (p.choose.status === true) chosen++;
  if (chosen !== room.player.length) return;

  // Gửi GIF checking (local)
  const checking = attachmentIfExists(CHECKING_GIF);
  api.sendMessage({
    body: "Đang kiểm tra kết quả",
    attachment: checking ? checking : undefined
  }, tid, (err, info) => {
    if (err) return api.sendMessage(String(err), tid, mid);

    setTimeout(async () => {
      // gỡ message checking
      if (info && info.messageID) {
        try { api.unsendMessage(info.messageID); } catch (_) {}
      }

      // tách thắng/thua theo result
      const winners = [];
      const losers = [];
      for (const p of room.player) {
        if (result === "chẵn") {
          (p.choose.msg === "chẵn" ? winners : losers).push({ name: p.name, userID: p.userID });
        } else {
          (p.choose.msg === "lẻ" ? winners : losers).push({ name: p.name, userID: p.userID });
        }
      }

      // chọn ảnh kết quả theo chẵn/lẻ từ local
      const pool = (result === "chẵn") ? EVEN_IMAGES : ODD_IMAGES;
      const att = pool.length ? fs.createReadStream(pick(pool)) : (attachmentIfExists(COVER_IMAGE) || undefined);

      // tính tiền
      let msg = "KẾT QUẢ: " + result.toUpperCase() + "\n\nThắng:\n";
      let i = 0, j = 0;

      for (const w of winners) {
        await Currencies.getData(w.userID);
        await Currencies.increaseMoney(w.userID, room.money);
        msg += `${++i}. ${w.name}\n`;
      }
      for (const l of losers) {
        await Currencies.getData(l.userID);
        await Currencies.decreaseMoney(l.userID, room.money);
        if (j === 0) msg += "\nThua:\n";
        msg += `${++j}. ${l.name}\n`;
      }
      msg += `\nThắng + ${room.money} VND\nThua - ${room.money} VND`;

      global.chanle.delete(tid);
      return api.sendMessage({ body: msg, attachment: att }, tid);

    }, 5000);
  });
};
