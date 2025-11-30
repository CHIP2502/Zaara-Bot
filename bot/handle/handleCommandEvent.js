module.exports = function ({ api, models, Users, Threads, Currencies }) {
    const logger = require("../../utils/log.js")
    return function ({ event }) {
        const { allowInbox } = global.config;
        const { userBanned, threadBanned } = global.data;
        const { commands, eventRegistered } = global.client;
        var { senderID, threadID } = event;
        var senderID = String(senderID);
        var threadID = String(threadID);
        if (userBanned.has(senderID) || threadBanned.has(threadID) || allowInbox == !![] && senderID == threadID) return;
        for (const eventReg of eventRegistered) {
            const cmd = commands.get(eventReg);
            var getText2 = (...values) => {
                if (cmd.languages && typeof cmd.languages == 'object') {
                    const pack = cmd.languages[global.config.language] || {};
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
                Obj.event = event 
                Obj.api = api
                Obj.models = models
                Obj.Users = Users
                Obj.Threads = Threads 
                Obj.Currencies = Currencies 
                Obj.getText = getText2;
                if (cmd) cmd.handleEvent(Obj);
            } catch (error) {
                logger(global.getText('handleCommandEvent', 'moduleError', cmd.config.name), 'error');
            }
        }
    };
};