# LifeHubFin - Android APK 构建脚本 (PowerShell)

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  LifeHubFin - Android APK 构建脚本" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

$CurrentDir = Get-Location
Write-Host "当前目录: $CurrentDir" -ForegroundColor Gray
Write-Host ""

$AndroidDir = Join-Path $PSScriptRoot "android"
if (Test-Path $AndroidDir) {
    Set-Location $AndroidDir
    Write-Host "切换到 Android 目录: $AndroidDir" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "开始构建 Release APK..." -ForegroundColor Green
Write-Host ""

# 运行 Gradle 构建
& .\gradlew.bat assembleRelease

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Green
    Write-Host "  ✅ APK 构建完成！" -ForegroundColor Green
    Write-Host "===============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "APK 文件位置: app\build\outputs\apk\release\app-release.apk" -ForegroundColor Cyan
    Write-Host ""

    # 检查文件是否存在
    $ApkPath = "app\build\outputs\apk\release\app-release.apk"
    if (Test-Path $ApkPath) {
        $FileInfo = Get-Item $ApkPath
        $SizeMB = [math]::Round($FileInfo.Length / 1MB, 2)
        Write-Host "文件大小: $SizeMB MB" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Red
    Write-Host "  ❌ 构建失败" -ForegroundColor Red
    Write-Host "===============================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "请检查错误信息并修复问题后重试。" -ForegroundColor Red
    Write-Host ""
}

Write-Host ""
Write-Host "按任意键退出..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
