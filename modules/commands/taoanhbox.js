const axios = require("axios");
const fs = require("fs-extra");
const Canvas = require("canvas");
const Jimp = require("jimp");
const superfetch = require("node-superfetch");
const path = require("path");
const fontPath = __dirname + "/cache/TUVBenchmark.ttf";

module.exports.config = {
    name: "taoanhbox",
    version: "2.4.1",
    hasPermssion: 1,
    credits: "shion - key chinhle",
    description: "Tạo ảnh all thành viên trong box kèm avatar box ở trên, delay tránh block",
    commandCategory: "Box",
    usages: "taoanhbox <size> [#mã màu] <tiêu đề>",
    cooldowns: 5,
    dependencies: {
        "fs-extra": "",
        "axios": "",
        "canvas": "",
        "jimp": "",
        "node-superfetch": "",
        "chalk": ""
    }
};

const tokensData = JSON.parse(fs.readFileSync(path.join(process.cwd(), "bot/data/tokens.json"), "utf8"));

const fbTokens = [tokensData["EAAAAU"]].filter(Boolean);

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAvatar(uid) {
    const urls = fbTokens.map(token =>
        `https://graph.facebook.com/${uid}/picture?height=720&width=720&access_token=${token}`
    );

    try {
        return await Promise.any(urls.map(url => superfetch.get(url).then(r => r.body)));
    } catch {
        return fs.readFileSync(`${__dirname}/cache/noavatar.png`);
    }
}

module.exports.circle = async (image) => {
    const img = await Jimp.read(image);
    img.circle();
    return await img.getBufferAsync(Jimp.MIME_PNG);
};


