const { spawn } = require("child_process");
const logger = require("./utils/log");
const chalk = require("chalk");

function startBot(message) {
    // Centered banner like GoatBot
    const width = process.stdout.columns || 80;
    const bannerLines = [


        "███████╗ █████╗  █████╗ ██████╗  █████╗  ",
        "╚════██║██╔══██╗██╔══██╗██╔══██╗██╔══██╗ ",
        "  ███╔═╝███████║███████║██████╔╝███████║ ",
        "██╔══╝  ██╔══██║██╔══██║██╔══██╗██╔══██║ ",
        "███████╗██║  ██║██║  ██║██║  ██║██║  ██║ ",
        "╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝ ",
        "",
        "Created by ZAARA with love"
    ];
    const center = (line) => {
        const pad = Math.max(0, Math.floor((width - line.length) / 2));
        return " ".repeat(pad) + line;
    };
    console.log("\n" + bannerLines.map(l => chalk.cyanBright(center(l))).join("\n") + "\n");
    if (message) logger(message, "[ Bắt Đầu ]");

    const child = spawn("node", ["--trace-warnings", "--async-stack-traces", "mirai.js"], {
        cwd: __dirname,
        stdio: "inherit",
        shell: true
    });

    child.on("close", async (codeExit) => {
        const codeStr = String(codeExit);
        if (codeExit == 1) return startBot("Restarting...");
        if (codeStr.startsWith('2')) {
            const secPart = codeStr.slice(1);
            const sec = secPart === '' ? 2 : parseInt(secPart, 10);
            const delayMs = (Number.isFinite(sec) ? sec : 2) * 1000;
            await new Promise(resolve => setTimeout(resolve, delayMs));
            return startBot("Open ...");
        }
        return;
    });

    child.on("error", function (error) {
        logger("An error occurred: " + JSON.stringify(error), "[ Starting ]");
    });
}

startBot();
