process.on('unhandledRejection', error => console.log(error));
process.on('uncaughtException', error => console.log(error));

//====================================================//
//========= Yêu cầu tất cả các biến cần sử dụng =========//
//====================================================//

const moment = require("moment-timezone");
const { readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync, rm } = require("fs-extra");
const { join, resolve } = require("path");
const chalk = require("chalk");
const { execSync } = require('child_process');
const fs = require("fs-extra");
const path = require("path");
const logger = require("./utils/log.js");
const login = require('./bot/fb-chat-api');
// const login = require('fca-pmd1405');
const listPackage = JSON.parse(readFileSync('./package.json')).dependencies;
const listbuiltinModules = require("module").builtinModules;
const os = require('os');

function getMemoryInfo() {
    const memory = process.memoryUsage();
    const totalRAM = os.totalmem();
    const freeRAM = os.freemem();
    const usedRAM = totalRAM - freeRAM;

    return {
        ram: {
            used: Math.round(usedRAM / 1024 / 1024),
            total: Math.round(totalRAM / 1024 / 1024),
        },
        heap: {
            used: Math.round(memory.heapUsed / 1024 / 1024),
            total: Math.round(memory.heapTotal / 1024 / 1024)
        }
    };
}

global.client = {
    commands: new Map(),
    events: new Map(),
    cooldowns: new Map(),
    eventRegistered: [],
    handleSchedule: [],
    handleReaction: [],
    handleReply: [],
    mainPath: process.cwd(),
    configPath: "",
    getTime(option) {
        const time = moment.tz("Asia/Ho_Chi_minh");
        const formatMap = {
            seconds: "ss", minutes: "mm", hours: "HH",
            date: "DD", month: "MM", year: "YYYY",
            fullHour: "HH:mm:ss", fullYear: "DD/MM/YYYY",
            fullTime: "HH:mm:ss DD/MM/YYYY"
        };
        return time.format(formatMap[option]);
    }
};

global.data = new Object({
    threadInfo: new Map(),
    threadData: new Map(),
    userName: new Map(),
    userBanned: new Map(),
    threadBanned: new Map(),
    commandBanned: new Map(),
    threadAllowNSFW: new Array(),
    allUserID: new Array(),
    allCurrenciesID: new Array(),
    allThreadID: new Array()
});

global.utils = require("./utils");
global.nodemodule = new Object();

// ✅ THÊM NGAY DƯỚI ĐÂY
global.nodemodule = global.nodemodule || {};
global.nodemodule['semver'] = require('semver');

global.config = new Object();
global.configModule = new Object();
global.moduleData = new Array();
global.language = new Object();
global.anti = resolve(__dirname, "./bot/data/anti.json");

global.bypass = require("./bot/login/loginEmail.js");
global.account = {
    cookie: fs.readFileSync('./cookie.txt', 'utf-8').trim()
};


//================== CONFIG LOAD ==================//
try {
    global.client.configPath = path.join(global.client.mainPath, "config.json");
    let configValue;
    try {
        configValue = require(global.client.configPath);
    } catch {
        const tempPath = global.client.configPath.replace(/\.json$/, "") + ".temp";
        if (fs.existsSync(tempPath)) {
            configValue = JSON.parse(fs.readFileSync(tempPath));
            logger.loader(`Found: ${tempPath}`);
        } else {
            return logger.loader("config.json Đâu Mất Rồi Bro=))?", "error");
        }
    }
    Object.assign(global.config, configValue);
    logger.loader("Em đã tải cấu hình config ròi nha anh iu <3");
} catch {
    return logger.loader("Can't load file config!", "error");
}

//=================== DATABASE ====================//
const { Sequelize, sequelize } = require("./database");
writeFileSync(global.client.configPath + ".temp", JSON.stringify(global.config, null, 4), 'utf8');

//================================================//
//========= Tải ngôn ngữ sử dụng =========//
//================================================//

