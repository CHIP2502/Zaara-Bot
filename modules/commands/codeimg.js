const axios = require('axios');
const fs = require('fs').promises;
const { exec } = require('child_process');
const path = require('path');
const FormData = require('form-data');

module.exports.config = {
    name: "codeimg",
    version: "2.2.0",
    hasPermssion: 0,
    credits: "Gpt",
    description: "Tạo hình ảnh từ code hoặc file",
    commandCategory: "Tiện ích",
    usages: "",
    cooldowns: 5,
};

const TEMP_DIR = path.join(__dirname, 'temp');

async function ensureTempDir() {
    await fs.mkdir(TEMP_DIR, { recursive: true });
}

async function cleanupTempFiles(files) {
    for (const file of files) {
        try {
            await fs.unlink(file);
            console.log(`Đã xóa file tạm: ${file}`);
        } catch (error) {
            console.error(`Lỗi khi xóa file tạm ${file}: ${error.message}`);
        }
    }
}

async function uploadImageToCatbox(imagePath) {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', await fs.readFile(imagePath), path.basename(imagePath));

    try {
        const response = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: form.getHeaders()
        });
        return response.data; 
    } catch (error) {
        console.error('Lỗi khi tải ảnh lên Catbox:', error);
        throw error;
    }
}

let streamURL = (url, ext = 'jpg') => axios.get(url, {
    responseType: 'stream',
}).then(res => (res.data.path = `tmp.${ext}`, res.data)).catch(e => null);

module.exports.handleReply = async function({ api, event, handleReply }) {
    if (event.senderID != handleReply.author) return;
    
    const { threadID, messageID, senderID } = event;
    
    try {
        if (handleReply.step === 1) {
            const choice = event.body.trim().toLowerCase();
            if (choice === '1') {
                api.sendMessage("📁 Vui lòng nhập tên file (bao gồm đuôi file) trong thư mục lệnh:", threadID, 
                    (error, info) => {
                        if (error) return console.error(error);
                        global.client.handleReply.push({
                            name: this.config.name,
                            messageID: info.messageID,
                            author: senderID,
                            step: 2,
                            isFile: true
                        });
                    }
                );
            } else if (choice === '2') {
                api.sendMessage("💻 Vui lòng nhập ngôn ngữ lập trình (ví dụ: javascript, python, java, ...):", threadID, 
                    (error, info) => {
                        if (error) return console.error(error);
                        global.client.handleReply.push({
                            name: this.config.name,
                            messageID: info.messageID,
                            author: senderID,
                            step: 2,
                            isFile: false
                        });
                    }
                );
            } else {
                api.sendMessage("❌ Lựa chọn không hợp lệ. Vui lòng chọn 1 hoặc 2.", threadID);
            }
        } else if (handleReply.step === 2) {
            if (handleReply.isFile) {
                const originalFilePath = path.join(__dirname, event.body.trim());
                try {
                    await fs.access(originalFilePath);
                    const fileContent = await fs.readFile(originalFilePath, 'utf8');
                    const language = path.extname(originalFilePath).slice(1);
                    
                    await ensureTempDir();
                    const tempFilePath = path.join(TEMP_DIR, `temp_${threadID}_${Date.now()}.${language}`);
                    await fs.writeFile(tempFilePath, fileContent);
                    
                    await processImage(api, threadID, tempFilePath, language, [tempFilePath]);
                } catch (error) {
                    api.sendMessage(`❌ Không thể đọc file "${event.body}". Lỗi: ${error.message}`, threadID);
                }
            } else {
                const language = event.body.trim();
                api.sendMessage("📝 Vui lòng reply tin nhắn này với code bạn muốn tạo hình ảnh.", threadID,
                    (error, info) => {
                        if (error) return console.error(error);
                        global.client.handleReply.push({
                            name: this.config.name,
                            messageID: info.messageID,
                            author: senderID,
                            step: 3,
                            language: language
                        });
                    }
                );
            }
        } else if (handleReply.step === 3) {
            const code = event.body;
            if (!code) {
                return api.sendMessage("❌ Vui lòng nhập code hợp lệ.", threadID, messageID);
            }
            
            await ensureTempDir();
            const tempFile = path.join(TEMP_DIR, `temp_${threadID}_${Date.now()}.${handleReply.language}`);
            
            await fs.writeFile(tempFile, code);
            await processImage(api, threadID, tempFile, handleReply.language, [tempFile]);
        }
    } catch (error) {
        console.error(`Lỗi không mong đợi: ${error.message}`);
        api.sendMessage(`❌ Đã xảy ra lỗi không mong đợi. Vui lòng thử lại sau.`, threadID);
    }
};

async function processImage(api, threadID, filePath, language, tempFiles = []) {
    api.sendMessage("🖼️ Đang tạo hình ảnh, vui lòng đợi...", threadID);

    exec(`npx carbon-now-cli "${filePath}" -l ${language}`, async (error, stdout, stderr) => {
        if (error) {
            await cleanupTempFiles(tempFiles);
            return api.sendMessage("❌ Có lỗi xảy ra khi tạo hình ảnh. Vui lòng thử lại sau.", threadID);
        }

        const outputLines = stdout.split('\n');
        const imageLine = outputLines.find(line => line.includes('The file can be found here:'));
        if (!imageLine) {
            await cleanupTempFiles(tempFiles);
            return api.sendMessage("❌ Không thể xác định vị trí file ảnh. Vui lòng thử lại.", threadID);
        }

        const imagePath = imageLine.split(': ')[1].trim().replace(' 😌', '');
        
        try {
            await fs.access(imagePath);
            const imageUrl = await uploadImageToCatbox(imagePath);
            const stream = await streamURL(imageUrl, 'png');
            if (stream) {
                await new Promise((resolve, reject) => {
                    api.sendMessage(
                        {
                            body: "🎉 Đây là hình ảnh code của bạn:",
                            attachment: stream
                        },
                        threadID,
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
            } else {
                api.sendMessage(`❌ Không thể tạo stream. Đây là link ảnh của bạn: ${imageUrl}`, threadID);
            }

            await cleanupTempFiles([...tempFiles, imagePath]);
        } catch (fsError) {
            console.error(`Lỗi xử lý file: ${fsError.message}`);
            api.sendMessage(`❌ Không thể tạo hoặc gửi hình ảnh. Vui lòng thử lại sau.`, threadID);
            await cleanupTempFiles(tempFiles);
        }
    });
}

module.exports.run = async function({ api, event, args }) {
    const { threadID, senderID } = event;
    
    const message = `🖥️ Tạo hình ảnh từ code 🎨

Bạn muốn tạo hình ảnh bằng cách nào?

1️⃣ Nhập tên file có sẵn trong thư mục lệnh
2️⃣ Gửi code trực tiếp

👉 Reply tin nhắn này với số 1 hoặc 2 để chọn.`;

    api.sendMessage(
        message,
        threadID,
        (error, info) => {
            if (error) {
                console.error("Lỗi khi gửi tin nhắn hướng dẫn:", error);
                return api.sendMessage("❌ Có lỗi xảy ra, vui lòng thử lại sau.", threadID);
            }
            global.client.handleReply.push({
                name: this.config.name,
                messageID: info.messageID,
                author: senderID,
                step: 1
            });
        }
    );
};