const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');
const http = require('http');
const https = require('https');
const readline = require('readline');

// ─── 参数解析 ───────────────────────────────────────────────
const args = process.argv.slice(2);
const type = args.find(a => ['major', 'minor', 'patch'].includes(a));
const shouldBuild = args.includes('--build');
const shouldUpload = args.includes('--upload');
const isForce = args.includes('--force') ? 1 : 0;

// 从 --log "xxx" 提取更新日志
const logIndex = args.indexOf('--log');
const cliLog = logIndex !== -1 ? args[logIndex + 1] : null;

if (!type) {
  console.log(`
📦 LifeHubFin 版本发布工具

用法:
  node scripts/bump-version.cjs <patch|minor|major> [选项]

选项:
  --build       构建 APK
  --upload      上传到后端（需要 --build）
  --force       标记为强制更新
  --log "xxx"   指定更新日志（不指定则交互输入）

示例:
  npm run bump:patch                          # 仅更新版本号
  npm run release:patch                       # 更新 + 构建
  npm run publish:patch                       # 更新 + 构建 + 上传
  npm run publish:patch -- --force            # 强制更新发布
  npm run publish:patch -- --log "修复bug"    # 指定更新日志
`);
  process.exit(1);
}

// ─── 加载配置 ───────────────────────────────────────────────
let config;
try {
  config = require('./publish.config.cjs');
} catch (e) {
  config = {
    apiBaseUrl: 'http://api.xhnya.top',
    publishEndpoint: '/sys/app-version/quick-publish',
    apkPath: './android/app/build/outputs/apk/release/app-release.apk',
    defaultUpdateLog: '版本更新',
  };
}

// ─── 工具函数 ───────────────────────────────────────────────

/**
 * 交互式读取用户输入
 */
