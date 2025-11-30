module.exports = function ({ api, models, Users, Threads, Currencies }) {
	const stringSimilarity = require('string-similarity'),
		escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
		logger = require("../../utils/log.js");
	const fs = require('fs');
	const path = require('path');
	const moment = require("moment-timezone");
	return async function ({
		event
	}) {
		const dateNow = Date.now()
		const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY");
		const { allowInbox, PREFIX, ADMINBOT, NDH, DeveloperMode, keyAdminOnly, ndhOnly, adminPaseOnly } = global.config;
		const { userBanned, threadBanned, threadInfo, threadData, commandBanned } = global.data;
		const { commands, cooldowns } = global.client;
		var { body, senderID, threadID, messageID } = event;

		let threadSettingBox = global.data.threadData.get(threadID) || {};
		let prefixbox = threadSettingBox.PREFIX || PREFIX;
		const tm = process.uptime(),
			Tm = (require('moment-timezone')).tz('Asia/Ho_Chi_Minh').format('HH:mm:ss || DD/MM/YYYY')
		h = Math.floor(tm / (60 * 60)), H = h < 10 ? '0' + h : h,
			m = Math.floor((tm % (60 * 60)) / 60), M = m < 10 ? '0' + m : m,
			s = Math.floor(tm % 60), S = s < 10 ? '0' + s : s, $ = ':'
		senderID = String(senderID),
			threadID = String(threadID);
		const threadSetting = threadData.get(threadID) || {}
		const prefixRegex = new RegExp(`^(<@!?${senderID}>|${escapeRegex((threadSetting.hasOwnProperty("PREFIX")) ? threadSetting.PREFIX : PREFIX)})\\s*`);
		// if(senderID === api.getCurrentUserID()) return
		const adminbot = require('../../config.json');
		if (typeof body === 'string' && body.startsWith(prefixbox) && !NDH.includes(senderID) && !ADMINBOT.includes(senderID) && adminbot.adminOnly == true) {
			return api.sendMessage(`⚠️ Chỉ admin bot mới có thể sử dụng bot!`, threadID, messageID);
		}
		if (typeof body === 'string' && body.startsWith(prefixbox) && !NDH.includes(senderID) && !ADMINBOT.includes(senderID) && adminbot.adminPaseOnly == true) {
			return api.sendMessage(`⚠️ Chỉ admin bot mới được sử dụng bot trong chat riêng!`, threadID, messageID);
		}
		if (typeof body === 'string' && body.startsWith(prefixbox) && !NDH.includes(senderID) && !ADMINBOT.includes(senderID) && adminbot.ndhOnly == true) {
			return api.sendMessage(`⚠️ Chỉ người hỗ trợ bot mới có thể sử dụng bot!`, threadID, messageID);
		}
		const dataAdbox = require('../../modules/commands/data/dataAdbox.json');
		var threadInf = (threadInfo.get(threadID) || await Threads.getInfo(threadID));
		const findd = threadInf.adminIDs.find(el => el.id == senderID);
		
		// Kiểm tra chế độ bảo trì server
		if (typeof body === 'string' && body.startsWith(prefixbox)) {
			try {
				// Xóa cache và đọc file mới mỗi lần
				delete require.cache[require.resolve('../../modules/commands/data/maintenance.json')];
				const maintenanceData = require('../../modules/commands/data/maintenance.json');
				if (maintenanceData.status && !NDH.includes(senderID) && !ADMINBOT.includes(senderID)) {
					return api.sendMessage(
						`🔧 [ SERVER ĐANG BẢO TRÌ ] 🔧\n\n` +
						`⚠️ Admin đang bảo trì server!\n` +
						`📝 Lý do: ${maintenanceData.reason}\n` +
						`⏰ Thời gian bắt đầu: ${maintenanceData.startTime}\n\n` +
						`🔄 Vui lòng thử lại sau khi bảo trì hoàn tất.\n` +
						`📞 Liên hệ admin nếu cần hỗ trợ khẩn cấp.`,
						event.threadID, event.messageID
					);
				}
			} catch (error) {
				console.error('Lỗi khi đọc dữ liệu maintenance:', error);
			}
		}
		
		
		if (userBanned.has(senderID) || threadBanned.has(threadID) || allowInbox == ![] && senderID == threadID) {
			if (!body.startsWith(PREFIX)) return
			if (!NDH.includes(senderID.toString()) && !ADMINBOT.includes(senderID.toString())) {
				if (userBanned.has(senderID)) {
					const {
						reason,
						dateAdded
					} = userBanned.get(senderID) || {};
					return api.sendMessage(global.getText("handleCommand", "userBanned", reason, dateAdded), threadID, async (err, info) => {
						await new Promise(resolve => setTimeout(resolve, 15 * 1000));
						return api.unsendMessage(info.messageID);
					}, messageID);
				} else {
					if (threadBanned.has(threadID)) {
						const {
							reason,
							dateAdded
						} = threadBanned.get(threadID) || {};
						return api.sendMessage(global.getText("handleCommand", "threadBanned", reason, dateAdded), threadID, async (err, info) => {
							await new Promise(resolve => setTimeout(resolve, 15 * 1000));
							return api.unsendMessage(info.messageID);
						}, messageID);
					}
				}
			}
		}
		body = body !== undefined ? body : 'x'
		const [matchedPrefix] = body.match(prefixRegex) || ['']
		var args = body.slice(matchedPrefix.length).trim().split(/ +/);
		var commandName = args.shift().toLowerCase();
		var command = commands.get(commandName);
		//------------ usePrefix -------->
		if (!prefixRegex.test(body)) {
			args = (body || '').trim().split(/ +/);
			commandName = args.shift()?.toLowerCase();
			command = commands.get(commandName);
			if (command && command.config) {
				if (command.config.usePrefix === false && commandName.toLowerCase() !== command.config.name.toLowerCase()) {
					api.sendMessage(global.getText("handleCommand", "notMatched", command.config.name), event.threadID, event.messageID);
					return;
				}
				if (command.config.usePrefix === true && !body.startsWith(PREFIX)) {
					return;
				}
			}
			if (command && command.config) {
				if (typeof command.config.usePrefix === 'undefined') {
					return;
				}
			}
		}
		//---------------END --------------<
		if (!command) {
			if (!body.startsWith((threadSetting.hasOwnProperty("PREFIX")) ? threadSetting.PREFIX : PREFIX)) return;
			var allCommandName = [];
			const commandValues = commands['keys']();
			for (const cmd of commandValues) allCommandName.push(cmd);
			const name = await Users.getNameUser(event.senderID);
			let uid = event.senderID;
			const folderPath = './modules/commands';

			fs.readdir(folderPath, (err, files) => {
				if (err) {
					console.error('Lỗi đọc thư mục:', err);
					return;
				}
				const allFiles = files.filter(file => fs.statSync(path.join(folderPath, file)).isFile()).map(file => ({
					name: file,
					time: fs.statSync(path.join(folderPath, file)).mtime.getTime(),
				}));
				const convertTime = (seconds) => {
					const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
					const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
					const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
					return `${hours}:${minutes}:${secs}`;
				};
				const uptime = convertTime(process.uptime());
				const latestFile = allFiles.sort((a, b) => b.time - a.time)[0];
				if (latestFile) {
					const newFile = latestFile.name;
					const checker = stringSimilarity.findBestMatch(commandName, allCommandName);
					if (checker.bestMatch.rating >= 0.5) {
						command = commands.get(checker.bestMatch.target);
					} else {
						api.sendMessage({
							body: `${name}\n✏️ Lệnh gần giống: " ${checker.bestMatch.target} "\n⏳ Uptime: ${uptime}\n🪐 Loaded: ${newFile}`
						}, event.threadID, 
						async (err, info) => {
							await new Promise(resolve => setTimeout(resolve, 50 * 1000));
							return api.unsendMessage(info.messageID);
						}, event.messageID);
					}
				}
			});
		}
		if (command) {
			//if(command.config.usePrefix === false) return
			if (true) {
				let fs = require('fs');
				let path = __dirname + '/../../modules/commands/data/commands-banned.json';
				let data = {};
				let send = msg => api.sendMessage(msg, threadID, messageID);
				let is_qtv_box = id => threadInfo.get(threadID).adminIDs.some($ => $.id == id);
				let name = id => global.data.userName.get(id);
				let cmd = command.config.name;
				if (fs.existsSync(path)) data = JSON.parse(fs.readFileSync(path));
				if (data[threadID]) {
					if (ban = data[threadID].cmds.find($ => $.cmd == cmd)) {
						if (ADMINBOT.includes(ban.author) && !NDH.includes(senderID) && /*!ADMINBOT.includes(senderID)*/ ban.author != senderID) return send(`[ BANNER COMMAND ]\n────────────────────\n🕑 Vào lúc: ${ban.time}\n👤 Admin bot: ${name(ban.author)}\n⛔ Đã cấm nhóm sử dụng lệnh ${cmd}\n✏️ Liên hệ với admin để được hỗ trợ\n────────────────────\n⏳ Uptime: ${H + $ + M + $ + S}\n⏰ Time: ${Tm}`);
						if (is_qtv_box(ban.author) && !NDH.includes(senderID) && /*!is_qtv_box(senderID) && !ADMINBOT.includes(senderID)*/ ban.author != senderID) return send(`[ BANNER COMMAND ]\n────────────────────\n🕑 Vào lúc: ${ban.time}\n👤 Qtv nhóm: ${name(ban.author)}\n⛔ Đã cấm thành viên sử dụng lệnh ${cmd}\n────────────────────\n⏳ Uptime: ${H + $ + M + $ + S}\n⏰ Time: ${Tm}`);
					};
					if (all = (data[threadID].users[senderID] || {}).all) {
						if (all.status == true && ADMINBOT.includes(all.author) && !NDH.includes(senderID) && !ADMINBOT.includes(senderID)) return send(`[ BANNER USER ]\n────────────────────\n🕑 Vào lúc: ${all.time}\n⚠️ Bạn đã bị admin bot: ${name(all.author)} cấm\n👤 Liên hệ với admin để được hỗ trợ\n────────────────────\n⏳ Uptime: ${H + $ + M + $ + S}\n⏰ Time: ${Tm}`);
						if (all.status == true && is_qtv_box(all.author) && !NDH.includes(senderID) && !ADMINBOT.includes(senderID) && !is_qtv_box(senderID)) return send(`[ BANNER USER ]\n────────────────────\n🕑 Vào lúc ${all.time}\n⛔ Bạn đã bị qtv box: ${name(all.author)} cấm\n────────────────────\n⏳ Uptime: ${H + $ + M + $ + S}\n⏰ Time: ${Tm}`);
					};
					if (user_ban = (data[threadID].users[senderID] || {
						cmds: []
					}).cmds.find($ => $.cmd == cmd)) {
						if (ADMINBOT.includes(user_ban.author) && !NDH.includes(senderID) && !ADMINBOT.includes(senderID)) return send(`[ USERBAN COMMAND ]\n────────────────────\n🕑 Vào lúc: ${user_ban.time}\n👤 Admin bot: ${name(user_ban.author)}\n⛔ Đã cấm bạn sử dụng lệnh ${cmd}\n✏️ Liên hệ với admin để được hỗ trợ\n────────────────────\n⏳ Uptime: ${H + $ + M + $ + S}\n⏰ Time: ${Tm}`);
						if (is_qtv_box(user_ban.author) && !is_qtv_box(senderID) && !NDH.includes(senderID) && !ADMINBOT.includes(senderID)) return send(`[ USERBAN COMMAND ]\n────────────────────\n🕑 Vào lúc: ${user_ban.time}\n👤 Qtv nhóm: ${name(user_ban.author)}\n⛔ Đã cấm bạn sử dụng lệnh ${cmd}\n────────────────────\n⏳ Uptime: ${H + $ + M + $ + S}\n⏰ Time: ${Tm}`);
					}
				}
			};
		}
		{
			const disablePath = process.cwd() + '/modules/commands/data/disable-command.json';
			if (!ADMINBOT.includes(senderID) && !NDH.includes(senderID) && fs.existsSync(disablePath)) {
				const disabled = JSON.parse(fs.readFileSync(disablePath));
				if (disabled[threadID]?.[command.config.commandCategory] == true) {
					return api.sendMessage(`[ DISABLE COMMAND ]\n────────────────────\n⚠️ Box không được phép sử dụng các lệnh thuộc nhóm " ${command.config.commandCategory} "\n👤 Liên hệ với admin để được hỗ trợ\n────────────────────\n⏳ Uptime: ${H + $ + M + $ + S}\n⏰ Time: ${Tm}`, threadID);
				}
			}
		}
		if (commandBanned.get(threadID) || commandBanned.get(senderID)) {
			if (!NDH.includes(senderID) && !ADMINBOT.includes(senderID)) {
				const banThreads = commandBanned.get(threadID) || [],
					banUsers = commandBanned.get(senderID) || [];
				if (banThreads.includes(command.config.name)) return api.sendMessage(global.getText("handleCommand", "commandThreadBanned", command.config.name), threadID, async (err, info) => {
					await new Promise(resolve => setTimeout(resolve, 15 * 1000))
					return api.unsendMessage(info.messageID);
				}, messageID);
				if (banUsers.includes(command.config.name)) return api.sendMessage(global.getText("handleCommand", "commandUserBanned", command.config.name), threadID, async (err, info) => {
					await new Promise(resolve => setTimeout(resolve, 15 * 1000));
					return api.unsendMessage(info.messageID);
				}, messageID);
			}
		}
		/* if (command.config.commandCategory.toLowerCase() == 'nsfw' && !global.data.threadAllowNSFW.includes(threadID) && !NDH.includes(senderID) && !ADMINBOT.includes(senderID))
  return api.sendMessage(global.getText("handleCommand", "threadNotAllowNSFW"), threadID, async (err, info) => {
		 await new Promise(resolve => setTimeout(resolve, 15 * 1000))
		 return api.unsendMessage(info.messageID);
	   }, messageID);*/
		var threadInfo2;
		if (event.isGroup == !![]) try {
			threadInfo2 = (threadInfo.get(threadID) || await Threads.getInfo(threadID))
			if (Object.keys(threadInfo2).length == 0) throw new Error();
		} catch (err) {
			logger(global.getText("handleCommand", "cantGetInfoThread", "error"));
		}
		const ten = await Users.getNameUser(event.senderID)
		let uid1 = event.senderID;
		var permssion = 0;
		var threadInfoo = (threadInfo.get(threadID) || await Threads.getInfo(threadID));
		const find = threadInfoo.adminIDs.find(el => el.id == senderID);
		if (NDH.includes(senderID.toString())) permssion = 3;
		else if (ADMINBOT.includes(senderID.toString())) permssion = 2;
		else if (!ADMINBOT.includes(senderID) && find) permssion = 1;
		var quyenhan = ""
		if (!command || !command.config) return;
		if (command.config.hasPermssion == 1) {
			quyenhan = "Quản Trị Viên"
		} else if (command.config.hasPermssion == 2) {
			quyenhan = "ADMIN_BOT"
		} else if (command.config.hasPermssion == 3) {
			quyenhan = "Chúa"
		}
		if (command.config.hasPermssion > permssion) return api.sendMessage(`👤 Người dùng: ${ten}\n⛔ Chỉ có ${quyenhan} mới được sử dụng lệnh ${command.config.name} \n⚠️ Bạn không có quyền sử dụng lệnh này\n────────────────────\n⏰ Time: ${Tm}`, event.threadID, async (err, info) => {
			await new Promise(resolve => setTimeout(resolve, 15 * 1000));
			return api.unsendMessage(info.messageID);
		}, event.messageID);
		// if (!client.cooldowns.has(command.config.name)) client.cooldowns.set(command.config.name, new Map());
		// const timestamps = client.cooldowns.get(command.config.name);
		if (!command || !command.config) return;
		if (!cooldowns.has(command.config.name)) cooldowns.set(command.config.name, new Map());
		const timestamps = cooldowns.get(command.config.name);

		const expirationTime = (command.config.cooldowns || 1) * 1000;
		if (timestamps.has(senderID) && dateNow < timestamps.get(senderID) + expirationTime) return api.sendMessage(`⚠️ Tránh để bot bị spam, bạn vui lòng chờ ${((timestamps.get(senderID) + expirationTime - dateNow) / 1000).toString().slice(0, 5)} giây để sử dụng lại lệnh "${command.config.name}" nhé!`, threadID, async (err, info) => {
			await new Promise(resolve => setTimeout(resolve, 15 * 1000));
			return api.unsendMessage(info.messageID);
		}, messageID);
		var getText2 = (...values) => {
			if (command.languages && typeof command.languages == 'object') {
				const pack = command.languages[global.config.language] || {};
				let lang = pack[values[0]] || '';
				for (var i = values.length; i > 0; i--) {
					const expReg = RegExp('%' + i, 'g');
					lang = lang.replace(expReg, values[i]);
				}
				if (lang) return lang;
			}
			return global.getText(...values);
		};
		try {
			const Obj = {};
			Obj.api = api
			Obj.event = event
			Obj.args = args
			Obj.models = models
			Obj.Users = Users
			Obj.Threads = Threads
			Obj.Currencies = Currencies
			Obj.permssion = permssion
			Obj.getText = getText2
			command.run(Obj)
			timestamps.set(senderID, dateNow);
			if (DeveloperMode == !![]) logger(global.getText("handleCommand", "executeCommand", time, commandName, senderID, threadID, args.join(" "), (Date.now()) - dateNow), "[ DEV MODE ]");
			return;
		} catch (e) {
			return api.sendMessage(global.getText("handleCommand", "commandError", commandName, e), threadID);
		}
	};
};