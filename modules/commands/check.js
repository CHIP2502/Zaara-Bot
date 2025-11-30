module.exports.config = {
  name: "checktt",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "DungUwU && Nghĩa",
  description: "Check tương tác ngày/tuần/toàn bộ",
  commandCategory: "Tiện ích",
  usages: "[all/week/day]",
  cooldowns: 0,
  dependencies: {
    "fs-extra": " ",
    "moment-timezone": " "
  }
};

// Constants & Utils
const DATA_PATH = __dirname + '/tt/';
const MOMENT = require('moment-timezone');
const getToday = () => MOMENT.tz("Asia/Ho_Chi_Minh").day();
const formatNum = n => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const fs = require('fs-extra');
const ensureDir = () => !fs.existsSync(DATA_PATH) && fs.mkdirSync(DATA_PATH, { recursive: true });
const loadData = (threadID) => {
  const path = DATA_PATH + threadID + '.json';
  return fs.existsSync(path) ? JSON.parse(fs.readFileSync(path)) : {
    total: [], week: [], day: [], time: getToday(),
    last: { time: getToday(), day: [], week: [] }
  };
};
const saveData = (threadID, data) => fs.writeFileSync(DATA_PATH + threadID + '.json', JSON.stringify(data, null, 4));

module.exports.onLoad = () => {
  ensureDir();
  setInterval(() => {
    fs.readdirSync(DATA_PATH).forEach(file => {
      try {
        const data = JSON.parse(fs.readFileSync(DATA_PATH + file));
        if (data.time !== getToday()) {
          setTimeout(() => {
            const updated = JSON.parse(fs.readFileSync(DATA_PATH + file));
            if (updated.time !== getToday()) {
              updated.time = getToday();
              saveData(file.replace('.json', ''), updated);
            }
          }, 60000);
        }
      } catch { fs.unlinkSync(DATA_PATH + file); }
    });
  }, 60000);
};

// Data helpers
const ensureUser = (data, userID, today) => {
  if (!data.last) data.last = { time: today, day: [], week: [] };
  ['total', 'week', 'day', 'last.week', 'last.day'].forEach(path => {
    const [parent, child] = path.split('.');
    const arr = child ? data[parent][child] : data[parent];
    if (!arr.find(u => u.id === userID)) arr.push({ id: userID, count: 0 });
  });
};

const incrementCount = (data, userID) => {
  ['total', 'week', 'day'].forEach(type => {
    const user = data[type].find(u => u.id === userID);
    user ? user.count++ : data[type].push({ id: userID, count: 1 });
  });
};

const filterUsers = (data, participants) => {
  if (!participants?.length) return;
  const ids = participants.map(String);
  ['day', 'week', 'total'].forEach(type => {
    data[type] = data[type].filter(u => ids.includes(String(u.id)));
  });
};

module.exports.handleEvent = async function ({ api, event, Threads }) {
  try {
    if (!event.isGroup || global.client.sending_top) return;
    
    const { threadID, senderID } = event;
    const today = getToday();
    const data = loadData(threadID);
    
    // Ensure users exist
    (event.participantIDs || []).forEach(id => ensureUser(data, id, today));
    saveData(threadID, data);
    
    // Check new day
    if (data.time !== today) {
      global.client.sending_top = true;
      setTimeout(() => global.client.sending_top = false, 300000);
    }
    
    // Update counts
    incrementCount(data, senderID);
    filterUsers(data, event.participantIDs);
    saveData(threadID, data);
  } catch (e) { console.error('handleEvent error:', e); }
};

// Command handlers
const handleBox = (api, event, args) => {
  const body = event.args[0].replace(exports.config.name, '') + 'box info';
  const newArgs = body.split(' ');
  arguments[0].args = newArgs.slice(1);
  arguments[0].event.args = newArgs;
  arguments[0].event.body = body;
  return require('./box.js').run(...Object.values(arguments));
};

const handleReset = async (api, event, threadID, senderID, Threads) => {
  const thread = (await Threads.getData(threadID)).threadInfo;
  if (!thread.adminIDs.some(a => a.id === senderID)) {
    return api.sendMessage('❎ Bạn không đủ quyền hạn để sử dụng', event.threadID, event.messageID);
  }
  fs.unlinkSync(DATA_PATH + threadID + '.json');
  return api.sendMessage('✅ Đã xóa toàn bộ dữ liệu đếm tương tác của nhóm', event.threadID);
};

