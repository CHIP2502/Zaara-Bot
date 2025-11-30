const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Key của bạn
const API_KEY = "f858cb9c5a3c54f5dc98a8bb4b5b6dd3"; 

module.exports.config = {
    name: "thoitiet",
    version: "2.1.0",
    hasPermssion: 0,
    credits: "Gemini Fixed",
    description: "Xem thời tiết (Fix lỗi ảnh)",
    commandCategory: "Tiện ích",
    usages: "thoitiet <tên thành phố>",
    cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    
    if (args.length === 0) {
        return api.sendMessage("⚠️ Vui lòng nhập tên thành phố (VD: .thoitiet Ha Noi)", threadID, messageID);
    }

    const city = args.join(" ");

    try {
        // 1. Gọi API
        const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=vi`
        );
        const data = response.data;

        // 2. Xử lý dữ liệu
        const cityName = data.name;
        const temp = Math.round(data.main.temp);
        const desc = data.weather[0].description;
        const humidity = data.main.humidity;
        const wind = data.wind.speed;
        
        // Giờ mọc/lặn
        const sunrise = new Date(data.sys.sunrise * 1000).toLocaleTimeString('vi-VN');
        const sunset = new Date(data.sys.sunset * 1000).toLocaleTimeString('vi-VN');

        // 3. TẢI ẢNH VỀ CACHE (Khắc phục lỗi ảnh xám)
        const iconCode = data.weather[0].icon;
        const iconUrl = `http://openweathermap.org/img/wn/${iconCode}@4x.png`;
        
        const cacheDir = path.join(__dirname, "cache");
        // Tạo thư mục cache nếu chưa có
        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

        const iconPath = path.join(cacheDir, `weather_${iconCode}.png`);

        const imageStream = await axios.get(iconUrl, { responseType: 'stream' });
        const writer = fs.createWriteStream(iconPath);
        imageStream.data.pipe(writer);

        writer.on('finish', () => {
            // 4. Gửi tin nhắn kèm ảnh
            const msgBody = 
                `🌍 Thời tiết: ${cityName}\n` +
                `☁️ Trạng thái: ${desc.charAt(0).toUpperCase() + desc.slice(1)}\n` +
                `🌡️ Nhiệt độ: ${temp}°C\n` +
                `💧 Độ ẩm: ${humidity}%\n` +
                `🌬️ Gió: ${wind} m/s\n` +
                `🌅 Mọc: ${sunrise} | 🌇 Lặn: ${sunset}`;

            api.sendMessage({
                body: msgBody,
                attachment: fs.createReadStream(iconPath)
            }, threadID, () => {
                // Xóa ảnh sau khi gửi xong
                fs.unlinkSync(iconPath);
            }, messageID);
        });

    } catch (err) {
        if (err.response && err.response.status === 404) {
            return api.sendMessage(`❌ Không tìm thấy thành phố: "${city}"`, threadID, messageID);
        }
        console.error(err);
        return api.sendMessage("❌ Lỗi khi lấy thời tiết.", threadID, messageID);
    }
};