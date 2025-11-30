const fs = require("fs");
module.exports.config = {
name: "hi",
	version: "1.0.1",
	hasPermssion: 0,
	credits: "VanHung",
	description: "hi",
	commandCategory: "Không cần dấu lệnh",
	usages: "ko cần prefix chỉ cần chat hi",
	cooldowns: 5,
};
module.exports.handleEvent = function({ api, event, client, __GLOBAL }) {
	var { threadID, messageID } = event;
	if (event.body.indexOf("hi")==0 ||event.body.indexOf("Hi")==0 || event.body.indexOf("Hello")==0 ||event.body.indexOf("Chào")==0 ||(event.body.indexOf("hello")==0)) {
		var msg = {
				body: "Hehe chào lại nè babi nhoa ❤️",
				attachment: fs.createReadStream(__dirname + `/noprefix/hi.gif`)
			}
			api.sendMessage(msg, threadID, messageID);
		}
	}
	module.exports.run = function({ api, event, client, __GLOBAL }) {

}

