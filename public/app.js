// =============================================
//  КОНФИГ — меняй здесь если используешь свой сервер
// =============================================

const PEER_CONFIG = {
  host: 'unformalised-caterina-cloakless.ngrok-free.dev',
  port: 443,
  path: '/peerjs',
  secure: true,
  debug: 0,
};

// =============================================
//  СОСТОЯНИЕ
// =============================================

const ROOM_ID = location.hash.slice(1) || Math.random().toString(36).slice(2, 8).toUpperCase();
if (!location.hash) location.hash = ROOM_ID;

const MY_ID = `${ROOM_ID}-${Math.random().toString(36).slice(2, 7)}`;

let peer         = null;
let localStream  = null;
let screenStream = null;
let peers        = {};   // peerId -> { dataConn, mediaConn, stream, tileEl }
let micOn        = true;
let camOn        = false;
let screenOn     = false;
let selfTile     = null;

// =============================================
//  DOM
// =============================================

const waitingEl   = document.getElementById('waiting');
const urlCopy     = document.getElementById('url-copy');
const statusLine  = document.getElementById('status-line');
const grid        = document.getElementById('video-grid');
const roomLabel   = document.getElementById('room-label');
const peerCountEl = document.getElementById('peer-count');
const btnMic      = document.getElementById('btn-mic');
const btnCam      = document.getElementById('btn-cam');
const btnScreen   = document.getElementById('btn-screen');
const btnLeave    = document.getElementById('btn-leave');

roomLabel.textContent = ROOM_ID;
urlCopy.textContent   = location.href;
urlCopy.onclick = () =>
  navigator.clipboard.writeText(location.href).then(() => notify('ССЫЛКА СКОПИРОВАНА'));

// =============================================
//  JOIN
// =============================================

document.getElementById('join-btn').onclick = async () => {
  const btn = document.getElementById('join-btn');
  btn.disabled = true;
  setStatus('ЗАПРАШИВАЕМ МИКРОФОН…');

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch (e) {
    setStatus('НУЖЕН ДОСТУП К МИКРОФОНУ');
    btn.disabled = false;
    return;
  }

  setStatus('ПОДКЛЮЧЕНИЕ К СЕРВЕРУ…');
  initPeer();
};

// =============================================
//  PEER INIT — пробуем стать хостом (ID = ROOM_ID)
// =============================================

function initPeer() {
  const p = new Peer(ROOM_ID, PEER_CONFIG);

  p.on('open', () => {
    peer = p;
    setupListeners();
    onJoined();
    notify('КОМНАТА СОЗДАНА');
  });

  p.on('error', (err) => {
    if (err.type === 'unavailable-id') {
      // Хост уже есть — входим как гость
      p.destroy();
      joinAsGuest();
    } else {
      setStatus('ОШИБКА: ' + err.type);
      document.getElementById('join-btn').disabled = false;
    }
  });
}

function joinAsGuest() {
  const p = new Peer(MY_ID, PEER_CONFIG);

  p.on('open', () => {
    peer = p;
    setupListeners();
    onJoined();
    connectToHost();
  });

  p.on('error', (err) => {
    setStatus('ОШИБКА: ' + err.type);
    document.getElementById('join-btn').disabled = false;
  });
}

function onJoined() {
  setStatus('');
  waitingEl.style.display = 'none';
  addSelfTile();
  updateCount();
}

// =============================================
//  ВХОДЯЩИЕ СОЕДИНЕНИЯ (хост слушает)
// =============================================

function setupListeners() {
  peer.on('connection', (conn) => {
    conn.on('open', () => {
      getOrCreate(conn.peer).dataConn = conn;
      setupDataConn(conn);
      updateCount();

      // Хост рассылает новому участнику список всех остальных
      const list = Object.keys(peers).filter(id => id !== conn.peer);
      if (list.length) conn.send({ type: 'peers', list });
    });
  });

  peer.on('call', (call) => {
    call.answer(localStream);
    handleCall(call);
  });
}

// =============================================
//  ГОСТЬ: подключается к хосту
// =============================================

