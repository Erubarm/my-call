const express    = require('express');
const { ExpressPeerServer } = require('peer');
const path       = require('path');
const http       = require('http');

const app  = express();
const PORT = process.env.PORT || 9000;

// ngrok требует этот заголовок
app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

// Статика из /public
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);

// PeerJS на том же порту, путь /peerjs
const peerServer = ExpressPeerServer(server, {
  allow_discovery: false,
});

app.use('/peerjs', peerServer);

peerServer.on('connection', (client) => {
  console.log(`[+] подключился: ${client.getId()}`);
});

peerServer.on('disconnect', (client) => {
  console.log(`[-] отключился:  ${client.getId()}`);
});

server.listen(PORT, () => {
  console.log(`\n✅  CALL сервер запущен`);
  console.log(`🏠  Локально:  http://localhost:${PORT}`);
  console.log(`🌐  Публично:  https://unformalised-caterina-cloakless.ngrok-free.dev`);
  console.log(`📡  PeerJS:    http://localhost:${PORT}/peerjs`);
  console.log(`\n⚠️  Запусти ngrok в отдельном окне: ngrok start --config ngrok.yml call\n`);
});