const langFile = fs.readFileSync(`${__dirname}/languages/${global.config.language || "en"}.lang`, "utf-8")
    .split(/\r?\n|\r/).filter(line => line && !line.startsWith('#'));
for (const item of langFile) {
    const sep = item.indexOf('=');
    const [head, ...keyParts] = item.slice(0, sep).split('.');
    const key = keyParts.join('.');
    const value = item.slice(sep + 1).replace(/\\n/gi, '\n');
    global.language[head] = global.language[head] || {};
    global.language[head][key] = value;
}
global.getText = function (...args) {
    const langText = global.language;
    if (!langText[args[0]]) throw `Not found key language: ${args[0]}`;
    let text = langText[args[0]][args[1]];
    for (let i = args.length - 1; i > 0; i--) {
        text = text.replace(RegExp(`%${i}`, 'g'), args[i + 1]);
    }
    return text;
};

//=====================================//
// AUTO CLEAN CACHE CODE BY DONGDEV //
//=====================================//

if (global.config.autoCleanCache.Enable) {
    const folderPath = global.config.autoCleanCache.CachePath;
    const fileExtensions = global.config.autoCleanCache.AllowFileExtension;

    fs.readdir(folderPath, (err, files) => {
        if (err) {
            console.error('Lỗi khi đọc thư mục:', err);
            return;
        }
        files.forEach((file) => {
            const filePath = path.join(folderPath, file);
            if (fileExtensions.includes(path.extname(file).toLowerCase())) {
                fs.unlink(filePath, (err) => {
                    if (err) {
                        logger(`Anh yêu ơi em đã xoá các file jpg, mp4, gif, ttf, mp3 rùi nè <3`, "[ AUTO - CLEAN ]", err);
                    } else {
                        // File deleted successfully
                    }
                });
            }
        });
        logger(`Anh yêu ơi em đã xoá các file jpg, mp4, gif, ttf, mp3 rùi nè <3`, "[ AUTO - CLEAN ]");
    });
} else {
    logger(`Auto Clean Cache Đã Bị Tắt`, "[ AUTO - CLEAN ]");
}

//==============================================================//
//== Đăng nhập tài khoản và bắt đầu lắng nghe sự kiện ====//
//==============================================================//

function cookieToAppState(cookieStr) {
    try {
        const pairs = cookieStr.split(/;\s*/).filter(Boolean);
        const expiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 5).toUTCString();
        const appState = [];
        for (const pair of pairs) {
            const idx = pair.indexOf('=');
            if (idx <= 0) continue;
            const key = pair.slice(0, idx).trim();
            const value = pair.slice(idx + 1).trim();
            appState.push({ key, value, domain: 'facebook.com', path: '/', expires: expiry });
        }
        return appState;
    } catch {
        return [];
    }
}

