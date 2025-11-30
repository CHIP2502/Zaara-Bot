module.exports.config = {
    name: "top",
    version: "1.6.0",
    credits: "DC-Nam & Updated by Gojo Satoru",
    hasPermssion: 0,
    description: "Xem top money, level (kết hợp cultivation)... ở trong box hoặc server",
    usages: "[boxmoney|boxlevel|svmoney|svlevel] + độ dài list(ko có mặc định là 10)",
    commandCategory: "Box",
    cooldowns: 5
};

function getCultivationRealm(level) {
    const realms = [
        { name: "Luyện Khí", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Trúc Cơ", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Khai Quang", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Kim Đan", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Nguyên Anh", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Hóa Thần", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Phản Hư", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Luyện Hư", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Hợp Thể", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Đại Thừa", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Độ Kiếp", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Thiên Tiên", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Chân Tiên", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Kim Tiên", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Thánh Nhân", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Đại Thánh", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Tiên Đế", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Tiên Tôn", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Hỗn Độn", levels: 9, subRealms: ["Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"] },
        { name: "Vô Cực", levels: 1, subRealms: ["Viên Mãn"] }
    ];



    let currentLevel = 0;
    for (let realm of realms) {
        if (level > currentLevel && level <= currentLevel + realm.levels) {
            const subRealmIndex = Math.floor((level - currentLevel - 1) / (realm.levels / realm.subRealms.length));
            return `${realm.name} ${realm.subRealms[subRealmIndex]}`;
        }
        currentLevel += realm.levels;
    }

    return "Tiên Tôn Viên Mãn";
}

function getMoneyFortune(money) {
    const fortunes = [
        "Tài lộc đang đến, cơ hội làm giàu sắp xuất hiện!",
        "Cẩn thận trong chi tiêu, thời gian này dễ hao tài tốn của.",
        "Có người muốn mượn tiền, nên cân nhắc kỹ trước khi cho mượn.",
        "Đầu tư thông minh sẽ mang lại lợi nhuận lớn trong tương lai gần.",
        "Tiền bạc hanh thông, có thể mua sắm những thứ mình thích.",
        "Nên tiết kiệm, thời gian tới có thể có những khoản chi phí bất ngờ.",
        "Có cơ hội kiếm thêm thu nhập từ nghề tay trái.",
        "Cẩn thận với những lời mời gọi đầu tư, có thể là lừa đảo.",
        "Sắp có người trả nợ hoặc hoàn trả tiền đã cho mượn từ lâu.",
        "Nên làm từ thiện, giúp đỡ người khác sẽ mang lại phúc đức về tiền bạc."
    ];

    const fortuneIndex = Math.floor((money * 17) % fortunes.length);
    return fortunes[fortuneIndex];
}

