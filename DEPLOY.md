# CALL — Инструкция по развёртыванию

## Что понадобится

- Windows 11
- Node.js — https://nodejs.org (скачать LTS)
- cloudflared — https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

---

## Шаг 1 — Установить Node.js

Скачай установщик с https://nodejs.org и установи (LTS версия).

Проверь в PowerShell:
```powershell
node -v   # должно показать v20.x.x или выше
npm -v    # должно показать версию npm
```

---

## Шаг 2 — Установить cloudflared

**Вариант А — через winget (рекомендую):**
```powershell
winget install Cloudflare.cloudflared
```

**Вариант Б — вручную:**
Скачай с https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/,
распакуй `cloudflared.exe` в `C:\Windows\System32`.

---

## Шаг 3 — Установить зависимости проекта

Открой PowerShell в папке проекта:
```powershell
cd C:\Users\ИМЯ\projects\call
npm install
```

---

## Шаг 4 — Каждый раз при запуске

Проще всего — дважды кликни `start.bat`.

Или вручную — открой **два** окна PowerShell.

**Окно 1 — запустить Node.js сервер:**
```powershell
cd C:\Users\ИМЯ\projects\call
npm start
```

**Окно 2 — запустить Cloudflare Tunnel:**
```powershell
cloudflared tunnel --url http://localhost:9000
```

В окне 2 появится строка вида:
```
INF  +--------------------------------------------------------------------------------------------+
INF  |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable): |
INF  |  https://example-words-here.trycloudflare.com                                             |
INF  +--------------------------------------------------------------------------------------------+
```

---

## Шаг 5 — Готово!

Скопируй ссылку `https://....trycloudflare.com` и отправь собеседнику.

Ссылка работает в России без VPN. При каждом новом запуске ссылка будет новой.

Открыть конкретную комнату:
**https://....trycloudflare.com/#ROOM123**

---

## Автозапуск при старте Windows (опционально)

Положи ярлык `start.bat` в папку автозапуска:
`Win + R` → `shell:startup` → вставь ярлык на `start.bat`

---

## Если что-то не работает

**Порт занят:**
```powershell
netstat -ano | findstr :9000
taskkill /PID <номер> /F
```

**cloudflared не запускается:**
- Проверь установку: `cloudflared --version`
- Попробуй перезапустить от имени администратора

**Браузер блокирует микрофон:**
- Cloudflare даёт HTTPS, поэтому браузер должен разрешить
- Если открываешь локально через http:// — Chrome блокирует. Используй публичную ссылку.

**PeerJS не подключается:**
- Оба окна должны быть открыты
- Проверь http://localhost:9000/peerjs — должен вернуть JSON
