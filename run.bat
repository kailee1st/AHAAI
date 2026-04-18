@echo off
echo.
echo ╔═══════════════════════════════════╗
echo ║       Aha Moment AI  v2           ║
echo ╚═══════════════════════════════════╝
echo.

:: 포트 정리
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8080 "') do (
  taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 "') do (
  taskkill /f /pid %%a >nul 2>&1
)

echo [1/2] FastAPI 백엔드 시작 (포트 8080)...
start "Aha-Backend" cmd /k "cd /d %~dp0backend && python main.py"

timeout /t 2 /nobreak >nul

echo [2/2] React 프론트엔드 시작 (포트 5173)...
start "Aha-Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo  백엔드:    http://localhost:8080
echo  프론트:    http://localhost:5173
echo.
start http://localhost:5173
