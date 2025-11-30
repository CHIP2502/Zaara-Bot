const os = require('os');
const moment = require('moment-timezone');
const { execSync } = require('child_process');
const fs = require('fs');

module.exports = {
  config: {
    name: "upt",
    version: "4.0.0",
    hasPermssion: 2,
    credits: "Vtuan, Niio-team, update LocDev",
    description: "Thông tin hệ thống đa nền tảng (Linux/Windows/Docker/Panel)",
    commandCategory: "Admin",
    usages: "upt [cpu|ram|disk|net|sys|all]",
    cooldowns: 5
  },

  run: async function ({ api, event, args }) {
    const startedAt = Date.now();

    const toMB = (bytes) => Math.max(0, Math.round(bytes / 1024 / 1024));
    const toGB = (bytes) => (bytes / 1024 / 1024 / 1024).toFixed(2);

    const uptimeFmt = () => {
      const t = process.uptime();
      const d = Math.floor(t / 86400);
      const h = Math.floor(t / 3600) % 24;
      const m = Math.floor(t / 60) % 60;
      const s = Math.floor(t % 60);
      return `${d ? d + ' ngày ' : ''}${h ? h + ' giờ ' : ''}${m ? m + ' phút ' : ''}${s} giây`;
    };

    const cpuUsagePercent = async () => {
      const s = process.cpuUsage();
      await new Promise(r => setTimeout(r, 150));
      const e = process.cpuUsage(s);
      return ((e.user + e.system) / 1e6).toFixed(1);
    };

    const getDiskInfo = () => {
      try {
        if (process.platform === 'win32') {
          const out = execSync('wmic logicaldisk get size,freespace,caption', { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
          let total = 0, free = 0;
          out.split(/\r?\n/).forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 3 && /[A-Z]:/.test(parts[0])) {
              const freespace = Number(parts[1]);
              const size = Number(parts[2]);
              if (!isNaN(size)) total += size;
              if (!isNaN(freespace)) free += freespace;
            }
          });
          const used = Math.max(0, total - free);
          return { total, free, used };
        } else {
          // POSIX: use df on root
          const out = execSync('df -kP /', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim().split(/\r?\n/)[1];
          const parts = out.trim().split(/\s+/);
          const totalKB = Number(parts[1]) * 1;
          const usedKB = Number(parts[2]) * 1;
          const availKB = Number(parts[3]) * 1;
          return { total: totalKB * 1024, used: usedKB * 1024, free: availKB * 1024 };
        }
      } catch {
        return null;
      }
    };

    const getEnvInfo = () => {
      let env = 'Bare-metal/VPS';
      let hints = [];
      try {
        // Docker / container detection
        if (fs.existsSync('/.dockerenv')) env = 'Docker Container';
        const cgroupPath = '/proc/1/cgroup';
        if (fs.existsSync(cgroupPath)) {
          const cg = fs.readFileSync(cgroupPath, 'utf8');
          if (/docker|kubepods|containerd/i.test(cg)) env = 'Container (cgroup)';
        }
      } catch {}
      if (process.env.P_SERVER_UUID || process.env.P_HOME) hints.push('Pterodactyl');
      if (process.env.RENDER) hints.push('Render');
      if (process.env.KOYEB) hints.push('Koyeb');
      if (process.env.RAILWAY_STATIC_URL || process.env.RAILWAY_PROJECT_ID) hints.push('Railway');
      if (process.env.VERCEL) hints.push('Vercel');
      if (process.env.DETA_RUNTIME) hints.push('Deta');
      return hints.length ? `${env} • ${hints.join(', ')}` : env;
    };

    const getNetworkInfo = () => {
      const ifaces = os.networkInterfaces();
      const addrs = [];
      Object.keys(ifaces).forEach(name => {
        for (const i of ifaces[name] || []) {
          if (!i.internal && i.family === 'IPv4') addrs.push(`${name}: ${i.address}`);
        }
      });
      return addrs.length ? addrs.join('\n') : 'N/A';
    };

    const memTotal = os.totalmem();
    const memFree = os.freemem();
    const memUsed = Math.max(0, memTotal - memFree);
    const heap = process.memoryUsage();
    const cpuPct = await cpuUsagePercent();
    const ping = Date.now() - startedAt;

    const disk = getDiskInfo();
    const envInfo = getEnvInfo();
    const load = os.platform() !== 'win32' ? os.loadavg()[0].toFixed(2) : 'N/A';

    const sections = {
      sys: [
        `📋 OS: ${os.type()} ${os.release()} (${os.arch()})`,
        `🟢 Node: ${process.version}`,
        `🧩 Cores: ${os.cpus().length} • Load(1m): ${load}`,
        `🧭 Env: ${envInfo}`
      ].join('\n'),
      cpu: `💻 CPU dùng (ước tính): ${cpuPct}%`,
      ram: [
        `📊 RAM: ${toGB(memUsed)} / ${toGB(memTotal)} GB`,
        `🧠 Heap: ${toMB(heap.heapUsed)}/${toMB(heap.heapTotal)} MB`
      ].join('\n'),
      disk: disk ? `💽 Disk: ${toGB(disk.used)} / ${toGB(disk.total)} GB\n🛢️ Trống: ${toGB(disk.free)} GB` : '💽 Disk: N/A',
      net: `🛜 Network:\n${getNetworkInfo()}`,
      meta: [
        `⏱️ Uptime: ${uptimeFmt()}`,
        `📝 Prefix: ${global.config.PREFIX}`,
        `🔣 Trạng thái: ${ping < 200 ? 'mượt mà' : ping < 800 ? 'bình thường' : 'lag'}`,
        `📡 Ping: ${ping}ms`,
        `⏰ ${moment().tz('Asia/Ho_Chi_Minh').format('HH:mm:ss | DD/MM/YYYY')}`
      ].join('\n')
    };

    const choice = (args[0] || 'all').toLowerCase();
    let body;
    switch (choice) {
      case 'cpu': body = `${sections.cpu}`; break;
      case 'ram': body = `${sections.ram}`; break;
      case 'disk': body = `${sections.disk}`; break;
      case 'net': body = `${sections.net}`; break;
      case 'sys': body = `${sections.sys}`; break;
      case 'all':
      default:
        body = [sections.sys, sections.cpu, sections.ram, sections.disk, sections.net, sections.meta].join('\n\n');
        break;
    }

    const attachment = Array.isArray(global.anime) && global.anime.length ? global.anime.splice(0, 1) : undefined;
    return api.sendMessage({ body, attachment }, event.threadID, event.messageID);
  }
};
