# 发布脚本说明

## 常用命令

```bash
# 只升级版本号（默认 patch）
npm run bump

# 升级版本号并构建 APK
npm run release

# 升级版本号、构建 APK、上传后端
npm run publish

# 使用当前版本和当前 APK 重新上传
npm run reupload
```

## 推荐流程

### 正常发布

```bash
npm run publish -- --log "修复若干问题"
```

脚本会自动完成这几件事：

1. 更新 `package.json`
2. 更新 `src/config/version.ts`
3. 更新 `android/app/build.gradle`
4. 构建 `release` APK
5. 上传到后端发布接口

### 后端没启动，稍后补传

如果你已经成功构建过 APK，但发布时后端没启动，可以在后端恢复后直接执行：

```bash
npm run reupload -- --log "补传 5.0.3 APK"
```

这个命令会：

1. 保持当前版本号不变
2. 不重新构建 APK
3. 校验版本文件是否一致
4. 直接上传现成的 `app-release.apk`

## APK 默认路径

```text
android/app/build/outputs/apk/release/app-release.apk
```

## 配置文件

发布配置位于 `scripts/publish.config.cjs`，支持：

```js
module.exports = {
  apiBaseUrl: 'http://localhost:9000',
  publishEndpoint: '/sys/app-version/quick-publish',
  apkPath: './android/app/build/outputs/apk/release/app-release.apk',
  defaultUpdateLog: '版本更新',
};
```

也可以在项目根目录 `.env` 中配置：

```bash
API_BASE_URL=http://localhost:9000
```

## 常见问题

### 1. `reupload` 提示版本不一致

说明下面三个文件里的版本没有对齐：

- `package.json`
- `src/config/version.ts`
- `android/app/build.gradle`

先统一版本后再重传，避免把错误版本号的 APK 上传上去。

### 2. 提示找不到 APK

先执行：

```bash
npm run release
```

或者确认 `android/app/build/outputs/apk/release/app-release.apk` 已存在。

### 3. 后端返回 413

说明后端上传大小限制太小，需要检查服务端的 multipart 配置，例如：

```yaml
spring:
  servlet:
    multipart:
      max-file-size: 200MB
      max-request-size: 200MB
```

### 4. 上传失败但我想手动补传

脚本失败时会自动打印一份可直接执行的 `curl` 命令，方便你手动排查或补传。
