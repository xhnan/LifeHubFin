/**
 * 版本发布配置
 * 请根据你的实际环境修改这些配置
 */
const fs = require('fs');
const path = require('path');

// 自动加载项目根目录的 .env 文件
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

module.exports = {
  // 后端 API 地址（优先级: 环境变量 > .env 文件 > 默认值）
  apiBaseUrl: process.env.API_BASE_URL || 'http://api.xhnya.top',

  // 版本发布接口
  publishEndpoint: '/sys/app-version/quick-publish',

  // APK 输出路径
  apkPath: './android/app/build/outputs/apk/release/app-release.apk',

  // 默认更新日志（交互输入时回车使用此值）
  defaultUpdateLog: '版本更新',
};