function connectToHost() {
  const conn = peer.connect(ROOM_ID, { reliable: true });

  conn.on('open', () => {
    getOrCreate(ROOM_ID).dataConn = conn;
    setupDataConn(conn);
    const call = peer.call(ROOM_ID, localStream);
    getOrCreate(ROOM_ID).mediaConn = call;
    handleCall(call);
  });

  conn.on('error', () => notify('НЕ УДАЛОСЬ ПОДКЛЮЧИТЬСЯ К ХОСТУ'));
}

// =============================================
//  DATA CHANNEL (сигнализация внутри комнаты)
// =============================================

function setupDataConn(conn) {
  conn.on('data', (msg) => handleData(conn.peer, msg));
  conn.on('close', () => removePeer(conn.peer));
  conn.on('error', () => removePeer(conn.peer));
}

function handleData(fromId, msg) {
  if (msg.type === 'peers') {
    // Подключаемся к каждому участнику из списка
    msg.list.forEach(pid => {
      if (peers[pid]) return;
      const conn = peer.connect(pid, { reliable: true });
      conn.on('open', () => {
        getOrCreate(pid).dataConn = conn;
        setupDataConn(conn);
        const call = peer.call(pid, localStream);
        getOrCreate(pid).mediaConn = call;
        handleCall(call);
      });
    });
  }
}

// =============================================
//  МЕДИА: входящий/исходящий звонок
// =============================================

function handleCall(call) {
  const pid = call.peer;
  const entry = getOrCreate(pid);
  entry.mediaConn = call;

  call.on('stream', (remoteStream) => {
    entry.stream = remoteStream;
    if (!entry.tileEl) {
      const tile = createTile(pid, remoteStream, pid.slice(-5).toUpperCase(), false);
      entry.tileEl = tile;
      grid.appendChild(tile);
      updateCount();
      notify('УЧАСТНИК ПОДКЛЮЧИЛСЯ');
    }
  });

  call.on('close', () => removePeer(pid));
  call.on('error', () => removePeer(pid));
}

function getOrCreate(pid) {
  if (!peers[pid]) peers[pid] = { dataConn: null, mediaConn: null, stream: null, tileEl: null };
  return peers[pid];
}

function removePeer(pid) {
  const entry = peers[pid];
  if (!entry) return;
  try { entry.dataConn?.close(); }  catch (e) {}
  try { entry.mediaConn?.close(); } catch (e) {}
  entry.tileEl?.remove();
  delete peers[pid];
  updateCount();
  notify('УЧАСТНИК ОТКЛЮЧИЛСЯ');
}

// =============================================
//  ВИДЕО-ТАЙЛЫ
// =============================================

function addSelfTile() {
  selfTile = createTile('self', localStream, 'ВЫ', true);
  grid.appendChild(selfTile);
  setupAudioVis(localStream, selfTile);
}

function createTile(id, stream, label, isSelf) {
  const tile = document.createElement('div');
  tile.className = 'video-tile';
  tile.id = `tile-${id}`;

  const video = document.createElement('video');
  video.autoplay = true;
  video.playsInline = true;
  if (isSelf) video.muted = true;
  video.srcObject = stream;

  const avatarWrap = document.createElement('div');
  avatarWrap.className = 'avatar-wrap';
  const circle = document.createElement('div');
  circle.className = 'avatar-circle';
  circle.textContent = label.slice(0, 2);
  avatarWrap.appendChild(circle);

  const ring       = document.createElement('div'); ring.className = 'speaking-ring';
  const lbl        = document.createElement('div'); lbl.className = 'tile-label'; lbl.textContent = label;
  const mutedBadge = document.createElement('div'); mutedBadge.className = 'muted-badge'; mutedBadge.textContent = '🔇';

  const bars = document.createElement('div');
  bars.className = 'audio-bars';
  for (let i = 0; i < 5; i++) {
    const b = document.createElement('div'); b.className = 'audio-bar'; bars.appendChild(b);
  }

  tile.append(avatarWrap, video, ring, lbl, mutedBadge, bars);

  const checkVid = () => {
    const hasV = stream.getVideoTracks().some(t => t.readyState !== 'ended' && t.enabled);
    video.style.display      = hasV ? 'block' : 'none';
    avatarWrap.style.display = hasV ? 'none'  : 'flex';
  };
  stream.addEventListener('addtrack', checkVid);
  stream.addEventListener('removetrack', checkVid);
  checkVid();

  if (!isSelf) setupAudioVis(stream, tile);
  return tile;
}

