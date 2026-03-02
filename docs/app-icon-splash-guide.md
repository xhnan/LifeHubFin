# 应用图标和启动页设置指南

## 📱 应用图标设置

### 第一步：准备图标源文件

你需要准备一个 **1024x1024 像素** 的 PNG 图片作为应用图标。

**推荐设计工具**：
- **Figma**: 免费在线设计工具
- **Canva**: 提供图标模板
- **Photoshop/Illustrator**: 专业设计

**设计要点**：
- 简洁清晰，避免过多细节
- 使用品牌主色调
- 无需圆角（系统会自动添加）
- 透明背景会被替换为白色

---

### 第二步：生成多尺寸图标

#### 方法一：使用在线工具（推荐）

1. **访问** [AppIcon.co](https://appicon.co) 或 [MakeAppIcon](https://makeappicon.com)
2. **上传** 你的 1024x1024 PNG 图片
3. **选择** React Native 平台
4. **下载** 生成的图标包
5. **解压** 并复制文件：
   - Android: 复制到 `android/app/src/main/res/mipmap-*/`
   - iOS: 复制到 `ios/LifeHubFin/Images.xcassets/AppIcon.appiconset/`

#### 方法二：使用命令行工具

```bash
# 安装工具
npm install -g icon-gen

# 生成图标（准备一个 1024x1024 的 icon.png）
icon-gen -i icon.png -o android/app/src/main/res/mipmap-*/ -a android
```

---

### 第三步：图标尺寸对照表

| Android 密度 | 尺寸 | 目录 |
|-------------|------|------|
| mdpi | 48×48 | mipmap-mdpi |
| hdpi | 72×72 | mipmap-hdpi |
| xhdpi | 96×96 | mipmap-xhdpi |
| xxhdpi | 144×144 | mipmap-xxhdpi |
| xxxhdpi | 192×192 | mipmap-xxxhdpi |

每个目录需要两个文件：
- `ic_launcher.png` - 普通图标
- `ic_launcher_round.png` - 圆形图标（Android 8.0+）

---

### 第四步：替换图标文件

```bash
# 1. 将生成的图标文件复制到对应目录
cp your-icon-48x48.png android/app/src/main/res/mipmap-mdpi/ic_launcher.png
cp your-icon-72x72.png android/app/src/main/res/mipmap-hdpi/ic_launcher.png
cp your-icon-96x96.png android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
cp your-icon-144x144.png android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
cp your-icon-192x192.png android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png

# 2. 清理 Android 构建缓存
cd android && ./gradlew clean

# 3. 重新构建
./gradlew assembleRelease
```

---

## 🚀 启动页（Splash Screen）设置

### 使用 react-native-bootsplash（推荐）

这是一个现代化的启动页解决方案，支持动画效果。

#### 安装依赖

```bash
npm install --save-dev react-native-bootsplash
```

#### 生成启动页图片

1. **准备** 一张 1080×1920 的竖屏图片（PNG 格式）
2. **运行** 生成命令：

```bash
npx react-native-bootsplash generate \
  --platforms=android \
  --background=YOUR_BACKGROUND_COLOR \
  --logo=path/to/your/logo.png \
  --logoWidth=120 \
  --outputPath=android/app/src/main/res
```

**示例**：
```bash
npx react-native-bootsplash generate \
  --platforms=android \
  --background=#3B7DD8 \
  --logo=./assets/logo.png \
  --logoWidth=120 \
  --outputPath=android/app/src/main/res
```

#### 配置 Android

在 `android/app/src/main/res/values/styles.xml` 中添加：

```xml
<style name="BootTheme" parent="Theme.BootSplash">
    <item name="android:windowBackground">@drawable/bootsplash</item>
</style>
```

#### 在应用中使用

```typescript
import React, {useEffect} from 'react';
import {BootSplash} from 'react-native-bootsplash';

function App() {
  useEffect(() => {
    const init = async () => {
      // ... 其他初始化代码

      // 隐藏启动页
      await BootSplash.hide({fade: true});
    };

    init();
  }, []);

  return <YourApp />;
}
```

---

### 简单方案：使用 react-native-splash-screen

如果只需要一个静态启动页，可以使用这个库。

#### 安装依赖

```bash
npm install react-native-splash-screen
```

#### Android 配置

1. **创建** `android/app/src/main/res/layout/launch_screen.xml`：

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:gravity="center"
    android:background="#3B7DD8">

    <ImageView
        android:layout_width="120dp"
        android:layout_height="120dp"
        android:src="@mipmap/ic_launcher"
        android:scaleType="centerCrop" />

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="LifeHub"
        android:textColor="#ffffff"
        android:textSize="24sp"
        android:layout_marginTop="16dp" />
</LinearLayout>
```

2. **修改** `android/app/src/main/res/values/styles.xml`：

```xml
<style name="AppTheme" parent="Theme.AppCompat.Light.NoActionBar">
    <item name="android:statusBarColor">@color/bootsplash_status_bar</item>
</style>

<style name="BootTheme" parent="AppTheme">
    <item name="android:windowBackground">@layout/launch_screen</item>
</style>
```

3. **修改** `android/app/src/main/AndroidManifest.xml`：

```xml
<activity
    android:name=".MainActivity"
    android:theme="@style/BootTheme"
    android:exported="true">
    <!-- ... -->
</activity>
```

#### 在代码中使用

```typescript
import React, {useEffect} from 'react';
import SplashScreen from 'react-native-splash-screen';

function App() {
  useEffect(() => {
    // 延迟隐藏启动页（等待数据加载）
    const timer = setTimeout(() => {
      SplashScreen.hide();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return <YourApp />;
}
```

---

## 🎨 LifeHubFin 推荐方案

基于你的应用风格（蓝色主题 #3B7DD8），推荐配置：

### 应用图标
```
背景色：#3B7DD8（主蓝色）
图标：白色记账/财务图标
居中显示，简洁大方
```

### 启动页
```
背景色：#3B7DD8
Logo：应用图标（白色，120×120）
文字：LifeHub（白色，24sp，居中）
副标题：智能记账 · 轻松生活（浅灰色，14sp）
```

---

## 📦 完整设置步骤

### 1. 准备资源
```bash
# 创建资源目录
mkdir -p assets/icons
mkdir -p assets/bootsplash
```

### 2. 生成图标
- 使用在线工具或 Figma 设计图标
- 生成不同尺寸的 PNG 文件
- 复制到 `android/app/src/main/res/mipmap-*/`

### 3. 安装启动页库
```bash
npm install --save-dev react-native-bootsplash
```

### 4. 生成启动页
```bash
npx react-native-bootsplash generate \
  --platforms=android \
  --background=#3B7DD8 \
  --logo=./assets/icon.png \
  --logoWidth=120 \
  --outputPath=android/app/src/main/res
```

### 5. 测试
```bash
# 清理缓存
cd android && ./gradlew clean

# 重新构建
cd .. && npm run android
```

---

## 🔗 在线工具

### 图标生成
- [AppIcon.co](https://appicon.co) - 支持多平台
- [MakeAppIcon](https://makeappicon.com) - 简单易用
- [IconKitchen](https://icon.kitchen) - 可在线设计

### 启动页生成
- [AppBrand](https://appbrand.it) - 生成启动页
- [BootSplash](https://zoontek.github.io/react-native-bootsplash/) - 官方文档

---

## ❓ 常见问题

**Q: 图标不显示？**
A: 运行 `cd android && ./gradlew clean` 清理缓存后重新构建

**Q: 启动页闪一下就消失了？**
A: 检查是否在正确的时机调用 `SplashScreen.hide()`，建议在数据加载完成后调用

**Q: 如何同时设置 iOS 和 Android？**
A: 使用在线工具时选择两个平台，或者分别运行两次生成命令
