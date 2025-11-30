const fs = require('fs');
const logger = require('../../utils/log');
const moment = require('moment-timezone');

const dataDir = __dirname + '/data';
const dataPath = dataDir + '/thuebot.json';
const cachePath = dataDir + '/lastUpdate.txt';

// Create data directory and files if they don't exist
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, '[]');
if (!fs.existsSync(cachePath)) fs.writeFileSync(cachePath, '');

// Load data
let data = JSON.parse(fs.readFileSync(dataPath));
const save = () => fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

// Read last updated date
let lastUpdatedDate = fs.readFileSync(cachePath, 'utf8').trim();

// Admin UID (consider making this configurable or an array for multiple admins)

/**
 * Updates the bot's nickname in specified threads or all threads if none are specified.
 * The nickname includes the group's prefix, bot name, and rental expiration date.
 * @param {object} api - The API object from the bot.
 * @param {string[]} specificTids - Optional array of thread IDs to update.
 */
function updateNickname(api, specificTids = []) {
    const allThreads = global.data.threadInfo;
    const targetTids = specificTids.length > 0 ? specificTids : Array.from(allThreads.keys());

    for (let tid of targetTids) {
        const rentData = data.find((g) => g.t_id === tid);
        const threadInfo = allThreads.get(tid);

        // Skip if group is not rented or thread info is not available
        if (!rentData && threadInfo) continue;

        const threadData = global.data.threadData.get(tid) || {};
        const PREFIX_GROUP = threadData.PREFIX || global.config.PREFIX;
        let nickname;

        if (rentData) {
            const newEndDate = moment(rentData.time_end, 'DD/MM/YYYY').format('DD/MM/YYYY');
            const days_left = moment(rentData.time_end, 'DD/MM/YYYY').diff(
                moment().tz('Asia/Ho_Chi_Minh'),
                'days'
            );
            nickname = `[ ${PREFIX_GROUP} ] - ${global.config.BOTNAME} | HSD: ${newEndDate} | ${days_left} ngày 🕒`;
        } else {
            // If not rented, set a default nickname
            nickname = `[ ${PREFIX_GROUP} ] - ${global.config.BOTNAME} | HSD: Chưa thuê bot`;
        }

        // Only change nickname if threadInfo exists, meaning the bot is in the group
        if (threadInfo) {
            api.changeNickname(nickname, tid, api.getCurrentUserID()).catch((err) => {
                logger(`Không thể đổi biệt danh nhóm ${tid}: ${err.message}`, '[ RENT ]');
            });
        }
    }
}

/**
 * Downloads an image from a URL and returns a readable stream.
 * The downloaded file is temporarily stored and then deleted after a minute.
 * @param {string} url - The URL of the image.
 * @param {string} mime - The MIME type/extension of the image (e.g., 'jpg', 'png').
 * @returns {Promise<import('fs').ReadStream>} A readable stream of the downloaded image.
 */
async function streamURL(url, mime = 'jpg') {
    try {
        if (!url.startsWith('http')) throw new Error('URL không hợp lệ');
        const cacheDir = `${__dirname}/cache`;
        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

        const dest = `${cacheDir}/${Date.now()}.${mime}`;
        const downloader = require('image-downloader');
        const fse = require('fs-extra');

        await downloader.image({ url, dest });
        if (!fse.existsSync(dest)) throw new Error('Không thể tải hình ảnh');

        // Delete the file after 60 seconds
        setTimeout(() => {
            if (fse.existsSync(dest)) fse.unlinkSync(dest);
        }, 60 * 1000);

        return fse.createReadStream(dest);
    } catch (err) {
        logger(`Lỗi trong streamURL: ${err.message}`, '[ RENT ]');
        throw err;
    }
}

module.exports.config = {
    name: 'rent',
    version: '1.4.0',
    hasPermssion: 1, // Admin permission level
    credits: 'DC-Nam & DongDev & Khôi',
    description: 'Thuê bot + tự cập nhật biệt danh mỗi ngày',
    commandCategory: 'Admin',
    usages: '[]',
    cooldowns: 1,
    usePrefix: false,
};

