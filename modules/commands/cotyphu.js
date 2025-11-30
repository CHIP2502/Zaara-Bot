/**
 * CỜ TỶ PHÚ VIỆT NAM - FULL 40 Ô, ĐẤU GIÁ, THẾ CHẤP, CANVAS, THỐNG KÊ
 * 
 * @author      KhangDev x LocDev
 * @version     3.0.0
 * @description Game Cờ Tỷ Phú với đầy đủ tính năng đấu giá, thế chấp.
 * @requires    canvas
 */
const fs = require("fs");
const path = require("path");
const Canvas = require('canvas');

module.exports.config = {
    name: "typhu",
    version: "3.0.0",
    hasPermssion: 0,
    credits: "KhangDev",
    description: "Cờ tỷ phú Việt Nam, trở thành tỷ phú hoặc phá sản.",
    commandCategory: "Game",
    usages: "[create/join/start/roll/buy/build/sell/stats/info/board/end]",
    usePrefix: false,
    cooldowns: 5,
    dependencies: { "canvas": "" }
};

// ==== CONSTANTS & CONFIG ====
const CACHE_DIR = path.join(__dirname, 'cache');
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

const GAME_DEFAULTS = {
    startingMoney: 10000,
    maxPlayers: 4,
    minPlayers: 2,
    passingGoMoney: 2000,
    auctionTime: 40,
    buyTime: 15,
    mortgageRate: 0.5,
    unmortgageRate: 0.6,
    bankruptThreshold: -1000
};
const PLAYER_COLORS = ["#e74c3c", "#3498db", "#27ae60", "#f1c40f"];
const PLAYER_ICONS = ["🔴", "🔵", "🟢", "🟡"];
const PROPERTY_COLORS = {
    brown: "#964B00", lightblue: "#5dade2", pink: "#ff69b4",
    orange: "#f39c12", red: "#e74c3c", yellow: "#f9e79f",
    green: "#27ae60", blue: "#344fa1"
};

// ==== CORRECTED BOARD CONSTANTS (SỬA LỖI LỆCH Ô) ====
const BOARD_SIZE = 1000;
const CORNER_SIZE = 140; // Điều chỉnh để có lưới hoàn hảo
const PROPERTY_LONG_SIDE = 140; // Cạnh dài của ô đất, bằng cạnh ô góc
const PROPERTY_SHORT_SIDE = 80; // Cạnh ngắn ô đất: (1000 - 2 * 140) / 9 = 720 / 9 = 80

// ==== BOARD DATA ====
// Dữ liệu bàn cờ đã được tái cấu trúc hoàn toàn theo phân tích
const BOARD_LIST = [
    // Cạnh Dưới
    { name: "BẮT ĐẦU", type: "start" },
    { name: "Hà Nội", type: "land", color: "blue", price: 4000, rent: [500, 2000, 6000, 14000, 17000, 20000], buildPrice: 2000 },
    { name: "KHÍ VẬN", type: "community" },
    { name: "Sài Gòn", type: "land", color: "blue", price: 3500, rent: [350, 1750, 5000, 11000, 13000, 15000], buildPrice: 2000 },
    { name: "THUẾ THU NHẬP", type: "tax", amount: 2000 },
    { name: "GA HÀ NỘI", type: "station", price: 2000, rent: [250, 500, 1000, 2000] },
    { name: "Đà Nẵng", type: "land", color: "green", price: 3200, rent: [280, 1500, 4500, 10000, 12000, 14000], buildPrice: 2000 },
    { name: "CƠ HỘI", type: "chance" },
    { name: "Hải Phòng", type: "land", color: "green", price: 3000, rent: [260, 1300, 3900, 9000, 11000, 12750], buildPrice: 2000 },
    { name: "Cần Thơ", type: "land", color: "green", price: 3000, rent: [260, 1300, 3900, 9000, 11000, 12750], buildPrice: 2000 },
    // Cạnh Trái
    { name: "NHÀ TÙ", type: "jail" },
    { name: "Huế", type: "land", color: "red", price: 2400, rent: [200, 1000, 3000, 7500, 9250, 11000], buildPrice: 1500 },
    { name: "KHÍ VẬN", type: "community" },
    { name: "Nghệ An", type: "land", color: "red", price: 2200, rent: [180, 900, 2500, 7000, 8750, 10500], buildPrice: 1500 },
    { name: "Vũng Tàu", type: "land", color: "yellow", price: 2800, rent: [240, 1200, 3600, 8500, 10250, 12000], buildPrice: 1500 },
    { name: "GA ĐÀ NẴNG", type: "station", price: 2000, rent: [250, 500, 1000, 2000] },
    { name: "Quảng Ninh", type: "land", color: "yellow", price: 2600, rent: [220, 1100, 3300, 8000, 9750, 11500], buildPrice: 1500 },
    { name: "NGÂN HÀNG", type: "utility", price: 1500 }, // Thay thế CTY ĐIỆN LỰC
    { name: "Nha Trang", type: "land", color: "yellow", price: 2600, rent: [220, 1100, 3300, 8000, 9750, 11500], buildPrice: 1500 },
    // Cạnh Trên
    { name: "ĐỖ XE MIỄN PHÍ", type: "freeparking" },
    { name: "Đồng Nai", type: "land", color: "orange", price: 2000, rent: [160, 800, 2200, 6000, 8000, 10000], buildPrice: 1000 },
    { name: "CƠ HỘI", type: "chance" },
    { name: "Long An", type: "land", color: "orange", price: 1800, rent: [140, 700, 2000, 5500, 7500, 9500], buildPrice: 1000 },
    { name: "Lâm Đồng", type: "land", color: "orange", price: 1800, rent: [140, 700, 2000, 5500, 7500, 9500], buildPrice: 1000 },
    { name: "GA SÀI GÒN", type: "station", price: 2000, rent: [250, 500, 1000, 2000] },
    { name: "Kiên Giang", type: "land", color: "pink", price: 1600, rent: [120, 600, 1800, 5000, 7000, 9000], buildPrice: 1000 },
    { name: "CTY NƯỚC SẠCH", type: "utility", price: 1500 },
    { name: "Bắc Giang", type: "land", color: "pink", price: 1400, rent: [100, 500, 1500, 4500, 6250, 7500], buildPrice: 1000 },
    { name: "Sơn La", type: "land", color: "pink", price: 1400, rent: [100, 500, 1500, 4500, 6250, 7500], buildPrice: 1000 },
    // Cạnh Phải
    { name: "VÀO TÙ", type: "goToJail" },
    { name: "Đà Lạt", type: "land", color: "lightblue", price: 1200, rent: [80, 400, 1000, 3000, 4500, 6000], buildPrice: 500 },
    { name: "SỰ KIỆN", type: "community" }, // Thay thế Pleiku
    { name: "Pleiku", type: "land", color: "lightblue", price: 1000, rent: [60, 300, 900, 2700, 4000, 5500], buildPrice: 500 },
    { name: "Biên Hòa", type: "land", color: "brown", price: 600, rent: [40, 200, 600, 1800, 3200, 4500], buildPrice: 500 },
    { name: "GA VINH", type: "station", price: 2000, rent: [250, 500, 1000, 2000] },
    { name: "Phú Quốc", type: "land", color: "brown", price: 600, rent: [20, 100, 300, 900, 1600, 2500], buildPrice: 500 },
    { name: "THUẾ ĐẶC BIỆT", type: "tax", amount: 1000 },
    { name: "Hạ Long", type: "land", color: "brown", price: 800, rent: [60, 300, 900, 2700, 4000, 5500], buildPrice: 500 }
];
const CHANCE_CARDS = [
    { text: "Bạn nhận được tiền thưởng cổ tức. Nhận $1,000.", action: "collectMoney", value: 1000 },
    { text: "Bạn bị phạt vì đi sai làn đường. Trả $500.", action: "payMoney", value: 500 },
    { text: "Tiến đến ô 'BẮT ĐẦU' và nhận $2,000.", action: "goto", position: 0, value: 2000 },
    { text: "Bạn được tặng quà sinh nhật. Nhận $200.", action: "collectMoney", value: 200 },
    { text: "Bạn đi lùi 3 bước.", action: "moveBack", value: 3 },
    { text: "Tiến đến ô Hà Nội.", action: "goto", position: 1 },
    { text: "Bạn trúng xổ số! Nhận $500.", action: "collectMoney", value: 500 },
    { text: "Nâng cấp nhà cửa, trả $300.", action: "payMoney", value: 300 },
    { text: "Hãy trả $200 cho mỗi người chơi khác.", action: "payAll", value: 200 },
    { text: "Thu phí bảo trì đất $400.", action: "payMoney", value: 400 },
    { text: "Nhận trợ cấp thất nghiệp $600.", action: "collectMoney", value: 600 },
    { text: "Tiến tới 'Cần Thơ'.", action: "goto", position: 9 },
    { text: "Bạn bị mất ví, mất $300.", action: "payMoney", value: 300 },
    { text: "Đi tới ô 'Nhà tù'.", action: "goto", position: 10 },
    { text: "Bạn được thăng chức, nhận $700.", action: "collectMoney", value: 700 },
    { text: "Nhận hoàn thuế $400.", action: "collectMoney", value: 400 },
    { text: "Bạn phải sửa nhà, trả $250.", action: "payMoney", value: 250 },
    { text: "Tiến tới ô 'Sài Gòn'.", action: "goto", position: 3 },
    { text: "Đi tới ô 'Bắc Ninh'.", action: "goto", position: 19 },
    { text: "Bạn bị phạt tốc độ, trả $100.", action: "payMoney", value: 100 }
];
const COMMUNITY_CARDS = [
    { text: "Bạn nhận được lãi tiết kiệm. Nhận $500.", action: "collectMoney", value: 500 },
    { text: "Bạn đóng góp từ thiện. Trả $300.", action: "payMoney", value: 300 },
    { text: "Tiến tới 'NHÀ TÙ'.", action: "goto", position: 10 },
    { text: "Bạn nhận được tiền thưởng công việc. Nhận $700.", action: "collectMoney", value: 700 },
    { text: "Bạn phải trả viện phí. Trả $400.", action: "payMoney", value: 400 },
    { text: "Nhận thưởng từ công ty. Nhận $1,200.", action: "collectMoney", value: 1200 },
    { text: "Bảo hiểm chi trả $500.", action: "collectMoney", value: 500 },
    { text: "Trả học phí $350.", action: "payMoney", value: 350 },
    { text: "Bạn bị mất đồ, trả $250.", action: "payMoney", value: 250 },
    { text: "Nhận quà khuyến mãi $300.", action: "collectMoney", value: 300 },
    { text: "Trúng giải thưởng mini, nhận $200.", action: "collectMoney", value: 200 },
    { text: "Trả phí dịch vụ công cộng $150.", action: "payMoney", value: 150 },
    { text: "Thu phí bảo trì tài sản $350.", action: "payMoney", value: 350 },
    { text: "Nhận quỹ hỗ trợ $800.", action: "collectMoney", value: 800 },
    { text: "Được miễn tiền thuê trong lượt tiếp theo.", action: "freeRentNext", value: 1 },
    { text: "Bạn được ra tù miễn phí.", action: "getOutOfJail", value: 1 },
    { text: "Tiến tới ô 'Hải Phòng'.", action: "goto", position: 8 },
    { text: "Nhận tiền thưởng đầu tư $900.", action: "collectMoney", value: 900 },
    { text: "Trả phí môi trường $600.", action: "payMoney", value: 600 },
    { text: "Nhận tiền thưởng công đoàn $400.", action: "collectMoney", value: 400 }
];

