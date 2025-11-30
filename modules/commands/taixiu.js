module.exports.config = {
  name: "taixiu",
  version: "0.0.2",
  hasPermssion: 0,
  credits: "WhoisHakira stolen form lorenBot(MinhHuyDev) | fix local assets by Trung+GPT",
  description: "Chơi tài xỉu",
  commandCategory: "Trò Chơi",
  usages: "taixiu [tài/xỉu/b3gn/b2gn/ct/cs] [số tiền] (tổng|số nếu ct/cs)",
  cooldowns: 10
};

const fs = require('fs');
const path = require('path');
const axios = require('axios');

let bdsd = true;
let tilethang = 0.95;
let tilethangb3dn = 10;
let tilethangb2dn = 5;
let timedelay = 2;
let haisogiong = 2;
let basogiong = 3;
let motsogiong = 0.95;

function replace(int){
  const str = int.toString();
  return str.replace(/(.)(?=(\d{3})+$)/g,'$1,');
}

// map file local (đặt tên theo cậu đang dùng)
const LOCAL_MAP = {
  1: "H8w634y.jpeg",
  2: "H8w634y.jpeg",
  3: "SmOzlNt.jpeg",
  4: "680wTWp.jpeg",
  5: "X3KzAc4.jpeg",
  6: "6.jpg"
};

// fallback URL nếu thiếu file local
const FALLBACK_URL = {
  1: "https://i.imgur.com/H8w634y.jpg",
  2: "https://i.imgur.com/vc9r4q4.jpg",
  3: "https://i.imgur.com/SmOzlNt.jpg",
  4: "https://i.imgur.com/680wTWp.jpg",
  5: "https://i.imgur.com/X3KzAc4.jpg",
  6: "https://i.imgur.com/KAOjcW0.jpg"
};

// trả về ReadStream của ảnh xúc xắc n (ưu tiên local, thiếu thì URL)
async function getDiceStream(n){
  const fileName = LOCAL_MAP[n] || `${n}.jpg`;
  const p = path.join(__dirname, "assets", fileName);
  if (fs.existsSync(p)) return fs.createReadStream(p);

  const res = await axios.get(FALLBACK_URL[n], { responseType: "stream" });
  return res.data;
}

function getRATE(tong){
  // cậu đang set toàn 25; giữ nguyên
  return 25;
}

// chuẩn hoá input: nhận xiu/xỉu/tai/tài
function norm(s){ return (s || "").toLowerCase().normalize('NFC'); }

