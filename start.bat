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

echo  [2/2] Запускаем ngrok туннель...
start "CALL ngrok" cmd /k "cd /d %~dp0 && ngrok start --config ngrok.yml call"

echo.
echo  Готово! Открывай:
echo  https://unformalised-caterina-cloakless.ngrok-free.dev
echo.
pause
