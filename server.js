const express = require('express');
const { ExpressPeerServer } = require('peer');
const path = require('path');
const http = require('http');

const app  = express();
const PORT = process.env.PORT || 9000;

// ngrok требует этот заголовок, иначе блокирует запросы
app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

// Раздаём статику из /public
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);

// PeerJS сигнальный сервер
const peerServer = ExpressPeerServer(server, {
  path: '/peerjs',
  allow_discovery: false,
});

app.use('/peerjs', peerServer);

peerServer.on('connection', (client) => {
  console.log(`[+] подключился: ${client.getId()}`);
});

peerServer.on('disconnect', (client) => {
  console.log(`[-] отключился: ${client.getId()}`);
});

server.listen(PORT, () => {
  console.log(`\n✅  CALL сервер запущен`);
  console.log(`🏠  Локально:  http://localhost:${PORT}`);
  console.log(`🌐  Публично:  https://unformalised-caterina-cloakless.ngrok-free.dev`);
  console.log(`\n⚠️  Не забудь запустить ngrok в отдельном окне!\n`);
});
