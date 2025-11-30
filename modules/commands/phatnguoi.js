const axios = require("axios");

module.exports.config = {
    name: "phatnguoi",
    version: "7.0.0",
    hasPermssion: 0,
    credits: "Zaara",
    description: "Tra cứu phạt nguội (Server CheckPhatNguoi.vn)",
    commandCategory: "Tiện ích",
    usages: "phatnguoi <oto/xemay> <biển số>",
    cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID } = event;

    // 1. Kiểm tra đầu vào
    if (args.length < 2) {
        return api.sendMessage(
            "⚠️ Sai cú pháp!\n" +
            "👉 Ô tô: .phatnguoi oto 29A-XXX.XX\n" +
            "👉 Xe máy: .phatnguoi xm 29-XX XXX.XX",
            threadID, messageID
        );
    }

    const typeInput = args[0].toLowerCase();
    const plateInput = args.slice(1).join(" ");

    // 2. Xác định loại xe (1: Ô tô, 2: Xe máy)
    let loaiXe = 1;
    let typeName = "Ô tô";
    
    if (["xemay", "xm", "moto", "bike"].includes(typeInput)) {
        loaiXe = 2;
        typeName = "Xe máy";
    }

    // 3. Chuẩn hóa biển số (Xóa hết dấu, chỉ giữ Chữ và Số)
    // VD: 98A-415.94 -> 98A41594
    const cleanPlate = plateInput.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

    try {
        api.sendMessage(`🔍 Đang tra cứu bên server CheckPhatNguoi.vn cho xe ${cleanPlate}...`, threadID, messageID);

        // 4. GỌI API (Phương thức POST)
        // Server này khác hoàn toàn với phatnguoi.com (GET) nên không bị Cloudflare chặn kiểu cũ
        const res = await axios.post(
            "https://checkphatnguoi.vn/api/phat-nguoi",
            {
                bienso: cleanPlate,
                loaixe: loaiXe
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Origin": "https://checkphatnguoi.vn",
                    "Referer": "https://checkphatnguoi.vn/"
                },
                timeout: 30000 // Chờ 30s để server xử lý
            }
        );

        const data = res.data;

        // 5. Kiểm tra kết quả
        // Nếu API trả về data.data rỗng -> Không có lỗi
        if (!data || !data.data || data.data.length === 0) {
            return api.sendMessage(
                `✅ Tin vui: Xe ${cleanPlate} hiện tại KHÔNG có lỗi phạt nguội trên hệ thống này.`,
                threadID, messageID
            );
        }

        // 6. Có lỗi -> In ra danh sách
        const listLoi = data.data;
        let msg = `🔥 CẢNH BÁO: TÌM THẤY ${listLoi.length} LỖI VI PHẠM 🔥\n` +
                  `🚗 Biển số: ${cleanPlate}\n` +
                  `━━━━━━━━━━━━━━━━━━\n`;

        listLoi.forEach((item, index) => {
            msg += `\n${index + 1}. ${item.HanhViViPham || "Lỗi vi phạm"}\n` +
                   `🕒 Thời gian: ${item.ThoiGianViPham || "Không rõ"}\n` +
                   `📍 Địa điểm: ${item.DiaDiemViPham || "Không rõ"}\n` +
                   `📝 Trạng thái: ${item.TrangThai || "Chưa xử lý"}\n` +
                   `👮 Đơn vị: ${item.DonViPhatHien || "Cơ quan chức năng"}\n` +
                   `📞 Liên hệ: ${item.NoiGiaiQuyet || "Không có"}\n` +
                   `--------------------`;
        });

        api.sendMessage(msg, threadID, messageID);

    } catch (err) {
        console.error("Lỗi PhatNguoi:", err.message);
        
        if (err.response && err.response.status === 403) {
            return api.sendMessage("❌ Server Bot bị chặn IP. Vui lòng thử lại sau.", threadID, messageID);
        }
        
        return api.sendMessage("❌ Lỗi kết nối. Server đang quá tải hoặc bảo trì.", threadID, messageID);
    }
};