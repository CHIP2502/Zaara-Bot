module.exports = {
  config: {
    name: "run",
    version: "1.0.3",
    hasPermssion: 2,
    credits: "Quất - Modified",
    description: "running shell with auto-send",
    commandCategory: "Admin",
    usages: "[Script]",
    cooldowns: 5
  },

  run: async (o) => {
    const s = async (a) => {
      if (typeof a === "object" || Array.isArray(a)) {
        a = Object.keys(a).length !== 0 ? JSON.stringify(a, null, 4) : "";
      }
      if (typeof a === "number") a = a.toString();
      await o.api.sendMessage(a, o.event.threadID, o.event.messageID);
    };

    const { log } = console;
    try {
      const code = o.args.join(" ");
      if (code.startsWith('down.')) {
        const result = await eval(code);
        await s(result);
      } else {
        const result = await require("eval")(code, { s, o, log }, true);
        await s(result);
      }
    } catch (e) {
      const errorMessage = `[ Lỗi ] ${e.message}\n[ Dịch ] ${(await require('axios').get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&q=${encodeURIComponent(e.message)}`)).data[0][0][0]}`;
      await s(errorMessage);
    }
  }
}