module.exports.run = async function ({ event, api, Currencies, Users, args }) {
  try {
    const moment = require("moment-timezone");
    const format_day = moment().format('DD-MM-YYYY');
    const { increaseMoney , decreaseMoney } = Currencies;
    const { threadID, messageID, senderID } = event;
    const { sendMessage: HakiraSEND } = api;

    const name = await Users.getNameUser(senderID);
    const money = (await Currencies.getData(senderID)).money;

    const inputRaw = args[0];
    const bet = parseInt((args[1] == "all" ? money : args[1]));
    const tong = parseInt(args[2]);

    if(!inputRaw)
      return HakiraSEND("Bạn chưa nhập tài/xỉu/ (bbgn) bộ ba giống nhau/ (b2gn) bộ đôi giống nhau/ (ct) cược tổng/ (cs) cược số", threadID, messageID);

    if(!bet || isNaN(bet))
      return HakiraSEND("Số tiền không hợp lệ.", threadID, messageID);

    if(bet < 1000)
      return HakiraSEND("Bạn cần đặt cược tối thiểu 1000 VND", threadID, messageID);

    if(bet > money)
      return HakiraSEND("Bạn không đủ tiền để đặt cược", threadID, messageID);

    const i0 = norm(inputRaw);
    let choose = null;
    if (["tài","tai","-t"].includes(i0)) choose = "tài";
    else if (["xỉu","xiu","-x"].includes(i0)) choose = "xỉu";
    else if (["b3gn","bbgn","bộ ba giống nhau"].includes(i0)) choose = "b3gn";
    else if (["b2gn","bdgn","bộ đôi giống nhau"].includes(i0)) choose = "b2gn";
    else if (["cược tổng","ct"].includes(i0)) choose = "cuoctong";
    else if (["cược số","cs"].includes(i0)) choose = "cuocso";

    const tag = ['tài','xỉu','b3gn','b2gn','cuoctong','cuocso'];
    if(!choose || !tag.includes(choose))
      return HakiraSEND('Sai Tag', threadID, messageID);

    if(choose == 'cuoctong' && (isNaN(tong) || tong < 4 || tong > 17))
      return HakiraSEND("Tổng cược không hợp lệ ?", threadID, messageID);

    if(choose == 'cuocso' && (isNaN(tong) || tong < 1 || tong > 6))
      return HakiraSEND("Số được chọn không hợp lệ ?", threadID, messageID);

    const number = [], img = [];
    for(let i = 0; i < 3; i++){
      const n = Math.floor(Math.random() * 6) + 1;
      number.push(n);
      const stream = await getDiceStream(n);
      img.push(stream);
      await new Promise(resolve => setTimeout(resolve, timedelay * 0));
    }

    const total = number[0] + number[1] + number[2];
    let ans, result, mn, mne;

    if(choose == 'cuocso'){
      if(number.filter(v => v == tong).length === 1){
        ans = `${tong}`; result = 'win'; mn = bet * motsogiong; mne = money + mn;
      } else if (number.filter(v => v == tong).length === 2){
        ans = `${tong}`; result = 'win'; mn = bet * haisogiong; mne = money + mn;
      } else if (number.filter(v => v == tong).length === 3){
        ans = `${tong}`; result = 'win'; mn = bet * basogiong; mne = money + mn;
      } else {
        ans = `${tong}`; result = 'lose'; mn = bet; mne = money - mn;
      }
    }

    if(choose == 'cuoctong'){
      if(total == tong){
        ans = "cược tổng"; result = 'win'; mn = bet * parseInt(getRATE(tong)); mne = money + mn;
      } else {
        ans = `${total}`; result = 'lose'; mn = bet; mne = money - mn;
      }
    }

    if(choose == 'b3gn'){
      if(number[0] == number[1] && number[1] == number[2]) {
        ans = "bộ ba đồng nhất"; result = 'win'; mn = bet * tilethangb3dn; mne = money + mn;
      } else {
        ans = (total >= 11 && total <= 18 ? "tài" : "xỉu"); result = 'lose'; mn = bet; mne = money - mn;
      }
    }

    if(choose == 'b2gn'){
      if(number[0] == number[1] || number[1] == number[2] || number[0] == number[2]) {
        ans = "bộ hai đồng nhất"; result = 'win'; mn = bet * tilethangb2dn; mne = money + mn;
      } else {
        ans = (total >= 11 && total <= 18 ? "tài" : "xỉu"); result = 'lose'; mn = bet; mne = money - mn;
      }
    }

    if(choose == 'tài' || choose == 'xỉu') {
      if(number[0] == number[1] && number[1] == number[2]) {
        ans = "bộ ba đồng nhất"; result = 'lose'; mn = bet; mne = money - mn;
      } else {
        ans = (total >= 11 && total <= 18 ? "tài" : "xỉu");
        if(ans == choose){ result = 'win'; mn = bet * tilethang; mne = money + mn; }
        else { result = 'lose'; mn = bet; mne = money - mn; }
      }
    }

    if(result =='lose') await decreaseMoney(senderID, mn);
    else if(result == 'win') await increaseMoney(senderID, mn);

    let msg =
      `[ TÀI XỈU ONLINE ]\n` +
      `- Người Chơi: ${name} Đã Lựa Chọn: ${choose}\n` +
      `- Tổng ba xúc xắc: ${total}\n` +
      `- Kết Quả: ${ans}\n` +
      `- Bạn cược ${choose} với số tiền ${replace(bet)} VND và ${(result == 'win' ? 'Thắng' : 'Thua')}: ${replace(Math.floor(mn))} VND\n` +
      `- Số Tiền Hiện Tại: ${replace(mne)} VND`;

    await HakiraSEND({ body: msg, attachment: img }, threadID, messageID);

    if(bdsd === true) {
      const bill =
        `MiraiPay, Ngày ${format_day}\n` +
        `${(result == 'win') ? 'nhận tiền' : 'trừ tiền'} dịch vụ game tài xỉu\n` +
        `số tiền ${replace(mn)}\n` +
        `Số dư khả dụng: ${replace(mne)}$\n` +
        `Cảm ơn đã tin dùng dịch vụ của MiraiPay`;
      await HakiraSEND({ body: bill }, senderID);
    }
  } catch (e) {
    console.log(e);
    return api.sendMessage(`Lỗi: ${e.message}`, event.threadID, event.messageID);
  }
};
