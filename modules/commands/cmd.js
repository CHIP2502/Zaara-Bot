const { execSync } = require('child_process');
const { writeFileSync, unlinkSync, readFileSync, readdirSync, existsSync } = require('fs-extra');
const { join } = require('path');
const axios = require('axios');

module.exports = {
  config: {
    name: "cmd",
    version: "1.3.0",
    hasPermssion: 3,
    credits: "Mirai Team + GPT",
    description: "Quản lý/Kiểm soát toàn bộ module của bot",
    commandCategory: "Admin",
    usages: "[load/unload/loadAll/unloadAll/install] [tên module/url/code] [tên file]",
    cooldowns: 5
  },

  run: async function ({ event, args, api }) {
    const { configPath, mainPath } = global.client;
    const logger = require(mainPath + "/utils/log");
    const { threadID, messageID } = event;
    let moduleList = args.slice(1);

    const loadModule = async (nameModule, configValue) => {
      try {
        const dirModule = join(__dirname, `${nameModule}.js`);
        delete require.cache[require.resolve(dirModule)];
        const command = require(dirModule);

        if (command.config.name) {
          const index = global.client.eventRegistered.indexOf(command.config.name);
          if (index > -1) global.client.eventRegistered.splice(index, 1);
        }

        global.client.commands.delete(nameModule);

        if (!command.config || !command.run || !command.config.commandCategory) {
          throw new Error("Module không đúng định dạng!");
        }

        global.client.commands.set(command.config.name, command);

        if (command.config.envConfig) {
          for (const [key, value] of Object.entries(command.config.envConfig)) {
            global.configModule[command.config.name] = global.configModule[command.config.name] || {};
            configValue[command.config.name] = configValue[command.config.name] || {};
            global.configModule[command.config.name][key] ??= value;
            configValue[command.config.name][key] ??= value;
          }
        }

        if (command.handleEvent && !global.client.eventRegistered.includes(command.config.name)) {
          global.client.eventRegistered.push(command.config.name);
        }

        if (command.onLoad) await command.onLoad({ configValue });

        return { success: true, command };
      } catch (error) {
        return { success: false, error };
      }
    };

    switch (args[0]) {
      case "load": {
        if (moduleList.length === 0) return api.sendMessage("Tên module không được để trống!", threadID, messageID);
        delete require.cache[require.resolve(configPath)];
        const configValue = require(configPath);
        writeFileSync(configPath + ".temp", JSON.stringify(configValue, null, 2));

        const currentCommands = new Set(global.client.commands.keys());
        const errorList = [], loadedList = [], commandGroups = {}, newCommands = [];

        for (const nameModule of moduleList) {
          const result = await loadModule(nameModule, configValue);
          if (result.success) {
            const command = result.command;
            loadedList.push(command.config.name);

            global.config["commandDisabled"] = global.config["commandDisabled"].filter(item => item !== `${nameModule}.js`);
            configValue["commandDisabled"] = configValue["commandDisabled"].filter(item => item !== `${nameModule}.js`);

            const category = command.config.commandCategory.toLowerCase();
            if (!commandGroups[category]) commandGroups[category] = [];
            commandGroups[category].push(command.config.name);

            if (!currentCommands.has(command.config.name)) newCommands.push(command.config.name);

            logger.loader(`Loaded command ${command.config.name}!`);
          } else {
            errorList.push({ name: nameModule, error: result.error });
            console.log(`Không thể load module ${nameModule} với lỗi:`);
            console.error(result.error);
          }
        }

        if (errorList.length > 0) {
          let msg = `❌ Không thể load ${errorList.length} module:\n`;
          errorList.forEach(({ name, error }) => {
            msg += `- ${name}: ${error.message || "Không xác định"}\n`;
          });
          api.sendMessage(msg, threadID, messageID);
        }

        if (loadedList.length > 0) {
          let msg = `✅ Load thành công ${loadedList.length} lệnh\n\n`;
          for (const [cat, cmds] of Object.entries(commandGroups)) {
            msg += `📁 ${cat.charAt(0).toUpperCase() + cat.slice(1)}:\n`;
            msg += cmds.map(cmd => `  ➣ ${cmd}`).join("\n") + "\n\n";
          }
          if (newCommands.length > 0) msg += `📥 Lệnh mới: ${newCommands.join(", ")}\n`;
          api.sendMessage(msg, threadID, messageID);
        }

        writeFileSync(configPath, JSON.stringify(configValue, null, 4));
        unlinkSync(configPath + ".temp");
        break;
      }

      case "unload": {
        if (moduleList.length === 0) return api.sendMessage("Tên module không được để trống!", threadID, messageID);
        const configValue = require(configPath);
        writeFileSync(configPath + ".temp", JSON.stringify(configValue, null, 4));

        for (const nameModule of moduleList) {
          global.client.commands.delete(nameModule);
          global.client.eventRegistered = global.client.eventRegistered.filter(item => item !== nameModule);
          configValue["commandDisabled"].push(`${nameModule}.js`);
          global.config["commandDisabled"].push(`${nameModule}.js`);
          logger(`Unloaded command ${nameModule}!`);
        }

        writeFileSync(configPath, JSON.stringify(configValue, null, 4));
        unlinkSync(configPath + ".temp");
        api.sendMessage(`Đã hủy tải ${moduleList.length} module.`, threadID, messageID);
        break;
      }

      case "loadAll": {
        moduleList = readdirSync(__dirname)
          .filter(file => file.endsWith(".js") && !file.includes("example") && file !== "cmd.js")
          .map(file => file.replace(/\.js$/, ""));
        args[0] = "load";
        return this.run({ event, args: ["load", ...moduleList], api });
      }

      case "unloadAll": {
        moduleList = readdirSync(__dirname)
          .filter(file => file.endsWith(".js") && !file.includes("example") && file !== "cmd.js")
          .map(file => file.replace(/\.js$/, ""));
        args[0] = "unload";
        return this.run({ event, args: ["unload", ...moduleList], api });
      }

      case "install": {
        const [input, fileName] = [args[1], args[2]];
        if (!input || !fileName || !fileName.endsWith(".js")) {
          return api.sendMessage("⚠️ Vui lòng nhập đúng cú pháp: cmd install <url hoặc code> <tenFile>.js", threadID, messageID);
        }

        let rawCode;
        try {
          if (/https?:\/\//.test(input)) {
            rawCode = (await axios.get(input)).data;
          } else {
            rawCode = input;
          }
        } catch (e) {
          return api.sendMessage(`❌ Không thể tải mã lệnh từ nguồn cung cấp: ${e.message}`, threadID, messageID);
        }

        const savePath = join(__dirname, fileName);
        if (existsSync(savePath)) {
          return api.sendMessage("⚠️ File đã tồn tại, hãy xoá hoặc đổi tên khác.", threadID, messageID);
        }

        try {
          writeFileSync(savePath, rawCode, 'utf8');
          return api.sendMessage(`✅ Đã lưu lệnh tại: ${fileName}\n➡️ Dùng: cmd load ${fileName.replace(/\.js$/, "")}`, threadID, messageID);
        } catch (e) {
          return api.sendMessage(`❌ Ghi file thất bại: ${e.message}`, threadID, messageID);
        }
      }

      default:
        return api.sendMessage("❌ Lựa chọn không hợp lệ!", threadID, messageID);
    }
  }
};