const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');
const http = require('http');
const https = require('https');
const readline = require('readline');

const args = process.argv.slice(2);
const bumpType = args.find(arg => ['major', 'minor', 'patch'].includes(arg)) || 'patch';
const shouldBuild = args.includes('--build');
const shouldUpload = args.includes('--upload');
const uploadOnly = args.includes('--upload-only');
const isForce = args.includes('--force') ? 1 : 0;
const helpRequested = args.includes('--help') || args.includes('-h');

const logIndex = args.indexOf('--log');
const cliLog = logIndex !== -1 ? args[logIndex + 1] : null;

let config;
try {
  config = require('./publish.config.cjs');
} catch (error) {
  config = {
    apiBaseUrl: 'http://api.xhnya.top',
    publishEndpoint: '/sys/app-version/quick-publish',
    apkPath: './android/app/build/outputs/apk/release/app-release.apk',
    defaultUpdateLog: '版本更新',
  };
}

function printUsage() {
  console.log(`
LifeHubFin 发布工具

用法:
  node scripts/bump-version.cjs [patch|minor|major] [选项]

选项:
  --build         构建 APK
  --upload        上传到后端
  --upload-only   仅重新上传当前版本，不改版本号，不重新构建
  --force         标记为强制更新
  --log "xxx"     指定更新日志
  --help          显示帮助

示例:
  npm run bump
  npm run release
  npm run publish -- --log "修复若干问题"
  npm run reupload -- --log "补传 5.0.3 APK"
`);
}

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

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version || '');
  if (!match) {
    throw new Error(`无法解析版本号: ${version}`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function toVersionCode(version) {
  return version.major * 10000 + version.minor * 100 + version.patch;
}

function loadCurrentVersionState() {
  const packageJsonPath = path.join(__dirname, '../package.json');
  const versionTsPath = path.join(__dirname, '../src/config/version.ts');
  const buildGradlePath = path.join(__dirname, '../android/app/build.gradle');

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const versionTsContent = fs.readFileSync(versionTsPath, 'utf8');
  const buildGradleContent = fs.readFileSync(buildGradlePath, 'utf8');

  const tsVersionMatch = versionTsContent.match(/APP_VERSION = '([^']+)'/);
  const tsVersionCodeMatch = versionTsContent.match(/APP_VERSION_CODE = (\d+)/);
  const gradleVersionMatch = buildGradleContent.match(/versionName "([^"]+)"/);
  const gradleVersionCodeMatch = buildGradleContent.match(/versionCode (\d+)/);

  if (!tsVersionMatch || !tsVersionCodeMatch || !gradleVersionMatch || !gradleVersionCodeMatch) {
    throw new Error('无法从版本配置文件中读取当前版本信息');
  }

  return {
    packageJsonPath,
    versionTsPath,
    buildGradlePath,
    packageJson,
    versionTsContent,
    buildGradleContent,
    packageVersion: packageJson.version,
    packageVersionCode: toVersionCode(parseVersion(packageJson.version)),
    tsVersion: tsVersionMatch[1],
    tsVersionCode: Number(tsVersionCodeMatch[1]),
    gradleVersion: gradleVersionMatch[1],
    gradleVersionCode: Number(gradleVersionCodeMatch[1]),
  };
}

function assertVersionConsistency(state) {
  const versionSet = new Set([state.packageVersion, state.tsVersion, state.gradleVersion]);
  const codeSet = new Set([state.packageVersionCode, state.tsVersionCode, state.gradleVersionCode]);

  if (versionSet.size !== 1 || codeSet.size !== 1) {
    throw new Error(
      [
        '检测到版本信息不一致，请先统一后再重新上传：',
        `package.json: ${state.packageVersion} (${state.packageVersionCode})`,
        `src/config/version.ts: ${state.tsVersion} (${state.tsVersionCode})`,
        `android/app/build.gradle: ${state.gradleVersion} (${state.gradleVersionCode})`,
      ].join('\n')
    );
  }
}

function bumpVersionString(version, type) {
  const parsed = parseVersion(version);

  if (type === 'major') {
    return `${parsed.major + 1}.0.0`;
  }

  if (type === 'minor') {
    return `${parsed.major}.${parsed.minor + 1}.0`;
  }

  return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
}

function writeVersionFiles(state, nextVersion) {
  const nextVersionCode = toVersionCode(parseVersion(nextVersion));
  const buildDate = new Date().toISOString().slice(0, 10);

  state.packageJson.version = nextVersion;
  fs.writeFileSync(
    state.packageJsonPath,
    JSON.stringify(state.packageJson, null, 2) + '\n'
  );

  fs.writeFileSync(
    state.versionTsPath,
    `export const APP_VERSION = '${nextVersion}';\n` +
      `export const APP_VERSION_CODE = ${nextVersionCode};\n` +
      `export const MIN_SUPPORTED_VERSION = '1.0.0';\n` +
      `export const BUILD_DATE = '${buildDate}';\n`
  );

  const nextGradleContent = state.buildGradleContent
    .replace(/versionName "([^"]+)"/, `versionName "${nextVersion}"`)
    .replace(/versionCode \d+/, `versionCode ${nextVersionCode}`);

  fs.writeFileSync(state.buildGradlePath, nextGradleContent);

  return {
    version: nextVersion,
    versionCode: nextVersionCode,
  };
}

