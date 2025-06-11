@echo off
:: 设置控制台为 UTF-8 编码，以正确显示中文和日文
chcp 65001 > nul

:: 设置窗口标题
title LAIN AI Server (Dev Mode)

:: =======================================================
:: --- 前置依赖检查 (Pre-flight Check) ---
:: =======================================================
echo [CHECK] 正在检查依赖环境...

:: 1. 检查 Docker 是否已安装并正在运行
docker info >nul 2>nul
if errorlevel 1 (
    echo [FATAL ERROR] Docker Desktop 未运行或未安装。
    echo [ACTION]      请先启动 Docker Desktop，然后再运行此脚本。
    echo.
    pause
    exit /b 1
)
echo [OK] Docker 已就绪。

:: 2. 检查名为 "chroma-db" 的容器是否正在运行
docker ps --filter "name=chroma-db" --filter "status=running" --format "{{.Names}}" | findstr "chroma-db" >nul
if errorlevel 1 (
    :: ▼▼▼ 核心修正：使用 ^ 来转义括号 ▼▼▼
    echo [FATAL ERROR] ChromaDB 数据库容器 ^(chroma-db^) 未在运行。
    echo [ACTION]      请在另一个终端中运行以下命令来启动它:
    echo [COMMAND]     docker start chroma-db
    echo [HINT]        如果您从未创建过该容器, 请先运行一次: docker run -d -p 8000:8000 --name chroma-db chromadb/chroma
    echo.
    pause
    exit /b 1
)
echo [OK] ChromaDB 数据库已就绪。
echo.


:: =======================================================
:: --- 主循环，启动 Node.js 服务器 ---
:: =======================================================
:loop
cls
echo [%time%] [INFO] 正在尝试启动服务器...
echo -------------------------------------------------------

:: 使用 npm run dev 命令，它会调用 nodemon
npm run dev

:: 捕获 nodemon 进程的退出码
set "EXITCODE=%ERRORLEVEL%"

echo -------------------------------------------------------
echo [%time%] [WARN] 服务器进程已停止。退出码: %EXITCODE%

:: 如果是用户手动关闭 (CTRL+C)，则脚本正常结束
if %EXITCODE% EQU 0 goto end
if %EXITCODE% EQU 130 goto end

echo [INFO] 检测到异常退出。将在 5 秒后自动重启...
timeout /t 5 > nul
goto loop

:end
echo [INFO] 脚本已结束运行。按任意键退出。
pause >nul