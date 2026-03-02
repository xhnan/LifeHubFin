@echo off
echo ===============================================
echo   清理缓存并重新构建
echo ===============================================
echo.

echo 步骤 1: 清理 Gradle 缓存...
cd /d %~dp0android
gradlew.bat clean
echo.

echo 步骤 2: 返回项目根目录...
cd /d %~dp0
echo.

echo 步骤 3: 清理 Metro 缓存...
call npm cache clean --force
echo.

echo ===============================================
echo   ✅ 缓存清理完成！
echo ===============================================
echo.
echo 现在可以运行构建了：
echo   cd android ^&^& .\gradlew.bat assembleRelease
echo.

pause
