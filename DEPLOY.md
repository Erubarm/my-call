# CALL — Инструкция по развёртыванию

## Что понадобится

- Windows 11
- Node.js — https://nodejs.org (скачать LTS)
- ngrok — https://ngrok.com/download (или через winget)

---

## Шаг 1 — Установить Node.js

Скачай установщик с https://nodejs.org и установи (LTS версия).

Проверь в PowerShell:
```powershell
node -v   # должно показать v20.x.x или выше
npm -v    # должно показать версию npm
```

---

## Шаг 2 — Установить ngrok

**Вариант А — через winget (рекомендую):**
```powershell
winget install ngrok
```

**Вариант Б — вручную:**
Скачай с https://ngrok.com/download, распакуй ngrok.exe в папку проекта или в C:\Windows\System32.

---

## Шаг 3 — Установить зависимости проекта

Открой PowerShell в папке проекта:
```powershell
cd C:\Users\ИМЯ\projects\call
npm install
```

---

## Шаг 4 — Настроить ngrok (один раз)

Зарегистрировать authtoken (выполнить один раз):
```powershell
ngrok config add-authtoken 3AIOnWWHJQ49t0BdpNKP03NB7hk_6Q4zS9NK9NPf7LGAD3oGR
```

---

## Шаг 5 — Каждый раз при запуске

Открой **два** окна PowerShell.

**Окно 1 — запустить Node.js сервер:**
```powershell
cd C:\Users\ИМЯ\projects\call
npm start
```
Увидишь:
```
✅  CALL сервер запущен
🏠  Локально:  http://localhost:9000
🌐  Публично:  https://unformalised-caterina-cloakless.ngrok-free.dev
```

**Окно 2 — запустить ngrok туннель:**
```powershell
cd C:\Users\ИМЯ\projects\call
ngrok start --config ngrok.yml call
```
Увидишь:
```
Forwarding  https://unformalised-caterina-cloakless.ngrok-free.dev -> http://localhost:9000
```

---

## Шаг 6 — Готово!

Твоя постоянная ссылка на звонилку:

**https://unformalised-caterina-cloakless.ngrok-free.dev**

Отправь её собеседнику — он сразу попадёт в ту же комнату. Или открой с хэшем конкретной комнаты:

**https://unformalised-caterina-cloakless.ngrok-free.dev/#ROOM123**

---

## Автозапуск при старте Windows (опционально)

Чтобы сервер запускался автоматически — создай файл `start.bat` в папке проекта:

```bat
@echo off
start "CALL Server" cmd /k "cd /d %~dp0 && npm start"
start "CALL ngrok"  cmd /k "cd /d %~dp0 && ngrok start --config ngrok.yml call"
```

Положи ярлык этого файла в папку автозапуска:
`Win + R` → `shell:startup` → вставь ярлык на `start.bat`

---

## Если что-то не работает

**Порт занят:**
```powershell
netstat -ano | findstr :9000
taskkill /PID <номер> /F
```

**ngrok говорит "domain not found":**
- Убедись что домен привязан в личном кабинете ngrok → Domains
- Authtoken зарегистрирован командой из Шага 4

**Браузер блокирует микрофон:**
- ngrok даёт HTTPS, поэтому браузер должен разрешить
- Если открываешь локально через http:// — Chrome блокирует. Используй публичную ссылку.

**PeerJS не подключается:**
- Оба окна PowerShell должны быть открыты
- Проверь http://localhost:9000/peerjs — должен вернуть JSON с информацией о сервере