// ==== CORRECTED CANVAS FUNCTIONS ====
function getCellCoords(index) {
    // Cạnh dưới (ô 1-9)
    if (index > 0 && index < 10) return { x: BOARD_SIZE - CORNER_SIZE - (index) * PROPERTY_SHORT_SIDE, y: BOARD_SIZE - PROPERTY_LONG_SIDE, width: PROPERTY_SHORT_SIDE, height: PROPERTY_LONG_SIDE, rotation: 0 };
    // Cạnh trái (ô 11-19)
    if (index > 10 && index < 20) return { x: 0, y: BOARD_SIZE - CORNER_SIZE - (index - 10) * PROPERTY_SHORT_SIDE, width: PROPERTY_LONG_SIDE, height: PROPERTY_SHORT_SIDE, rotation: Math.PI / 2 };
    // Cạnh trên (ô 21-29)
    if (index > 20 && index < 30) return { x: CORNER_SIZE + (index - 21) * PROPERTY_SHORT_SIDE, y: 0, width: PROPERTY_SHORT_SIDE, height: PROPERTY_LONG_SIDE, rotation: Math.PI };
    // Cạnh phải (ô 31-39)
    if (index > 30 && index < 40) return { x: BOARD_SIZE - PROPERTY_LONG_SIDE, y: CORNER_SIZE + (index - 31) * PROPERTY_SHORT_SIDE, width: PROPERTY_LONG_SIDE, height: PROPERTY_SHORT_SIDE, rotation: -Math.PI / 2 };

    // Các ô góc
    if (index === 0) return { x: BOARD_SIZE - CORNER_SIZE, y: BOARD_SIZE - CORNER_SIZE, width: CORNER_SIZE, height: CORNER_SIZE, rotation: 0 };
    if (index === 10) return { x: 0, y: BOARD_SIZE - CORNER_SIZE, width: CORNER_SIZE, height: CORNER_SIZE, rotation: 0 };
    if (index === 20) return { x: 0, y: 0, width: CORNER_SIZE, height: CORNER_SIZE, rotation: 0 };
    if (index === 30) return { x: BOARD_SIZE - CORNER_SIZE, y: 0, width: CORNER_SIZE, height: CORNER_SIZE, rotation: 0 };
}

