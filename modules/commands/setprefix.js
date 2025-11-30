const path = require('path');
const fs = require('fs');
module.exports.config = {
	name: "setprefix",
	version: "1.0.1",
	hasPermssion: 1,
	credits: "Mirai Team",//Mod By Huykaiser❤️
	description: "Đặt lại prefix của nhóm",//đổi luôn biệt danh bot
	commandCategory: "QTV",
	usages: "[prefix/reset]",
	cooldowns: 5
};

const thuebotDataPath = path.join(__dirname, 'data', 'thuebot.json');

let data = fs.existsSync(thuebotDataPath) ? JSON.parse(fs.readFileSync(thuebotDataPath)) : [];

module.exports.languages = {
	"vi": {
		"successChange": "Đã chuyển đổi dấu lệnh của nhóm thành: %1",
		"missingInput": "Phần dấu lệnh cần đặt không được để trống",
		"resetPrefix": "Đã reset dấu lệnh thành mặc định: %1",
		"confirmChange": "Bạn có chắc muốn thay đổi dấu lệnh của nhóm thành: 「 %1 」\nVui lòng thả cảm xúc vào tin nhắn này để đổi dấu lệnh."
	},
	"en": {
		"successChange": "Changed prefix into: %1",
		"missingInput": "Prefix have not to be blank",
		"resetPrefix": "Reset prefix to: %1",
		"confirmChange": "Are you sure that you want to change prefix into: %1"
	}
}

module.exports.handleReaction = async function ({ api, event, Threads, handleReaction, getText }) {
	try {
		if (event.userID != handleReaction.author) return;
		const { threadID, messageID } = event;
		var data = (await Threads.getData(String(threadID))).data || {};
		data["PREFIX"] = handleReaction.PREFIX;
		await Threads.setData(threadID, { data });
		await global.data.threadData.set(String(threadID), data);
		api.unsendMessage(handleReaction.messageID);
		// Yêu cầu lại dữ liệu từ thuebot.json
		let rentalData = fs.existsSync(thuebotDataPath) ? JSON.parse(fs.readFileSync(thuebotDataPath)) : [];
		if (Array.isArray(rentalData)) {
			const rentalInfo = rentalData.find(rental => rental.t_id === threadID);
			let newNickname;
			if (rentalInfo) {
				newNickname = `${rentalInfo.time_end}`;
			} else {
				newNickname = "Chưa thuê bot";
			}
			api.changeNickname(`「 ${handleReaction.PREFIX} 」 • ${global.config.BOTNAME} | HSD: ${newNickname}`, event.threadID, event.senderID);
		} else {
			console.error('Data is not an array:', rentalData);
		}
		return api.sendMessage(getText("successChange", handleReaction.PREFIX), threadID, messageID);
	} catch (e) { return console.log(e) }
}

module.exports.run = async ({ api, event, args, Threads, getText }) => {
	if (typeof args[0] == "undefined") return api.sendMessage(getText("missingInput"), event.threadID, event.messageID);
	let prefix = args[0].trim();
	if (!prefix) return api.sendMessage(getText("missingInput"), event.threadID, event.messageID);
	if (prefix == "reset") {
		var data = (await Threads.getData(event.threadID)).data || {};
		data["PREFIX"] = global.config.PREFIX;
		await Threads.setData(event.threadID, { data });
		await global.data.threadData.set(String(event.threadID), data);
		var uid = api.getCurrentUserID()
		api.changeNickname(`「 ${global.config.PREFIX} 」 • ${global.config.BOTNAME}`, event.threadID, uid);
		return api.sendMessage(getText("resetPrefix", global.config.PREFIX), event.threadID, event.messageID);
	} else return api.sendMessage(getText("confirmChange", prefix), event.threadID, (error, info) => {
		global.client.handleReaction.push({
			name: "setprefix",
			messageID: info.messageID,
			author: event.senderID,
			PREFIX: prefix
		})
	})
}

module.exports.handleEvent = async function ({ api, event, Threads }) {
	if (event.body === "prefix" || event.body === "Prefix") {
		const threadSetting = global.data.threadData.get(event.threadID) || {};
		const prefix = threadSetting.PREFIX || global.config.PREFIX;
		const msg = `🔍 ${global.config.BOTNAME} - Prefix của nhóm là: ${prefix}`;

		return api.sendMessage(msg, event.threadID);
	}
}