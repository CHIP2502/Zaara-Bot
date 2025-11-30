module.exports.config = {
    name: "chart",
    version: "1.1", // Đã fix
    hasPermssion: 2,
    credits: "Horizon", // Fix by Gemini
    description: "Tạo Sơ Đồ Tương Tác Với Top 8 Nhóm",
    commandCategory: "Horizon",
    usages: "",
    cooldowns: 10
};

module.exports.run = async function({ api, event }) {
    const { createReadStream, unlinkSync, writeFileSync, statSync } = require("fs-extra");
    const axios = require('axios');
    const path = __dirname + `/cache/chart.png`;

    var KMath = (data) => data.reduce((a, b) => a + b, 0);
    
    // Lấy danh sách nhóm
    var inbox = await api.getThreadList(100, null, ['INBOX']);
    // Lọc ra các nhóm (isGroup) và bot đã đăng ký (isSubscribed)
    let xx = [...inbox].filter(group => group.isSubscribed && group.isGroup);

    var kho = [], search = [], count = [];

    for (let n of xx) {
        // Lấy tên nhóm, nếu không có tên thì để là "Không tên"
        var threadInfo = n.name || "Nhóm Không Tên";
        var threadye = n.messageCount;
        kho.push({
            "name": threadInfo,
            "exp": (typeof threadye == "undefined") ? 0 : threadye
        });
    }

    // Sắp xếp giảm dần theo tương tác
    kho.sort(function (a, b) { return b.exp - a.exp; });

    // --- PHẦN SỬA LỖI Ở ĐÂY ---
    // Chỉ lấy tối đa 8 nhóm, hoặc ít hơn nếu kho không đủ 8
    const limit = Math.min(8, kho.length); 

    if (limit === 0) return api.sendMessage("Bot chưa tham gia nhóm nào hoặc không lấy được dữ liệu.", event.threadID);

    for (let num = 0; num < limit; num++) {
        // Cắt tên nếu quá dài để hiển thị trên chart đẹp hơn
        let name = kho[num].name;
        if (name.length > 20) name = name.substring(0, 17) + "...";
        
        search.push("'" + name + "'");
        count.push(kho[num].exp);
    }
    // ---------------------------

    var full = KMath(count);
    
    // Tạo URL biểu đồ
    var url = `https://quickchart.io/chart?c={type:'doughnut',data:{labels:[${encodeURIComponent(search)}],datasets:[{label:'${encodeURIComponent('Tương Tác')}',data:[${encodeURIComponent(count)}]}]},options:{plugins:{doughnutlabel:{labels:[{text:'${full}',font:{size:26}},{text:'${encodeURIComponent('Tổng')}'}]}}}}`;

    try {
        const { data: stream } = await axios.get(url, { method: 'GET', responseType: 'arraybuffer' });
        writeFileSync(path, Buffer.from(stream, 'utf-8'));
        return api.sendMessage({ body: 'Top tương tác các nhóm:', attachment: createReadStream(path) }, event.threadID, event.messageID);
    } catch (e) {
        return api.sendMessage("Đã xảy ra lỗi khi tạo biểu đồ.", event.threadID, event.messageID);
    }
};