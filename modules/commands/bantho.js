module.exports.config = {
	name: "bantho",
	version: "1.0.2",
	hasPermssion: 0,
	credits: "quên - rework by DMH dzai - mod by Trung",
	description: "Ảnh bàn thờ của đứa bị tag (trừ UID đặc biệt)",
	commandCategory: "Edit-IMG",
	usages: "@tag",
	cooldowns: 5,
	dependencies: {
	  "fs-extra": "",
	  "axios": "",
	  "canvas": "",
	  "jimp": "",
	  "node-superfetch": ""
	}
};

module.exports.circle = async (image) => {
	const jimp = global.nodemodule['jimp'];
	image = await jimp.read(image);
	image.circle();
	return await image.getBufferAsync("image/png");
};

module.exports.run = async ({ event, api }) => {
	try {
		const Canvas = global.nodemodule['canvas'];
		const request = global.nodemodule["node-superfetch"];
		const jimp = global.nodemodule["jimp"];
		const fs = global.nodemodule["fs-extra"];

		const path_bantho = __dirname + '/cache/bantho.png'; 
		const id = Object.keys(event.mentions)[0] || event.senderID;

		// 🚫 Bỏ qua nếu là UID bị trừ
		if (id == "100050467390630") {
			return api.sendMessage("UID này được miễn nến 🕯️😎", event.threadID, event.messageID);
		}

		const canvas = Canvas.createCanvas(960, 634);
		const ctx = canvas.getContext('2d');
		const background = await Canvas.loadImage('https://i.imgur.com/brK0Hbb.jpg');
		
		let avatar = await request.get(`https://graph.facebook.com/${id}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`);
		avatar = await this.circle(avatar.body);
		
		ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
		ctx.drawImage(await Canvas.loadImage(avatar), 353, 158, 205, 205);

		const imageBuffer = canvas.toBuffer();
		fs.writeFileSync(path_bantho, imageBuffer);

		api.sendMessage({
			body: "Ơ kìa bạn khỏe không ?:))",
			attachment: fs.createReadStream(path_bantho, { highWaterMark: 128 * 1024 })
		}, event.threadID, () => fs.unlinkSync(path_bantho), event.messageID);
	} catch (e) {
		api.sendMessage(e.stack, event.threadID);
	}
};

// Text by DMH - do not clear this line & forget me !
//  ////////   //         /////////       //         ////////   /////////
//  //    //   //         //           //    //    //           //
//  //   ///   //         //          //      //    ////        //
//  ////////   //         /////////   //      //      ///       /////////
//  //         //         //          //////////         ///    //
//  //         //         //          //      //           //   //
//  //         /////////  /////////   //      //   ////////     /////////   (mod by Trung)