async function drawBoardCanvas(gameData, outputPath) {
    const canvas = Canvas.createCanvas(BOARD_SIZE, BOARD_SIZE);
    const ctx = canvas.getContext('2d');

    // Vẽ nền
    ctx.fillStyle = '#cde6d0'; // Monopoly classic green
    ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);

    // Font settings
    const TITLE_FONT = 'bold 15px Arial'; // Tăng kích thước font tên ô
    const PRICE_FONT = '13px Arial';    // Tăng kích thước font giá tiền

    // Vẽ các ô trên bàn cờ
    for (let i = 0; i < 40; i++) {
        const coords = getCellCoords(i);
        const cell = gameData.board && Array.isArray(gameData.board) ? gameData.board[i] : undefined;

        if (!coords) continue;

        ctx.save();
        ctx.translate(coords.x, coords.y);

        // Vẽ viền ô và nền
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, coords.width, coords.height);
        ctx.fillStyle = '#cde6d0';
        ctx.fillRect(1, 1, coords.width - 2, coords.height - 2);

        // Xoay ô nếu cần
        if (coords.rotation) {
            ctx.translate(coords.width / 2, coords.height / 2);
            ctx.rotate(coords.rotation);
            ctx.translate(-coords.width / 2, -coords.height / 2);
        }

        // Tính toán tọa độ văn bản tương đối trong ô ĐÃ XOAY
        // Điều này giúp đơn giản hóa việc căn chỉnh
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle'; // Căn giữa theo chiều dọc

        let contentX = coords.width / 2;
        let contentY = coords.height / 2;

        // Xử lý dải màu cho các nhóm đất (chỉ cho ô đất có màu)
        if (cell && cell.type === 'land' && cell.color) {
            const bandColor = PROPERTY_COLORS[cell.color];
            if (bandColor) {
                ctx.fillStyle = bandColor;
                ctx.fillRect(0, 0, coords.width, 25); // Dải màu luôn ở trên cùng của ô đã xoay
            }
        }
        
        // Điều chỉnh vị trí Y ban đầu của văn bản tùy thuộc vào loại ô
        let currentTextY = contentY;
        if (cell && (cell.type === 'land' || cell.type === 'station' || cell.type === 'utility')) {
            currentTextY = contentY + 10; // Đẩy văn bản xuống một chút để có không gian cho dải màu
        }

        // Vẽ tên ô
        ctx.fillStyle = '#000000';
        ctx.font = TITLE_FONT;
        const cellName = (cell && typeof cell.name === 'string' && cell.name.trim().length > 0) ? cell.name : `Ô ${i}`;
        const nameParts = cellName.split(' ');
        if (nameParts.length > 2 && coords.width < CORNER_SIZE) { // Chỉ chia dòng cho ô chữ nhật
            // Chia thành nhiều dòng nếu tên quá dài
            ctx.fillText(nameParts.slice(0, Math.ceil(nameParts.length / 2)).join(' '), contentX, currentTextY - 8);
            ctx.fillText(nameParts.slice(Math.ceil(nameParts.length / 2)).join(' '), contentX, currentTextY + 12);
        } else {
            const hasAmount = cell && (typeof cell.price === 'number' || typeof cell.amount === 'number');
            ctx.fillText(cellName, contentX, currentTextY - (hasAmount ? 10 : 0)); // Dịch lên nếu có giá
        }

        // Vẽ giá tiền nếu có
        if (cell && (typeof cell.price === 'number' || typeof cell.amount === 'number')) {
            const amountToShow = (typeof cell.price === 'number') ? cell.price : cell.amount;
            ctx.font = PRICE_FONT;
            ctx.fillStyle = '#000000';
            ctx.fillText(formatMoney(amountToShow), contentX, currentTextY + (nameParts.length > 2 ? 30 : 20)); // Dịch xuống dưới tên
        }

        // Vẽ thông tin sở hữu
        if (cell && cell.owner !== null && Array.isArray(gameData.playerIDs)) {
            const ownerIndex = gameData.playerIDs.findIndex(id => id === cell.owner);
            if (ownerIndex !== -1) {
                ctx.fillStyle = PLAYER_COLORS[ownerIndex] + '80'; // Add transparency
                ctx.fillRect(1, 1, coords.width - 2, coords.height - 2);
            }
        }

        // Vẽ số nhà nếu có
        if (cell && typeof cell.houses === 'number' && cell.houses > 0) {
            ctx.fillStyle = '#4caf50'; // Màu xanh lá cho nhà
            let houseX = 5;
            let houseY = 5; // Vị trí mặc định ở trên cùng
            if (cell.type === 'land' && cell.color) houseY = 30; // Dưới dải màu

            for (let h = 0; h < cell.houses; h++) {
                ctx.fillRect(houseX + (h * 15), houseY, 10, 10);
            }
        }
        ctx.restore();
    }

    // Vẽ vị trí người chơi
    gameData.playerPosArr.forEach((pos, idx) => {
        if (pos === null || pos === undefined) return; // Bỏ qua người chơi không hợp lệ
        if (!Array.isArray(gameData.playerIDs) || gameData.playerIDs[idx] === null) return;
        if (typeof pos !== 'number' || pos < 0 || pos >= 40) return;
        const coords = getCellCoords(pos);
        if (!coords) return;
        ctx.fillStyle = PLAYER_COLORS[idx];
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        let arcX, arcY;
        const padding = 25; // Khoảng đệm từ rìa ô
        const playerSize = 12; // Bán kính quân cờ
        const offset = idx * (playerSize * 2 + 4); // Offset để các quân cờ không chồng lên nhau

        if (pos % 10 === 0) { // Ô góc
            arcX = coords.x + padding + (idx % 2) * (coords.width - 2 * padding);
            arcY = coords.y + padding + Math.floor(idx / 2) * (coords.height - 2 * padding);
        } else if (pos > 0 && pos < 10) { // Cạnh dưới
            arcX = coords.x + coords.width / 2;
            arcY = coords.y + padding + offset;
        } else if (pos > 10 && pos < 20) { // Cạnh trái
            arcX = coords.x + coords.width - padding - offset;
            arcY = coords.y + coords.height / 2;
        } else if (pos > 20 && pos < 30) { // Cạnh trên
            arcX = coords.x + coords.width / 2;
            arcY = coords.y + coords.height - padding - offset;
        } else { // Cạnh phải
            arcX = coords.x + padding + offset;
            arcY = coords.y + coords.height / 2;
        }

        ctx.arc(arcX, arcY, playerSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    });

    // Vẽ thông tin người chơi ở giữa bàn cờ
    const centerBoxX = CORNER_SIZE;
    const centerBoxY = CORNER_SIZE;
    const centerBoxWidth = BOARD_SIZE - 2 * CORNER_SIZE;

    ctx.font = 'bold 60px Arial';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.7)';
    ctx.shadowBlur = 10;
    ctx.fillText("CỜ TỶ PHÚ", centerBoxX + centerBoxWidth / 2, centerBoxY + 90);
    ctx.shadowColor = 'transparent';
    ctx.font = '22px Arial';
    let yPos = centerBoxY + 150;
    gameData.playerNames.forEach((name, idx) => {
        ctx.fillStyle = PLAYER_COLORS[idx];
        ctx.textAlign = 'left';
        if (idx === gameData.currentIdx) {
            ctx.fillText('▶', centerBoxX + 50, yPos);
        }
        ctx.fillText(`${PLAYER_ICONS[idx]} ${name}: ${formatMoney(gameData.playerMoney[idx])}`, centerBoxX + 80, yPos);
        yPos += 40;
    });

    // Lưu canvas thành file
    const buffer = canvas.toBuffer();
    fs.writeFileSync(outputPath, buffer);
    return outputPath;
}

// ==== NOTIFICATION FUNCTIONS ====
const notifyPlus = {
    gameStart: async (api, threadID, game) => {
        let caption = "🎮 Trò chơi bắt đầu!\n\n";
        caption += "📝 Danh sách người chơi:\n";
        game.players.forEach((player, idx) => {
            caption += `${player.icon} ${player.name} - ${formatMoney(player.money)}\n`;
        });
        caption += `\n👉 Lượt đầu tiên: ${game.players[game.currentPlayerIndex].name}`;
        caption += `\n🎲 Gõ 'roll' để tung xúc xắc và bắt đầu cuộc đua!`;

        const fileName = `ban_co_start_${threadID}.png`;
        const tempImg = await drawBoardCanvas({
            playerPosArr: game.players.map(p => p.position),
            playerNames: game.players.map(p => p.name),
            playerIDs: game.players.map(p => p.userID),
            playerMoney: game.players.map(p => p.money),
            currentIdx: game.currentPlayerIndex,
            board: game.board
        }, path.join(CACHE_DIR, fileName));

        await api.sendMessage({
            body: caption,
            attachment: fs.createReadStream(tempImg)
        }, threadID, () => {
            try { fs.unlinkSync(tempImg); } catch (e) { }
        });
    },
    turnStart: async (api, threadID, player, game) => {
        let msg = `🎲 Đến lượt: ${player.name}\n`;
        msg += `💰 Tiền hiện tại: ${formatMoney(player.money)}\n`;
        msg += `📍 Đang đứng tại: ${game.board[player.position].name}\n`;
        if (player.inJail) {
            msg += "⚠️ Bạn đang ở trong nhà tù!\n";
            if (player.hasJailFreeCard) {
                msg += "💡 Bạn có thẻ ra tù miễn phí, sẽ tự động sử dụng.";
            } else {
                msg += `🔒 Còn ${3 - player.jailTurn} lượt nữa mới được ra.`;
            }
        } else {
            msg += "💡 Gõ 'roll' để tung xúc xắc và di chuyển!";
        }
        await api.sendMessage(msg, threadID);
    },
    diceRoll: async (api, threadID, player, dice1, dice2) => {
        const msg = `🎲 ${player.name} tung xúc xắc: ${dice1} + ${dice2} = ${dice1 + dice2}`;
        await api.sendMessage(msg, threadID);
    },

    landOnProperty: async (api, threadID, player, property, game) => {
        let msg = `📍 ${player.name} đã dừng tại ô: ${property.name}\n`;
        if (!property.owner) {
            msg += `💰 Giá mua: ${formatMoney(property.price)}\n`;
            msg += "💡 Gõ 'buy' để mua hoặc chờ đấu giá nếu không mua.";
        } else if (property.owner === player.userID) {
            msg += "✨ Đây là đất của bạn!";
        } else {
            const owner = game.players.find(p => p.userID === property.owner);
            const rent = property.rent[property.houses || 0];
            msg += `👤 Chủ đất: ${owner.name}\n`;
            msg += `💸 Tiền thuê phải trả: ${formatMoney(rent)}`;
        }
        await api.sendMessage(msg, threadID);
    },

    propertyBought: async (api, threadID, player, property) => {
        const msg = `🥳 ${player.name} chốt đơn ${property.name} với giá ${formatMoney(property.price)}! Lướt nhẹ luôn!`;
        await api.sendMessage(msg, threadID);
    },
    cantAfford: async (api, threadID, player, amount) => {
        const msg = `🪦 ${player.name} không đủ lúa đâu! (Còn thiếu: ${formatVND(amount)})`;
        await api.sendMessage(msg, threadID);
    },
    bankruptcy: async (api, threadID, player) => {
        const msg = `💥 ${player.name} đã phá sản và bị loại khỏi trò chơi!`;
        await api.sendMessage(msg, threadID);
    },
    gameEnd: async (api, threadID, winner) => {
        const msg = `🎉 GAME ĐÃ KẾT THÚC!\n\n👑 NGƯỜI CHIẾN THẮNG: ${winner.name}\n💰 SỐ TIỀN: ${formatMoney(winner.money)}\n\nCảm ơn mọi người đã chơi!`;
        await api.sendMessage(msg, threadID);
    },
    passGo: async (api, threadID, player) => {
        const msg = `✅ ${player.name} đã đi qua ô Bắt Đầu và nhận ${formatMoney(GAME_DEFAULTS.passingGoMoney)}!`;
        await api.sendMessage(msg, threadID);
    },
    freeRent: async (api, threadID, player) => {
        const msg = `🎫 ${player.name} đã sử dụng thẻ miễn tiền thuê!`;
        await api.sendMessage(msg, threadID);
    },
    payRent: async (api, threadID, player, owner, rent) => {
        const msg = `💸 ${player.name} đã trả ${formatMoney(rent)} tiền thuê cho ${owner.name}.`;
        await api.sendMessage(msg, threadID);
    },
    landOnOwnProperty: async (api, threadID, player, land) => {
        const msg = `🏠 ${player.name} đã về thăm nhà tại ${land.name}.`;
        await api.sendMessage(msg, threadID);
    },
    payTax: async (api, threadID, player, amount) => {
        const msg = `💸 ${player.name} đã nộp thuế ${formatMoney(amount)}.`;
        await api.sendMessage(msg, threadID);
    },
    landOnJail: async (api, threadID, player) => {
        const msg = `👮 ${player.name} chỉ đến thăm tù thôi!`;
        await api.sendMessage(msg, threadID);
    },
    goToJail: async (api, threadID, player) => {
        const msg = `🚓 ${player.name} đã bị bắt và phải vào tù!`;
        await api.sendMessage(msg, threadID);
    },
    getOutOfJail: async (api, threadID, player) => {
        const msg = `🎉 ${player.name} đã được ra tù!`;
        await api.sendMessage(msg, threadID);
    },
    freeParking: async (api, threadID, player) => {
        const msg = `🅿️ ${player.name} được đỗ xe miễn phí.`;
        await api.sendMessage(msg, threadID);
    }
};

