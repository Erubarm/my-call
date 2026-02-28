@echo off
title CALL App Launcher
echo.
echo  ====================================
echo   CALL - запуск серверов
echo  ====================================
echo.
echo  [1/2] Запускаем Node.js сервер...
start "CALL Server" cmd /k "cd /d %~dp0 && npm start"

echo  Ждём 3 секунды пока сервер поднимется...
timeout /t 3 /nobreak >nul

echo  [2/2] Запускаем Cloudflare Tunnel...
echo  Ссылку смотри в окне "CALL Cloudflare" (строка "trycloudflare.com")
start "CALL Cloudflare" cmd /k "cloudflared tunnel --url http://127.0.0.1:9000 --protocol http2"

echo.
pause