function setupAudioVis(stream, tile) {
  try {
    const ctx      = new AudioContext();
    const src      = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser(); analyser.fftSize = 32;
    src.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const bars = tile.querySelectorAll('.audio-bar');

    const tick = () => {
      if (!tile.isConnected) return ctx.close();
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      tile.classList.toggle('speaking', avg > 10);
      bars.forEach((b, i) => { b.style.height = Math.max(2, (data[i * 2] / 255) * 20) + 'px'; });
      requestAnimationFrame(tick);
    };
    tick();
  } catch (e) {}
}

// =============================================
//  CONTROLS
// =============================================

btnMic.onclick = () => {
  micOn = !micOn;
  localStream.getAudioTracks().forEach(t => t.enabled = micOn);
  btnMic.classList.toggle('off', !micOn);
  btnMic.textContent = micOn ? '🎤' : '🔇';
  selfTile?.classList.toggle('mic-muted', !micOn);
};

btnCam.onclick = async () => {
  if (!camOn) {
    try {
      const vs    = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
      const track = vs.getVideoTracks()[0];
      localStream.addTrack(track);

      Object.values(peers).forEach(({ mediaConn }) => {
        mediaConn?.peerConnection?.addTrack(track, localStream);
      });

      const v = selfTile?.querySelector('video');
      if (v) {
        v.srcObject = localStream;
        v.style.display = 'block';
        selfTile.querySelector('.avatar-wrap').style.display = 'none';
      }

      camOn = true;
      btnCam.classList.add('active');
      notify('КАМЕРА ВКЛЮЧЕНА');
      track.onended = () => { camOn = false; btnCam.classList.remove('active'); };
    } catch (e) {
      notify('НЕТ ДОСТУПА К КАМЕРЕ');
    }
  } else {
    localStream.getVideoTracks().forEach(t => { t.stop(); localStream.removeTrack(t); });
    camOn = false;
    btnCam.classList.remove('active');
    const v = selfTile?.querySelector('video');
    if (v) { v.style.display = 'none'; selfTile.querySelector('.avatar-wrap').style.display = 'flex'; }
    notify('КАМЕРА ВЫКЛЮЧЕНА');
  }
};

btnScreen.onclick = async () => {
  if (!screenOn) {
    try {
      screenStream    = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const track     = screenStream.getVideoTracks()[0];
      const screenTile = createTile('screen', screenStream, 'ЭКРАН', true);
      screenTile.classList.add('screenshare-tile');
      grid.insertBefore(screenTile, grid.firstChild);

      Object.values(peers).forEach(({ mediaConn }) => {
        screenStream.getTracks().forEach(t => mediaConn?.peerConnection?.addTrack(t, screenStream));
      });

      screenOn = true;
      btnScreen.classList.add('active');
      notify('ДЕМОНСТРАЦИЯ НАЧАТА');
      track.onended = stopScreen;
    } catch (e) {
      notify('ДЕМОНСТРАЦИЯ ОТМЕНЕНА');
    }
  } else {
    stopScreen();
  }
};

function stopScreen() {
  screenStream?.getTracks().forEach(t => t.stop());
  document.getElementById('tile-screen')?.remove();
  screenOn = false;
  btnScreen.classList.remove('active');
  notify('ДЕМОНСТРАЦИЯ ЗАВЕРШЕНА');
}

btnLeave.onclick = () => {
  Object.keys(peers).forEach(removePeer);
  peer?.destroy();
  localStream?.getTracks().forEach(t => t.stop());
  screenStream?.getTracks().forEach(t => t.stop());
  location.reload();
};

window.onbeforeunload = () => peer?.destroy();

// =============================================
//  UTILS
// =============================================

function updateCount() {
  const n = Object.values(peers).filter(p => p.tileEl).length + 1;
  peerCountEl.textContent = `${n} участни${n === 1 ? 'к' : n < 5 ? 'ка' : 'ков'}`;
}

function setStatus(txt) { statusLine.textContent = txt; }

function notify(txt) {
  const el = document.createElement('div');
  el.className = 'notif';
  el.textContent = txt;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