// ==== GAME STATE & UTILS ====
const gameRooms = new Map();
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
function formatMoney(amount) {
    if (typeof amount !== "number") return amount;
    return "$" + amount.toLocaleString("vi-VN");
}
function getBoardCaption(game) {
    let caption = "🟩 Bàn cờ Tỷ Phú Việt Nam\n";
    for (const p of game.players) {
        if (p.isBankrupt) continue;
        caption += `• ${p.name} [Vị trí: ${p.position} - ${game.board[p.position]?.name}] [Tiền: ${formatMoney(p.money)}]${game.players[game.currentPlayerIndex].userID === p.userID ? " 👈 (Lượt đi)" : ""}\n`;
    }
    return caption;
}

// ==== HELPER FUNCTIONS ====
function createPlayer(userID, name, index) {
    return {
        userID,
        name,
        money: GAME_DEFAULTS.startingMoney,
        position: 0, // Thêm dấu phẩy
        properties: [], // Thêm thuộc tính này
        inJail: false,
        jailTurn: 0,
        hasJailFreeCard: false,
        freeRentNext: false,
        isBankrupt: false,
        color: PLAYER_COLORS[index],
        icon: PLAYER_ICONS[index % PLAYER_ICONS.length], // Sửa để tránh lỗi nếu nhiều hơn 4 người chơi
        stats: {
            rolls: 0,
            properties: 0,
            mortgage: 0,
            unmortgage: 0,
            jailVisits: 0,
            moneyPeak: GAME_DEFAULTS.startingMoney,
            moneyLost: 0,
            crisisCount: 0,
            swapCount: 0,
            frozenCount: 0
        },
        antiScam: {
            active: false,
            turnsLeft: 0
        },
        trafficJam: {
            active: false,
            turnsLeft: 0
        },
        reverseDirection: { active: false, turnsLeft: 0, startTurn: 0 },
        lockedArea: { active: false, turnsLeft: 0, startTurn: 0, start: 0, end: 0, penalty: false },
        propertyTrap: { active: false, turnsLeft: 0, startTurn: 0, position: 0, penalty: 0 },
        eventHistory: [],
        pendingMessages: [],
        moveDirection: 1
    };
}

const SPECIAL_EVENTS = [
    {
        id: 3,
        name: "🔄 Đảo Chiều Di Chuyển",
        description: "Mọi người phải đi ngược chiều trong 3 lượt tới!",
        type: "reverse_direction",
        duration: 3,
        onActivate: (game, player) => {
            game.reverseDirection = {
                active: true,
                turnsLeft: 3,
                startTurn: game.currentTurn
            };
            game.moveDirection = -1; // -1: ngược chiều, 1: thuận chiều

            return {
                title: "🔄 KÍCH HOẠT ĐẢO CHIỀU!",
                message: "Tất cả sẽ di chuyển ngược chiều trong 3 lượt tới.",
                effect: "reverse_move"
            };
        },
        onDeactivate: (game) => {
            game.reverseDirection.active = false;
            game.moveDirection = 1;
            return "🔄 Hết hiệu lực đảo chiều, mọi người đi bình thường.";
        }
    },
    {
        id: 4,
        name: "💥 Khủng Hoảng Kinh Tế",
        description: "Các nhà đầu tư hoảng loạn! Mất 20% số tiền mặt.",
        type: "economic_crisis",
        onActivate: (game, player) => {
            let report = {
                title: "💥 KHỦNG HOẢNG KINH TẾ!",
                message: "Thị trường sụp đổ, mọi người mất 20% tiền mặt:\n\n",
                losses: []
            };
            game.players.forEach(p => {
                if (!p.isBankrupt && p.money > 0) {
                    const loss = Math.floor(p.money * 0.2);
                    p.money -= loss;
                    report.losses.push({
                        player: p.name,
                        amount: loss
                    });
                    p.stats.moneyLost += loss;
                    p.stats.crisisCount = (p.stats.crisisCount || 0) + 1;
                }
            });
            return report;
        }
    },
    {
        id: 5,
        name: "🎲 Hoán Đổi Vị Trí",
        description: "Mọi người bị hoán đổi vị trí ngẫu nhiên!",
        type: "position_swap",
        onActivate: (game, player) => {
            const activePlayers = game.players.filter(p => !p.isBankrupt);
            const positions = activePlayers.map(p => p.position);
            for (let i = positions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [positions[i], positions[j]] = [positions[j], positions[i]];
            }
            let report = {
                title: "🎲 HOÁN ĐỔI VỊ TRÍ!",
                message: "Mọi người đổi vị trí:\n\n",
                swaps: []
            };
            activePlayers.forEach((p, idx) => {
                const oldPos = p.position;
                p.position = positions[idx];
                report.swaps.push({
                    player: p.name,
                    from: game.board[oldPos].name,
                    to: game.board[p.position].name
                });
                p.stats.swapCount = (p.stats.swapCount || 0) + 1;
            });
            return report;
        }
    },
    {
        id: 6,
        name: "🕳️ Hố Đen Tài Chính",
        description: "Tài khoản trên $500 bị phong tỏa 2 lượt!",
        type: "financial_blackhole",
        duration: 2,
        onActivate: (game, player) => {
            const THRESHOLD = 500000;
            let report = {
                title: "🕳️ HỐ ĐEN TÀI CHÍNH!",
                message: "Tài khoản >500K bị phong tỏa:\n\n",
                frozen: []
            };
            game.players.forEach(p => {
                if (!p.isBankrupt && p.money > THRESHOLD) {
                    p.frozen = {
                        active: true,
                        turnsLeft: 2,
                        startTurn: game.currentTurn
                    };
                    report.frozen.push({
                        player: p.name,
                        money: p.money
                    });
                    p.stats.frozenCount = (p.stats.frozenCount || 0) + 1;
                }
            });
            return report;
        },
        onDeactivate: (game) => {
            game.players.forEach(p => {
                if (p.frozen?.active) {
                    p.frozen.active = false;
                }
            });
            return "🕳️ Hết thời gian phong tỏa tài khoản.";
        }
    },
    {
        id: 7,
        name: "🚧 Phong Tỏa Khu Vực",
        description: "Một khu vực bị phong tỏa trong 2 lượt!",
        type: "area_lockdown",
        duration: 2,
        onActivate: (game, player) => {
            const start = Math.floor(Math.random() * 30);
            const end = (start + 10) % 40;
            game.lockedArea = {
                active: true,
                turnsLeft: 2,
                startTurn: game.currentTurn,
                start: start,
                end: end,
                penalty: true
            };
            let report = {
                title: "🚧 PHONG TỎA KHU VỰC!",
                message: `Khu vực từ ${game.board[start].name} đến ${game.board[end].name} bị phong tỏa!\n\n` +
                    "Ai vào khu vực này sẽ bị mất lượt.",
                area: { start, end }
            };
            return report;
        },
        onDeactivate: (game) => {
            game.lockedArea.active = false;
            return "🚧 Đã gỡ bỏ phong tỏa khu vực.";
        }
    },
    {
        id: 8,
        name: "🧨 Gài Mìn Tài Sản",
        description: "Một ô đất trở thành bẫy trong 2 lượt!",
        type: "property_trap",
        duration: 2,
        onActivate: (game, player) => {
            const lands = game.board.filter(cell => cell.type === "land");
            const trap = lands[Math.floor(Math.random() * lands.length)];
            const pos = game.board.indexOf(trap);
            game.propertyTrap = {
                active: true,
                turnsLeft: 2,
                startTurn: game.currentTurn,
                position: pos,
                penalty: 100
            };
            return {
                title: "🧨 GÀI MÌN TÀI SẢN!",
                message: `${trap.name} đã trở thành ô bẫy!\n` +
                    `Ai đặt chân vào sẽ bị phạt ${formatMoney(100)}`,
                trap: {
                    position: pos,
                    name: trap.name
                }
            };
        },
        onDeactivate: (game) => {
            game.propertyTrap.active = false;
            return "🧨 Bẫy đã được gỡ bỏ.";
        }
    }
];