function buildReleaseApk() {
  const gradleCmd = process.platform === 'win32'
    ? 'gradlew.bat assembleRelease'
    : './gradlew assembleRelease';

  execSync(gradleCmd, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..', 'android'),
  });
}

function getApkPath() {
  return path.resolve(path.join(__dirname, '..', config.apkPath));
}

function ensureApkExists() {
  const apkPath = getApkPath();

  if (!fs.existsSync(apkPath)) {
    throw new Error(`APK 文件未找到: ${apkPath}`);
  }

  const apkSize = fs.statSync(apkPath).size;
  return {apkPath, apkSize};
}

function getUploadUrl() {
  const baseUrl = (config.apiBaseUrl || '').replace(/\/$/, '');
  const endpoint = config.publishEndpoint || '';
  return `${baseUrl}${endpoint}`;
}

function formatSize(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function createMultipartBody(fields, filePath, fileFieldName) {
  const boundary = '----LifeHubFinBoundary' + Math.random().toString(16).slice(2);
  const CRLF = '\r\n';
  const fileName = path.basename(filePath);
  const fileBuffer = fs.readFileSync(filePath);
  const parts = [];

  for (const [key, value] of Object.entries(fields)) {
    parts.push(
      Buffer.from(
        `--${boundary}${CRLF}` +
          `Content-Disposition: form-data; name="${key}"${CRLF}${CRLF}` +
          `${value}${CRLF}`
      )
    );
  }

  parts.push(
    Buffer.from(
      `--${boundary}${CRLF}` +
        `Content-Disposition: form-data; name="${fileFieldName}"; filename="${fileName}"${CRLF}` +
        `Content-Type: application/vnd.android.package-archive${CRLF}${CRLF}`
    )
  );
  parts.push(fileBuffer);
  parts.push(Buffer.from(`${CRLF}--${boundary}--${CRLF}`));

  return {
    boundary,
    body: Buffer.concat(parts),
  };
}

function uploadFile(url, fields, filePath, fileFieldName) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;
    const {boundary, body} = createMultipartBody(fields, filePath, fileFieldName);
    const totalSize = body.length;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: `${parsedUrl.pathname}${parsedUrl.search || ''}`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': totalSize,
        'X-API-Key': 'lifehub-quick-publish-api-key-2026-secret-token',
      },
      timeout: 300000,
    };

    const req = client.request(options, res => {
      let raw = '';
      res.setEncoding('utf8');

      res.on('data', chunk => {
        raw += chunk;
      });

      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode || 0,
            data: raw ? JSON.parse(raw) : null,
          });
        } catch (error) {
          resolve({
            status: res.statusCode || 0,
            data: raw,
          });
        }
      });
    });

    req.on('error', error => {
      if (error.code === 'ECONNREFUSED') {
        reject(new Error('连接被拒绝，后端可能还没有启动'));
        return;
      }

      if (error.code === 'ECONNRESET' || error.code === 'EPIPE') {
        reject(new Error('连接中断，后端可能在接收大文件时断开了连接'));
        return;
      }

      reject(error);
    });

    req.on('timeout', () => {
      req.destroy(new Error('上传超时，请检查后端服务和网络'));
    });

    const chunkSize = 512 * 1024;
    let offset = 0;

    function writeChunk() {
      let canContinue = true;

      while (canContinue && offset < totalSize) {
        const end = Math.min(offset + chunkSize, totalSize);
        const chunk = body.slice(offset, end);
        offset = end;

        const percent = Math.round((offset / totalSize) * 100);
        process.stdout.write(
          `\r   上传进度: ${percent}% (${(offset / 1024 / 1024).toFixed(1)}/${(totalSize / 1024 / 1024).toFixed(1)} MB)`
        );

        if (offset >= totalSize) {
          req.end(chunk);
        } else {
          canContinue = req.write(chunk);
        }
      }

      if (!canContinue && offset < totalSize) {
        req.once('drain', writeChunk);
      }
    }

    writeChunk();
  });
}

function printManualUploadCommand(uploadUrl, version, versionCode, updateLog, apkPath) {
  console.log('\n可手动执行以下 curl 进行上传:');
  console.log(`curl -X POST "${uploadUrl}" ^`);
  console.log(`  -H "X-API-Key: lifehub-quick-publish-api-key-2026-secret-token" ^`);
  console.log(`  -F "versionCode=${versionCode}" ^`);
  console.log(`  -F "versionName=${version}" ^`);
  console.log(`  -F "updateLog=${updateLog}" ^`);
  console.log(`  -F "isForce=${isForce}" ^`);
  console.log(`  -F "platform=android" ^`);
  console.log(`  -F "file=@${apkPath}"`);
}