module.exports.run = async ({ event, api, args }) => {
    const khungAvtUrl = "https://i.imgur.com/gYxZFzx.png";
    const bgList = [
        'https://i.imgur.com/P3QrAgh.jpg',
        'https://i.imgur.com/RueGAGI.jpg',
        'https://i.imgur.com/bwMjOdp.jpg',
        'https://i.imgur.com/trR9fNf.jpg'
    ];

    const { threadID, messageID } = event;
    api.sendMessage('✅ Đang tạo ảnh', threadID, messageID);

    // Font
    if (!fs.existsSync(fontPath)) {
        return api.sendMessage("❌ Không tìm thấy font TUVBenchmark.ttf trong thư mục cache/", threadID, messageID);
    }
    Canvas.registerFont(fontPath, { family: "TUVBenchmark" });

    // Load background + khung
    const background = await Canvas.loadImage(bgList[Math.floor(Math.random() * bgList.length)]);
    const bgX = background.width;
    const khungAvt = await Canvas.loadImage(khungAvtUrl);

    // Info nhóm
    const threadInfo = await api.getThreadInfo(threadID);
    const { participantIDs, adminIDs, name, userInfo, threadName, imageSrc } = threadInfo;
    const admin = adminIDs.map(e => e.id);
    const live = userInfo.filter(u => u.gender !== undefined);

    // Tham số
    let size, color, title;
    const image = bgX * 1000;
    const sizeParti = Math.floor(image / live.length);
    const sizeAuto = Math.floor(Math.sqrt(sizeParti));
    if (!args[0]) {
        size = sizeAuto;
        color = '#FFFFFF';
        title = threadName || name;
    } else {
        size = parseInt(args[0]);
        if (isNaN(size) || size < 10 || size > 1000) return api.sendMessage("Kích thước không hợp lệ!", threadID, messageID);
        color = args[1] || '#FFFFFF';
        title = args.slice(2).join(" ").trim() || threadName || name;
    }

    const l = parseInt(size / 15);
    const adminUsers = live.filter(u => admin.includes(u.id));
    const memberUsers = live.filter(u => !admin.includes(u.id));
    const totalUsers = [...adminUsers, ...memberUsers];
    const maxPerRow = Math.floor(bgX / (size + l));

    // ==== LẤY AVATAR BOX VÀO ĐẦU ====
    // Tải avatar nhóm, nếu có
    let boxAvatarBuffer;
    try {
        if (imageSrc) {
            // Nếu có ảnh nhóm
            const resp = await axios.get(imageSrc, { responseType: "arraybuffer" });
            boxAvatarBuffer = Buffer.from(resp.data, "binary");
        } else {
            boxAvatarBuffer = fs.readFileSync(`${__dirname}/cache/noavatar.png`);
        }
    } catch (e) {
        boxAvatarBuffer = fs.readFileSync(`${__dirname}/cache/noavatar.png`);
    }
    // Làm tròn avatar box
    const boxAvatarCircle = await module.exports.circle(boxAvatarBuffer);
    const boxAvtSize = size * 1.5; // Avatar box to hơn thành viên

    // Canvas tạm để vẽ avatar thành viên
    const tempCanvas = Canvas.createCanvas(bgX, 5000);
    const ctx = tempCanvas.getContext('2d');
    let i = 0;

    // ==== VẼ AVATAR BOX + TÊN NHÓM ====
    // avatar nhóm trên cùng, căn giữa
    let yBoxAvt = 80;
    ctx.drawImage(await Canvas.loadImage(boxAvatarCircle), Math.floor((bgX - boxAvtSize) / 2), yBoxAvt, boxAvtSize, boxAvtSize);

    // Tên nhóm dưới avatar box
    Canvas.registerFont(fontPath, { family: "TUVBenchmark" });
    let titleFontSize = Math.floor(boxAvtSize / 4);
    ctx.font = `${titleFontSize}px TUVBenchmark`;
    ctx.textAlign = "center";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#151515";
    ctx.strokeText(title, bgX / 2, yBoxAvt + boxAvtSize + titleFontSize + 10);
    ctx.fillStyle = color;
    ctx.fillText(title, bgX / 2, yBoxAvt + boxAvtSize + titleFontSize + 10);

    // Tính vị trí bắt đầu vẽ member (cách avatar box + tên box 1 chút)
    let startY = yBoxAvt + boxAvtSize + titleFontSize + 35;

    // ==== VẼ AVATAR THÀNH VIÊN, delay tránh block ====
    const drawAvatars = async (users, startY) => {
        let x = 0, y = startY;
        for (let index = 0; index < users.length;) {
            const rowUsers = users.slice(index, index + maxPerRow);
            const rowWidth = rowUsers.length * (size + l) - l;
            x = Math.floor((bgX - rowWidth) / 2);

            for (let user of rowUsers) {
                try {
                    await delay(150 + Math.floor(Math.random() * 120)); // delay 150-270ms mỗi lần
                    const avtUser = await fetchAvatar(user.id);
                    const avatar = await module.exports.circle(avtUser);
                    const avatarload = await Canvas.loadImage(avatar);
                    ctx.drawImage(avatarload, x, y, size, size);
                    if (admin.includes(user.id)) ctx.drawImage(khungAvt, x, y, size, size);
                    x += size + l;
                    i++;
                } catch (e) {
                    console.log("Lỗi: " + user.id, e.message);
                }
                index++;
            }
            y += size + l;
        }
        return y;
    };

    // VẼ ADMIN
    const lastYAdmin = await drawAvatars(adminUsers, startY);
    // VẼ THÀNH VIÊN
    const lastYMember = await drawAvatars(memberUsers, lastYAdmin + l);
    const actualHeight = lastYMember + l + 100;

    // Canvas cuối
    const imgCanvas = Canvas.createCanvas(bgX, actualHeight);
    const finalCtx = imgCanvas.getContext('2d');
    // Vẽ background
    for (let y = 0; y < actualHeight; y += background.height) {
        finalCtx.drawImage(background, 0, y, bgX, Math.min(background.height, actualHeight - y));
    }
    // Vẽ nội dung chính
    finalCtx.drawImage(tempCanvas, 0, 0);

    // Save
    const pathAVT = __dirname + `/cache/${Date.now() + 10000}.png`;
    const cutImage = await Jimp.read(imgCanvas.toBuffer());
    await cutImage.writeAsync(pathAVT);

    // Send
    return api.sendMessage({
        body: `🍗 Tổng: ${i} thành viên\n👑 Admin: ${adminUsers.length} | 👥 Member: ${memberUsers.length}\n📏 Kích thước ảnh: ${bgX} x ${actualHeight}\n🍠 Lọc ${participantIDs.length - i} người dùng ẩn`,
        attachment: fs.createReadStream(pathAVT)
    }, threadID, (err) => {
        if (err) api.sendMessage(`Đã xảy ra lỗi: ${err}`, threadID, messageID);
        fs.unlinkSync(pathAVT);
    }, messageID);
};