async function onBot({ models }) {
    let loginData = {};
    const options = global.config.FCAOption || {};

    try {
        if (fs.existsSync('./appstate.json')) {
            const appState = JSON.parse(fs.readFileSync('./appstate.json', 'utf8'));
            loginData.appState = appState;
            logger.loader(global.getText('mirai', 'foundPathAppstate'));
        } else if (fs.existsSync('./cookie.txt')) {
            const cookieStr = fs.readFileSync('./cookie.txt', 'utf8').trim();
            const appState = cookieToAppState(cookieStr);
            if (!appState.length) throw new Error('Invalid cookie format');
            loginData.appState = appState;
            logger.loader(global.getText('mirai', 'foundPathCookie'));
        } else if (global.config.facebookAccount && global.config.facebookAccount.email && global.config.facebookAccount.password) {
            loginData.email = global.config.facebookAccount.email;
            loginData.password = global.config.facebookAccount.password;
            logger.loader('Using email/password from config');
        } else {
            return logger.loader(global.getText('mirai', 'notFoundPathCookie'), 'error');
        }
    } catch (e) {
        logger.loader(global.getText('mirai', 'readCookieError', e.message), 'error');
        return global.bypass.handleRelogin();
    }

    try {
        const loginApiData = await new Promise((resolve, reject) => {
            login(loginData, options, (err, api) => {
                if (err) return reject(err);
                resolve(api);
            });
        });

        global.client.api = loginApiData;
        global.config.version = '1.3.0';
        global.client.timeStart = Date.now();
        // Load commands
        fs.readdirSync(global.client.mainPath + '/modules/commands')
            .filter(cmd => cmd.endsWith('.js') && !cmd.includes('example') && !global.config.commandDisabled.includes(cmd))
            .forEach(command => {
                try {
                    const module = require(path.join(global.client.mainPath, '/modules/commands/', command));
                    if (!module.config || !module.run || !module.config.commandCategory)
                        throw new Error(global.getText('mirai', 'errorFormat'));
                    if (global.client.commands.has(module.config.name || ''))
                        throw new Error(global.getText('mirai', 'nameExist'));
                    if (module.config.dependencies && typeof module.config.dependencies === 'object') {
                        for (const dep in module.config.dependencies) {
                            const depPath = path.join(__dirname, 'nodemodules', 'node_modules', dep);
                            try {
                                if (!global.nodemodule[dep]) {
                                    if (listPackage[dep] || listbuiltinModules.includes(dep)) global.nodemodule[dep] = require(dep);
                                    else global.nodemodule[dep] = require(depPath);
                                }
                            } catch {
                                const installCmd = `npm --package-lock false --save install ${dep}${module.config.dependencies[dep] && module.config.dependencies[dep] !== '*' ? '@' + module.config.dependencies[dep] : ''}`;
                                execSync(installCmd, { stdio: 'inherit', env: process.env, shell: true, cwd: path.join(__dirname, 'nodemodules') });
                                for (let i = 1; i <= 3; i++) {
                                    try {
                                        require.cache = {};
                                        if (listPackage[dep] || listbuiltinModules.includes(dep)) global.nodemodule[dep] = require(dep);
                                        else global.nodemodule[dep] = require(depPath);
                                        break;
                                    } catch { }
                                }
                            }
                        }
                    }
                    if (module.config.envConfig) {
                        global.configModule[module.config.name] = global.configModule[module.config.name] || {};
                        global.config[module.config.name] = global.config[module.config.name] || {};
                        for (const env in module.config.envConfig) {
                            global.configModule[module.config.name][env] = global.config[module.config.name][env] ?? module.config.envConfig[env];
                            global.config[module.config.name][env] = global.config[module.config.name][env] ?? module.config.envConfig[env];
                        }
                    }
                    if (module.onLoad) module.onLoad({ api: loginApiData, models });
                    if (module.handleEvent) global.client.eventRegistered.push(module.config.name);
                    global.client.commands.set(module.config.name, module);
                } catch { }
            });

        // Load events
        fs.readdirSync(global.client.mainPath + '/modules/events')
            .filter(ev => ev.endsWith('.js') && !global.config.eventDisabled.includes(ev))
            .forEach(ev => {
                try {
                    const event = require(path.join(global.client.mainPath, '/modules/events/', ev));
                    if (!event.config || !event.run)
                        throw new Error(global.getText('mirai', 'errorFormat'));
                    if (global.client.events.has(event.config.name || ''))
                        throw new Error(global.getText('mirai', 'nameExist'));
                    if (event.config.dependencies && typeof event.config.dependencies === 'object') {
                        for (const dep in event.config.dependencies) {
                            const depPath = path.join(__dirname, 'nodemodules', 'node_modules', dep);
                            try {
                                if (!global.nodemodule[dep]) {
                                    if (listPackage[dep] || listbuiltinModules.includes(dep)) global.nodemodule[dep] = require(dep);
                                    else global.nodemodule[dep] = require(depPath);
                                }
                            } catch {
                                const installCmd = `npm --package-lock false --save install ${dep}${event.config.dependencies[dep] && event.config.dependencies[dep] !== '*' ? '@' + event.config.dependencies[dep] : ''}`;
                                execSync(installCmd, { stdio: 'inherit', env: process.env, shell: true, cwd: path.join(__dirname, 'nodemodules') });
                                for (let i = 1; i <= 3; i++) {
                                    try {
                                        require.cache = {};
                                        if (listPackage[dep] || listbuiltinModules.includes(dep)) global.nodemodule[dep] = require(dep);
                                        else global.nodemodule[dep] = require(depPath);
                                        break;
                                    } catch { }
                                }
                            }
                        }
                    }
                    if (event.config.envConfig) {
                        global.configModule[event.config.name] = global.configModule[event.config.name] || {};
                        global.config[event.config.name] = global.config[event.config.name] || {};
                        for (const env in event.config.envConfig) {
                            global.configModule[event.config.name][env] = global.config[event.config.name][env] ?? event.config.envConfig[env];
                            global.config[event.config.name][env] = global.config[event.config.name][env] ?? event.config.envConfig[env];
                        }
                    }
                    if (event.onLoad) event.onLoad({ api: loginApiData, models });
                    global.client.events.set(event.config.name, event);
                } catch { }
            });
        logger.loader(global.getText('mirai', 'finishLoadModule', global.client.commands.size, global.client.events.size))

        writeFileSync(global.client['configPath'], JSON['stringify'](global.config, null, 4), 'utf8')
        unlinkSync(global['client']['configPath'] + '.temp');
        const listenerData = { api: loginApiData, models };
        const listener = require('./bot/login/listen.js')(listenerData);

        function listenerCallback(error, message) {
            if (error) {
                if (JSON.stringify(error).includes('Not logged in')) {
                    logger(global.getText('mirai', 'handleListenError', JSON.stringify(error)), 'error');
                    return global.bypass.handleRelogin();
                }
                return logger(global.getText('mirai', 'handleListenError', JSON.stringify(error)), 'error');
            }
            if (["presence", "typ", "read_receipt"].includes(message?.type)) return;
            if (global.config.DeveloperMode) console.log(message);
            return listener(message);
        }

        global.handleListen = loginApiData.listenMqtt(listenerCallback);
        // ================== AUTO REFRESH COOKIE (CONFIGURABLE) ==================
        const refreshMinutes = (global.config.facebookAccount && !isNaN(global.config.facebookAccount.intervalGetNewCookie))
            ? Number(global.config.facebookAccount.intervalGetNewCookie)
            : 1440;
        const REFRESH_INTERVAL_MS = refreshMinutes * 60 * 1000;
        setTimeout(async function refreshCookie() {
            try {
                logger('Đang làm mới cookie...', '[ REFRESH COOKIE ]');
                const reloginOk = await global.bypass.handleRelogin();
                if (!reloginOk) throw new Error('handleRelogin failed');
                // handleRelogin sẽ ghi cookie.txt và thoát process để khởi động lại
                logger('Làm mới cookie thành công', '[ REFRESH COOKIE ]');
            } catch (err) {
                logger(`Làm mới cookie lỗi: ${err.message}`, '[ REFRESH COOKIE ]');
                setTimeout(refreshCookie, REFRESH_INTERVAL_MS);
            }
        }, REFRESH_INTERVAL_MS);
    } catch (err) {
        logger(global.getText('mirai', 'handleLoginError', JSON.stringify(err)), 'error');
    }
}

//=============================================//
//========= Kết nối đến Database =========//
//=============================================//

(async () => {
    try {
        await sequelize.authenticate();
        const models = require('./database/model')({ Sequelize, sequelize });
        onBot({ models });
    } catch (error) {
        logger(global.getText('mirai', 'successConnectDatabase', JSON.stringify(error)), '[ DATABASE ] ');
    }
})();