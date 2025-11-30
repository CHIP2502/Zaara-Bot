module.exports.config = {
  name: "wiki",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "Mirai Team",
  description: "Tìm mọi thông tin cần biêt thông qua Wikipedia",
  commandCategory: "Tìm kiếm",
  usages: "[vi] [thông tin cần tìm kiếm]",
  cooldowns: 1,
  dependencies: {
        "wikijs": ""
    }
}

module.exports.languages = {
    "vi": {
        "missingInput": "Nội dung cần tìm kiếm không được để trống!",
        "returnNotFound": "Không tìm thấy nội dung %1"
    },
    "en": {
        "missingInput": "Enter what you need to search for.",
        "returnNotFound": "Can't find %1"
    }
}

module.exports.run = async ({ event, args, api, getText }) => {
  try {
    // Load wikijs an toàn cho cả CJS/ESM và cả khi thiếu global.nodemodule
    const wikijsMod = (global.nodemodule && global.nodemodule["wikijs"]) || require("wikijs");
    const wiki = wikijsMod.default || wikijsMod;

    // Ngôn ngữ + query
    let apiUrl = "https://vi.wikipedia.org/w/api.php";
    let content = args.join(" ").trim();

    if (args[0] && args[0].toLowerCase() === "en") {
      apiUrl = "https://en.wikipedia.org/w/api.php";
      content = args.slice(1).join(" ").trim();
    }

    if (!content) {
      return api.sendMessage(getText("missingInput"), event.threadID, event.messageID);
    }

    // Lấy trang + summary
    const page = await wiki({ apiUrl }).page(content).catch(() => null);
    if (!page) {
      return api.sendMessage(getText("returnNotFound", content), event.threadID, event.messageID);
    }

    let summary = await page.summary();

    // Giới hạn độ dài để tránh spam/quá 2k ký tự
    if (summary.length > 1900) {
      summary = summary.slice(0, 1900) + "…";
    }

    return api.sendMessage(summary, event.threadID, event.messageID);
  } catch (err) {
    console.error("wiki error:", err);
    return api.sendMessage("Có lỗi khi truy vấn Wikipedia.", event.threadID, event.messageID);
  }
};