module.exports.run = async function ({
    api: a,
    event: e,
    args: g,
    Currencies,
    Users
}) {
    const {
        threadID: t,
        messageID: m,
        senderID: s,
        participantIDs: pI
    } = e
    var arr = [],
        newArr = [],
        msg = "",
        type = g[0],
        leng = parseInt(g[1]) - 1
    const allType = ["boxmoney", "boxlevel", "svmoney", "svlevel"]
    if (!allType.includes(type)) return a.sendMessage(`===== 𝗧𝗢𝗣 =====\n━━━━━━━━━━━━━━━━\nNhập 𝗧𝗢𝗣 bạn muốn xem\n→ Top boxmoney: xem những người có số tiền nhiều nhất ở nhóm\n→ Top boxlevel: xem những người có level và cảnh giới tu tiên cao nhất ở nhóm\n→ Top svmoney: xem top 10 đại gia giàu nhất hệ thống bot\n→ Top svlevel: xem top 10 người có level và cảnh giới tu tiên cao nhất hệ thống bot\n━━━━━━━━━━━━━━━━\n𝗩𝗗: /top svmoney`, t, m)
    if (isNaN(leng) && leng) return a.sendMessage(`Độ dài list phải là 1 con số`, t, m)
    switch (type) {
        case "boxmoney": {
            for (const id of pI) {
                let money = (await Currencies.getData(id)).money || 0
                arr.push({
                    id: id,
                    money: money,
                    fortune: getMoneyFortune(money)
                })
            }
            arr.sort(S("money"))
            for (const i in arr) {
                newArr.push({
                    stt: i,
                    id: arr[i].id,
                    money: arr[i].money,
                    fortune: arr[i].fortune
                })
            }
            msg = `==== [ 𝗧𝗢𝗣 10 TỶ PHÚ ] ====\n━━━━━━━━━━━━━━━━━━\n`.toUpperCase()
            for (const i in newArr) {
                let name = (await Users.getData(newArr[i].id)).name || ""
                msg += `${i < 4 ? ICON(i) : `${i}.`} ${name}\n→ Số tiền: ${CC(newArr[i].money)}$\n→ Tử vi: ${newArr[i].fortune}\n\n`
                if (i == leng && i < newArr.length || i == 10) break
            }
            let find = newArr.find(i => i.id == s)
            msg += TX("money", find.stt, find.money, find.fortune)
            a.sendMessage(msg, t, m)
        }
            break;
        case "svmoney": {
            let get = await Currencies.getAll(['userID', 'money'])
            get.sort(S("money"))
            for (const i in get) {
                arr.push({
                    stt: i,
                    id: get[i].userID,
                    money: get[i].money,
                    fortune: getMoneyFortune(get[i].money)
                })
            }
            msg = `==== [ 𝗧𝗢𝗣 10 TỶ PHÚ ] ====\n━━━━━━━━━━━━━━━━━━\n`.toUpperCase()
            for (const i in arr) {
                let name = (await Users.getData(arr[i].id)).name || ""
                msg += `${i < 4 ? ICON(i) : `${i}.`} ${name}\n→ Số tiền: ${CC(arr[i].money)}$\n→ Tử vi: ${arr[i].fortune}\n\n`
                if (i == leng && i < arr.length || i == 10) break
            }
            let find = arr.find(i => i.id == s)
            msg += TX("money", find.stt, find.money, find.fortune)
            a.sendMessage(msg, t, m)
        }
            break;
        case "boxlevel": {
            for (const id of pI) {
                let exp = (await Currencies.getData(id)).exp || 0
                let userData = await Users.getData(id)
                let level = LV(exp)
                arr.push({
                    id: id,
                    name: userData.name,
                    exp: exp,
                    level: level,
                    realm: getCultivationRealm(level)
                })
            }
            arr.sort(S("level"))
            for (const i in arr) {
                newArr.push({
                    stt: i,
                    id: arr[i].id,
                    name: arr[i].name,
                    level: arr[i].level,
                    realm: arr[i].realm
                })
            }
            msg = `== [ 𝗧𝗢𝗣 10 TU TIÊN NHÓM ] ==\n━━━━━━━━━━━━━━━━━━\n`.toUpperCase()
            for (const i in newArr) {
                msg += `${i < 4 ? ICON(i) : `${i}.`} ${newArr[i].name}\n→ Level: ${newArr[i].level}\n→ Cảnh giới: ${newArr[i].realm}\n\n`
                if (i == leng && i < newArr.length || i == 10) break
            }
            let find = newArr.find(i => i.id == s)
            msg += TX("level", find.stt, find.level, find.realm)
            a.sendMessage(msg, t, m)
        }
            break;
        case "svlevel": {
            let get = await Currencies.getAll(['userID', 'exp'])
            for (const user of get) {
                let userData = await Users.getData(user.userID)
                let level = LV(user.exp)
                arr.push({
                    id: user.userID,
                    name: userData.name,
                    exp: user.exp,
                    level: level,
                    realm: getCultivationRealm(level)
                })
            }
            arr.sort(S("level"))
            msg = `= [ 𝗧𝗢𝗣 𝟭𝟬 TU TIÊN 𝗦𝗘𝗩𝗘𝗥 ] =\n━━━━━━━━━━━━━━━━━━\n`.toUpperCase()
            for (const i in arr) {
                msg += `${i < 4 ? ICON(i) : `${i}.`} ${arr[i].name}\n→ Level: ${arr[i].level}\n→ Cảnh giới: ${arr[i].realm}\n\n`
                if (i == leng && i < arr.length || i == 10) break
            }
            let find = arr.find(i => i.id == s)
            msg += TX("level", find.stt, find.level, find.realm)
            a.sendMessage(msg, t, m)
        }
            break;
    }
}

function LV(x) {
    return Math.floor((Math.sqrt(1 + (4 * x) / 3) + 1) / 2)
}

function CC(n) {
    return n.toLocaleString('en-US', {
        minimumFractionDigits: 2
    })
}

function ICON(i) {
    return i == 0 ? "🏆" : i == 1 ? "🥇" : i == 2 ? "🥈" : i == 3 ? "🥉" : ""
}

function S(k) {
    return function (a, b) {
        let i = 0;
        if (a[k] > b[k]) {
            i = 1
        } else if (a[k] < b[k]) {
            i = -1
        }
        return i * -1
    }
}

function TX(tx, i, x, y) {
    return `━━━━━━━━━━━━━━━━━━\n${i >= 11 ? `→ Bạn đứng thứ: ${i}\n→ ${tx == "money" ? `Số tiền: ${CC(x)}$\n→ Tử vi: ${y}` : `Level: ${x}\n→ Cảnh giới: ${y}`}` : i >= 1 && i <= 4 ? "→ Bạn hiện đang có mặt trong 𝗧𝗢𝗣 " : i == 0 ? "→ Hiện tại bạn đang là người đứng 𝗧𝗢𝗣 đầu" : "→ Hiện tại bạn đang có mặt trong 𝗧𝗢𝗣 10"}`
}