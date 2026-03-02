# 🎨 LifeHubFin 图标和启动页设置

## ✅ 已完成的配置

### 1. 启动页（Splash Screen）
✅ 已安装 `react-native-splash-screen`
✅ 已创建启动页布局
✅ 已配置 Android 主题
✅ 已集成到 App.tsx

**启动页效果**：
- 背景色：#3B7DD8（应用主色）
- 显示应用图标
- 显示 "LifeHub" 标题
- 显示副标题 "智能记账 · 轻松生活"

---

## 📱 应用图标设置指南

### 第一步：准备图标

你需要准备一个 **1024×1024 像素** 的 PNG 图片。

**设计建议**：
```
背景：#3B7DD8（应用蓝色）
图标：白色财务/记账相关图标
尺寸：1024×1024
格式：PNG
```

### 第二步：生成多尺寸图标

#### 方法一：在线工具（最简单）

1. 访问 [AppIcon.co](https://appicon.co)
2. 上传你的 1024×1024 PNG 图片
3. 选择 "React Native" 平台
4. 下载生成的图标包
5. 解压后替换以下文件：

```bash
# Android 图标替换
android/app/src/main/res/mipmap-mdpi/ic_launcher.png          (48×48)
android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png     (48×48)

android/app/src/main/res/mipmap-hdpi/ic_launcher.png          (72×72)
android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png     (72×72)

android/app/src/main/res/mipmap-xhdpi/ic_launcher.png         (96×96)
android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png    (96×96)

android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png       (144×144)
android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png  (144×144)

android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png      (192×192)
android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png (192×192)
```

#### 方法二：使用 Figma 设计

1. 打开 [Figma](https://figma.com)
2. 创建 1024×1024 的画板
3. 设计你的图标
4. 导出为 PNG
5. 使用上述在线工具生成多尺寸

### 第三步：测试

```bash
# 1. 清理 Android 缓存
cd android && ./gradlew clean

# 2. 返回项目根目录
cd ..

# 3. 重新运行
npm run android
```

---

## 🎨 推荐设计方案

### 应用图标
```
┌────────────────────────┐
│                        │
│       ┌──────┐         │
│       │  ¥   │         │  白色财务图标
│       │      │         │  (人民币符号或账本)
│       └──────┘         │
│                        │
│      LifeHub           │
│   智能记账              │  蓝色背景 #3B7DD8
│                        │
└────────────────────────┘
```

### 设计工具推荐

**在线工具（免费）**：
- [Canva](https://canva.com) - 搜索 "App Icon" 模板
- [Figma](https://figma.com) - 专业设计工具
- [Photopea](https://photopea.com) - 在线 Photoshop

**图标素材**：
- [Icons8](https://icons8.com) - 免费图标
- [Flaticon](https://flaticon.com) - 扁平化图标
- [IconFinder](https://iconfinder.com) - 高质量图标

---

## 📝 完整检查清单

### 启动页
- [x] 安装依赖包
- [x] 创建布局文件
- [x] 配置样式
- [x] 修改 AndroidManifest.xml
- [x] 集成到 App.tsx

### 应用图标
- [ ] 准备 1024×1024 PNG 源文件
- [ ] 使用在线工具生成多尺寸图标
- [ ] 替换 mipmap-* 目录下的图标文件
- [ ] 清理缓存并重新构建

---

## 🔗 快速链接

### 图标生成
- https://appicon.co
- https://makeappicon.com
- https://icon.kitchen

### 设计工具
- https://canva.com
- https://figma.com
- https://photopea.com

### 图标素材
- https://icons8.com
- https://flaticon.com

---

## 💡 提示

1. **首次构建**需要清理缓存
2. **测试时**可以先在模拟器上查看效果
3. **图标建议**使用简洁的设计，避免过多细节
4. **启动页**已经配置完成，无需额外操作

---

## 🆘 遇到问题？

**Q: 启动页不显示？**
A: 运行 `cd android && ./gradlew clean` 清理缓存

**Q: 图标还是默认的？**
A: 确保替换了所有 mipmap-* 目录下的图标文件

**Q: 如何查看效果？**
A: 运行 `npm run android`，在模拟器或真机上查看
