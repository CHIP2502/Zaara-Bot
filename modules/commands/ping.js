module.exports.config = {
	name: "ping",
	version: "1.0.8",
	hasPermssion: 1,
	credits: "Mirai Team",
	description: "Tag ẩn toàn bộ thành viên",
	commandCategory: "QTV",
	usages: "[Text]",
	cooldowns: 20
};

module.exports.run = async function({ api, event, args }) {
	try {
		const botID = api.getCurrentUserID();
		var listUserID = event.participantIDs.filter(ID => ID != botID && ID != event.senderID);
		var body = (args.length != 0) ? args.join(" ") : "Bạn đã bị quản trị viên xoá khỏi nhóm.", mentions = [], index = 0;
		
		for(const idUser of listUserID) {
			body = "‎" + body;
			mentions.push({ id: idUser, tag: "‎", fromIndex: index - 1 });
			index -= 1;
		}

		return api.sendMessage({ body, mentions }, event.threadID, event.messageID);

	}
	catch (e) { return console.log(e); }
}