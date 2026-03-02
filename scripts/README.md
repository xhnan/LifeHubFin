# 版本发布脚本使用说明

## 快速开始

### 仅更新版本号（不构建）
```bash
npm run bump:patch   # 补丁版本：0.0.1 → 0.0.2
npm run bump:minor   # 次版本：0.0.1 → 0.1.0
npm run bump:major   # 主版本：0.0.1 → 1.0.0
```

### 更新版本号 + 构建 APK
```bash
npm run release:patch   # 补丁版本 + 构建
npm run release:minor   # 次版本 + 构建
npm run release:major   # 主版本 + 构建
```

### 完整发布流程（更新 + 构建 + 生成上传命令）
```bash
npm run publish:patch   # 补丁版本完整发布
npm run publish:minor   # 次版本完整发布
npm run publish:major   # 主版本完整发布
```

---

## 执行流程

### 方式一：分步执行（推荐）

```bash
# 1. 更新版本号
npm run bump:patch

# 2. 提交代码
git add .
git commit -m "chore: bump version to 0.0.2"

# 3. 构建 APK
cd android && ./gradlew assembleRelease

# 4. 上传到后端
# 使用脚本生成的 upload-apk.bat (Windows) 或 upload-apk.sh (Mac/Linux)
```

### 方式二：一键构建

```bash
# 更新版本号并构建 APK
npm run release:patch

# 然后手动上传生成的 APK
```

---

## 配置说明

编辑 `scripts/publish.config.js` 来自定义配置：

```javascript
module.exports = {
  // 后端 API 地址
  apiBaseUrl: 'http://120.78.0.54:9000',

  // 发布接口
  publishEndpoint: '/sys/app-version/quick-publish',

  // APK 输出路径
  apkPath: './android/app/build/outputs/apk/release/app-release.apk',

  // 默认更新日志
  defaultUpdateLog: '版本更新',
};
```

---

## 上传 APK 到后端

执行 `npm run publish:patch` 后，脚本会生成上传命令文件：

### Windows
双击 `upload-apk.bat` 文件

### Mac/Linux
```bash
bash upload-apk.sh
```

或手动复制脚本输出的 curl 命令执行。

---

## 注意事项

1. **首次构建**需要先运行：
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

2. **构建时间**：首次构建可能需要 5-10 分钟下载依赖

3. **APK 位置**：构建完成后在 `android/app/build/outputs/apk/release/app-release.apk`

4. **版本号规则**：
   - 补丁：修复 bug（0.0.1 → 0.0.2）
   - 次版本：新增功能（0.0.1 → 0.1.0）
   - 主版本：重大变更（0.0.1 → 1.0.0）

---

## 生成 Git 标签（可选）

```bash
# 发布后打标签
git tag v0.0.2
git push origin v0.0.2
```
