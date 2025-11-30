const fs = require("fs");

module.exports = {
	config: {
		name: "restart",
		version: "1.0.0",
		hasPermssion: 3,
		credits: "LocDev",
		description: "Khởi Động Lại Bot.",
		commandCategory: "Admin",
		cooldowns: 0
	},

	onLoad: function ({ api }) {
		const pathFile = `${__dirname}/temp/restart.txt`; // đồng nhất tên thư mục
		if (fs.existsSync(pathFile)) {
			const [tid, time] = fs.readFileSync(pathFile, "utf-8").split(" ");
			api.sendMessage(`✅ | Bot restarted\n⏰ | Time: ${(Date.now() - time) / 1000}s`, tid);
			fs.unlinkSync(pathFile);
		}
	},

	run: async function ({ api, event }) {
		const pathFile = `${__dirname}/temp/restart.txt`; // giống với onLoad
		fs.writeFileSync(pathFile, `${event.threadID} ${Date.now()}`);
		await api.sendMessage("🔄 Restarting bot...", event.threadID);
		process.exit(2);
	}
};