const handleFilter = async (api, event, threadID, senderID, args, data) => {
  const thread = await api.getThreadInfo(threadID);
  if (!thread.adminIDs.some(a => a.id === senderID) || !thread.isGroup || 
      !thread.adminIDs.some(a => a.id === api.getCurrentUserID()) || !args[1] || isNaN(args[1])) {
    return api.sendMessage("❎ Không có quyền hoặc dữ liệu không hợp lệ", threadID);
  }
  
  const minCount = parseInt(args[1]);
  const removed = [];
  
  for (const user of event.participantIDs) {
    if (user === api.getCurrentUserID()) continue;
    const userData = data.total.find(u => u.id === user);
    if (!userData || userData.count <= minCount) {
      await new Promise(r => setTimeout(async () => {
        try { await api.removeUserFromGroup(user, threadID); removed.push(user); } catch {}
        r();
      }, 1000));
    }
  }
  
  const names = removed.map((u, i) => `${i + 1}. ${global.data.userName.get(u)}`).join('\n');
  return api.sendMessage(`✅ Đã xóa ${removed.length} thành viên ≤ ${minCount} tin\n\n${names}`, threadID);
};

module.exports.run = async function ({ api, event, args, Users, Threads }) {
  await new Promise(r => setTimeout(r, 500));
  
  const { threadID, senderID, mentions } = event;
  const query = args[0]?.toLowerCase() || '';
  
  if (!fs.existsSync(DATA_PATH + threadID + '.json')) {
    return api.sendMessage("⚠️ Chưa có dữ liệu", threadID);
  }
  
  const data = loadData(threadID);
  
  // Handle commands
  if (query === 'box') return handleBox(api, event, args);
  if (query === 'reset') return handleReset(api, event, threadID, senderID, Threads);
  if (query === 'lọc') return handleFilter(api, event, threadID, senderID, args, data);

  // Data processing
  const getData = (q, d) => ({ 'all': d.total, '-a': d.total, 'week': d.week, '-w': d.week, 'day': d.day, '-d': d.day }[q] || d.total);
  const getHeader = (q) => ({ 'all': 'TỔNG', '-a': 'TỔNG', 'week': 'TUẦN', '-w': 'TUẦN', 'day': 'NGÀY', '-d': 'NGÀY' }[q] || 'TỔNG');
  
  const loadUsers = async (data, Users) => {
    const users = [];
    for (const item of data) {
      const name = await Users.getNameUser(item.id) || 'Facebook User';
      users.push({ ...item, name });
    }
    return users.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  };

  const isIndividual = (q, m, e) => {
    const list = ['all', '-a', 'week', '-w', 'day', '-d'];
    return !list.includes(q) && (!Object.keys(m).length || Object.keys(m).length <= 1) || (!list.includes(q) && e.type === 'message_reply');
  };

  const getPermission = (uid, thread) => {
    if (global.config.ADMINBOT.includes(uid)) return 'Admin Bot';
    if (global.config.NDH.includes(uid)) return 'Người Hỗ Trợ';
    if (thread.adminIDs.some(a => a.id === uid)) return 'Quản Trị Viên';
    return 'Thành Viên';
  };

  // Main processing
  const userData = getData(query, data);
  const header = `[ KIỂM TRA TIN NHẮN ${getHeader(query)} ]\n`;
  const users = await loadUsers(userData, Users);
  const ranking = data.total.sort((a, b) => b.count - a.count).map((u, i) => ({ rank: i + 1, id: u.id, count: u.count }));
  
  let body = '';
  if (isIndividual(query, mentions, event)) {
    const UID = event.messageReply?.senderID || Object.keys(mentions)[0] || senderID;
    const userIndex = users.findIndex(u => u.id === UID);
    if (userIndex === -1) return api.sendMessage(`${UID === senderID ? 'Bạn' : 'User'} chưa có dữ liệu`, threadID);
    
    const user = users[userIndex];
    const userTotal = data.total.find(u => u.id === UID)?.count || 0;
    const userWeek = data.week.find(u => u.id === UID)?.count || 0;
    const userDay = data.day.find(u => u.id === UID)?.count || 0;
    
    const rankWeek = data.week.sort((a, b) => b.count - a.count).findIndex(u => u.id === UID);
    const rankDay = data.day.sort((a, b) => b.count - a.count).findIndex(u => u.id === UID);
    
    const totalDay = data.day.reduce((a, b) => a + b.count, 0);
    const totalWeek = data.week.reduce((a, b) => a + b.count, 0);
    const totalAll = data.total.reduce((a, b) => a + b.count, 0);
    
    const thread = await api.getThreadInfo(threadID);
    const permission = getPermission(UID, thread);
    
    body = `[ ${thread.threadName} ]\n\n` +
      `👤 Tên: ${user.name}\n🎖️ Chức Vụ: ${permission}\n📝 Profile: https://www.facebook.com/profile.php?id=${UID}\n\n` +
      `💬 Tin Nhắn Trong Ngày: ${formatNum(userDay)}\n📊 Tỉ Lệ Tương Tác Ngày ${((userDay / totalDay) * 100).toFixed(2)}%\n🥇 Hạng Trong Ngày: ${rankDay + 1}\n\n` +
      `💬 Tin Nhắn Trong Tuần: ${formatNum(userWeek)}\n📊 Tỉ Lệ Tương Tác Tuần ${((userWeek / totalWeek) * 100).toFixed(2)}%\n🥈 Hạng Trong Tuần: ${rankWeek + 1}\n\n` +
      `💬 Tổng Tin Nhắn: ${formatNum(userTotal)}\n📊 Tỉ Lệ Tương Tác Tổng ${((userTotal / totalAll) * 100).toFixed(2)}%\n🏆 Hạng Tổng: ${userIndex + 1}\n\n` +
      `📌 Thả cảm xúc '❤️' tin nhắn này để xem tổng tin nhắn của toàn bộ thành viên trong nhóm`;
  } else {
    body = users.map((u, i) => `${i + 1}. ${u.name} - ${formatNum(u.count)} Tin Nhắn`).join('\n') +
           `\n💬 Tổng Tin Nhắn: ${formatNum(users.reduce((a, b) => a + b.count, 0))}`;
  }

  const footer = (query === 'all' || query === '-a') ? 
    `\n📊 Bạn hiện đang đứng ở hạng: ${ranking.find(r => r.id === senderID)?.rank || 'N/A'}\n\n` +
    `Reply (phản hồi) tin nhắn này theo số thứ tự để xóa thành viên ra khỏi nhóm.\n` +
    `${global.config.PREFIX}checktt lọc + số tin nhắn để xóa thành viên ra khỏi nhóm.\n` +
    `${global.config.PREFIX}checktt reset -> reset lại toàn bộ dữ liệu tin nhắn.\n` +
    `${global.config.PREFIX}checktt box -> xem thông tin nhóm` : '';

  return api.sendMessage(header + body + footer, threadID, (err, info) => {
    if (err) return console.log(err);
    
    if (query === 'all' || query === '-a') {
      global.client.handleReply.push({ 
        name: this.config.name, 
        messageID: info.messageID, 
        tag: 'locmen', 
        thread: threadID, 
        author: senderID, 
        storage: users 
      });
    }
    global.client.handleReaction.push({ 
      name: this.config.name, 
      messageID: info.messageID, 
      sid: senderID 
    });
  });
};
module.exports.handleReply = async function ({ api, event, handleReply, Threads }) {
  try {
    const { senderID } = event;
    const thread = (await Threads.getData(event.threadID)).threadInfo;
    
    if (!thread.adminIDs.some(a => a.id === api.getCurrentUserID()) || 
        !thread.adminIDs.some(a => a.id === senderID)) {
      return api.sendMessage('❎ Không có quyền thực hiện', event.threadID, event.messageID);
    }
    
    const indices = event.body.split(" ");
    if (isNaN(indices.join(''))) return api.sendMessage('⚠️ Dữ liệu không hợp lệ', event.threadID);
    
    const removed = [];
    let errors = 0;
    
    for (const idx of indices) {
      const user = handleReply?.storage[parseInt(idx) - 1];
      if (user?.id) {
        try {
          await api.removeUserFromGroup(user.id, event.threadID);
          removed.push(`${idx}. ${global.data.userName.get(user.id) || 'Unknown'}`);
        } catch { errors++; }
      }
    }
    
    return api.sendMessage(`✅ Đã xóa ${removed.length} người thành công\n❎ Thất bại ${errors}\n\n${removed.join('\n')}`, handleReply.thread);
  } catch (e) { console.error('handleReply error:', e); }
};
module.exports.handleReaction = function ({ event, api, handleReaction: r }) {
  if (event.userID !== r.sid || event.reaction !== "❤") return;
  
  try {
    api.unsendMessage(r.messageID);
    const data = loadData(event.threadID);
    const users = data.total.sort((a, b) => b.count - a.count);
    const total = users.reduce((s, u) => s + u.count, 0);
    const rank = users.findIndex(u => u.id === event.userID) + 1;
    
    const msg = `[ KIỂM TRA TẤT CẢ TIN NHẮN ]\n\n` +
      `${users.map((u, i) => `${i + 1}. ${global.data.userName.get(u.id)} - ${formatNum(u.count)} tin`).join('\n')}\n\n` +
      `💬 Tổng tin nhắn: ${formatNum(total)}\n📊 Bạn hiện đang đứng ở hạng: ${rank}\n\n` +
      `📌 Reply (phản hồi) tin nhắn này theo số thứ tự để xóa thành viên ra khỏi nhóm.\n` +
      `${global.config.PREFIX}checktt lọc + số tin nhắn để xóa thành viên ra khỏi nhóm.\n` +
      `${global.config.PREFIX}checktt reset -> reset lại toàn bộ dữ liệu tin nhắn.\n` +
      `${global.config.PREFIX}checktt box -> xem thông tin nhóm.`;
    
    api.sendMessage(msg, event.threadID, (err, info) => {
      if (err) return console.error('Send error:', err);
      global.client.handleReply.push({ 
        name: this.config.name, 
        messageID: info.messageID, 
        tag: 'locmen', 
        thread: event.threadID, 
        author: event.senderID, 
        storage: users 
      });
    });
  } catch (e) { 
    console.error('handleReaction error:', e); 
  }
};