function createGameRoom(threadID, ownerID, ownerName) {
    return {
        threadID,
        owner: ownerID,
        status: "waiting",
        players: [createPlayer(ownerID, ownerName, 0)],
        currentPlayerIndex: 0,
        board: JSON.parse(JSON.stringify(BOARD_LIST)), // Deep copy
        chanceCards: shuffleArray([...CHANCE_CARDS]),
        communityCards: shuffleArray([...COMMUNITY_CARDS]),
        specialEvents: shuffleArray([...SPECIAL_EVENTS]),
        stats: {
            startTime: Date.now(),
            rounds: 0,
            totalMoves: 0,
            bankruptPlayers: 0
        },
        trafficJam: {
            active: false,
            turnsLeft: 0
        },
        reverseDirection: { active: false, turnsLeft: 0, startTurn: 0 },
        lockedArea: { active: false, turnsLeft: 0, startTurn: 0, start: 0, end: 0, penalty: false },
        propertyTrap: { active: false, turnsLeft: 0, startTurn: 0, position: 0, penalty: 0 },
        eventHistory: [],
        pendingMessages: [],
        moveDirection: 1
    };
}

// ==== SPECIAL EVENTS ====
function checkEffects(game, player) {
    const effects = {
        reverse: false,
        locked: false,
        trapped: false,
        frozen: false,
        rentModifier: 1
    };
    if (game.reverseDirection?.active) {
        effects.reverse = true;
    }
    if (game.lockedArea?.active) {
        const pos = player.position;
        const start = game.lockedArea.start;
        const end = game.lockedArea.end;
        if (start < end) {
            effects.locked = (pos >= start && pos <= end);
        } else {
            effects.locked = (pos >= start || pos <= end);
        }
    }
    if (game.propertyTrap?.active) {
        effects.trapped = (player.position === game.propertyTrap.position);
    }
    if (player.frozen?.active) {
        effects.frozen = true;
    }
    if (game.rentModifier?.active) {
        effects.rentModifier = game.rentModifier.rate;
    }
    return effects;
}

async function processEvent(event, game, player, api, threadID) {
    try {
        const result = event.onActivate(game, player);
        let message = `${result.title}\n\n`;
        if (result.message) message += result.message + "\n";
        switch (event.type) {
            case "economic_crisis":
                result.losses.forEach(loss => {
                    message += `${loss.player}: -${formatMoney(loss.amount)}\n`;
                });
                break;
            case "position_swap":
                result.swaps.forEach(swap => {
                    message += `${swap.player}: ${swap.from} ➜ ${swap.to}\n`;
                });
                break;
            case "financial_blackhole":
                result.frozen.forEach(user => {
                    message += `${user.player} (${formatMoney(user.money)}): ❄️ Đóng băng 2 lượt\n`;
                });
                break;
        }
        game.eventHistory = game.eventHistory || [];
        game.eventHistory.push({
            turn: game.currentTurn,
            event: event.name,
            result: result
        });
        await api.sendMessage(message, threadID);
    } catch (err) {
        console.error(`[Lỗi Sự Kiện] ${event.name}:`, err);
        await api.sendMessage("❌ Đã xảy ra lỗi khi xử lý sự kiện!", threadID);
    }
}

function updateEvents(game) {
    if (game.reverseDirection?.active) {
        updateEventDuration(game.reverseDirection, "reverse_direction", game);
    }
    if (game.lockedArea?.active) {
        updateEventDuration(game.lockedArea, "area_lockdown", game);
    }
    if (game.propertyTrap?.active) {
        updateEventDuration(game.propertyTrap, "property_trap", game);
    }
    game.players.forEach(player => {
        if (player.frozen?.active) {
            updateEventDuration(player.frozen, "frozen", game);
        }
    });
}

function updateEventDuration(event, type, game) {
    if (event.turnsLeft > 0) {
        event.turnsLeft--;
        if (event.turnsLeft <= 0) {
            const eventData = SPECIAL_EVENTS.find(e => e.type === type);
            if (eventData?.onDeactivate) {
                const message = eventData.onDeactivate(game);
                if (message) {
                    game.pendingMessages.push(message);
                }
            }
        }
    }
}

async function tryRandomEvent(game, player, api, threadID) {
    if (Math.random() < 0.15) {
        const event = SPECIAL_EVENTS[Math.floor(Math.random() * SPECIAL_EVENTS.length)];
        await processEvent(event, game, player, api, threadID);
        return true;
    }
    return false;
}

// ==== AUCTION SYSTEM ====
const auctionStates = new Map();
class AuctionState {
    constructor(threadID, propertyIndex, game) {
        this.threadID = threadID;
        this.propertyIndex = propertyIndex;
        this.property = game.board[propertyIndex];
        this.startPrice = Math.floor(this.property.price * GAME_DEFAULTS.mortgageRate);
        this.currentBid = this.startPrice;
        this.highestBidder = null;
        this.bids = new Map();
        this.startTime = Date.now();
        this.endTime = Date.now() + (GAME_DEFAULTS.auctionTime * 1000);
        this.ended = false;
        this.timer = setTimeout(() => this.endAuction(game), GAME_DEFAULTS.auctionTime * 1000);
    }
    async placeBid(userID, amount, game, api) {
        if (this.ended) return "⚠️ Phiên đấu giá đã kết thúc!";
        const player = game.players.find(p => p.userID === userID && !p.isBankrupt);
        if (!player) return "⚠️ Bạn không thể đấu giá!";
        if (amount <= this.currentBid) return `⚠️ Giá phải cao hơn giá hiện tại (${formatMoney(this.currentBid)})!`;
        if (amount > player.money) return "⚠️ Bạn không đủ tiền!";
        this.currentBid = amount;
        this.highestBidder = userID;
        this.bids.set(userID, amount);
        const timeLeft = this.endTime - Date.now();
        if (timeLeft < 5000) {
            clearTimeout(this.timer);
            this.endTime = Date.now() + 10000;
            this.timer = setTimeout(() => this.endAuction(game), 10000);
        }
        return `🔨 ${player.name} trả giá ${formatMoney(amount)}!`;
    }
    async endAuction(game) {
        if (this.ended) return;
        this.ended = true;
        clearTimeout(this.timer);
        if (this.highestBidder) {
            const winner = game.players.find(p => p.userID === this.highestBidder);
            winner.money -= this.currentBid;
            this.property.owner = this.highestBidder;
            winner.properties.push(this.propertyIndex);
            await notifyPlus.propertyBought(global.api, this.threadID, winner, this.property);
            await global.api.sendMessage(`🎉 Đấu giá kết thúc!\n${winner.name} đã mua được ${this.property.name} với giá ${formatMoney(this.currentBid)}!`, this.threadID);
        } else {
            await global.api.sendMessage("⌛ Đấu giá kết thúc! Không có ai tham gia.", this.threadID);
        }
        auctionStates.delete(this.threadID);
    }
}

