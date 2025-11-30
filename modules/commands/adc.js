module.exports.config = {
  name: "adc",
  version: "1.0.0",
  hasPermssion: 3,
  credits: "D-Jukie",
  description: "Áp dụng code từ buildtooldev và pastebin",
  commandCategory: "Admin",
  usages: "[reply or text]",
  cooldowns: 0,
  dependencies: {
    "pastebin-api": "",
    "cheerio": "",
    "request": ""
  }
};

module.exports.languages = {
  vi: {
    needOwner: "%1callad có thằng nghịch linh tinh này\n- tên nó: %2\n- linkFb: https://www.facebook.com/profile.php?id=%3",
    needInput: "Vui lòng reply link muốn áp dụng code hoặc ghi tên file để up code lên pastebin!",
    commandNotFound: "Lệnh %1 không tồn tại!",
    pasted: "%1",
    applyError: "Đã xảy ra lỗi khi áp dụng code vào %1.js",
    appliedAndUse: "Đã húp mdl vào %1.js, sử dụng .command load mdl ấy  để sử dụng!",
    replyLinkOnly: "Vui lòng chỉ reply link (không chứa gì khác ngoài link)",
    writeError: "Đã xảy ra lỗi khi áp dụng code mới cho \"%1.js\".",
    wroteSuccess: "Đã thêm code này vào \"%1.js\", sử dụng command load để sử dụng!",
    driveAdded: "Đã thêm code này vào \"%1.js\" nếu xảy ra lỗi thì đổi file drive thành txt nhé!",
    driveError: "Đã xảy ra lỗi khi áp dụng code mới cho \"%1.js\"."
  },
  en: {
    needOwner: "%1callad found a user messing around\n- Name: %2\n- Profile: https://www.facebook.com/profile.php?id=%3",
    needInput: "Please reply a link to apply code or provide a file name to upload code to pastebin!",
    commandNotFound: "Command %1 not found!",
    pasted: "%1",
    applyError: "An error occurred while applying code to %1.js",
    appliedAndUse: "Code added to %1.js, use .command load to load it!",
    replyLinkOnly: "Please reply link only (no extra text)",
    writeError: "Error applying new code for \"%1.js\".",
    wroteSuccess: "Code added to \"%1.js\". Use load command to use it!",
    driveAdded: "Code added to \"%1.js\". If error occurs, change the Drive file to txt!",
    driveError: "Error applying new code for \"%1.js\"."
  }
};

module.exports.run = async function ({ api, event, args, Users, getText }) {
  const axios = require('axios');
  const fs = require('fs');
  const request = require('request');
  const cheerio = require('cheerio');
  const { join, resolve } = require("path");
  const { senderID, threadID, messageID, messageReply, type } = event;
  var name = args[0];
  if (senderID != 511411909) {
    var uid = "";
    uid += `${senderID}`
    let userName = await Users.getNameUser(uid)
    return api.sendMessage(getText('needOwner', global.config.PREFIX, userName, uid), threadID, messageID)
  }
  if (type == "message_reply") {
    var text = messageReply.body;
  }
  if (!text && !name) return api.sendMessage(getText('needInput'), threadID, messageID);
  if (!text && name) {
    var data = fs.readFile(
      `${__dirname}/${args[0]}.js`,
      "utf-8",
      async (err, data) => {
        if (err) return api.sendMessage(getText('commandNotFound', args[0]), threadID, messageID);
        const { PasteClient } = require('pastebin-api')
        const client = new PasteClient("_DyXwzkPYNa9nZ7gJGSY286iHsTdoscf");
        async function pastepin(name) {
          const url = await client.createPaste({
            code: data,
            expireDate: 'N',
            format: "javascript",
            name: name,
            publicity: 1
          });
          var id = url.split('/')[3]
          return 'https://pastebin.com/raw/' + id
        }
        var link = await pastepin(args[1] || 'noname')
        return api.sendMessage(getText('pasted', link), threadID, messageID);
      }
    );
    return
  }
  var urlR = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/
  var url = text.match(urlR);
  if (url[0].indexOf('pastebin') !== -1) {
    axios.get(url[0]).then(i => {
      var data = i.data
      fs.writeFile(
        `${__dirname}/${args[0]}.js`,
        data,
        "utf-8",
        function (err) {
          if (err) return api.sendMessage(getText('applyError', args[0]), threadID, messageID);
          api.sendMessage(getText('appliedAndUse', args[0]), threadID, messageID);
        }
      );
    })
  }

  if (url[0].indexOf('buildtool') !== -1 || url[0].indexOf('tinyurl.com') !== -1) {
    const options = {
      method: 'GET',
      url: messageReply.body
    };
    request(options, function (error, response, body) {
      if (error) return api.sendMessage(getText('replyLinkOnly'), threadID, messageID);
      const load = cheerio.load(body);
      load('.language-js').each((index, el) => {
        if (index !== 0) return;
        var code = el.children[0].data
        fs.writeFile(`${__dirname}/${args[0]}.js`, code, "utf-8",
          function (err) {
            if (err) return api.sendMessage(getText('writeError', args[0]), threadID, messageID);
            return api.sendMessage(getText('wroteSuccess', args[0]), threadID, messageID);
          }
        );
      });
    });
    return
  }
  if (url[0].indexOf('drive.google') !== -1) {
    var id = url[0].match(/[-\w]{25,}/)
    const path = resolve(__dirname, `${args[0]}.js`);
    try {
      await utils.downloadFile(`https://drive.google.com/u/0/uc?id=${id}&export=download`, path);
      return api.sendMessage(getText('driveAdded', args[0]), threadID, messageID);
    }
    catch (e) {
      return api.sendMessage(getText('driveError', args[0]), threadID, messageID);
    }
  }
}
