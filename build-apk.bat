@echo off
echo ===============================================
echo   LifeHubFin - Android APK 构建脚本
echo ===============================================
echo.

cd /d %~dp0android
echo 当前目录: %CD%
echo.

echo 开始构建 Release APK...
echo.

call gradlew.bat assembleRelease

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===============================================
    echo   ✅ APK 构建完成！
    echo ===============================================
    echo.
    echo APK 文件位置: app\build\outputs\apk\release\app-release.apk
    echo.
) else (
    echo.
    echo ===============================================
    echo   ❌ 构建失败
    echo ===============================================
    echo.
    echo 请检查错误信息并修复问题后重试。
    echo.
)

pause
