# 🎯 快速构建和发布指南

## Windows 环境说明

由于 Windows 命令行的限制，推荐使用以下方式：

---

## 📦 方式一：双击批处理文件（最简单）

**已创建**: `build-apk.bat`（在项目根目录）

1. **双击** `build-apk.bat`
2. 等待构建完成（首次可能需要 5-10 分钟）
3. 完成后 APK 会在 `android/app/build/outputs/apk/release/app-release.apk`

---

## 🔨 方式二：使用命令提示符

```bash
# 1. 打开命令提示符（CMD）或 PowerShell

# 2. 进入项目目录
cd D:\Code\Project\LifeHub\LifeHubFin

# 3. 进入 Android 目录
cd android

# 4. 运行构建
gradlew.bat assembleRelease

# 5. 返回项目根目录
cd ..
```

---

## 🚀 方式三：Android Studio

1. 打开 Android Studio
2. 打开项目：`File → Open → 选择 android 目录`
3. 菜单：`Build → Generate Signed Bundle / APK`
4. 选择 APK
5. 选择 release 签名配置
6. 点击 Finish

---

## 📝 完整发布流程

### 第一步：更新版本号

```bash
npm run bump:patch
```

### 第二步：构建 APK

**任选一种**：
- 双击 `build-apk.bat` ⭐ 推荐
- 或在 CMD 中运行：`cd android && gradlew.bat assembleRelease`

### 第三步：上传到后端

构建完成后，运行：
```bash
npm run publish:patch
```

这会生成上传命令，复制执行即可。

---

## ⚠️ 常见问题

### Q: 构建时提示 JAVA_HOME 未设置？

**A**: 需要安装 JDK 17

1. 下载 JDK: https://adoptium.net/
2. 安装后设置环境变量：
   ```
   JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.x
   ```
3. 重启命令提示符

### Q: 构建时间很长？

**A**: 首次构建需要下载依赖，等待 5-10 分钟是正常的。

后续构建会快很多（1-2分钟）。

### Q: 构建失败？

**A**: 尝试清理缓存：
```bash
cd android
gradlew.bat clean
cd ..
```

然后重新构建。

---

## 📦 APK 位置

构建成功后：
```
android/app/build/outputs/apk/release/app-release.apk
```

文件大小约 15-20 MB。

---

## 🎯 推荐流程

```bash
# 1. 更新版本号
npm run bump:patch

# 2. 构建 APK（双击 build-apk.bat）

# 3. 生成上传命令
npm run publish:patch

# 4. 复制输出的 curl 命令并执行（或双击生成的 upload-apk.bat）
```