/**
 * Converts a date string from DD/MM/YYYY to MM/DD/YYYY format.
 * @param {string} input - The date string in DD/MM/YYYY format.
 * @returns {string} The date string in MM/DD/YYYY format.
 */
function form_mm_dd_yyyy(input = '') {
    const split = input.split('/');
    return `${split[1]}/${split[0]}/${split[2]}`;
}

// Daily nickname update check
module.exports.onLoad = ({ api }) =>
    setInterval(() => {
        const now = moment().tz('Asia/Ho_Chi_Minh');
        const today = now.format('DD/MM/YYYY');
        // Check if it's past midnight and the update hasn't happened today
        if (now.hours() === 0 && now.minutes() < 5 && lastUpdatedDate !== today) {
            lastUpdatedDate = today;
            fs.writeFileSync(cachePath, today);
            updateNickname(api);
            logger(`Đã cập nhật biệt danh vào ngày ${today} lúc ${now.format('HH:mm:ss')}`, '[ RENT ]');
        }
    }, 60000); // Check every 1 minute

module.exports.run = async function ({ api, event, args }) {
    const send = (msg, cb) => api.sendMessage(msg, event.threadID, cb, event.messageID);
    const t_id = event.threadID;
    const senderID = event.senderID;

    // Function to check if sender is admin
    const isAdmin = global.config.NDH.includes(senderID);

    switch (args[0]) {
        case 'add': {
            if (!isAdmin) {
                return send('⚠️ Chỉ Admin mới có quyền thực hiện lệnh này!');
            }

            let targetTid = t_id;
            let targetUid = senderID;
            let days = 30;

            // Parse arguments: [add] [tid] [uid] [days]
            // Or [add] [uid] [days] (for current thread)
            // Or [add] [days] (for current thread, current user)
            if (args.length === 2) {
                // rent add <days>
                days = parseInt(args[1]);
            } else if (args.length === 3) {
                // rent add <uid> <days> (for current thread)
                targetUid = args[1];
                days = parseInt(args[2]);
            } else if (args.length >= 4) {
                // rent add <tid> <uid> <days>
                targetTid = args[1];
                targetUid = args[2];
                days = parseInt(args[3]);
            }

            if (isNaN(days) || days <= 0) return send(`❎ Số ngày không hợp lệ!`);

            const time_start = moment().tz('Asia/Ho_Chi_Minh').startOf('day').format('DD/MM/YYYY');
            const time_end = moment().tz('Asia/Ho_Chi_Minh').startOf('day').add(days, 'days').format('DD/MM/YYYY');

            let existingEntry = data.find((item) => item.t_id == targetTid);

            if (existingEntry) {
                let newEndDate = moment(existingEntry.time_end, 'DD/MM/YYYY')
                    .add(days, 'days')
                    .format('DD/MM/YYYY');
                existingEntry.time_end = newEndDate;
                send(`✅ Đã gia hạn thêm cho nhóm\n- Thời hạn: ${days} ngày\n- Hết hạn: ${newEndDate}`);
            } else {
                data.push({ t_id: targetTid, id: targetUid, time_start, time_end });
                send(`✅ Đã thêm nhóm vào danh sách thuê bot\n- Thời hạn: ${days} ngày\n- Hết hạn: ${time_end}`);
            }

            save();
            updateNickname(api, [targetTid]); // Update nickname for the specific thread
            break;
        }

        case 'list': {
            if (!isAdmin) {
                return send('⚠️ Chỉ Admin mới có quyền thực hiện lệnh này!');
            }

            if (data.length === 0) return send('❎ Danh sách thuê bot trống.');

            const list = data
                .map((g, i) => {
                    const thread = global.data.threadInfo.get(g.t_id);
                    const userName = global.data.userName.get(g.id) || 'Không xác định';
                    const threadName = (thread && thread.threadName) || 'Không rõ';
                    return `${i + 1}. ${userName} | ${threadName}\nHSD: ${g.time_end}`;
                })
                .join('\n-------------------\n');

            return api.sendMessage(
                `[ DANH SÁCH THUÊ BOT ]\n-------------------\n${list}\n-------------------\nReply STT để xem thông tin hoặc gõ del/giahan`,
                event.threadID,
                (e, info) => {
                    global.client.handleReply.push({
                        name: this.config.name,
                        messageID: info.messageID,
                        event, // Pass the original event for senderID check in handleReply
                    });
                },
                event.messageID
            );
        }

        case 'lọc': {
            if (!isAdmin) {
                return send('⚠️ Chỉ Admin mới có quyền thực hiện lệnh này!');
            }

            const expired = data.filter(
                (g) => new Date(form_mm_dd_yyyy(g.time_end)).getTime() < Date.now() + 25200000 // Add 7 hours for GMT+7
            );
            if (!expired.length) return send(`✅ Không có nhóm nào hết hạn.`);

            const removedTids = [];
            expired.forEach((g) => {
                data = data.filter((x) => x.t_id !== g.t_id); // Filter out expired groups
                removedTids.push(g.t_id);
                api.removeUserFromGroup(api.getCurrentUserID(), g.t_id, (err) => {
                    if (err) logger(`⚠️ Không thể out nhóm ${g.t_id}: ${err.message}`, '[ RENT ]');
                });
            });
            save();
            return send(`🗑️ Đã xóa và out ${expired.length} nhóm hết hạn.`);
        }

        case 'update': {
            if (!isAdmin) {
                return send('⚠️ Chỉ Admin mới có quyền thực hiện lệnh này!');
            }

            if (args[1] === 'all') {
                updateNickname(api);
                return send('✅ Đã cập nhật biệt danh cho tất cả nhóm thuê.');
            } else {
                updateNickname(api, [t_id]);
                return send('✅ Đã cập nhật biệt danh cho nhóm hiện tại.');
            }
        }

        case 'info': {
            const info = data.find((g) => g.t_id === t_id);
            if (!info) {
                const msg = await api.sendMessage('❎ Nhóm này không có trong danh sách thuê bot.', event.threadID, event.messageID);
                setTimeout(() => api.unsendMessage(msg.messageID), 30 * 1000);
                return;
            }

            const timeEnd = moment(info.time_end, 'DD/MM/YYYY').tz('Asia/Ho_Chi_Minh');
            const timeNow = moment().tz('Asia/Ho_Chi_Minh');
            const days_left = timeEnd.diff(timeNow, 'days');
            const status = days_left >= 0 ? '✅ Còn hạn' : '❌ Đã hết hạn';

            try {
                const userPhotoUrl = `https://graph.facebook.com/${info.id}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
                const threadInfo = await api.getThreadInfo(t_id);
                const groupPhotoUrl = threadInfo.imageSrc;

                const attachments = [];
                if (userPhotoUrl) {
                    try {
                        attachments.push(await streamURL(userPhotoUrl, 'jpg'));
                    } catch (error) {
                        logger(`Lỗi khi tải ảnh người thuê: ${error.message}`, '[ RENT ]');
                    }
                }
                if (groupPhotoUrl) {
                    try {
                        attachments.push(await streamURL(groupPhotoUrl, 'jpg'));
                    } catch (error) {
                        logger(`Lỗi khi tải ảnh nhóm: ${error.message}`, '[ RENT ]');
                    }
                }

                const msgBody =
                    `[ THÔNG TIN THUÊ BOT ]\n` +
                    `👤 Người thuê: ${global.data.userName.get(info.id) || 'Không xác định'}\n` +
                    `🔗 Facebook: https://facebook.com/${info.id}\n` +
                    `🏘️ Nhóm: ${threadInfo.threadName || 'Không rõ'}\n` +
                    `🔗 TID: ${t_id}\n` +
                    `📆 Ngày thuê: ${info.time_start}\n` +
                    `⏳ Ngày hết hạn: ${info.time_end}\n` +
                    `📌 Tình trạng: ${status}\n` +
                    `📎 Còn lại: ${days_left >= 0 ? `${days_left} ngày` : 'Đã hết hạn'}`;

                const msg = await api.sendMessage(
                    { body: msgBody, attachment: attachments },
                    event.threadID,
                    event.messageID
                );
                setTimeout(() => api.unsendMessage(msg.messageID), 30 * 1000);
            } catch (err) {
                logger(`Lỗi trong lệnh info: ${err.message}`, '[ RENT ]');
                // Send info without attachments if there's an error and retract after 30 seconds
                const threadInfo = await api.getThreadInfo(t_id);
                const msg = await api.sendMessage(
                    `❎ Lỗi khi lấy ảnh: ${err.message}\n` +
                    `[ THÔNG TIN THUÊ BOT ]\n` +
                    `👤 Người thuê: ${global.data.userName.get(info.id) || 'Không xác định'}\n` +
                    `🔗 Facebook: https://facebook.com/${info.id}\n` +
                    `🏘️ Nhóm: ${threadInfo.threadName || 'Không rõ'}\n` +
                    `🔗 TID: ${t_id}\n` +
                    `📆 Ngày thuê: ${info.time_start}\n` +
                    `⏳ Ngày hết hạn: ${info.time_end}\n` +
                    `📌 Tình trạng: ${status}\n` +
                    `📎 Còn lại: ${days_left >= 0 ? `${days_left} ngày` : 'Đã hết hạn'}`,
                    event.threadID,
                    event.messageID
                );
                setTimeout(() => api.unsendMessage(msg.messageID), 30 * 1000);
            }
            break;
        }

        case 'remove': {
            if (!isAdmin) {
                return send('⚠️ Chỉ Admin mới có quyền thực hiện lệnh này!');
            }

            const tidToRemove = (args[1] || t_id).trim();
            const index = data.findIndex((g) => g.t_id === tidToRemove);

            if (index === -1) {
                return send(`❎ Nhóm ${tidToRemove} không có trong danh sách thuê bot.`);
            }

            data.splice(index, 1);
            save();

            // Update nickname to reflect "not rented" status
            const threadData = global.data.threadData.get(tidToRemove) || {};
            const PREFIX_GROUP = threadData.PREFIX || global.config.PREFIX;
            const nickname = `『 ${PREFIX_GROUP} 』 ⪼ ${global.config.BOTNAME} | HSD: Chưa thuê bot`;

            try {
                api.changeNickname(nickname, tidToRemove, api.getCurrentUserID()).catch((err) => {
                    logger(`Không thể đổi biệt danh nhóm ${tidToRemove}: ${err.message}`, '[ RENT ]');
                });
            } catch (err) {
                logger(`⚠️ Lỗi khi cập nhật nickname nhóm ${tidToRemove}: ${err.message}`, '[ RENT ]');
            }

            return send(`✅ Đã xoá nhóm ${tidToRemove} khỏi danh sách thuê bot.`);
        }

        case 'fix': {
            if (!isAdmin) {
                return send('⚠️ Chỉ Admin mới có quyền thực hiện lệnh này!');
            }

            let targetTids = [];
            if (args[1]) {
                const tid = args[1];
                if (!global.data.threadInfo.get(tid)) return send(`❎ Nhóm ${tid} không tồn tại!`);
                targetTids = [tid];
            } else {
                targetTids = data.map((g) => g.t_id);
            }

            let fixedCount = 0;
            const errors = [];

            for (const tid of targetTids) {
                try {
                    const threadInfo = await api.getThreadInfo(tid);
                    const currentNickname = threadInfo.nicknames[api.getCurrentUserID()] || '';
                    const threadData = global.data.threadData.get(tid) || {};
                    const PREFIX_GROUP = threadData.PREFIX || global.config.PREFIX;
                    const rentData = data.find((g) => g.t_id === tid);
                    let expectedNickname;

                    if (rentData) {
                        const newEndDate = moment(rentData.time_end, 'DD/MM/YYYY').format('DD/MM/YYYY');
                        const days_left = moment(rentData.time_end, 'DD/MM/YYYY').diff(
                            moment().tz('Asia/Ho_Chi_Minh'),
                            'days'
                        );
                        expectedNickname = `『 ${PREFIX_GROUP} 』 ⪼ ${global.config.BOTNAME} | HSD: ${newEndDate} | ${days_left} ngày 🕒`;
                    } else {
                        expectedNickname = `『 ${PREFIX_GROUP} 』 ⪼ ${global.config.BOTNAME} | HSD: Chưa thuê bot`;
                    }

                    if (currentNickname !== expectedNickname) {
                        await api.changeNickname(expectedNickname, tid, api.getCurrentUserID());
                        fixedCount++;
                    }
                } catch (err) {
                    logger(`Lỗi khi kiểm tra biệt danh nhóm ${tid}: ${err.message}`, '[ RENT ]');
                    errors.push(`Nhóm ${tid}: ${err.message}`);
                }
            }

            const resultMsg =
                fixedCount > 0
                    ? `✅ Đã sửa biệt danh cho ${fixedCount} nhóm.\n${errors.length > 0 ? `⚠️ Lỗi:\n${errors.join('\n')}` : ''
                    }`
                    : `✅ Tất cả biệt danh đã đúng, không cần sửa.\n${errors.length > 0 ? `⚠️ Lỗi:\n${errors.join('\n')}` : ''
                    }`;
            return send(resultMsg);
        }

        default:
            return api.sendMessage(
                `⚙️ Các lệnh:\n\n🔰 Admin Bot:\n• rent add [tid] [uid] [days]\n• rent remove [tid]\n• rent list\n• rent lọc\n• rent update [all]\n• rent fix [tid]\n\n💬 Nhóm:\n• rent info`,
                event.threadID,
                async (err, info) => {
                    await new Promise((resolve) => setTimeout(resolve, 15 * 1000));
                    return api.unsendMessage(info.messageID);
                },
                event.messageID
            );
    }
};