// ==== SPECIAL CARD LOGIC ====
function processSpecialCard(card, player, game, api, threadID) {
    let msg = "🎫 " + card.text;
    if (card.action === "collectMoney") {
        player.money += card.value;
    } else if (card.action === "payMoney") {
        if (player.antiScam && player.antiScam.active && player.antiScam.turnsLeft > 0) {
            api.sendMessage(`🛡️ ${player.name} đang bật Chống Lừa Đảo, miễn nhiễm với hành vi gian lận!`, threadID);
        } else {
            player.money -= card.value;
        }
    } else if (card.action === "goto") {
        let old = player.position;
        player.position = card.position;
        if (card.value) player.money += card.value;
        msg += `\nBạn được chuyển từ ô ${old} đến ô ${game.board[card.position].name}.`;
    } else if (card.action === "moveBack") {
        player.position = (player.position - card.value + 40) % 40;
        msg += `\nBạn bị lùi ${card.value} bước về ô ${game.board[player.position].name}.`;
    } else if (card.action === "payAll") {
        let total = 0;
        let blocked = false;
        for (const p of game.players) {
            if (p.userID !== player.userID && !p.isBankrupt) {
                if (p.antiScam && p.antiScam.active && p.antiScam.turnsLeft > 0) {
                    api.sendMessage(`🛡️ ${p.name} đang bật Chống Lừa Đảo, miễn nhiễm với hành vi gian lận!`, threadID);
                    blocked = true;
                } else {
                    p.money += card.value;
                    total += card.value;
                }
            }
        }
        if (!blocked) player.money -= total;
        msg += `\nBạn phải trả tổng ${formatMoney(total)} cho các người chơi khác.`;
    } else if (card.action === "freeRentNext") {
        player.freeRentNext = true;
        msg += `\nBạn sẽ được miễn trả tiền thuê lượt tiếp theo.`;
    } else if (card.action === "getOutOfJail") {
        player.hasJailFreeCard = true;
        msg += `\nBạn có thể dùng thẻ này khi bị vào tù.`;
    } // Thêm dấu ngoặc nhọn đóng ở đây
    api.sendMessage(msg, threadID);
}

// ==== LUẬT CHƠI & LỆNH ====
const GAME_RULES = `
🎲 LUẬT CHƠI CỜ TỶ PHÚ VIỆT NAM 🎲

1️⃣ Mỗi người chơi bắt đầu với 10.000.000 VNĐ

2️⃣ Cách di chuyển:
   • Lần lượt tung xúc xắc và di chuyển
   • Qua ô "BẮT ĐẦU" nhận 2.000.000 VNĐ

3️⃣ Mua và sở hữu đất:
   • Đứng vào ô đất trống: được quyền mua
   • Nếu không mua: đấu giá cho tất cả người chơi
   • Sở hữu cả nhóm màu: được xây nhà

4️⃣ Tiền thuê đất:
   • Đứng vào đất người khác: trả tiền thuê
   • Tiền thuê tăng theo số nhà xây
   • Sở hữu cả nhóm: tiền thuê tăng gấp đôi

5️⃣ Các ô đặc biệt:
   • Cơ hội/Khí vận: rút thẻ nhận hiệu ứng
   • Nhà tù: bị kẹt 3 lượt hoặc trả tiền ra
   • Thuế: đóng theo số tiền quy định
   • Đỗ xe miễn phí: không có hiệu ứng

6️⃣ Phá sản:
   • Hết tiền = phá sản = bị loại
   • Tài sản được đấu giá cho người khác
   • Người cuối cùng còn tiền là người thắng

7️⃣ Thế chấp:
   • Thế chấp đất để nhận 50% giá trị
   • Chuộc lại với 60% giá trị
   • Phải bán hết nhà trước khi thế chấp

8️⃣ Đấu giá:
   • Thời gian: 40 giây
   • Giá khởi điểm: 50% giá gốc
   • Người trả giá cao nhất thắng
   • Cộng thêm 10 giây sau mỗi lần trả giá

❗ Lưu ý: 
   • 2-4 người chơi
   • Không AFK quá 2 phút
   • Không spam lệnh
`;
const GAME_COMMANDS_HELP = `
🎲 Các lệnh cờ tỷ phú 🎲
/typhu create: Tạo phòng chơi mới.
join: Tham gia vào phòng chờ.
start: Bắt đầu ván chơi (chủ phòng).
roll: Tung xúc xắc để di chuyển.
buy: Mua đất bạn đang đứng.
build: Xây nhà trên đất của bạn.
sell: Bán đất cho ngân hàng.
info: Xem thông tin tài sản người chơi.
luat: Xem luật chơi chi tiết.
`;