function prompt(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * multipart/form-data 上传（纯 Node.js，无第三方依赖）
 * 所有参数（文本 + 文件）都通过 multipart form-data body 发送
 * Spring Boot 的 @RequestParam 在 multipart 请求中从 form parts 读取
 */
function uploadFile(url, fields, filePath, fileFieldName) {
  return new Promise((resolve, reject) => {
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
    const fileName = path.basename(filePath);
    const fileStream = fs.readFileSync(filePath);
    const CRLF = '\r\n';

    const parsedUrl = new URL(url);

    // 所有参数都放到 multipart body（文本字段 + 文件）
    const partBuffers = [];

    // 文本字段作为 multipart form parts
    for (const [key, value] of Object.entries(fields)) {
      partBuffers.push(Buffer.from(
        `--${boundary}${CRLF}` +
        `Content-Disposition: form-data; name="${key}"${CRLF}${CRLF}` +
        `${value}${CRLF}`
      ));
    }

    // 文件字段
    partBuffers.push(Buffer.from(
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="${fileFieldName}"; filename="${fileName}"${CRLF}` +
      `Content-Type: application/octet-stream${CRLF}${CRLF}`
    ));
    partBuffers.push(fileStream);
    partBuffers.push(Buffer.from(`${CRLF}--${boundary}--${CRLF}`));

    const body = Buffer.concat(partBuffers);

    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
        'X-API-Key': 'lifehub-quick-publish-api-key-2026-secret-token',
      },
      timeout: 300000, // 5 分钟超时
    };

    const req = client.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({status: res.statusCode, data: json});
        } catch (e) {
          resolve({status: res.statusCode, data: data});
        }
      });
    });

    req.on('error', err => {
      // 服务端提前关闭连接（常见于文件超大小限制）
      if (err.code === 'ECONNRESET' || err.code === 'EPIPE') {
        reject(new Error(`服务器关闭了连接 (${err.code})，可能是文件大小超限。请检查后端 multipart 上传大小配置 (当前 APK: ${(totalSize / 1024 / 1024).toFixed(1)} MB)`));
      } else {
        reject(err);
      }
    });
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('上传超时（5分钟）'));
    });

    // 写入并显示进度
    const totalSize = body.length;
    const chunkSize = 512 * 1024; // 512KB chunks
    let written = 0;

    function writeChunk() {
      let ok = true;
      while (ok && written < totalSize) {
        const end = Math.min(written + chunkSize, totalSize);
        const chunk = body.slice(written, end);
        written = end;

        const percent = Math.round((written / totalSize) * 100);
        process.stdout.write(`\r   上传进度: ${percent}% (${(written / 1024 / 1024).toFixed(1)}/${(totalSize / 1024 / 1024).toFixed(1)} MB)`);

        if (written >= totalSize) {
          req.end(chunk);
        } else {
          ok = req.write(chunk);
        }
      }
      if (!ok && written < totalSize) {
        req.once('drain', writeChunk);
      }
    }

    writeChunk();
  });
}

// ─── 主流程 ─────────────────────────────────────────────────
async function main() {
  const startTime = Date.now();

  // ========== Step 1: 版本号递增 ==========
  console.log('\n' + '═'.repeat(50));
  console.log('  📦 LifeHubFin 自动发布');
  console.log('═'.repeat(50));

  const packageJsonPath = path.join(__dirname, '../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const [curMajor, curMinor, curPatch] = packageJson.version.split('.').map(Number);

  let newMajor = curMajor, newMinor = curMinor, newPatch = curPatch;
  switch (type) {
    case 'major': newMajor++; newMinor = 0; newPatch = 0; break;
    case 'minor': newMinor++; newPatch = 0; break;
    case 'patch': newPatch++; break;
  }

  const newVersion = `${newMajor}.${newMinor}.${newPatch}`;
  const newVersionCode = newMajor * 10000 + newMinor * 100 + newPatch;

  console.log(`\n  版本: ${packageJson.version} → ${newVersion}`);
  console.log(`  Code:  ${newVersionCode}`);
  console.log(`  类型:  ${type}`);
  if (shouldBuild) console.log('  构建:  ✓');
  if (shouldUpload) console.log('  上传:  ✓');
  if (isForce) console.log('  强制更新: ✓');
  console.log('');

  // 更新 package.json
  packageJson.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log('  ✅ package.json');

  // 更新 src/config/version.ts
  const versionTsPath = path.join(__dirname, '../src/config/version.ts');
  fs.writeFileSync(versionTsPath,
    `export const APP_VERSION = '${newVersion}';\n` +
    `export const APP_VERSION_CODE = ${newVersionCode};\n` +
    `export const MIN_SUPPORTED_VERSION = '1.0.0';\n` +
    `export const BUILD_DATE = '${new Date().toISOString().split('T')[0]}';\n`
  );
  console.log('  ✅ src/config/version.ts');

  // 更新 android/app/build.gradle
  const buildGradlePath = path.join(__dirname, '../android/app/build.gradle');
  let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');
  buildGradle = buildGradle.replace(/versionName ".*?"/, `versionName "${newVersion}"`);
  buildGradle = buildGradle.replace(/versionCode \d+/, `versionCode ${newVersionCode}`);
  fs.writeFileSync(buildGradlePath, buildGradle);
  console.log('  ✅ android/app/build.gradle');

  if (!shouldBuild) {
    console.log('\n✨ 版本号更新完成！');
    console.log('   下一步: npm run release:patch  (构建 APK)');
    return;
  }

  // ========== Step 2: 构建 APK ==========
  console.log('\n' + '─'.repeat(50));
  console.log('  🔨 构建 APK...');
  console.log('─'.repeat(50) + '\n');

  const gradleCmd = process.platform === 'win32'
    ? 'gradlew.bat assembleRelease'
    : './gradlew assembleRelease';

  try {
    execSync(gradleCmd, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..', 'android'),
    });
  } catch (error) {
    console.error('\n  ❌ APK 构建失败');
    process.exit(1);
  }

  const apkPath = path.resolve(path.join(__dirname, '..', config.apkPath));
  if (!fs.existsSync(apkPath)) {
    console.error(`\n  ❌ APK 文件未找到: ${apkPath}`);
    process.exit(1);
  }

  const apkSize = fs.statSync(apkPath).size;
  console.log(`\n  ✅ APK 构建完成`);
  console.log(`  📦 大小: ${(apkSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  📂 路径: ${apkPath}`);

  if (!shouldUpload) {
    console.log('\n✨ 构建完成！');
    console.log('   下一步: npm run publish:patch  (上传到后端)');
    return;
  }

  // ========== Step 3: 获取更新日志 ==========
  let updateLog = cliLog || '';

  if (!updateLog) {
    console.log('\n' + '─'.repeat(50));
    console.log('  📝 更新日志');
    console.log('─'.repeat(50));
    updateLog = await prompt(`\n  请输入更新日志（回车使用默认值 "${config.defaultUpdateLog}"）:\n  > `);
    if (!updateLog) {
      updateLog = config.defaultUpdateLog;
    }
  }

  console.log(`  日志: ${updateLog}`);

  // ========== Step 4: 上传到后端 ==========
  console.log('\n' + '─'.repeat(50));
  console.log('  📤 上传到后端...');
  console.log('─'.repeat(50) + '\n');

  const uploadUrl = `${config.apiBaseUrl}${config.publishEndpoint}`;
  console.log(`  接口: ${uploadUrl}`);

  try {
    const result = await uploadFile(
      uploadUrl,
      {
        versionCode: String(newVersionCode),
        versionName: newVersion,
        updateLog: updateLog,
        isForce: String(isForce),
        platform: 'android',
      },
      apkPath,
      'file'
    );

    console.log(''); // 换行（上传进度占了一行）

    if (result.status === 200 && result.data && result.data.code === 200) {
      const data = result.data.data || {};
      console.log('\n  ✅ 上传成功！');
      console.log('');
      console.log(`  版本名称:  ${data.versionName || newVersion}`);
      console.log(`  版本代码:  ${data.versionCode || newVersionCode}`);
      if (data.fileUrl) console.log(`  下载地址:  ${data.fileUrl}`);
      if (data.fileSize) console.log(`  文件大小:  ${(data.fileSize / 1024 / 1024).toFixed(2)} MB`);
      if (data.fileMd5) console.log(`  MD5:       ${data.fileMd5}`);
    } else {
      console.log(`\n  ⚠️  HTTP ${result.status} - 响应: ${JSON.stringify(result.data)}`);
      if (result.status === 413 || (typeof result.data === 'string' && result.data.includes('size'))) {
        console.log('  原因: 文件大小超过后端限制');
        console.log('  解决: 在后端 application.yml 中增大 spring.servlet.multipart.max-file-size');
      } else if (result.status === 404) {
        console.log('  原因: 接口地址不存在，请检查 publish.config.cjs 中的配置');
      } else if (result.status === 401 || result.status === 403) {
        console.log('  原因: 认证失败，接口可能需要登录');
      } else if (!result.data || result.data === '') {
        console.log('  原因: 服务器返回空响应，可能文件大小超限或连接被中断');
        console.log('  建议: 检查后端日志，或在 application.yml 中设置:');
        console.log('         spring.servlet.multipart.max-file-size=200MB');
        console.log('         spring.servlet.multipart.max-request-size=200MB');
      } else {
        console.log('  请检查后端接口是否正常');
      }
    }
  } catch (error) {
    console.error(`\n  ❌ 上传失败: ${error.message}`);
    console.log('\n  可手动上传，curl 命令:');
    console.log(`  curl -X POST ${uploadUrl} \\`);
    console.log(`    -F "versionCode=${newVersionCode}" \\`);
    console.log(`    -F "versionName=${newVersion}" \\`);
    console.log(`    -F "file=@${apkPath}" \\`);
    console.log(`    -F "updateLog=${updateLog}" \\`);
    console.log(`    -F "isForce=${isForce}" \\`);
    console.log(`    -F "platform=android"`);
    process.exit(1);
  }

  // ========== 完成 ==========
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n' + '═'.repeat(50));
  console.log(`  🎉 v${newVersion} 发布完成！耗时 ${elapsed}s`);
  console.log('═'.repeat(50) + '\n');
}

main().catch(error => {
  console.error('❌ 执行失败:', error);
  process.exit(1);
});