module.exports.handleReply = async function ({ api, event, handleReply }) {
    const send = async (msg) => {
        const sentMsg = await api.sendMessage(msg, event.threadID, event.messageID);
        setTimeout(() => api.unsendMessage(sentMsg.messageID), 30 * 1000);
    };

    // Only allow the original sender of the 'rent list' command to use handleReply
    if (event.senderID !== handleReply.event.senderID) return;

    const args = event.body.split(' ');
    const cmd = args[0].toLowerCase();

    if (cmd === 'del') {
        const indices = args
            .slice(1)
            .map((i) => parseInt(i))
            .filter((i) => !isNaN(i) && i > 0 && i <= data.length)
            .sort((a, b) => b - a); // Sort descending to avoid issues with splice

        if (!indices.length) return send(`❎ Không có STT hợp lệ để xóa.`);

        const tidsToUpdate = [];
        for (const i of indices) {
            const item = data[i - 1];
            if (item) {
                tidsToUpdate.push(item.t_id);
                data.splice(i - 1, 1);
            }
        }

        save();
        try {
            updateNickname(api, tidsToUpdate);
        } catch (err) {
            logger(`⚠️ Lỗi khi cập nhật biệt danh sau khi xóa: ${err.message}`, '[ RENT ]');
        }

        return send(`✅ Đã xóa thành công ${tidsToUpdate.length} nhóm!`);
    }

    if (cmd === 'giahan') {
        const index = parseInt(args[1]) - 1;
        const days = parseInt(args[2]);

        if (isNaN(index) || !data[index] || isNaN(days) || days <= 0) {
            return send(`❌ STT hoặc số ngày không hợp lệ.`);
        }

        let g = data[index];
        g.time_end = moment(g.time_end, 'DD/MM/YYYY').add(days, 'days').format('DD/MM/YYYY');

        save();

        try {
            updateNickname(api, [g.t_id]);
        } catch (err) {
            logger(`⚠️ Lỗi khi cập nhật biệt danh nhóm ${g.t_id}: ${err.message}`, '[ RENT ]');
        }

        return send(`✅ Đã gia hạn nhóm thêm ${days} ngày.`);
    }

    if (isFinite(cmd)) {
        const index = parseInt(cmd) - 1;
        const g = data[index];
        if (!g) return send(`❎ STT không tồn tại.`);

        const timeEnd = moment(g.time_end, 'DD/MM/YYYY').tz('Asia/Ho_Chi_Minh');
        const timeNow = moment().tz('Asia/Ho_Chi_Minh');
        const days_left = timeEnd.diff(timeNow, 'days');
        const status = days_left >= 0 ? '✅ Còn hạn' : '❌ Đã hết hạn';

        try {
            const userPhotoUrl = `https://graph.facebook.com/${g.id}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
            const threadInfo = await api.getThreadInfo(g.t_id);
            const groupPhotoUrl = threadInfo.imageSrc;

            const attachments = [];
            if (userPhotoUrl) {
                try {
                    attachments.push(await streamURL(userPhotoUrl, 'jpg'));
                } catch (error) {
                    logger(`Lỗi khi tải ảnh người thuê trong handleReply: ${error.message}`, '[ RENT ]');
                }
            }
            if (groupPhotoUrl) {
                try {
                    attachments.push(await streamURL(groupPhotoUrl, 'jpg'));
                } catch (error) {
                    logger(`Lỗi khi tải ảnh nhóm trong handleReply: ${error.message}`, '[ RENT ]');
                }
            }

            const msgBody =
                `[ THÔNG TIN THUÊ BOT - Nhóm ${cmd} ]\n` +
                `👤 Người thuê: ${global.data.userName.get(g.id) || 'Không xác định'}\n` +
                `🔗 Facebook: https://facebook.com/${g.id}\n` +
                `🏘️ Nhóm: ${threadInfo.threadName || 'Không rõ'}\n` +
                `🔗 TID: ${g.t_id}\n` +
                `📆 Ngày thuê: ${g.time_start}\n` +
                `⏳ Ngày hết hạn: ${g.time_end}\n` +
                `📌 Tình trạng: ${status}\n` +
                `📎 Còn lại: ${days_left >= 0 ? `${days_left} ngày` : 'Đã hết hạn'}`;

            const msg = await api.sendMessage(
                { body: msgBody, attachment: attachments },
                event.threadID,
                async (err, info) => {
                    await new Promise((resolve) => setTimeout(resolve, 35 * 1000)); // Retract after 35 seconds
                    return api.unsendMessage(info.messageID);
                },
                event.messageID
            );
        } catch (err) {
            logger(`Lỗi khi xử lý thông tin trong handleReply: ${err.message}`, '[ RENT ]');
            const threadInfo = await api.getThreadInfo(g.t_id);
            const msg = await api.sendMessage(
                `❎ Lỗi khi lấy ảnh: ${err.message}\n` +
                `[ THÔNG TIN THUÊ BOT - Nhóm ${cmd} ]\n` +
                `👤 Người thuê: ${global.data.userName.get(g.id) || 'Không xác định'}\n` +
                `🔗 Facebook: https://facebook.com/${g.id}\n` +
                `🏘️ Nhóm: ${threadInfo.threadName || 'Không rõ'}\n` +
                `🔗 TID: ${g.t_id}\n` +
                `📆 Ngày thuê: ${g.time_start}\n` +
                `⏳ Ngày hết hạn: ${g.time_end}\n` +
                `📌 Tình trạng: ${status}\n` +
                `📎 Còn lại: ${days_left >= 0 ? `${days_left} ngày` : 'Đã hết hạn'}`,
                event.threadID,
                async (err, info) => {
                    await new Promise((resolve) => setTimeout(resolve, 35 * 1000)); // Retract after 35 seconds
                    return api.unsendMessage(info.messageID);
                },
                event.messageID
            );
        }
        return;
    }

    return send(`❎ Lệnh sai.\nReply với: STT | del <STT> | giahan <STT> <số ngày>`);
};