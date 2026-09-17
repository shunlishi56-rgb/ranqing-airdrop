@echo off
chcp 65001 >nul
setlocal

set "SRC=D:\AgentTele_Theshun\xiaokongtou\cloudfunctions"
set "DIST=D:\AgentTele_Theshun\xiaokongtou\unpackage\dist\dev\mp-weixin\cloudfunctions"

echo ============================================
echo   同步云函数到编译产物
echo ============================================
echo.

if not exist "%SRC%" (
    echo [错误] 源目录不存在: %SRC%
    pause
    exit /b 1
)

REM 检查产物父目录（没编译过就没有）
for %%A in ("%DIST%\..") do set "PARENT=%%~fA"
if not exist "%PARENT%" (
    echo [提示] 编译产物目录不存在，请先在 HBuilderX 编译一次再运行本脚本。
    pause
    exit /b 1
)

REM 清旧拷新
if exist "%DIST%" rmdir /s /q "%DIST%"
xcopy "%SRC%" "%DIST%\" /e /i /q >nul
if errorlevel 1 (
    echo [错误] 复制失败，请检查文件是否被占用。
    pause
    exit /b 1
)

echo [完成] 已同步 %DIST%
echo.
echo 现在回到微信开发者工具，对需要更新的云函数
echo 右键 - 上传并部署：云端安装依赖
echo.
pause
