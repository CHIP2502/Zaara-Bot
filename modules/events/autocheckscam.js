const scamChecker = require('../../utils/scamChecker');

module.exports.config = {
  name: "autocheckscam",
  eventType: ["message"],
  version: "1.0.0",
  credits: "Quất",
  description: "Tự động kiểm tra scam khi phát hiện số điện thoại hoặc link Facebook trong chat",
  envConfig: {
    enable: true,
    cooldown: 30000 // 30 giây cooldown giữa các lần check
  }
};

module.exports.run = async function ({ api, event, Users, Threads }) {
  const { threadID, messageID, senderID, body } = event;
  const botID = api.getCurrentUserID();
  
  // Bỏ qua nếu là bot hoặc không có nội dung tin nhắn
  if (senderID === botID || !body || typeof body !== 'string') return;
  
  try {
    // Kiểm tra xem có bật tính năng auto check scam không
    const threadData = await Threads.getData(threadID);
    const autoCheckEnabled = threadData?.data?.autoCheckScam !== false; // Mặc định là true
    
    if (!autoCheckEnabled) return;
    
    // Kiểm tra cooldown
    const now = Date.now();
    const lastCheck = global.data.lastScamCheck || {};
    if (lastCheck[threadID] && (now - lastCheck[threadID]) < (global.configModule?.autocheckscam?.cooldown || 30000)) {
      return;
    }
    
    // Tìm các item cần check
    const items = scamChecker.extractItems(body);
    if (!items.length) return;
    
    // Cập nhật cooldown
    if (!global.data.lastScamCheck) global.data.lastScamCheck = {};
    global.data.lastScamCheck[threadID] = now;
    
    // Thông báo phát hiện
    await api.sendMessage(
      `🔍 Phát hiện ${items.length} item cần check scam:\n${items.map(item => `• ${item}`).join('\n')}\n\n⏳ Đang kiểm tra...`,
      threadID, messageID
    );
    
    // Check từng item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const result = await scamChecker.checkScam(item);
        if (result) {
          await api.sendMessage(
            `📊 **KẾT QUẢ CHECK SCAM CHO "${item}"**:\n\n${result}`,
            threadID
          );
        } else {
          await api.sendMessage(
            `❌ Không thể check scam cho "${item}"`,
            threadID
          );
        }
        
        // Delay giữa các lần check để tránh spam
        if (i < items.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`Lỗi khi check scam cho ${item}:`, error);
        await api.sendMessage(
          `💥 Lỗi khi check scam cho "${item}": ${error.message}`,
          threadID
        );
      }
    }
    
    await api.sendMessage(
      `✅ Đã hoàn thành check scam cho tất cả ${items.length} item!`,
      threadID
    );
    
  } catch (error) {
    console.error('Lỗi trong autocheckscam event:', error);
  }
};