async function resolveUpdateLog(defaultValue) {
  if (cliLog) {
    return cliLog;
  }

  const answer = await prompt(`请输入更新日志，直接回车使用默认值「${defaultValue}」: `);
  return answer || defaultValue;
}

async function main() {
  if (helpRequested) {
    printUsage();
    return;
  }

  const startTime = Date.now();
  const state = loadCurrentVersionState();

  console.log('\n' + '='.repeat(56));
  console.log(uploadOnly ? '  LifeHubFin 重新上传 APK' : '  LifeHubFin 发布 APK');
  console.log('='.repeat(56));

  let targetVersion;
  let targetVersionCode;

  if (uploadOnly) {
    assertVersionConsistency(state);
    targetVersion = state.packageVersion;
    targetVersionCode = state.packageVersionCode;

    console.log(`\n  当前版本: ${targetVersion}`);
    console.log(`  版本号:   ${targetVersionCode}`);
    if (isForce) {
      console.log('  强制更新: 是');
    }
  } else {
    const nextVersion = bumpVersionString(state.packageVersion, bumpType);
    const nextVersionCode = toVersionCode(parseVersion(nextVersion));

    console.log(`\n  版本变更: ${state.packageVersion} -> ${nextVersion}`);
    console.log(`  版本号:   ${nextVersionCode}`);
    console.log(`  升级类型: ${bumpType}`);
    if (shouldBuild) {
      console.log('  构建 APK: 是');
    }
    if (shouldUpload) {
      console.log('  上传后端: 是');
    }
    if (isForce) {
      console.log('  强制更新: 是');
    }

    const written = writeVersionFiles(state, nextVersion);
    targetVersion = written.version;
    targetVersionCode = written.versionCode;

    console.log('\n  已更新版本文件:');
    console.log('  - package.json');
    console.log('  - src/config/version.ts');
    console.log('  - android/app/build.gradle');

    if (!shouldBuild) {
      console.log('\n版本号已更新完成。');
      console.log('下一步可执行: npm run release');
      return;
    }

    console.log('\n开始构建 release APK...');
    buildReleaseApk();
    console.log('APK 构建完成。');

    if (!shouldUpload) {
      console.log('\n构建已完成。');
      console.log('如果后端可用，再执行: npm run reupload');
      return;
    }
  }

  const {apkPath, apkSize} = ensureApkExists();
  console.log(`\n  APK 路径: ${apkPath}`);
  console.log(`  APK 大小: ${formatSize(apkSize)}`);

  const updateLog = await resolveUpdateLog(config.defaultUpdateLog || '版本更新');
  const uploadUrl = getUploadUrl();

  console.log(`\n上传地址: ${uploadUrl}`);
  console.log(`更新日志: ${updateLog}`);

  try {
    const result = await uploadFile(
      uploadUrl,
      {
        versionCode: String(targetVersionCode),
        versionName: targetVersion,
        updateLog,
        isForce: String(isForce),
        platform: 'android',
      },
      apkPath,
      'file'
    );

    process.stdout.write('\n');

    if (result.status === 200 && result.data && result.data.code === 200) {
      const data = result.data.data || {};
      console.log('\n上传成功。');
      console.log(`版本名称: ${data.versionName || targetVersion}`);
      console.log(`版本号:   ${data.versionCode || targetVersionCode}`);
      if (data.fileUrl) {
        console.log(`文件地址: ${data.fileUrl}`);
      }
      if (data.fileSize) {
        console.log(`文件大小: ${formatSize(data.fileSize)}`);
      }
      if (data.fileMd5) {
        console.log(`文件 MD5: ${data.fileMd5}`);
      }
    } else {
      console.error(`\n上传失败，HTTP ${result.status}`);
      console.error(`返回内容: ${JSON.stringify(result.data)}`);

      if (result.status === 404) {
        console.error('原因提示: 上传接口地址不正确，请检查 scripts/publish.config.cjs 或后端路由。');
      } else if (result.status === 401 || result.status === 403) {
        console.error('原因提示: 鉴权失败，请确认 X-API-Key 或后端权限配置。');
      } else if (result.status === 413) {
        console.error('原因提示: 文件太大，请检查后端 multipart 大小限制。');
      } else if (!result.data) {
        console.error('原因提示: 后端没有返回可解析内容，可能服务异常中断。');
      }

      printManualUploadCommand(uploadUrl, targetVersion, targetVersionCode, updateLog, apkPath);
      process.exit(1);
    }
  } catch (error) {
    process.stdout.write('\n');
    console.error(`上传异常: ${error.message}`);
    printManualUploadCommand(uploadUrl, targetVersion, targetVersionCode, updateLog, apkPath);
    process.exit(1);
  }

  const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n完成，用时 ${elapsedSeconds}s`);
}

main().catch(error => {
  console.error(`执行失败: ${error.message}`);
  process.exit(1);
});
