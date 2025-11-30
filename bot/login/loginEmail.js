const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const path = require('path');
const fs = require('fs');
const { TOTP } = require('totp-generator');
const log = require(`../../utils/log.js`);
function loadConfig() {
  // Prefer already-loaded config from global if available
  if (global?.client?.config) return global.client.config;
  const { NODE_ENV } = process.env;
  const configPath = path.normalize(
    path.join(process.cwd(), `config${['production', 'development'].includes(NODE_ENV) ? '.dev.json' : '.json'}`)
  );
  try {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    return require(configPath);
  } catch (_) {
    return {};
  }
}
const createSession = async () => {
  const { wrapper } = await import('axios-cookiejar-support');
  const jar = new CookieJar();
  return wrapper(axios.create({ jar }));
};
const headersMobile = (type) => {
  const viewportWidth = Math.floor(Math.random() * (414 - 360 + 1)) + 360;
  const dpr = Math.random() < 0.5 ? 2 : 3;
  const iosVersions = ['16_6', '16_7', '17_0', '17_1', '17_2'];
  const randomIosVersion = iosVersions[Math.floor(Math.random() * iosVersions.length)];
  const base = {
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Ch-Prefers-Color-Scheme': Math.random() < 0.5 ? 'light' : 'dark',
    'Sec-Ch-Ua': '"Not/A)Brand";v="99", "Apple WebKit";v="605", "Safari";v="605"',
    'Sec-Ch-Ua-Full-Version-List': '"Not/A)Brand";v="99.0.0.0", "Apple WebKit";v="605.1.15", "Safari";v="605.1.15"',
    'Sec-Ch-Ua-Platform': '"iOS"',
    'Sec-Ch-Ua-Platform-Version': `"${randomIosVersion.replace('_', '.')}"`,
    'Priority': 'u=1, i',
    'Referer': 'https://m.facebook.com/',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': `Mozilla/5.0 (iPhone; CPU iPhone OS ${randomIosVersion} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${randomIosVersion.replace('_', '.')} Mobile/15E148 Safari/604.1`,
    'Connection': 'keep-alive',
  };
  if (type.toLowerCase() === 'get') {
    return {
      ...base,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Cache-Control': 'no-cache',
      'Dpr': dpr.toString(),
      'Priority': 'u=0, i',
      'Sec-Ch-Ua-Mobile': '?1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Viewport-Width': viewportWidth.toString(),
      'X-Requested-With': 'XMLHttpRequest',
      'X-FB-LSD': '1',
      'X-ASBD-ID': '129477'
    };
  } else if (type.toLowerCase() === 'post') {
    return {
      ...base,
      'Accept': '*/*',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Origin': 'https://m.facebook.com',
      'Priority': 'u=1, i',
      'Referer': 'https://m.facebook.com/',
      'Sec-Ch-Ua-Mobile': '?1',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'X-Requested-With': 'XMLHttpRequest',
      'X-FB-LSD': '1',
      'X-ASBD-ID': '129477',
      'Connection': 'keep-alive'
    };
  }
};
const loginEmail = async (params = {}) => {
  try {
    const config = loadConfig();
    const fromConfig = config?.facebookAccount || {};
    const email = params.email ?? fromConfig.email;
    const password = params.password ?? fromConfig.password;
    const secret2FA = params.secret2FA ?? fromConfig["2FASecret"] ?? fromConfig["2FA"] ?? null;

    if (!email || !password) {
      return { status: 'failed', error: 'Missing email or password (from params or config.json)' };
    }
    const session = await createSession();
    const response = await session.get('https://m.facebook.com/', {
      headers: headersMobile('get')
    });
    const html = response.data;
    const findMatch = (regex) => {
      const match = html.match(regex);
      return match ? match[1] : null;
    };
    const formData = {
      '__aaid': '0',
      '__user': '0',
      '__a': '1',
      '__req': 'd',
      '__hs': findMatch(/"haste_session":"(.*?)"/),
      'dpr': '1',
      '__ccg': 'EXCELLENT',
      '__rev': findMatch(/"server_revision":(.*?),/),
      '__hsi': findMatch(/"hsi":"(.*?)"/),
      '__csr': '',
      'fb_dtsg': findMatch(/"dtsg":{"token":"(.*?)"/),
      'jazoest': findMatch(/"jazoest", "(.*?)"/),
      'lsd': findMatch(/"LSD",\[\],{"token":"(.*?)"}/),
      'params': JSON.stringify({
        credential_type: 'password',
        username_text_input_id: 'yubcjs:61',
        password_text_input_id: 'yubcjs:62',
        contact_point: email,
        password: `#PWD_BROWSER:0:${Math.floor(Date.now() / 1000)}:${password}`
      })
    };
    log.load(`AUTO-LOGIN | Bắt đầu đăng nhập với: ${email}`);
    const loginResponse = await session.post('https://m.facebook.com/async/wbloks/fetch/?appid=com.bloks.www.bloks.caa.login.async.send_login_request&type=action&__bkv=955b57fc3bce3206cb37f9d05cdd37a39e9e17b07e844a93802fa127ca17dd13', new URLSearchParams(formData).toString(), { headers: headersMobile('post') });
    const finalUrl = loginResponse.request?.res?.responseUrl || '';
    if (
      finalUrl.includes("checkpoint/1501092823525282") ||
      finalUrl.includes("checkpoint/601051028565049") ||
      finalUrl.includes("checkpoint/828281030927956")
    ) {
      return {
        status: 'checkpoint_required',
        checkpoint_url: finalUrl
      };
    }
    const responseStr = loginResponse.data.replace('for (;;);', '');
    const responseData = JSON.parse(responseStr);
    if (responseData.payload?.layout?.bloks_payload?.action?.includes('redirection_to_two_fac')) {
      const action = responseData.payload.layout.bloks_payload.action;
      const contexts = action.match(/Make,\s*"([^"]{200,})"/g);
      if (!contexts || contexts.length === 0) {
        throw new Error("Cannot find 2FA context");
      }
      const twoStepData = contexts[contexts.length - 1].replace('Make, "', '').replace('"', '');
      if (twoStepData) {
        log.load('AUTO-LOGIN | Đang xử lý 2FA...');
        if (secret2FA) {
          const code = TOTP.generate(secret2FA.replace(/\s/g, '').toUpperCase()).otp;
          log.load(`AUTO-LOGIN | 2FA code: ${code}`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          const verify2FAData1 = {
            '__aaid': '0',
            '__user': '0',
            '__a': '1',
            '__req': 't',
            '__hs': '20120.BP:wbloks_caa_pkg.2.0...0',
            'dpr': '3',
            '__ccg': 'EXCELLENT',
            '__rev': findMatch(/"server_revision":(.*?),/),
            '__s': ':567cxa:z3ol4q',
            '__hsi': findMatch(/"hsi":"(.*?)"/),
            '__dyn': '0wzpawlE72fDg9ppo5S12wAxu13wqobE6u7E39x60lW4o3Bw4Ewk9E4W099w2s8hw73wGw6tw5Uw64w8W1uwf20n6aw8m0zE2ZwrU6q3a0le0iS2eU2dwde',
            '__csr': '',
            'fb_dtsg': findMatch(/"dtsg":{"token":"(.*?)"/),
            'jazoest': findMatch(/"jazoest", "(.*?)"/),
            'lsd': findMatch(/"LSD",\[\],{"token":"(.*?)"}/),
            'params': JSON.stringify({
              params: {
                server_params: {
                  two_step_verification_context: twoStepData,
                  flow_source: "two_factor_login",
                  challenge: "totp",
                  machine_id: null,
                  device_id: null
                },
                client_input_params: {
                  machine_id: '',
                  code: code,
                  should_trust_device: 1,
                  auth_secure_device_id: '',
                  openid_tokens: {}
                }
              }
            })
          };
          const verify2FAResponse = await session.post('https://m.facebook.com/async/wbloks/fetch/?appid=com.bloks.www.two_step_verification.verify_code.async&type=action&__bkv=955b57fc3bce3206cb37f9d05cdd37a39e9e17b07e844a93802fa127ca17dd13', new URLSearchParams(verify2FAData1).toString(),
            {
              headers: {
                ...headersMobile('post'),
                'Referer': 'https://m.facebook.com/'
              }
            });
          const verify2FAStr = verify2FAResponse.data.replace('for (;;);', '');
          const verify2FAData = JSON.parse(verify2FAStr);
          if (verify2FAData.ajaxUpdateAfterLogin) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const cookie = (verify2FAResponse.headers['set-cookie']).map(cookie => cookie.split(';')[0]).join('; ');
            return {
              status: 'success',
              userId: verify2FAData.ajaxUpdateAfterLogin.currentUser,
              fb_dtsg: verify2FAData.ajaxUpdateAfterLogin.dtsgToken,
              cookie
            };
          }
          return {
            status: 'success',
            userId: verify2FAData.ajaxUpdateAfterLogin.currentUser,
            dtsgToken: verify2FAData.ajaxUpdateAfterLogin.dtsgToken,
            dtsgAsyncGetToken: verify2FAData.ajaxUpdateAfterLogin.dtsgAsyncGetToken,
            ajaxResponseToken: verify2FAData.ajaxUpdateAfterLogin.ajaxResponseToken
          };
        }
        return {
          status: '2fa_required',
          twofactor_context: twoStepData,
          twofactor_type: 'web_2fa'
        };
      }
    }
    if (responseData.ajaxUpdateAfterLogin && responseData.ajaxUpdateAfterLogin.currentUser) {
      const cookie = (loginResponse.headers['set-cookie']).map(cookie => cookie.split(';')[0]).join('; ');
      return {
        status: 'success',
        userId: responseData.ajaxUpdateAfterLogin.currentUser,
        fb_dtsg: responseData.ajaxUpdateAfterLogin.dtsgToken,
        cookie
      };
    }
    return {
      status: 'failed',
      error: 'Login failed'
    };
  } catch (error) {
    console.log(error)
    return {
      status: 'failed',
      error: error.message
    };
  }
};

async function handleRelogin() {
  try {
    const config = loadConfig();
    const fromConfig = config?.facebookAccount || {};
    const email = fromConfig.email;
    const password = fromConfig.password;
    const secret2FA = fromConfig["2FASecret"] ?? fromConfig["2FA"] ?? null;

    if (!email || !password) {
      log.load('AUTO-LOGIN | Thiếu email hoặc mật khẩu trong config', 'error');
      return false;
    }

    log.load('AUTO-LOGIN | Đang thực hiện đăng nhập để làm mới cookie...');
    const result = await loginEmail({ email, password, secret2FA });
    if (result.status !== 'success' || !result.cookie) {
      log.load(`AUTO-LOGIN | Làm mới cookie thất bại: ${result.error || 'Unknown error'}`, 'error');
      return false;
    }

    const cookiePath = path.join(process.cwd(), 'cookie.txt');
    fs.writeFileSync(cookiePath, `${result.cookie}`.trim(), 'utf8');
    log.load('AUTO-LOGIN | Đã ghi cookie mới vào cookie.txt');
    setTimeout(() => process.exit(1), 500);
    return true;
  } catch (err) {
    log.load(`AUTO-LOGIN | Lỗi khi làm mới cookie: ${err.message}`, 'error');
    return false;
  }
}

module.exports = { login: loginEmail, handleRelogin };