module.exports.config = {
	name: "ev",
	version: "1.0.0",
	hasPermssion: 1,
	credits: "GPT-5",
	description: "Bật/tắt join/leave noti cho box hiện tại",
	commandCategory: "Group",
	usages: "ev <join|leave> <on|off>",
	cooldowns: 3
};

module.exports.run = async function ({ api, event, args, Threads }) {
	const { threadID, messageID } = event;
	const type = (args[0] || '').toLowerCase();
	const action = (args[1] || '').toLowerCase();

	if (!['join','leave'].includes(type) || !['on','off'].includes(action)) {
		return api.sendMessage("Dùng: ev <join|leave> <on|off>", threadID, messageID);
	}

	try {
		const record = await Threads.getData(threadID);
		const data = record?.data || {};
		if (type === 'join') data.joinNoti = action === 'on';
		if (type === 'leave') data.leaveNoti = action === 'on';

		await Threads.setData(threadID, { data });

		// Sync in-memory cache so events read the latest flag immediately
		const currentMem = global.data.threadData.get(threadID) || {};
		global.data.threadData.set(threadID, { ...currentMem, ...data });

		return api.sendMessage(`Đã ${action === 'on' ? 'bật' : 'tắt'} ${type} noti cho box này.`, threadID, messageID);
	} catch (e) {
		return api.sendMessage(`Lỗi: ${e.message || e}`, threadID, messageID);
	}
};


