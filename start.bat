@echo off
title CALL App Launcher
echo.
echo  ====================================
echo   CALL - запуск серверов
echo  ====================================
echo.
echo  [1/2] Запускаем Node.js сервер...
start "CALL Server" cmd /k "cd /d %~dp0 && npm start"
timeout /t 2 /nobreak >nul

echo  [2/2] Запускаем Cloudflare Tunnel...
echo  Ссылку смотри в окне "CALL Cloudflare" (строка "trycloudflare.com")
start "CALL Cloudflare" cmd /k "cloudflared tunnel --url http://localhost:9000"

echo.
pause
