# 🎯 Windows 构建 APK 解决方案

## 问题原因
- **PowerShell** 需要使用 `.\gradlew.bat` 而不是 `gradlew.bat`
- **批处理文件** 在某些终端中可能有编码问题

---

## ✅ 推荐方案

### 方案一：在 PowerShell 中直接运行 ⭐

```powershell
# 进入项目根目录
cd D:\Code\Project\LifeHub\LifeHubFin

# 进入 Android 目录
cd android

# 运行构建（注意前面的 .\ ）
.\gradlew.bat assembleRelease

# 等待构建完成...
```

### 方案二：使用 PowerShell 脚本

我已经创建了 `build-apk.ps1`，但需要先允许执行：

1. **以管理员身份打开 PowerShell**
2. **运行以下命令**：
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

3. **然后运行**：
```powershell
.\build-apk.ps1
```

### 方案三：使用 CMD（命令提示符）

1. **按 Win+R**，输入 `cmd`，回车
2. **运行**：
```cmd
cd D:\Code\Project\LifeHub\LifeHubFin\android
gradlew.bat assembleRelease
```

---

## 🎯 最简单的方法

**推荐直接在 PowerShell 中运行**：

```powershell
cd D:\Code\Project\LifeHub\LifeHubFin\android
.\gradlew.bat assembleRelease
```

就这么简单！

---

## 📋 完整流程

```powershell
# 1. 更新版本号（在项目根目录）
npm run bump:patch

# 2. 构建 APK
cd android
.\gradlew.bat assembleRelease
cd ..

# 3. 生成上传命令
npm run release:patch

# 4. 上传（会生成 upload-apk.bat）
# 双击 upload-apk.bat 或复制 curl 命令执行
```

---

## ⏱️ 预计时间

- **首次构建**: 5-10 分钟（需要下载依赖）
- **后续构建**: 1-3 分钟

---

## 📦 构建成功后

APK 文件位置：
```
android\app\build\outputs\apk\release\app-release.apk
```

文件大小：约 15-20 MB
