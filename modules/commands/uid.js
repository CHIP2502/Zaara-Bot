module.exports.config = {
	name: "uid",
	version: "1.0.0",
	hasPermssion: 0,
	credits: "Mirai Team",
	description: "Lấy ID người dùng.",
	commandCategory: "Box",
	cooldowns: 0,
	usePrefix: false
};

module.exports.run = async function ({ api, event, args }) {
	const axios = global.nodemodule['axios'];
	if (event.type == "message_reply") {
		uid = event.messageReply.senderID
		return api.shareContact(`${uid}`, uid, event.threadID)
	}
	if (!args[0]) { return api.shareContact(`${event.senderID}`, event.senderID, event.threadID); }
	else {
		if (args[0].indexOf(".com/") !== -1) {
			const res_ID = await api.getUID(args[0]);
			return api.shareContact(`${res_ID}`, res_ID, event.threadID)
		}
		else {
			for (var i = 0; i < Object.keys(event.mentions).length; i++) {
				var id = Object.keys(event.mentions)[i];
				api.shareContact(`${id}`, id, event.threadID);
			}
			return;
		}
	}
}
