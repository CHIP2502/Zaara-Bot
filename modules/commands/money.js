module.exports.config = {
  name: "money",
  version: "1.0.3",
  hasPermssion: 0,
  credits: "ntkiendz",
  description: "Kiểm tra số tiền của bản thân hoặc người được tag",
  commandCategory: "Bank",
  usages: "[Tag | reply]",
  cooldowns: 5
};

// Hàm định dạng tiền: $ (k/m/b/kb/mb/gb/g)
function formatMoney(money) {
  const units = [
    { value: 36n, label: 'g' },
    { value: 27n, label: 'gb' },
    { value: 24n, label: 'mb' },
    { value: 21n, label: 'kb' },
    { value: 18n, label: 'b' },
    { value: 15n, label: 'm' },
    { value: 12n, label: 'k' }
  ];
  money = BigInt(money);
  for (let u of units) {
    if (money >= 10n ** u.value) return money.toString() + ` $ (${u.label})`;
  }
  return money.toString() + '$';
}

module.exports.run = async function({ api, event, args, Currencies, Users }) {
  const { threadID, messageID, senderID, messageReply, mentions } = event;

 // Hàm định dạng tiền: thêm dấu , ngăn cách số
function formatMoney(money) {
  const units = [
    { value: 36n, label: 'g' },
    { value: 27n, label: 'gb' },
    { value: 24n, label: 'mb' },
    { value: 21n, label: 'kb' },
    { value: 18n, label: 'b' },
    { value: 15n, label: 'm' },
    { value: 12n, label: 'k' }
  ];
  money = BigInt(money);

  // thêm dấu phẩy cho số đầy đủ
  const full = money.toLocaleString("en-US");

  for (let u of units) {
    if (money >= 10n ** u.value) 
      return `${full}$ (${u.label})`;
  }

  return `${full}$`;
}
  // Nếu reply tin nhắn
  if (messageReply) {
    const targetID = messageReply.senderID;
    const name = await Users.getNameUser(targetID);
    const data = await Currencies.getData(targetID);
    const money = formatMoney(data.money || 0n);
    return api.sendMessage(`Số tiền của ${name} hiện đang có: ${money}`, threadID, messageID);
  }

  // Nếu mention người khác
  if (Object.keys(mentions).length === 1) {
    const targetID = Object.keys(mentions)[0];
    const name = await Users.getNameUser(targetID);
    const data = await Currencies.getData(targetID);
    const money = formatMoney(data.money || 0n);
    return api.sendMessage({
      body: `Số tiền của ${name} hiện đang có: ${money}`,
      mentions: [{ tag: name, id: targetID }]
    }, threadID, messageID);
  }

  // Nếu không có args, hiển thị tiền bản thân
  const name = await Users.getNameUser(senderID);
  const data = await Currencies.getData(senderID);
  const money = formatMoney(data.money || 0n);
  return api.sendMessage(`Số tiền bạn đang có: ${money}`, threadID, messageID);
};