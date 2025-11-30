const axios = require('axios');

module.exports.config = {
	name: "loibaihat",
	version: "1.0.0",
	hasPermssion: 0,
	credits: "Gojo",
	description: "Lấy lời bài hát",
	commandCategory: "Nhạc",
	usages: "loibaihat + tên bài hát",
	cooldowns: 5,
	dependencies: {
		
	}
};

module.exports.run = async function({ api, event, args }) {
	const songName = args.join(" ");
	try {
		const response = await axios.get(`https://lyrist.vercel.app/api/${encodeURIComponent(songName)}`);
		const data = response.data;
		if (data.title) {
			const message = `Lời bài hát ${data.title} của ${data.artist}:\n\n${data.lyrics}`;
			api.sendMessage(message, event.threadID, event.messageID);
		} else {
			api.sendMessage(`Không tìm thấy lời bài hát ${songName}.`, event.threadID, event.messageID);
		}
	} catch (error) {
		console.error(error);
		api.sendMessage('Có lỗi xảy ra khi tìm kiếm lời bài hát.', event.threadID, event.messageID);
	}
};