// ==== MODULE EXPORTS ====
// ==== LỆNH CHÍNH ====
module.exports.run = async function ({ api, event, args, Users }) {
    const { threadID, senderID } = event;
    if (!args[0]) {
        return api.sendMessage(GAME_COMMANDS_HELP, threadID);
    }
    const command = args[0].toLowerCase();
    switch (command) {
        case "rules":
        case "luat": // Giữ lại để có thể dùng /typhu luat
            return api.sendMessage(GAME_RULES, threadID);
        case "create":
            // Logic của create được chuyển vào đây để yêu cầu prefix
            if (gameRooms.has(threadID)) {
                return api.sendMessage("⚠️ Phòng đang có người chơi, vui lòng đợi!", threadID);
            }
            const userData = await Users.getData(senderID);
            const game = createGameRoom(threadID, senderID, userData.name);
            gameRooms.set(threadID, game);
            return api.sendMessage(
                `🎮 Đã tạo phòng chơi mới!\n` +
                `👑 Chủ phòng: ${userData.name}\n` +
                `💰 Tiền khởi đầu: ${formatMoney(GAME_DEFAULTS.startingMoney)}\n` +
                `👥 Số người chơi: ${game.players.length}/${GAME_DEFAULTS.maxPlayers}\n` +
                `\n👉 Nhắn "join" để tham gia!\n👉 Gõ "luật" hoặc "rules" để xem hướng dẫn chơi!`,
                threadID
            );
        case "help":
            return api.sendMessage(GAME_COMMANDS_HELP, threadID, event.messageID);
        default:
            return api.sendMessage("❓ Lệnh không hợp lệ. Gõ 'typhu help' để xem các lệnh có sẵn.", threadID, event.messageID);
    }
};
module.exports.handleEvent = async function ({ api, event, Users }) {
    const { threadID, senderID, body } = event;
    if (!body) return;
    const command = body.trim().toLowerCase().split(" ")[0];
    const allowAll = ["luật", "rules", "luat", "join", "help", "create"];
    const game = gameRooms.get(threadID);

    // Chặn mấy ông chưa join mà đòi nghịch lệnh game
    if (game && !allowAll.some(cmd => command.startsWith(cmd))) {
        const isPlayer = game.players.find(p => p.userID === senderID);
        if (!isPlayer) {
            return api.sendMessage("🎫 Chưa join phòng đâu nghen. Gõ 'join' lẹ đi chơi chung, không ai cản đâu!", threadID);
        }
    }
    if (command === "luật" || command === "rules" || command === "luat") {
        return api.sendMessage(GAME_RULES, threadID);
    }
    if (!game) return;

    switch (command) {
        case "join":
            if (game.status !== "waiting") {
                return api.sendMessage("⏳ Game đang chạy rồi, vào nữa là bug á bro!", threadID);
            }
            if (game.players.find(p => p.userID === senderID)) {
                return api.sendMessage("😋 Vô rồi còn join gì nữa trời!", threadID);
            }
            if (game.players.length >= GAME_DEFAULTS.maxPlayers) {
                return api.sendMessage("👥 Full slot rồi nha, chậm chân chịu khó xem thôi!", threadID);
            }
            const userData = await Users.getData(senderID);
            game.players.push(createPlayer(senderID, userData.name, game.players.length));
            return api.sendMessage(
                `🫰 ${userData.name} đã vào hội phá sản rồi! (${game.players.length}/${GAME_DEFAULTS.maxPlayers})`,
                threadID
            );

        case "start":
            if (game.status !== "waiting")
                return api.sendMessage("⚠️ Game này start rồi nha!", threadID);
            if (game.players.length < GAME_DEFAULTS.minPlayers)
                return api.sendMessage("⚠️ Chưa đủ người, rủ thêm bạn dzô!", threadID);
            if (game.owner !== senderID)
                return api.sendMessage("⚠️ Chỉ chủ phòng mới được bấm start nha!", threadID);

            game.status = "playing";
            game.currentPlayerIndex = 0;
            await notifyPlus.gameStart(api, threadID, game);
            return;

        case "roll":
            if (game.status !== "playing")
                return api.sendMessage("⚠️ Game chưa bắt đầu, lăn gì má ơi!", threadID);
            const player = game.players[game.currentPlayerIndex];
            if (player.userID !== senderID)
                return api.sendMessage("⚠️ Chưa tới lượt nha, chill đi!", threadID);
            // Ở tù thì xử lý
            if (player.inJail) {
                if (player.hasJailFreeCard) {
                    player.inJail = false;
                    player.hasJailFreeCard = false; // Sửa lỗi logic, thẻ phải được sử dụng
                    await api.sendMessage(`🔑 ${player.name} đã dùng thẻ ra tù miễn phí!`, threadID);
                } else {
                    player.jailTurn += 1;
                    if (player.jailTurn >= 3) {
                        player.inJail = false;
                        player.jailTurn = 0;
                        await api.sendMessage(`✅ ${player.name} đã ra tù sau 3 lượt!`, threadID);
                    } else {
                        game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
                        await notifyPlus.turnStart(api, threadID, game.players[game.currentPlayerIndex], game);
                        return api.sendMessage(`Bạn vẫn còn ở tù nha, lượt ${player.jailTurn}/3. Đợi đi!`, threadID);
                    }
                }
            }
            // Tung xúc xắc
            const dice1 = Math.floor(Math.random() * 6) + 1;
            const dice2 = Math.floor(Math.random() * 6) + 1;
            let total = dice1 + dice2;
            // Áp dụng chế độ kẹt xe
            if ((game.trafficJam && game.trafficJam.active && game.trafficJam.turnsLeft > 0) || (player.trafficJam && player.trafficJam.active && player.trafficJam.turnsLeft > 0)) {
                if (!player.inJail) {
                    if (Math.random() < 0.5) {
                        const oldTotal = total;
                        total = Math.floor(total / 2);
                        await api.sendMessage(`🚗 ${player.name} bị kẹt xe, chỉ đi được ${total}/${oldTotal} bước!`, threadID);
                    }
                }
            }
            await notifyPlus.diceRoll(api, threadID, player, dice1, dice2);

            // Di chuyển vị trí
            const oldPos = player.position;
            player.position = (oldPos + total) % game.board.length;
            if (player.position < oldPos) {
                player.money += GAME_DEFAULTS.passingGoMoney;
                await notifyPlus.passGo(api, threadID, player);
            }
            const land = game.board[player.position];

            // Thông báo tới ô
            // await notifyPlus.landOnProperty(api, threadID, player, land, game); // This is now part of the logic below

            // Logic xử lý từng loại ô
            if (land.type === "land") {
                if (!land.owner) {
                    // Đã xóa logic đấu giá
                } else if (land.owner !== player.userID) {
                    const owner = game.players.find(x => x.userID === land.owner);
                    const rent = land.rent[land.houses || 0];
                    if (player.freeRentNext) {
                        await notifyPlus.freeRent(api, threadID, player);
                        player.freeRentNext = false;
                    } else if (player.money < rent) {
                        await notifyPlus.bankruptcy(api, threadID, player);
                        player.isBankrupt = true;
                    } else {
                        player.money -= rent;
                        owner.money += rent;
                        await notifyPlus.payRent(api, threadID, player, owner, rent);
                    }
                } else {
                    await api.sendMessage(`✨ ${player.name} đã về thăm nhà tại ${land.name}.`, threadID);
                }
            } else if (land.type === "tax") {
                if (player.money < land.amount) {
                    await notifyPlus.bankruptcy(api, threadID, player);
                    player.isBankrupt = true;
                } else {
                    player.money -= land.amount;
                    await notifyPlus.payTax(api, threadID, player, land.amount);
                }
            } else if (["station", "harbor", "busstation", "airport"].includes(land.type)) {
                if (!land.owner) {
                    // Đã xóa logic đấu giá
                } else if (land.owner !== player.userID) {
                    const owner = game.players.find(x => x.userID === land.owner);
                    const stationCount = game.board.filter(l => l.type === land.type && l.owner === owner.userID).length;
                    const rent = land.rent[stationCount - 1];
                    if (player.freeRentNext) {
                        await notifyPlus.freeRent(api, threadID, player);
                        player.freeRentNext = false;
                    } else if (player.money < rent) {
                        await notifyPlus.bankruptcy(api, threadID, player);
                        player.isBankrupt = true;
                    } else {
                        player.money -= rent;
                        owner.money += rent;
                        await notifyPlus.payRent(api, threadID, player, owner, rent);
                    }
                } else {
                    await api.sendMessage(`✨ ${player.name} đã về thăm nhà tại ${land.name}.`, threadID);
                }
            } else if (land.type === "utility") {
                if (!land.owner) {
                    // Đã xóa logic đấu giá
                } else if (land.owner !== player.userID) {
                    const owner = game.players.find(x => x.userID === land.owner);
                    const count = game.board.filter(l => l.type === "utility" && l.owner === owner.userID).length;
                    const rent = total * (count === 2 ? 100000 : 40000);
                    if (player.freeRentNext) {
                        await notifyPlus.freeRent(api, threadID, player);
                        player.freeRentNext = false;
                    } else if (player.money < rent) {
                        await notifyPlus.bankruptcy(api, threadID, player);
                        player.isBankrupt = true;
                    } else {
                        player.money -= rent;
                        owner.money += rent;
                        await notifyPlus.payRent(api, threadID, player, owner, rent);
                    }
                } else {
                    await api.sendMessage(`✨ ${player.name} đã về thăm nhà tại ${land.name}.`, threadID);
                }
            } else if (land.type === "community") {
                const card = game.communityCards.shift();
                game.communityCards.push(card);
                processSpecialCard(card, player, game, api, threadID);
            } else if (land.type === "chance") {
                const card = game.chanceCards.shift();
                game.chanceCards.push(card);
                processSpecialCard(card, player, game, api, threadID);
            } else if (land.type === "special_event") {
                const event = game.specialEvents.shift();
                game.specialEvents.push(event);
                await processSpecialEvent(event, player, game, api, threadID);
            } else if (land.type === "jail") { // Just visiting
                await api.sendMessage(`👮 ${player.name} chỉ đến thăm tù thôi!`, threadID);
            } else if (land.type === "goToJail") {
                if (player.hasJailFreeCard) {
                    player.hasJailFreeCard = false;
                    await api.sendMessage(`🔑 ${player.name} đã dùng thẻ ra tù miễn phí và không phải vào tù!`, threadID);
                } else {
                    player.position = 10;
                    player.inJail = true;
                    player.jailTurn = 0;
                    await notifyPlus.goToJail(api, threadID, player);
                }
            } else if (land.type === "freeparking") {
                await api.sendMessage(`🅿️ ${player.name} được đỗ xe miễn phí.`, threadID);
            } else if (land.type === "start") {
                await notifyPlus.landOnStart(api, threadID, player);
            }

            // Cập nhật trạng thái sự kiện và gửi thông báo nếu có
            updateEvents(game);
            if (game.pendingMessages && game.pendingMessages.length > 0) {
                for (const msg of game.pendingMessages) {
                    await api.sendMessage(msg, threadID);
                }
                game.pendingMessages = [];
            }

            // Random event - Di chuyển logic này xuống sau khi xử lý ô đất
            // để tránh sự kiện xảy ra trước khi người chơi tương tác với ô đất
            await tryRandomEvent(game, player, api, threadID);

            // Chuyển lượt cho người tiếp theo
            do {
                game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
            } while (game.players[game.currentPlayerIndex].isBankrupt);

            await notifyPlus.turnStart(api, threadID, game.players[game.currentPlayerIndex], game);

            // Kiểm tra end game
            const activePlayers = game.players.filter(p => !p.isBankrupt);
            if (activePlayers.length === 1) {
                await notifyPlus.gameEnd(api, threadID, activePlayers[0]);
                gameRooms.delete(threadID);
                return;
            }

            await api.sendMessage(`👉 Đến lượt của ${game.players[game.currentPlayerIndex].name}!`, threadID);
            return;
        case "buy":
            if (game.status !== "playing") return;
            const buyingPlayer = game.players[game.currentPlayerIndex];
            if (senderID !== buyingPlayer.userID) return;

            const buyingCell = game.board[buyingPlayer.position];
            if (!buyingCell || buyingCell.owner !== null) return api.sendMessage("⚠️ Không thể mua ô này!", threadID);
            if (buyingCell.price > buyingPlayer.money) return api.sendMessage("⚠️ Bạn không đủ tiền!", threadID);

            buyingPlayer.money -= buyingCell.price;
            buyingCell.owner = buyingPlayer.userID;
            buyingPlayer.properties.push(buyingPlayer.position);

            await notifyPlus.propertyBought(api, threadID, buyingPlayer, buyingCell);
            return api.sendMessage(`🎉 ${buyingPlayer.name} đã mua ${buyingCell.name} với giá ${formatMoney(buyingCell.price)}!`, threadID);

        case "build":
            if (game.status !== "playing") return;
            const buildingPlayer = game.players[game.currentPlayerIndex];
            if (senderID !== buildingPlayer.userID) return;

            const buildingCell = game.board[buildingPlayer.position];
            if (!buildingCell || buildingCell.owner !== buildingPlayer.userID)
                return api.sendMessage("⚠️ Bạn không sở hữu ô này!", threadID);

            // Check if player owns all properties of same color
            const sameColorProps = game.board.filter(cell => cell.color === buildingCell.color);
            const ownsAll = sameColorProps.every(cell => cell.owner === buildingPlayer.userID);
            if (!ownsAll) return api.sendMessage("⚠️ Bạn cần sở hữu tất cả đất cùng màu để xây nhà!", threadID);

            if (buildingCell.houses >= 5) return api.sendMessage("⚠️ Đã xây tối đa số nhà!", threadID);
            if (buildingCell.buildPrice > buildingPlayer.money) return api.sendMessage("⚠️ Không đủ tiền xây nhà!", threadID);

            buildingPlayer.money -= buildingCell.buildPrice;
            buildingCell.houses++;

            return api.sendMessage(`🏠 ${buildingPlayer.name} đã xây nhà tại ${buildingCell.name}! (${buildingCell.houses}/5)`, threadID);

        case "mortgage":
            if (game.status !== "playing") return;
            const mortgagePlayer = game.players[game.currentPlayerIndex];
            if (senderID !== mortgagePlayer.userID) return;

            const mortgagePropName = command.slice(9).trim();
            const mortgageProp = game.board.find(cell =>
                cell.name.toLowerCase() === mortgagePropName.toLowerCase() &&
                cell.owner === mortgagePlayer.userID
            );

            if (!mortgageProp) return api.sendMessage("⚠️ Không tìm thấy đất hoặc không phải của bạn!", threadID);
            if (mortgageProp.mortgaged) return api.sendMessage("⚠️ Đất này đã được thế chấp!", threadID);
            if (mortgageProp.houses > 0) return api.sendMessage("⚠️ Cần bán hết nhà trước khi thế chấp!", threadID);

            const mortgageValue = Math.floor(mortgageProp.price * GAME_DEFAULTS.mortgageRate);
            mortgagePlayer.money += mortgageValue;
            mortgageProp.mortgaged = true;
            mortgagePlayer.stats.mortgage++;

            return api.sendMessage(`💰 ${mortgagePlayer.name} đã thế chấp ${mortgageProp.name} và nhận ${formatMoney(mortgageValue)}!`, threadID);

        case "unmortgage":
            if (game.status !== "playing") return;
            const unmortgagePlayer = game.players[game.currentPlayerIndex];
            if (senderID !== unmortgagePlayer.userID) return;

            const unmortgagePropName = command.slice(11).trim();
            const unmortgageProp = game.board.find(cell =>
                cell.name.toLowerCase() === unmortgagePropName.toLowerCase() &&
                cell.owner === unmortgagePlayer.userID
            );

            if (!unmortgageProp) return api.sendMessage("⚠️ Không tìm thấy đất hoặc không phải của bạn!", threadID);
            if (!unmortgageProp.mortgaged) return api.sendMessage("⚠️ Đất này chưa được thế chấp!", threadID);

            const unmortgageValue = Math.floor(unmortgageProp.price * GAME_DEFAULTS.unmortgageRate);
            if (unmortgageValue > unmortgagePlayer.money) return api.sendMessage("⚠️ Không đủ tiền chuộc lại!", threadID);

            unmortgagePlayer.money -= unmortgageValue;
            unmortgageProp.mortgaged = false;
            unmortgagePlayer.stats.unmortgage++;

            return api.sendMessage(`💰 ${unmortgagePlayer.name} đã chuộc lại ${unmortgageProp.name} với giá ${formatMoney(unmortgageValue)}!`, threadID);

        case "end":
            if (!game || senderID !== game.owner) {
                return api.sendMessage("⚠️ Bạn không phải chủ phòng!", threadID);
            }
            gameRooms.delete(threadID);
            return api.sendMessage("🏁 Đã kết thúc phòng chơi!", threadID);

        case "info":
            if (!game) return;
            let msg = "📊 THÔNG TIN GAME:\n\n";
            game.players.forEach((p, idx) => {
                if (p.isBankrupt) return;
                const properties = game.board
                    .filter((cell, pos) => p.properties.includes(pos))
                    .map(cell => cell.name)
                    .join(", ");
                msg += `${idx + 1}. ${p.name}\n`;
                msg += `💰 Tiền: ${formatMoney(p.money)}\n`;
                msg += `🏠 Sở hữu: ${properties || "Không có"}\n\n`;
            });
            return api.sendMessage(msg, threadID);

        case "board":
            if (!game) return api.sendMessage("⚠️ Chưa có phòng chơi nào!", threadID);

            // Vẽ bàn cờ
            const tempImg = await drawBoardCanvas({
                playerPosArr: game.players.map(p => p.position),
                playerNames: game.players.map(p => p.name),
                playerMoney: game.players.map(p => p.money),
                playerIDs: game.players.map(p => p.userID),
                currentIdx: game.currentPlayerIndex,
                board: game.board
            }, path.join(CACHE_DIR, `ban_co_${threadID}.png`));

            // Gửi ảnh bàn cờ
            await api.sendMessage({
                body: "🎲 BÀN CỜ TỶ PHÚ 🎲",
                attachment: fs.createReadStream(tempImg)
            }, threadID, () => {
                try {
                    fs.unlinkSync(tempImg);
                } catch (e) { }
            });
            return;

        case "stats":
            if (!game) return;
            let statsMsg = "📊 THỐNG KÊ GAME:\n\n";
            game.players.forEach((p, idx) => {
                if (p.isBankrupt) return;
                statsMsg += `${idx + 1}. ${p.name}\n`;
                statsMsg += `🎲 Số lần tung xúc xắc: ${p.stats.rolls}\n`;
                statsMsg += `🏠 Số lần mua đất: ${p.stats.properties}\n`;
                statsMsg += `💰 Số tiền cao nhất: ${formatMoney(p.stats.moneyPeak)}\n`;
                statsMsg += `🔒 Số lần vào tù: ${p.stats.jailVisits}\n\n`;
            });
            return api.sendMessage(statsMsg, threadID);
    }

    // Tự động chuyển lượt nếu là các lệnh thay đổi trạng thái lượt
    if (["roll", "buy", "build", "mortgage", "unmortgage"].includes(command.split(" ")[0])) {
        game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
        while (game.players[game.currentPlayerIndex].isBankrupt) {
            game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
        }

        const activePlayers = game.players.filter(p => !p.isBankrupt);
        if (activePlayers.length === 1) {
            await notifyPlus.gameEnd(api, threadID, activePlayers[0]);
            gameRooms.delete(threadID);
            return;
        }

        await notifyPlus.turnStart(api, threadID, game.players[game.currentPlayerIndex], game);
    }

};

// ==== ĐỊNH DẠNG TIỀN TỆ ====
function parseMoneyInput(input) {
    // Loại bỏ khoảng trắng và chữ
    input = input.trim().toLowerCase().replace(/\$|vnd|đ|d|vnđ|\s+/gi, "");

    if (!input) return null;

    let amount = 0;

    try {
        // 1. Xử lý định dạng tỷ (2b, 2.5b)
        if (input.endsWith("b")) {
            input = input.replace("b", "");
            amount = Math.round(parseFloat(input) * 1000000000);
        }
        // 2. Xử lý định dạng triệu (2m, 2.5m) 
        else if (input.endsWith("m")) {
            input = input.replace("m", "");
            amount = Math.round(parseFloat(input) * 1000000);
        }
        // 3. Xử lý định dạng nghìn (200k, 2.5k)
        else if (input.endsWith("k")) {
            input = input.replace("k", "");
            amount = Math.round(parseFloat(input) * 1000);
        }
        // 4. Xử lý số thường (200)
        else if (/^\d+$/.test(input)) {
            amount = parseInt(input);
        }

        return amount > 0 ? amount : null;
    } catch (err) {
        return null;
    }
}