import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

/* ============ DỮ LIỆU ============ */
/* Chỉ 2 nhân vật chibi đáng yêu — Milo (nam) và Luna (nữ). */
const CHARACTERS = [
  { name: 'Milo', gender: 'Nam', outfit: 'male', outfitId: 'street', desc: 'Năng động, thích cà phê đen và nhạc lofi.', skin: 0xf2c89b, hair: 0x2b1a12 },
  { name: 'Luna', gender: 'Nữ', outfit: 'female', outfitId: 'chic', desc: 'Dịu dàng, hay ngồi sân vườn đọc sách.', skin: 0xffe0bd, hair: 0x7c4a2d },
];

/* ---- Hệ thống trang phục (dữ liệu, không phải code cứng) ----
   Mỗi bộ đồ là 1 entry: nón, tóc, áo, quần/váy, giày, túi + màu.
   Sau này thêm đồ mới cho người chơi mua chỉ cần thêm 1 entry vào đây,
   không phải sửa code dựng nhân vật. */
const OUTFITS = {
  male: {
    street: {
      label: 'Street',
      hat: { type: 'snapback', main: 0x111827, brim: 0xe11d48, logo: 0xffffff },
      hair: { type: 'spiky' },
      top: { type: 'hoodie', main: 0xfff7ed, pocket: 0xe11d48 },
      bottom: { type: 'cargo', main: 0x4d7c0f, pocket: 0x3f6212 },
      shoes: { type: 'sneakers', main: 0xffffff, sole: 0xe11d48 },
    },
    denim: {
      label: 'Denim',
      hair: { type: 'short' },
      top: { type: 'denim', main: 0x3b82f6, pocket: 0x1e40af },
      bottom: { type: 'jeans', main: 0x1e3a5f },
      shoes: { type: 'sneakers', main: 0xffffff, sole: 0x3b82f6 },
    },
    sport: {
      label: 'Thể thao',
      hat: { type: 'headband', main: 0xe11d48 },
      hair: { type: 'curly' },
      top: { type: 'sport', main: 0xf97316, stripe: 0xffffff },
      bottom: { type: 'shorts', main: 0x1e3a5f },
      shoes: { type: 'sneakers', main: 0xffffff, sole: 0xf97316 },
    },
    winter: {
      label: 'Mùa đông',
      hat: { type: 'beanie', main: 0xdc2626, pom: 0xffffff },
      hair: { type: 'short' },
      top: { type: 'sweater', main: 0x15803d },
      bottom: { type: 'jeans', main: 0x374151 },
      shoes: { type: 'boots', main: 0x78350f, sole: 0x451a03 },
    },
  },
  female: {
    chic: {
      label: 'Chic',
      hat: { type: 'beret', main: 0xec4899 },
      hair: { type: 'long', bow: 0xf472b6 },
      top: { type: 'blouse', main: 0xf5f3ff },
      bottom: { type: 'skirt', main: 0xec4899, band: 0xdb2777 },
      shoes: { type: 'maryjane', main: 0x9d174d },
      bag: { type: 'crossbody', main: 0xfbbf24 },
    },
    denim: {
      label: 'Denim',
      hair: { type: 'bob' },
      top: { type: 'denim', main: 0x60a5fa, pocket: 0x1e40af },
      bottom: { type: 'jeans', main: 0x1e3a5f },
      shoes: { type: 'sneakers', main: 0xffffff, sole: 0xec4899 },
    },
    summer: {
      label: 'Mùa hè',
      hat: { type: 'sunhat', main: 0xfacc15, band: 0xec4899 },
      hair: { type: 'ponytail' },
      top: { type: 'dress', main: 0xfde68a, belt: 0xec4899 },
      bottom: { type: 'dress', main: 0xfde68a },
      shoes: { type: 'sandals', main: 0xd97706 },
    },
    winter: {
      label: 'Mùa đông',
      hat: { type: 'beanie', main: 0xec4899, pom: 0xffffff },
      hair: { type: 'bun' },
      top: { type: 'sweater', main: 0xdb2777 },
      bottom: { type: 'leggings', main: 0x111827 },
      shoes: { type: 'boots', main: 0x78350f, sole: 0x451a03 },
    },
  },
};
const RANDOM_NAMES = ['Minh Anh','Thu Hằng','Quốc Anh','Lan Chi','Hoàng Phúc','Thảo Nguyên','Đức Huy','Phương Thảo'];
const ZONE_NAMES = { hall: 'Sảnh chính', terrace: 'Sân vườn', lounge: 'Lounge' };

/* ============ TRẠNG THÁI ============ */
const state = {
  myId: 'me', myName: '', myChar: 0, myOutfit: '', entered: false,
  players: new Map(), // id -> charObj
  seats: [],          // {id, table, zone, x, z, angle, occupiedBy, cup}
  friends: new Set(JSON.parse(localStorage.getItem('cafe3d_friends') || '[]')),
  videoId: 'jfKfPfyJRdk', videoTitle: 'Lofi Girl — beats to relax/study to',
  camMode: 0, // 0 toàn cảnh, 1 theo mình, 2 tivi
};
const $ = (id) => document.getElementById(id);

/* Điện thoại: tự bật chế độ nhẹ (tắt bóng đổ, pixel ratio 1) cho mượt */
const IS_MOBILE = matchMedia('(pointer: coarse)').matches || innerWidth < 700;
const IS_PORTRAIT = innerHeight > innerWidth;
const LOWFX = new URLSearchParams(location.search).has('lowfx') || IS_MOBILE;

/* ============ FIREBASE — NGƯỜI THẬT CHƠI CHUNG ============
   Quán không còn bot: mọi người trong quán đều là người thật, đồng bộ qua
   Firebase Realtime Database (project cafe-ket-ban, Singapore).
   - rooms/cafe1/players/{id}: vị trí, ghế, trạng thái, tin nhắn của từng người
   - rooms/cafe1/chat: lịch sử chat chung
   - rooms/cafe1/tv/current + tv/queue: video và hàng chờ chung cả quán
   Nếu không kết nối được Firebase thì quán vẫn chơi được một mình. */
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBnbpbq_jQy18y_-F3mrX3CgdFcKj9NxhI',
  authDomain: 'cafe-ket-ban.firebaseapp.com',
  databaseURL: 'https://cafe-ket-ban-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'cafe-ket-ban',
  storageBucket: 'cafe-ket-ban.firebasestorage.app',
  messagingSenderId: '352844936742',
  appId: '1:352844936742:web:8df307ed62b5a538b098e7',
  measurementId: 'G-H59KB7SM5S',
};
const ROOM = 'cafe1';
let fbDb = null, fbReady = false;
const myFbId = 'u_' + Math.random().toString(36).slice(2, 10);
let myPlayerRef = null, mySeatAt = 0, myChatKeys = new Set();
let sharedCurrentId = null, sharedQueue = []; // [{key, id, by, at}]
let fbPlayersReady = false;
function fbInit() {
  try {
    if (!window.firebase || !firebase.initializeApp) { console.warn('Firebase SDK chưa tải được, chơi một mình'); return; }
    firebase.initializeApp(FIREBASE_CONFIG);
    fbDb = firebase.database();
    fbReady = true;
    fbDb.ref('.info/connected').on('value', (snap) => {
      const on = snap.val() === true;
      $('net-dot').classList.toggle('on', on);
      $('net-dot').title = on ? 'Đã kết nối — đang chơi chung với mọi người' : 'Mất kết nối — bạn đang chơi một mình';
      // Chỉ báo "đã kết nối" khi mạng thật sự thông (SDK tải xong chưa có nghĩa là nối được)
      if (on && state.entered && !window._fbHelloLogged) {
        window._fbHelloLogged = true;
        log('<span class="sys">🌐 Đã kết nối — người thật vào quán sẽ thấy bạn!</span>');
      }
    });
    listenPlayers();
    listenChat();
    listenTv();
    // Nhịp tim: cập nhật lastSeen để người khác không tưởng mình đã thoát
    setInterval(() => { if (state.entered) publishMe(true); }, 15000);
    // Dọn người đã thoát mà onDisconnect chưa kịp chạy
    setInterval(() => {
      if (!fbReady) return;
      fbDb.ref(`rooms/${ROOM}/players`).once('value', (snap) => {
        const v = snap.val() || {};
        const now = Date.now();
        Object.entries(v).forEach(([id, d]) => {
          if (id !== myFbId && now - (d.at || 0) > 90000) fbDb.ref(`rooms/${ROOM}/players/${id}`).remove();
        });
      });
    }, 30000);
  } catch (e) { console.warn('Không kết nối được Firebase', e); }
}
function joinFirebase() {
  if (!fbReady) { toast('Không kết nối được máy chủ, bạn đang chơi một mình'); return; }
  myPlayerRef = fbDb.ref(`rooms/${ROOM}/players/${myFbId}`);
  myPlayerRef.onDisconnect().remove();
  publishMe(true);
}
let lastPublish = 0;
function myStateData() {
  const me = state.players.get('me');
  return {
    name: state.myName || 'Khách',
    char: state.myChar,
    outfit: state.myOutfit || CHARACTERS[state.myChar].outfitId,
    x: me ? +me.group.position.x.toFixed(2) : 0,
    z: me ? +me.group.position.z.toFixed(2) : 15.5,
    rotY: me ? +me.group.rotation.y.toFixed(2) : Math.PI,
    mode: me ? me.mode : 'idle',
    seat: me && me.seat ? me.seat.id : null,
    seatAt: mySeatAt,
    drink: me ? me.drink : 0,
    msg: me && me._lastMsg ? me._lastMsg.text : '',
    msgAt: me && me._lastMsg ? me._lastMsg.at : 0,
    at: Date.now(),
  };
}
function publishMe(now = false) {
  if (!fbReady || !state.entered || !myPlayerRef) return;
  const t = Date.now();
  if (now || t - lastPublish >= 250) { lastPublish = t; myPlayerRef.set(myStateData()); }
}
function listenPlayers() {
  const ref = fbDb.ref(`rooms/${ROOM}/players`);
  ref.once('value', () => { fbPlayersReady = true; });
  ref.on('child_added', (snap) => {
    const id = snap.key, d = snap.val();
    if (!d || id === myFbId) return;
    if (Date.now() - (d.at || 0) > 90000) { snap.ref.remove(); return; }
    if (state.players.has(id)) return;
    const base = CHARACTERS[d.char] || CHARACTERS[0];
    const spec = { ...base, outfitId: d.outfit || base.outfitId };
    const c = spawnCharacter(id, d.name || 'Khách', spec, { x: d.x ?? 0, z: d.z ?? 15.5, rotY: d.rotY ?? 0 });
    c.isRemote = true;
    c.tx = d.x ?? 0; c.tz = d.z ?? 15.5; c.trotY = d.rotY ?? 0;
    applyRemoteState(c, d);
    if (fbPlayersReady) log(`<span class="sys">👋 ${escapeHtml(d.name || 'Khách')} vừa vào quán!</span>`);
  });
  ref.on('child_changed', (snap) => {
    const id = snap.key, d = snap.val();
    if (!d || id === myFbId) return;
    if (Date.now() - (d.at || 0) > 90000) { snap.ref.remove(); return; }
    const c = state.players.get(id);
    if (!c) return;
    // Người kia đổi nhân vật / trang phục -> dựng lại nhân vật cho họ
    const base = CHARACTERS[d.char] || CHARACTERS[0];
    const newOutfit = d.outfit || base.outfitId;
    if (c.spec.name !== base.name || c.spec.outfitId !== newOutfit) {
      removeCharacter(id);
      const spec = { ...base, outfitId: newOutfit };
      const nc = spawnCharacter(id, d.name || 'Khách', spec, { x: d.x ?? 0, z: d.z ?? 15.5, rotY: d.rotY ?? 0 });
      nc.isRemote = true;
      nc.tx = d.x ?? 0; nc.tz = d.z ?? 15.5; nc.trotY = d.rotY ?? 0;
      applyRemoteState(nc, d);
      return;
    }
    c.tx = d.x ?? c.tx; c.tz = d.z ?? c.tz; c.trotY = d.rotY ?? c.trotY;
    applyRemoteState(c, d);
    // Ghế mình đang giữ bị người khác ngồi mà họ giữ trước -> nhường ghế
    const me = state.players.get('me');
    if (me && me.seat && d.seat === me.seat.id && (d.seatAt || 0) < mySeatAt) {
      freeSeat(me.seat); me.seat = null; me.mode = 'idle'; me.pendingSeat = null; me.path = [];
      publishMe(true);
      toast('Ghế này có người ngồi trước rồi, chọn ghế khác nhé');
    }
  });
  ref.on('child_removed', (snap) => {
    const id = snap.key;
    const c = state.players.get(id);
    if (!c || id === myFbId) return;
    log(`<span class="sys">👋 ${escapeHtml(c.name)} đã rời quán.</span>`);
    removeCharacter(id);
  });
}
function applyRemoteState(c, d) {
  const seatId = d.seat;
  if (seatId !== null && seatId !== undefined) {
    const seat = state.seats[seatId];
    if (seat && c.seat !== seat) {
      if (c.seat) freeSeat(c.seat);
      c.seat = seat; seat.occupiedBy = c.id; seat.cup.visible = true;
    }
  } else if (c.seat) {
    freeSeat(c.seat); c.seat = null;
  }
  if (d.drink && !c._lastDrink) startDrink(c);
  c._lastDrink = d.drink ? 1 : 0;
  if (d.msg && d.msgAt && d.msgAt !== c._shownMsgAt) {
    c._shownMsgAt = d.msgAt;
    showBubble(c.id, d.msg);
  }
}
function listenChat() {
  const ref = fbDb.ref(`rooms/${ROOM}/chat`).limitToLast(60);
  ref.on('child_added', (snap) => {
    const d = snap.val();
    if (!d || myChatKeys.has(snap.key)) return;
    log(`<b>${escapeHtml(d.name || 'Khách')}:</b> ${escapeHtml(d.text || '')}`);
  });
}
function listenTv() {
  fbDb.ref(`rooms/${ROOM}/tv/current`).on('value', (snap) => {
    const d = snap.val();
    if (d && d.id) {
      sharedCurrentId = d.id;
      if (d.id !== state.videoId) setVideo(d.id);
    } else if (!d) {
      fbDb.ref(`rooms/${ROOM}/tv/current`).set({ id: DEFAULT_VIDEO, by: 'Quán', at: Date.now() });
    }
    renderQueue();
  });
  fbDb.ref(`rooms/${ROOM}/tv/queue`).on('value', (snap) => {
    const v = snap.val() || {};
    sharedQueue = Object.entries(v).map(([key, it]) => ({ key, ...it })).sort((a, b) => (a.at || 0) - (b.at || 0));
    renderQueue();
  });
}
function setSharedCurrent(id, by) {
  if (!fbReady) return;
  sharedCurrentId = id;
  fbDb.ref(`rooms/${ROOM}/tv/current`).set({ id, by: by || 'Khách', at: Date.now() });
}
function advanceSharedTv() {
  if (!fbReady) return;
  fbDb.ref(`rooms/${ROOM}/tv/queue`).once('value', (snap) => {
    const v = snap.val() || {};
    const items = Object.entries(v).map(([key, it]) => ({ key, ...it })).sort((a, b) => (a.at || 0) - (b.at || 0));
    if (items.length) {
      const first = items[0];
      fbDb.ref(`rooms/${ROOM}/tv/queue/${first.key}`).remove();
      setSharedCurrent(first.id, first.by);
    } else {
      setSharedCurrent(DEFAULT_VIDEO, 'Quán');
    }
  });
}

/* ============ SCENE ============ */
const container = $('scene-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x14102b);
scene.fog = new THREE.Fog(0x14102b, 45, 90);

const camera = new THREE.PerspectiveCamera(IS_MOBILE && IS_PORTRAIT ? 68 : 55, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, IS_MOBILE ? 12 : 15, IS_MOBILE ? 19 : 24);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(LOWFX ? 1 : Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = !LOWFX;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 2);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 5;
controls.maxDistance = 38;
controls.maxPolarAngle = 1.48;
controls.minAzimuthAngle = -1.35;
controls.maxAzimuthAngle = 1.35;
controls.update();

// Renderer CSS3D: chiếu video YouTube thật lên màn hình tivi trong game
const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(innerWidth, innerHeight);
cssRenderer.domElement.style.position = 'absolute';
cssRenderer.domElement.style.top = '0';
cssRenderer.domElement.style.left = '0';
cssRenderer.domElement.style.pointerEvents = 'none';
container.appendChild(cssRenderer.domElement);

scene.add(new THREE.HemisphereLight(0xcfd8ff, 0x3a2a1e, 0.85));
const sun = new THREE.DirectionalLight(0xffe7c2, 1.6);
sun.position.set(14, 22, 10);
sun.castShadow = !LOWFX;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -22; sun.shadow.camera.right = 22;
sun.shadow.camera.top = 22; sun.shadow.camera.bottom = -22;
scene.add(sun);
const warm1 = new THREE.PointLight(0xffb46b, 60, 30, 1.8); warm1.position.set(0, 5.5, -2); scene.add(warm1);
const warm2 = new THREE.PointLight(0x7dd3fc, 40, 26, 1.8); warm2.position.set(0, 5, 10); scene.add(warm2);
const warm3 = new THREE.PointLight(0xf472b6, 35, 24, 1.8); warm3.position.set(-13, 4.5, 0); scene.add(warm3);

/* ============ VẬT LIỆU DÙNG CHUNG ============ */
const MAT = {
  wood: new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.7 }),
  woodDark: new THREE.MeshStandardMaterial({ color: 0x5d3a1e, roughness: 0.75 }),
  black: new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5, metalness: 0.3 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.35, metalness: 0.7 }),
  wall: new THREE.MeshStandardMaterial({ color: 0x2d2350, roughness: 0.9 }),
  wallWarm: new THREE.MeshStandardMaterial({ color: 0x4a2c5a, roughness: 0.9 }),
  neonCyan: new THREE.MeshStandardMaterial({ color: 0x0e7490, emissive: 0x22d3ee, emissiveIntensity: 2.2 }),
  neonPink: new THREE.MeshStandardMaterial({ color: 0x9d174d, emissive: 0xf472b6, emissiveIntensity: 2.2 }),
  neonAmber: new THREE.MeshStandardMaterial({ color: 0x92400e, emissive: 0xfbbf24, emissiveIntensity: 2.0 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.9 }),
  leaf2: new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.9 }),
  pot: new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 }),
  counter: new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 }),
  counterTop: new THREE.MeshStandardMaterial({ color: 0xf5f5f4, roughness: 0.3 }),
  sofa: new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.85 }),
  sofa2: new THREE.MeshStandardMaterial({ color: 0xdb2777, roughness: 0.85 }),
  rug: new THREE.MeshStandardMaterial({ color: 0xbe185d, roughness: 1 }),
  rug2: new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 1 }),
  cupWhite: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }),
  coffee: new THREE.MeshStandardMaterial({ color: 0x3b2314, roughness: 0.2 }),
};
const GEO = {
  tableTop: new THREE.CylinderGeometry(0.62, 0.62, 0.06, 24),
  tableLeg: new THREE.CylinderGeometry(0.06, 0.06, 0.72, 12),
  tableBase: new THREE.CylinderGeometry(0.34, 0.38, 0.05, 20),
  chairSeat: new THREE.BoxGeometry(0.46, 0.08, 0.46),
  chairBack: new THREE.BoxGeometry(0.46, 0.55, 0.06),
  chairLeg: new THREE.BoxGeometry(0.06, 0.45, 0.06),
  cup: new THREE.CylinderGeometry(0.05, 0.04, 0.1, 12),
  pot: new THREE.CylinderGeometry(0.22, 0.16, 0.34, 12),
  bush: new THREE.SphereGeometry(0.42, 12, 10),
  lampShade: new THREE.ConeGeometry(0.3, 0.28, 16, 1, true),
  bulb: new THREE.SphereGeometry(0.09, 10, 8),
};
function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  return m;
}
function addMesh(mesh, parent = scene) { mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh; }

/* ============ SÀN + TƯỜNG (QUÁN 3D THẬT) ============ */
function plankTexture(base, line) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = line; g.lineWidth = 3;
  for (let y = 0; y <= 512; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = 'rgba(0,0,0,0.08)'; g.beginPath();
    const x = Math.random() * 512, y = Math.random() * 512;
    g.moveTo(x, y); g.lineTo(x + 40 + Math.random() * 60, y + (Math.random() - 0.5) * 8); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 5);
  return t;
}
const floor = new THREE.Mesh(new THREE.PlaneGeometry(34, 26), new THREE.MeshStandardMaterial({ map: plankTexture('#7d5a38', '#5d3a1e'), roughness: 0.8 }));
floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 3); floor.receiveShadow = true; scene.add(floor);
const terraceFloor = new THREE.Mesh(new THREE.PlaneGeometry(34, 9.5), new THREE.MeshStandardMaterial({ map: plankTexture('#6b7280', '#4b5563'), roughness: 0.95 }));
terraceFloor.rotation.x = -Math.PI / 2; terraceFloor.position.set(0, 0.01, 11.5); terraceFloor.receiveShadow = true; scene.add(terraceFloor);
// Tường sau + 2 tường bên (thấp, kiểu gaming)
const backWall = box(34, 7, 0.5, MAT.wall, 0, 3.5, -10); scene.add(backWall);
const leftWall = box(0.5, 7, 26, MAT.wallWarm, -17, 3.5, 3); scene.add(leftWall);
const rightWall = box(0.5, 7, 26, MAT.wallWarm, 17, 3.5, 3); scene.add(rightWall);
// Dải neon chạy dọc tường — phong cách gaming
function neonStrip(x, y, z, len, horizontal, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(horizontal ? len : 0.12, 0.12, horizontal ? 0.12 : len), mat);
  m.position.set(x, y, z); scene.add(m); return m;
}
neonStrip(0, 6.6, -9.7, 30, true, MAT.neonCyan);
neonStrip(-16.7, 6.6, 3, 24, false, MAT.neonPink);
neonStrip(16.7, 6.6, 3, 24, false, MAT.neonPink);
// Bảng hiệu neon (dời sang trái vì tivi đã to ra giữa tường)
function signTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = '#12081f'; g.fillRect(0, 0, 1024, 160);
  g.font = '900 84px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = '#22d3ee'; g.shadowBlur = 28; g.fillStyle = '#a5f3fc';
  g.fillText('☕ CAFÉ KẾT BẠN', 512, 82);
  return new THREE.CanvasTexture(c);
}
const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.4), new THREE.MeshBasicMaterial({ map: signTexture() }));
sign.position.set(-11.5, 5.6, -9.68); scene.add(sign);

/* ============ TIVI 3D (MÀN HÌNH LỚN TRÊN TƯỜNG) ============ */
const tvCanvas = document.createElement('canvas'); tvCanvas.width = 1024; tvCanvas.height = 576;
const tvCtx = tvCanvas.getContext('2d');
const tvTexture = new THREE.CanvasTexture(tvCanvas);
const tvScreen = new THREE.Mesh(
  new THREE.PlaneGeometry(12, 6.75),
  new THREE.MeshBasicMaterial({ map: tvTexture })
);
tvScreen.position.set(0, 3.4, -9.7); tvScreen.userData.isTV = true; scene.add(tvScreen);
const tvFrame = box(12.4, 7.15, 0.12, MAT.black, 0, 3.4, -9.78); scene.add(tvFrame);
tvScreen.position.z = -9.7; // nổi lên trước khung
function drawTV(t) {
  const g = tvCtx, W = 1024, H = 576;
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1e1b4b'); grad.addColorStop(1, '#0f0b1e');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  // sóng nhạc
  for (let i = 0; i < 48; i++) {
    const h = 40 + Math.abs(Math.sin(t * 2 + i * 0.7)) * 150 + Math.sin(t * 5 + i) * 20;
    g.fillStyle = i % 3 === 0 ? '#22d3ee' : (i % 3 === 1 ? '#f472b6' : '#a78bfa');
    g.fillRect(30 + i * 20, H - 90 - h, 12, h);
  }
  g.fillStyle = '#fff'; g.font = '900 64px Arial'; g.textAlign = 'center';
  g.fillText('▶  CAFÉ TV', W / 2, 150);
  g.font = '28px Arial'; g.fillStyle = '#c4b5fd';
  g.fillText('YouTube • ' + state.videoTitle, W / 2, 210);
  g.font = '24px Arial'; g.fillStyle = '#94a3b8';
  g.fillText('Dán link YouTube để thêm video vào hàng chờ', W / 2, 250);
  tvTexture.needsUpdate = true;
}

/* ---- Màn hình tivi 3D: iframe YouTube thật đặt đúng chỗ màn hình trong game ----
   Tivi luôn bật, không cho tắt. Không cho bấm tương tác vào tivi
   (pointer-events none): video chiếu chung cho cả quán, mỗi người chỉ
   chỉnh âm thanh của riêng mình. */
const DEFAULT_VIDEO = 'jfKfPfyJRdk';
const tv3dEl = document.createElement('div');
tv3dEl.style.width = '1200px';
tv3dEl.style.height = '675px';
tv3dEl.style.background = '#000';
const tv3dFrame = document.createElement('iframe');
tv3dFrame.style.width = '100%';
tv3dFrame.style.height = '100%';
tv3dFrame.style.border = 'none';
tv3dFrame.style.pointerEvents = 'none';
tv3dFrame.allow = 'autoplay; encrypted-media; picture-in-picture';
tv3dFrame.allowFullscreen = true;
tv3dEl.appendChild(tv3dFrame);
const tv3dObj = new CSS3DObject(tv3dEl);
tv3dObj.position.set(0, 3.4, -9.64);
tv3dObj.scale.set(0.01, 0.01, 0.01);
tv3dObj.visible = true; // tivi luôn bật
scene.add(tv3dObj);
function tv3dUrl() {
  return `https://www.youtube-nocookie.com/embed/${state.videoId}?autoplay=1&mute=1&enablejsapi=1&controls=0&disablekb=1&modestbranding=1&cc_load_policy=0&iv_load_policy=3`;
}
// Nạp video ngay từ đầu: nếu YouTube IFrame API bị chặn thì tivi vẫn chiếu
// bằng bản nhúng thường, không bị đen màn hình.
tv3dFrame.src = tv3dUrl();
function panelUrl(id) {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&disablekb=1&modestbranding=1&cc_load_policy=0&iv_load_policy=3`;
}

/* ---- YouTube IFrame API: phát theo hàng chờ + âm thanh riêng từng người ---- */
let ytPlayer = null, ytPlayerReady = false, loadedVideoId = null;
let ytPanelPlayer = null, ytPanelPlayerReady = false;
let myVolume = Math.min(100, Math.max(0, parseInt(localStorage.getItem('cafe3d_volume') || '60', 10) || 60));
let myMuted = localStorage.getItem('cafe3d_muted') === '1';
function loadYouTubeAPI() {
  if (window.YT && window.YT.Player) { onYouTubeIframeAPIReady(); return; }
  window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
  const s = document.createElement('script');
  s.src = 'https://www.youtube.com/iframe_api';
  s.onerror = () => console.warn('YouTube IFrame API bị chặn, dùng chế độ phát thường');
  document.head.appendChild(s);
}
function captionsOff(player) {
  // Ép tắt phụ đề hẳn (cc_load_policy=0 chỉ nghe theo tùy chọn tài khoản YouTube
  // của từng người nên có người vẫn thấy phụ đề tự bật)
  try { player.unloadModule('captions'); } catch (e) {}
}
function onYouTubeIframeAPIReady() {
  try {
    ytPlayer = new YT.Player(tv3dFrame, {
      videoId: state.videoId,
      playerVars: { autoplay: 1, mute: 1, controls: 0, disablekb: 1, modestbranding: 1, cc_load_policy: 0, iv_load_policy: 3, rel: 0 },
      events: {
        onReady: () => {
          ytPlayerReady = true;
          loadedVideoId = state.videoId;
          captionsOff(ytPlayer);
          applyVolume();
          setTimeout(syncVolumeUI, 500);
          ytPlayer.playVideo();
        },
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.ENDED) playNextInQueue();
          // Video bị tạm dừng ngoài ý muốn (vd: chuyển tab) thì phát lại
          else if (e.data === YT.PlayerState.PAUSED && !document.hidden) {
            setTimeout(() => { try { if (ytPlayerReady && ytPlayer.getPlayerState() === YT.PlayerState.PAUSED) ytPlayer.playVideo(); } catch (err) {} }, 500);
          }
        },
      },
    });
  } catch (err) { console.warn('Không khởi tạo được YouTube player', err); }
}
function createPanelPlayer() {
  if (ytPanelPlayer || !window.YT || !window.YT.Player) return;
  try {
    ytPanelPlayer = new YT.Player($('tv-frame'), {
      videoId: state.videoId,
      playerVars: { autoplay: 1, mute: 1, controls: 0, disablekb: 1, modestbranding: 1, cc_load_policy: 0, iv_load_policy: 3, rel: 0 },
      events: {
        onReady: () => { ytPanelPlayerReady = true; captionsOff(ytPanelPlayer); },
      },
    });
  } catch (err) { console.warn('Không khởi tạo được player xem trước', err); }
}
function loadIntoPlayer(player, id) {
  if (!player) return false;
  try {
    player.loadVideoById(id);
    setTimeout(() => captionsOff(player), 600);
    return true;
  } catch (e) { return false; }
}
function applyVolume() {
  updateSoundUI();
  if (!ytPlayerReady) return;
  if (myMuted) ytPlayer.mute();
  else { ytPlayer.unMute(); ytPlayer.setVolume(myVolume); }
  setTimeout(syncVolumeUI, 400);
}
function syncVolumeUI() {
  // Đồng bộ thanh trượt theo trạng thái THẬT của player: trình duyệt có thể chặn
  // bật tiếng khi chưa có thao tác của người dùng, lúc đó thanh trượt không được
  // hiển thị sai là đang có tiếng.
  if (!ytPlayerReady) return;
  try {
    myMuted = ytPlayer.isMuted();
    if (!myMuted) myVolume = ytPlayer.getVolume();
    localStorage.setItem('cafe3d_volume', String(myVolume));
    localStorage.setItem('cafe3d_muted', myMuted ? '1' : '0');
    updateSoundUI();
  } catch (e) {}
}
function updateSoundUI() {
  const muted = myMuted || myVolume === 0;
  $('btn-sound').textContent = muted ? '🔇' : '🔊';
  $('tv-mute').textContent = muted ? '🔇' : '🔊';
  $('tv-volume').value = myVolume;
  $('tv-volume-label').textContent = myMuted ? 'Đã tắt tiếng (chỉ mình bạn)' : `Âm lượng của bạn: ${myVolume}%`;
}
function setMyVolume(v) {
  myVolume = Math.min(100, Math.max(0, Math.round(v)));
  myMuted = false;
  localStorage.setItem('cafe3d_volume', String(myVolume));
  localStorage.setItem('cafe3d_muted', '0');
  applyVolume();
}
function toggleMyMute() {
  myMuted = !myMuted;
  localStorage.setItem('cafe3d_muted', myMuted ? '1' : '0');
  applyVolume();
}
// Chuyển tab quay lại thì phát tiếp + bật lại tiếng theo mức của mình
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && ytPlayerReady) {
    ytPlayer.playVideo();
    applyVolume();
  }
});

/* ---- Hàng chờ video: hết video này thì tới video người sau ---- */
let tvQueue = []; // {id, by, title}
let tvQueueIndex = -1; // -1 = đang chiếu video mặc định của quán
const titleCache = new Map();
async function fetchTitle(id) {
  if (titleCache.has(id)) return titleCache.get(id);
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
    const j = await r.json();
    titleCache.set(id, j.title || id);
  } catch (e) { titleCache.set(id, id); }
  renderQueue();
  return titleCache.get(id);
}
function renderQueue() {
  const box = $('tv-queue');
  if (fbReady) {
    if (sharedCurrentId) fetchTitle(sharedCurrentId);
    let html = '<div class="q-title">🎵 Đang chiếu: ' + escapeHtml(titleCache.get(sharedCurrentId) || sharedCurrentId || 'Lofi của quán') + '</div>';
    if (!sharedQueue.length) {
      html += '<div style="color:rgba(255,255,255,.6)">Hàng chờ trống — dán link YouTube để thêm video, hết video này sẽ tới video sau.</div>';
    } else {
      sharedQueue.forEach((item, i) => {
        html += `<div class="queue-item" data-i="${i}">${i + 1}. ${escapeHtml(titleCache.get(item.id) || item.id)} <span class="q-by">• ${escapeHtml(item.by)}</span></div>`;
      });
    }
    box.innerHTML = html;
    box.querySelectorAll('.queue-item').forEach((el) => el.addEventListener('click', () => skipToQueue(parseInt(el.dataset.i, 10))));
    return;
  }
  const current = tvQueueIndex >= 0 ? tvQueue[tvQueueIndex] : null;
  let html = '<div class="q-title">🎵 Đang chiếu: ' + escapeHtml(current ? (titleCache.get(current.id) || current.id) : 'Lofi của quán') + '</div>';
  if (!tvQueue.length) {
    html += '<div style="color:rgba(255,255,255,.6)">Hàng chờ trống — dán link YouTube để thêm video, hết video này sẽ tới video sau.</div>';
  } else {
    tvQueue.forEach((item, i) => {
      html += `<div class="queue-item${i === tvQueueIndex ? ' playing' : ''}" data-i="${i}">${i === tvQueueIndex ? '▶ ' : (i + 1) + '. '}${escapeHtml(titleCache.get(item.id) || item.id)} <span class="q-by">• ${escapeHtml(item.by)}</span></div>`;
    });
  }
  box.innerHTML = html;
  box.querySelectorAll('.queue-item').forEach((el) => el.addEventListener('click', () => skipToQueue(parseInt(el.dataset.i, 10))));
}
function addToQueue(id, by) {
  by = by || 'Khách';
  if (fbReady) {
    fetchTitle(id);
    if (!sharedCurrentId || sharedCurrentId === DEFAULT_VIDEO) {
      setSharedCurrent(id, by);
      toast('Đang phát video của bạn 📺');
    } else {
      fbDb.ref(`rooms/${ROOM}/tv/queue`).push({ id, by, at: Date.now() });
      toast('Đã thêm vào hàng chờ, hết video này sẽ tới lượt bạn 📺');
    }
    return;
  }
  tvQueue.push({ id, by });
  fetchTitle(id);
  if (tvQueueIndex === -1) {
    tvQueueIndex = 0;
    setVideo(id);
    toast('Đang phát video của bạn 📺');
  } else {
    toast('Đã thêm vào hàng chờ, hết video này sẽ tới lượt bạn 📺');
  }
  renderQueue();
}
function playNextInQueue() {
  if (fbReady) {
    // Chỉ người đang chiếu đúng video vừa hết mới được chuyển bài (tránh chuyển 2 lần)
    if (sharedCurrentId && state.videoId === sharedCurrentId) advanceSharedTv();
    return;
  }
  if (tvQueueIndex >= 0 && tvQueueIndex < tvQueue.length - 1) {
    tvQueueIndex++;
    setVideo(tvQueue[tvQueueIndex].id);
  } else {
    tvQueue = [];
    tvQueueIndex = -1;
    setVideo(DEFAULT_VIDEO);
  }
  renderQueue();
}
function skipToQueue(i) {
  if (fbReady) {
    const item = sharedQueue[i];
    if (!item) return;
    const updates = {};
    for (let j = 0; j <= i; j++) updates[`rooms/${ROOM}/tv/queue/${sharedQueue[j].key}`] = null;
    fbDb.ref().update(updates);
    setSharedCurrent(item.id, item.by);
    return;
  }
  if (!tvQueue[i]) return;
  tvQueueIndex = i;
  setVideo(tvQueue[i].id);
  renderQueue();
}

/* ============ QUẦY + GHẾ BAR ============ */
const counter = box(3.2, 1.1, 6.5, MAT.counter, 14.6, 0.55, -5.5); scene.add(counter);
const counterTop = box(3.6, 0.08, 6.9, MAT.counterTop, 14.6, 1.14, -5.5); scene.add(counterTop);
for (let i = 0; i < 4; i++) {
  const sx = 12.6, sz = -8 + i * 1.7;
  const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.08, 16), MAT.black);
  stool.position.set(sx, 0.72, sz); addMesh(stool);
  const sleg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8), MAT.metal);
  sleg.position.set(sx, 0.36, sz); addMesh(sleg);
}
// Kệ ly + menu trên quầy
for (let i = 0; i < 6; i++) {
  const cup = new THREE.Mesh(GEO.cup, MAT.cupWhite);
  cup.scale.setScalar(1.6); cup.position.set(14.6, 1.26, -8 + i * 1); addMesh(cup);
}
const menuTexC = document.createElement('canvas'); menuTexC.width = 512; menuTexC.height = 256;
{
  const g = menuTexC.getContext('2d');
  g.fillStyle = '#1f2937'; g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#fbbf24'; g.font = '900 44px Arial'; g.textAlign = 'center';
  g.fillText('MENU', 256, 60);
  g.fillStyle = '#fff'; g.font = '30px Arial'; g.textAlign = 'left';
  g.fillText('☕ Cà phê sữa đá  25k', 40, 120);
  g.fillText('☕ Espresso        30k', 40, 165);
  g.fillText('🧋 Trà sữa         35k', 40, 210);
}
const menuBoard = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.7), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(menuTexC) }));
menuBoard.position.set(14.2, 3.6, -5.5); menuBoard.rotation.y = -Math.PI / 2; scene.add(menuBoard);

/* ============ BÀN + GHẾ — 25 BÀN × 4 GHẾ = 100 CHỖ ============ */
const clickable = []; // mesh -> seat / tv / char
function makeTable(tx, tz, zone) {
  const top = new THREE.Mesh(GEO.tableTop, MAT.wood); top.position.set(tx, 0.74, tz); addMesh(top);
  const leg = new THREE.Mesh(GEO.tableLeg, MAT.woodDark); leg.position.set(tx, 0.37, tz); addMesh(leg);
  const base = new THREE.Mesh(GEO.tableBase, MAT.black); base.position.set(tx, 0.03, tz); addMesh(base);
  // ly trang trí giữa bàn
  const cup = new THREE.Mesh(GEO.cup, MAT.cupWhite); cup.position.set(tx + 0.18, 0.82, tz - 0.1); addMesh(cup);
  for (let s = 0; s < 4; s++) {
    const a = s * Math.PI / 2 + Math.PI / 4;
    const sx = tx + Math.cos(a) * 1.0, sz = tz + Math.sin(a) * 1.0;
    const faceA = a + Math.PI; // quay mặt vào bàn
    const chair = new THREE.Group();
    const seat = new THREE.Mesh(GEO.chairSeat, MAT.woodDark); seat.position.y = 0.45; seat.castShadow = true; chair.add(seat);
    const back = new THREE.Mesh(GEO.chairBack, MAT.woodDark); back.position.set(0, 0.75, -0.21); back.castShadow = true; chair.add(back);
    [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]].forEach(([lx, lz]) => {
      const l = new THREE.Mesh(GEO.chairLeg, MAT.black); l.position.set(lx, 0.22, lz); chair.add(l);
    });
    chair.position.set(sx, 0, sz);
    chair.rotation.y = -faceA + Math.PI / 2;
    scene.add(chair);
    // ly cà phê hiện khi có người ngồi
    const tableCup = new THREE.Mesh(GEO.cup, MAT.cupWhite);
    tableCup.position.set(tx + Math.cos(a) * 0.38, 0.82, tz + Math.sin(a) * 0.38);
    tableCup.visible = false; scene.add(tableCup);
    const seatObj = { id: state.seats.length, table: { x: tx, z: tz }, zone, x: sx, z: sz, angle: -a - Math.PI / 2, occupiedBy: null, cup: tableCup, chair };
    state.seats.push(seatObj);
    chair.traverse((o) => { if (o.isMesh) { o.userData.seat = seatObj; clickable.push(o); } });
    top.userData.seat = seatObj; clickable.push(top);
  }
}
const HALL_X = [-8, -2.7, 2.7, 8], HALL_Z = [-5, -1, 3];
HALL_X.forEach((x) => HALL_Z.forEach((z) => makeTable(x, z, 'hall')));
const TERR_Z = [8.5, 12.5];
HALL_X.forEach((x) => TERR_Z.forEach((z) => makeTable(x, z, 'terrace')));
[[-13, -4], [-13, 4], [13, -4], [13, 0], [13, 4]].forEach(([x, z]) => makeTable(x, z, 'lounge'));
// Thảm lounge
[[-13, -4], [-13, 4], [13, -4], [13, 0], [13, 4]].forEach(([x, z], i) => {
  const rug = new THREE.Mesh(new THREE.CircleGeometry(2.1, 24), i % 2 ? MAT.rug2 : MAT.rug);
  rug.rotation.x = -Math.PI / 2; rug.position.set(x, 0.02, z); rug.receiveShadow = true; scene.add(rug);
});
// Sofa lounge
[[-15.2, -1.5], [-15.2, 1.5], [15.2, -1.5]].forEach(([x, z]) => {
  const sofa = new THREE.Group();
  sofa.add(box(0.9, 0.45, 2.4, MAT.sofa, 0, 0.22, 0));
  sofa.add(box(0.9, 0.7, 0.35, MAT.sofa, 0, 0.7, -1.05));
  sofa.position.set(x, 0, z); sofa.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
  scene.add(sofa);
});

/* ============ CÂY + ĐÈN TREO + DÂY ĐÈN ============ */
function makePlant(x, z, s = 1) {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(GEO.pot, MAT.pot); pot.position.y = 0.17; pot.scale.setScalar(s); addMesh(pot, g);
  [[0, 0.75, 0, 1], [0.25, 0.6, 0.1, 0.7], [-0.22, 0.62, -0.08, 0.75]].forEach(([bx, by, bz, bs], i) => {
    const b = new THREE.Mesh(GEO.bush, i % 2 ? MAT.leaf2 : MAT.leaf);
    b.position.set(bx * s, by * s, bz * s); b.scale.setScalar(bs * s); addMesh(b, g);
  });
  g.position.set(x, 0, z); scene.add(g);
}
[[-16, -8.5], [16, -8.5], [-16, 6], [16, 6], [-16, 14.5], [16, 14.5], [-10, 14.8], [10, 14.8]].forEach(([x, z]) => makePlant(x, z));
HALL_X.forEach((x) => HALL_Z.forEach((z) => {
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.2, 6), MAT.black);
  cord.position.set(x, 5.9, z); scene.add(cord);
  const shade = new THREE.Mesh(GEO.lampShade, new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.7, side: THREE.DoubleSide }));
  shade.position.set(x, 4.75, z); addMesh(shade);
  const bulb = new THREE.Mesh(GEO.bulb, new THREE.MeshStandardMaterial({ color: 0xfff7cc, emissive: 0xffdf80, emissiveIntensity: 3 }));
  bulb.position.set(x, 4.62, z); scene.add(bulb);
}));
// Dây đèn sân vườn
function stringLights(z, y) {
  const pts = [];
  for (let x = -15; x <= 15; x += 1.5) pts.push(new THREE.Vector3(x, y - Math.sin((x + 15) / 30 * Math.PI) * 0.5, z));
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x444444 }));
  scene.add(line);
  pts.forEach((p, i) => {
    if (i % 2) return;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshStandardMaterial({ color: 0xfff7cc, emissive: 0xffd166, emissiveIntensity: 3 }));
    b.position.copy(p); b.position.y -= 0.1; scene.add(b);
  });
}
stringLights(9.5, 5.2); stringLights(13.5, 5.2);

/* ============ NHÂN VẬT 3D (LOW-POLY, CÓ KHỚP TAY CHÂN) ============ */
const SHARED_GEO = {
  body: new THREE.CapsuleGeometry(0.19, 0.34, 4, 14),
  head: new THREE.SphereGeometry(0.26, 24, 18),
  eye: new THREE.SphereGeometry(0.04, 10, 8),
  blush: new THREE.SphereGeometry(0.048, 10, 8),
  ear: new THREE.SphereGeometry(0.055, 10, 8),
  smile: new THREE.TorusGeometry(0.048, 0.012, 8, 16, Math.PI),
  thigh: new THREE.CylinderGeometry(0.075, 0.06, 0.38, 10),
  shin: new THREE.CylinderGeometry(0.06, 0.05, 0.36, 10),
  upperArm: new THREE.CylinderGeometry(0.055, 0.045, 0.26, 10),
  foreArm: new THREE.CylinderGeometry(0.045, 0.04, 0.24, 10),
  cup: new THREE.CylinderGeometry(0.045, 0.038, 0.09, 12),
  coffeeTop: new THREE.CylinderGeometry(0.04, 0.04, 0.01, 12),
  hairCone: new THREE.ConeGeometry(0.07, 0.2, 8),
  skirt: new THREE.CylinderGeometry(0.23, 0.38, 0.34, 20),
  waistband: new THREE.TorusGeometry(0.23, 0.02, 8, 20),
  shoe: new THREE.BoxGeometry(0.14, 0.1, 0.28),
  sole: new THREE.BoxGeometry(0.15, 0.05, 0.29),
  capTop: new THREE.SphereGeometry(0.27, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
  capBrim: new THREE.BoxGeometry(0.34, 0.025, 0.2),
  capBtn: new THREE.SphereGeometry(0.04, 8, 6),
  capLogo: new THREE.BoxGeometry(0.1, 0.06, 0.02),
  beret: new THREE.SphereGeometry(0.26, 20, 12),
  beretStem: new THREE.CylinderGeometry(0.015, 0.015, 0.06, 6),
  hood: new THREE.SphereGeometry(0.2, 16, 12),
  pocket: new THREE.BoxGeometry(0.2, 0.13, 0.05),
  cargoPocket: new THREE.BoxGeometry(0.13, 0.14, 0.04),
  bowWing: new THREE.BoxGeometry(0.16, 0.12, 0.04),
  bowKnot: new THREE.SphereGeometry(0.05, 10, 8),
  bang: new THREE.SphereGeometry(0.27, 20, 12),
  hairBack: new THREE.CapsuleGeometry(0.16, 0.3, 4, 12),
  hairLock: new THREE.CylinderGeometry(0.05, 0.04, 0.3, 8),
  collar: new THREE.TorusGeometry(0.2, 0.028, 8, 20),
  sock: new THREE.CylinderGeometry(0.058, 0.052, 0.24, 10),
  strap: new THREE.BoxGeometry(0.13, 0.02, 0.04),
  bag: new THREE.BoxGeometry(0.14, 0.16, 0.05),
  bagStrap: new THREE.BoxGeometry(0.03, 0.6, 0.02),
  hairShort: new THREE.SphereGeometry(0.27, 20, 12),
  curl: new THREE.SphereGeometry(0.1, 10, 8),
  bobSide: new THREE.BoxGeometry(0.09, 0.28, 0.12),
  tail: new THREE.CylinderGeometry(0.06, 0.04, 0.4, 8),
  tailTie: new THREE.SphereGeometry(0.07, 10, 8),
  bun: new THREE.SphereGeometry(0.1, 12, 10),
  beanieDome: new THREE.SphereGeometry(0.27, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
  beanieBrim: new THREE.CylinderGeometry(0.27, 0.27, 0.07, 20),
  pom: new THREE.SphereGeometry(0.06, 10, 8),
  sunBrim: new THREE.CylinderGeometry(0.4, 0.4, 0.02, 20),
  sunDome: new THREE.SphereGeometry(0.22, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
  sunBand: new THREE.TorusGeometry(0.22, 0.025, 8, 20),
  headband: new THREE.TorusGeometry(0.26, 0.03, 8, 20),
  chestPocket: new THREE.BoxGeometry(0.09, 0.1, 0.02),
  zipper: new THREE.BoxGeometry(0.02, 0.42, 0.015),
  stripe: new THREE.BoxGeometry(0.32, 0.06, 0.02),
  turtle: new THREE.CylinderGeometry(0.13, 0.15, 0.1, 16),
  dress: new THREE.CylinderGeometry(0.2, 0.42, 0.7, 20),
  dressBelt: new THREE.TorusGeometry(0.24, 0.02, 8, 20),
  belt: new THREE.TorusGeometry(0.2, 0.02, 8, 20),
  buckle: new THREE.BoxGeometry(0.05, 0.03, 0.02),
  shortsLeg: new THREE.CylinderGeometry(0.09, 0.085, 0.2, 10),
  boot: new THREE.BoxGeometry(0.14, 0.12, 0.28),
  bootShaft: new THREE.CylinderGeometry(0.062, 0.06, 0.2, 10),
  sandalSole: new THREE.BoxGeometry(0.14, 0.03, 0.28),
  sandalStrap: new THREE.BoxGeometry(0.13, 0.015, 0.05),
};
SHARED_GEO.thigh.translate(0, -0.19, 0);
SHARED_GEO.shin.translate(0, -0.18, 0);
SHARED_GEO.upperArm.translate(0, -0.13, 0);
SHARED_GEO.foreArm.translate(0, -0.12, 0);

/* ---- Trang phục + phụ kiện: mỗi loại món đồ là 1 hàm dựng riêng,
   buildOutfit chỉ việc tra bảng OUTFITS rồi gọi đúng hàm theo type ---- */
function buildOutfit(spec, outfit, P, M) {
  const add = (parent, mesh, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz); mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true; parent.add(mesh); return mesh;
  };
  const mat = (c, r = 0.7) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const white = mat(0xffffff, 0.6);
  /* Tóc */
  if (outfit.hair?.type === 'spiky') {
    [[-0.23, 0.0, -0.12], [0.23, 0.0, -0.12], [0, -0.02, -0.24]].forEach(([x, y, z]) =>
      add(P.head, new THREE.Mesh(SHARED_GEO.hairCone, M.hairMat), x, y, z, x * 1.2, 0, x * -1.2));
  } else if (outfit.hair?.type === 'short') {
    add(P.head, new THREE.Mesh(SHARED_GEO.hairShort, M.hairMat), 0, 0.1, -0.02, 0, 0, 0, 1, 0.5, 1);
  } else if (outfit.hair?.type === 'curly') {
    [[0, 0.2, 0], [-0.13, 0.14, 0.06], [0.13, 0.14, 0.06], [-0.07, 0.16, -0.12], [0.08, 0.15, -0.12]].forEach(([x, y, z]) =>
      add(P.head, new THREE.Mesh(SHARED_GEO.curl, M.hairMat), x, y, z));
  } else if (outfit.hair?.type === 'bob') {
    add(P.head, new THREE.Mesh(SHARED_GEO.hairShort, M.hairMat), 0, 0.08, -0.02, 0, 0, 0, 1, 0.7, 1);
    [-0.2, 0.2].forEach((x) =>
      add(P.head, new THREE.Mesh(SHARED_GEO.bobSide, M.hairMat), x, -0.08, 0.05));
  } else if (outfit.hair?.type === 'ponytail') {
    add(P.head, new THREE.Mesh(SHARED_GEO.hairShort, M.hairMat), 0, 0.1, -0.02, 0, 0, 0, 1, 0.6, 1);
    add(P.head, new THREE.Mesh(SHARED_GEO.tail, M.hairMat), 0, -0.15, -0.28, 0.5, 0, 0);
    add(P.head, new THREE.Mesh(SHARED_GEO.tailTie, mat(0xec4899)), 0, 0.05, -0.27);
  } else if (outfit.hair?.type === 'bun') {
    add(P.head, new THREE.Mesh(SHARED_GEO.hairShort, M.hairMat), 0, 0.1, -0.02, 0, 0, 0, 1, 0.6, 1);
    add(P.head, new THREE.Mesh(SHARED_GEO.bun, M.hairMat), 0, 0.28, -0.05);
  } else if (outfit.hair?.type === 'long') {
    add(P.head, new THREE.Mesh(SHARED_GEO.bang, M.hairMat), 0, 0.12, -0.03, 0, 0, 0, 1, 0.5, 1);
    add(P.head, new THREE.Mesh(SHARED_GEO.hairBack, M.hairMat), 0, -0.24, -0.2, 0, 0, 0, 1, 1, 0.5);
    [-0.24, 0.24].forEach((x) =>
      add(P.head, new THREE.Mesh(SHARED_GEO.hairLock, M.hairMat), x, -0.16, 0.08));
    if (outfit.hair.bow) {
      const bowM = mat(outfit.hair.bow);
      add(P.head, new THREE.Mesh(SHARED_GEO.bowWing, bowM), 0.1, 0.18, 0.11, 0, 0, 0.5);
      add(P.head, new THREE.Mesh(SHARED_GEO.bowWing, bowM), 0.24, 0.18, 0.09, 0, 0, -0.5);
      add(P.head, new THREE.Mesh(SHARED_GEO.bowKnot, bowM), 0.17, 0.18, 0.11);
    }
  }
  /* Nón */
  if (outfit.hat?.type === 'snapback') {
    add(P.head, new THREE.Mesh(SHARED_GEO.capTop, mat(outfit.hat.main)), 0, 0.1, -0.01, 0, 0, 0, 1, 0.55, 1);
    add(P.head, new THREE.Mesh(SHARED_GEO.capBrim, mat(outfit.hat.brim)), 0, 0.08, 0.27, 0.1, 0, 0);
    add(P.head, new THREE.Mesh(SHARED_GEO.capBtn, mat(outfit.hat.main)), 0, 0.25, 0);
    add(P.head, new THREE.Mesh(SHARED_GEO.capLogo, mat(outfit.hat.logo)), 0, 0.14, 0.25);
  } else if (outfit.hat?.type === 'beret') {
    add(P.head, new THREE.Mesh(SHARED_GEO.beret, mat(outfit.hat.main)), 0.08, 0.2, 0, 0, 0, -0.25, 1, 0.35, 1);
    add(P.head, new THREE.Mesh(SHARED_GEO.beretStem, mat(outfit.hat.main)), 0.14, 0.3, 0, 0, 0, -0.25);
  } else if (outfit.hat?.type === 'beanie') {
    add(P.head, new THREE.Mesh(SHARED_GEO.beanieDome, mat(outfit.hat.main)), 0, 0.12, 0, 0, 0, 0, 1, 0.6, 1);
    add(P.head, new THREE.Mesh(SHARED_GEO.beanieBrim, mat(outfit.hat.main)), 0, 0.08, 0);
    add(P.head, new THREE.Mesh(SHARED_GEO.pom, mat(outfit.hat.pom)), 0, 0.3, 0);
  } else if (outfit.hat?.type === 'sunhat') {
    add(P.head, new THREE.Mesh(SHARED_GEO.sunBrim, mat(outfit.hat.main)), 0, 0.14, 0);
    add(P.head, new THREE.Mesh(SHARED_GEO.sunDome, mat(outfit.hat.main)), 0, 0.14, 0, 0, 0, 0, 1, 0.7, 1);
    add(P.head, new THREE.Mesh(SHARED_GEO.sunBand, mat(outfit.hat.band)), 0, 0.16, 0, Math.PI / 2, 0, 0);
  } else if (outfit.hat?.type === 'headband') {
    add(P.head, new THREE.Mesh(SHARED_GEO.headband, mat(outfit.hat.main)), 0, 0.1, 0, 0.25, 0, 0);
  }
  /* Áo */
  if (outfit.top?.type === 'hoodie') {
    add(P.rig, new THREE.Mesh(SHARED_GEO.hood, M.shirt), 0, 1.28, -0.15, 0, 0, 0, 1, 0.6, 0.7);
    add(P.rig, new THREE.Mesh(SHARED_GEO.pocket, mat(outfit.top.pocket)), 0, 0.88, 0.18);
  } else if (outfit.top?.type === 'blouse') {
    add(P.rig, new THREE.Mesh(SHARED_GEO.collar, white), 0, 1.24, 0, Math.PI / 2, 0, 0);
  } else if (outfit.top?.type === 'denim') {
    add(P.rig, new THREE.Mesh(SHARED_GEO.collar, mat(outfit.top.pocket)), 0, 1.24, 0, Math.PI / 2, 0, 0);
    [-0.09, 0.09].forEach((x) =>
      add(P.rig, new THREE.Mesh(SHARED_GEO.chestPocket, mat(outfit.top.pocket)), x, 1.15, 0.185));
    add(P.rig, new THREE.Mesh(SHARED_GEO.zipper, mat(outfit.top.pocket)), 0, 1.05, 0.19);
  } else if (outfit.top?.type === 'sport') {
    add(P.rig, new THREE.Mesh(SHARED_GEO.stripe, mat(outfit.top.stripe)), 0, 1.15, 0.185);
    add(P.rig, new THREE.Mesh(SHARED_GEO.collar, white), 0, 1.24, 0, Math.PI / 2, 0, 0);
  } else if (outfit.top?.type === 'sweater') {
    add(P.rig, new THREE.Mesh(SHARED_GEO.turtle, M.shirt), 0, 1.34, 0);
  } else if (outfit.top?.type === 'dress') {
    add(P.rig, new THREE.Mesh(SHARED_GEO.dress, M.shirt), 0, 0.85, 0);
    add(P.rig, new THREE.Mesh(SHARED_GEO.dressBelt, mat(outfit.top.belt)), 0, 1.0, 0, Math.PI / 2, 0, 0);
  }
  /* Quần / váy */
  if (outfit.bottom?.type === 'cargo') {
    [P.legL, P.legR].forEach((leg) =>
      add(leg.thigh, new THREE.Mesh(SHARED_GEO.cargoPocket, mat(outfit.bottom.pocket)), 0.02, -0.12, 0.07));
  } else if (outfit.bottom?.type === 'skirt') {
    add(P.rig, new THREE.Mesh(SHARED_GEO.skirt, mat(outfit.bottom.main, 0.8)), 0, 0.62, 0);
    add(P.rig, new THREE.Mesh(SHARED_GEO.waistband, mat(outfit.bottom.band)), 0, 0.79, 0, Math.PI / 2, 0, 0);
  } else if (outfit.bottom?.type === 'jeans') {
    add(P.rig, new THREE.Mesh(SHARED_GEO.belt, mat(0x111827)), 0, 0.85, 0, Math.PI / 2, 0, 0);
    add(P.rig, new THREE.Mesh(SHARED_GEO.buckle, mat(0xfacc15)), 0, 0.85, 0.2);
  } else if (outfit.bottom?.type === 'shorts') {
    [P.legL, P.legR].forEach((leg) =>
      add(leg.thigh, new THREE.Mesh(SHARED_GEO.shortsLeg, mat(outfit.bottom.main, 0.85)), 0, -0.08, 0));
  }
  /* Túi xách */
  if (outfit.bag?.type === 'crossbody') {
    const bagM = mat(outfit.bag.main);
    add(P.rig, new THREE.Mesh(SHARED_GEO.bagStrap, bagM), 0, 1.02, 0.2, 0, 0, -0.83);
    add(P.rig, new THREE.Mesh(SHARED_GEO.bag, bagM), 0.22, 0.82, 0.1, 0, 0, -0.15);
  }
  /* Giày */
  [P.legL, P.legR].forEach((leg) => {
    if (outfit.shoes?.type === 'sneakers') {
      add(leg.shin, new THREE.Mesh(SHARED_GEO.shoe, mat(outfit.shoes.main, 0.5)), 0, -0.34, 0.05);
      add(leg.shin, new THREE.Mesh(SHARED_GEO.sole, mat(outfit.shoes.sole)), 0, -0.375, 0.05);
    } else if (outfit.shoes?.type === 'maryjane') {
      add(leg.shin, new THREE.Mesh(SHARED_GEO.sock, white), 0, -0.2, 0);
      add(leg.shin, new THREE.Mesh(SHARED_GEO.shoe, mat(outfit.shoes.main, 0.5)), 0, -0.34, 0.05);
      add(leg.shin, new THREE.Mesh(SHARED_GEO.strap, mat(outfit.shoes.main)), 0, -0.3, 0.05);
    } else if (outfit.shoes?.type === 'boots') {
      add(leg.shin, new THREE.Mesh(SHARED_GEO.bootShaft, mat(outfit.shoes.main, 0.6)), 0, -0.24, 0);
      add(leg.shin, new THREE.Mesh(SHARED_GEO.boot, mat(outfit.shoes.main, 0.5)), 0, -0.33, 0.05);
      add(leg.shin, new THREE.Mesh(SHARED_GEO.sole, mat(outfit.shoes.sole)), 0, -0.375, 0.05);
    } else if (outfit.shoes?.type === 'sandals') {
      add(leg.shin, new THREE.Mesh(SHARED_GEO.sandalSole, mat(outfit.shoes.main, 0.6)), 0, -0.37, 0.05);
      add(leg.shin, new THREE.Mesh(SHARED_GEO.sandalStrap, mat(outfit.shoes.main)), 0, -0.33, 0.1);
    }
  });
}

function buildCharacter(spec) {
  const outfit = OUTFITS[spec.outfit]?.[spec.outfitId] || Object.values(OUTFITS[spec.outfit])[0];
  const skin = new THREE.MeshStandardMaterial({ color: spec.skin, roughness: 0.65 });
  const shirt = new THREE.MeshStandardMaterial({ color: outfit.top.main, roughness: 0.8 });
  // Váy, váy liền và quần đùi để chân trần nên chân dùng màu da
  const legsSkin = ['skirt', 'dress', 'shorts'].includes(outfit.bottom.type);
  const pants = new THREE.MeshStandardMaterial({ color: legsSkin ? spec.skin : outfit.bottom.main, roughness: 0.85 });
  const hairMat = new THREE.MeshStandardMaterial({ color: spec.hair, roughness: 0.85 });
  const group = new THREE.Group();
  const rig = new THREE.Group(); group.add(rig);
  // Chân dài hơn (đùi + cẳng) — nhân vật cao ~1,7
  function makeLeg(side) {
    const thigh = new THREE.Group(); thigh.position.set(0.095 * side, 0.78, 0); rig.add(thigh);
    const tm = new THREE.Mesh(SHARED_GEO.thigh, pants); tm.castShadow = true; thigh.add(tm);
    const shin = new THREE.Group(); shin.position.set(0, -0.38, 0); thigh.add(shin);
    const sm = new THREE.Mesh(SHARED_GEO.shin, pants); sm.castShadow = true; shin.add(sm);
    return { thigh, shin };
  }
  const legL = makeLeg(-1), legR = makeLeg(1);
  // Thân thon hơn
  const body = new THREE.Mesh(SHARED_GEO.body, shirt); body.position.y = 1.02; body.castShadow = true; rig.add(body);
  // Tay dài hơn, tay phải cầm ly
  function makeArm(side) {
    const upper = new THREE.Group(); upper.position.set(0.25 * side, 1.18, 0); rig.add(upper);
    const um = new THREE.Mesh(SHARED_GEO.upperArm, shirt); um.castShadow = true; upper.add(um);
    const fore = new THREE.Group(); fore.position.set(0, -0.26, 0); upper.add(fore);
    const fm = new THREE.Mesh(SHARED_GEO.foreArm, skin); fm.castShadow = true; fore.add(fm);
    return { upper, fore };
  }
  const armL = makeArm(-1), armR = makeArm(1);
  const cupG = new THREE.Group(); cupG.position.set(0, -0.26, 0.04);
  const cupM = new THREE.Mesh(SHARED_GEO.cup, MAT.cupWhite); cupM.castShadow = true; cupG.add(cupM);
  const cof = new THREE.Mesh(SHARED_GEO.coffeeTop, MAT.coffee); cof.position.y = 0.04; cupG.add(cof);
  armR.fore.add(cupG);
  // Đầu to kiểu chibi: mắt to, má hồng, miệng cười, tai
  const head = new THREE.Group(); head.position.y = 1.42; rig.add(head);
  const headM = new THREE.Mesh(SHARED_GEO.head, skin); headM.castShadow = true; head.add(headM);
  const eyeM = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.3 });
  [-0.095, 0.095].forEach((x) => {
    const e = new THREE.Mesh(SHARED_GEO.eye, eyeM); e.position.set(x, 0.04, 0.23); head.add(e);
  });
  const blushM = new THREE.MeshStandardMaterial({ color: 0xfda4af, roughness: 0.9 });
  [-0.16, 0.16].forEach((x) => {
    const b = new THREE.Mesh(SHARED_GEO.blush, blushM);
    b.position.set(x, -0.04, 0.2); b.scale.set(1, 0.7, 0.4); head.add(b);
  });
  [-0.25, 0.25].forEach((x) => {
    const ear = new THREE.Mesh(SHARED_GEO.ear, skin); ear.position.set(x, 0.02, 0); head.add(ear);
  });
  const smile = new THREE.Mesh(SHARED_GEO.smile, eyeM);
  smile.position.set(0, -0.08, 0.24); smile.rotation.set(0.15, 0, Math.PI); head.add(smile);
  // Trang phục + phụ kiện theo bảng OUTFITS
  buildOutfit(spec, outfit, { rig, head, legL, legR, body }, { skin, shirt, pants, hairMat });
  // Bóng dưới chân
  const shadowDisc = new THREE.Mesh(new THREE.CircleGeometry(0.36, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }));
  shadowDisc.rotation.x = -Math.PI / 2; shadowDisc.position.y = 0.01; group.add(shadowDisc);
  return { group, rig, parts: { body, head, legL, legR, armL, armR, cupG } };
}

function spawnCharacter(id, name, spec, opts = {}) {
  const built = buildCharacter(spec);
  const c = {
    id, name, spec, ...built,
    mode: 'idle', path: [], pendingSeat: null, seat: null,
    speed: 2.3 + Math.random() * 0.5, walkPhase: Math.random() * 10,
    drink: 0, drinkTimer: 0, bubbleUntil: 0, bubbleEl: null,
    isRemote: false, tx: null, tz: null, trotY: null, _lastMsg: null, _shownMsgAt: 0, _lastDrink: 0,
    pose: { thighL: 0, thighR: 0, shinL: 0, shinR: 0, shL: 0, shR: 0, foreL: 0, foreR: 0, rigY: 0, headX: 0, headY: 0 },
    poseTarget: { thighL: 0, thighR: 0, shinL: 0.08, shinR: 0.08, shL: 0.06, shR: 0.06, foreL: -0.1, foreR: -0.1, rigY: 0, headX: 0, headY: 0 },
  };
  c.group.position.set(opts.x ?? 0, 0, opts.z ?? 15.5);
  c.group.rotation.y = opts.rotY ?? Math.PI;
  scene.add(c.group);
  c.group.traverse((o) => { if (o.isMesh) { o.userData.charId = id; clickable.push(o); } });
  state.players.set(id, c);
  if (opts.seat) sitDown(c, opts.seat, true);
  updateOnlineCount();
  return c;
}
function updateOnlineCount() {
  $('online-count').textContent = `${state.players.size}/100 đang trong quán`;
}
function freeSeat(seat) {
  if (!seat) return;
  seat.occupiedBy = null; seat.cup.visible = false;
}
function sitDown(c, seat, instant = false) {
  if (c.seat) freeSeat(c.seat);
  c.seat = seat; seat.occupiedBy = c.id; seat.cup.visible = true;
  c.mode = 'sit'; c.path = []; c.pendingSeat = null;
  c.group.position.set(seat.x, 0, seat.z);
  c.group.rotation.y = seat.angle;
  if (instant) {
    c.pose = { ...c.poseTarget, thighL: -1.5, thighR: -1.5, shinL: 1.45, shinR: 1.45, rigY: -0.33, shL: -0.25, shR: -0.25 };
  }
  if (c.id === 'me') publishMe(true);
}
function walkTo(c, x, z, seat = null) {
  if (c.seat) { freeSeat(c.seat); c.seat = null; }
  if (seat) seat.occupiedBy = c.id; // giữ chỗ
  c.pendingSeat = seat;
  const cur = c.group.position;
  // Đi theo lối đi giữa các hàng bàn để không xuyên bàn (lệch nhẹ mỗi người để không dồn cục)
  const rowZ = seat ? seat.table.z + 2.1 + (Math.random() - 0.5) * 0.9 : z;
  const pts = [];
  if (Math.abs(cur.z - rowZ) > 0.6) pts.push({ x: cur.x, z: rowZ });
  if (Math.abs((pts.length ? pts[0].x : cur.x) - x) > 0.4) pts.push({ x, z: rowZ });
  pts.push({ x, z });
  c.path = pts; c.mode = 'walk';
  if (c.id === 'me') { if (seat) mySeatAt = Date.now(); publishMe(true); }
}
function freeSeatNear(zone) {
  const list = state.seats.filter((s) => !s.occupiedBy && (!zone || s.zone === zone));
  return list.length ? list[Math.floor(Math.random() * list.length)] : null;
}

/* ---- Hoạt ảnh từng khung hình ---- */
const _v = new THREE.Vector3();
function updateCharacter(c, dt, t) {
  const p = c.pose, pt = c.poseTarget;
  // Người thật khác: trượt mượt tới vị trí họ gửi lên Firebase
  if (c.isRemote) {
    const dx = (c.tx ?? c.group.position.x) - c.group.position.x;
    const dz = (c.tz ?? c.group.position.z) - c.group.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.12) {
      const step = Math.min(dist, c.speed * dt * 1.6);
      c.group.position.x += (dx / dist) * step;
      c.group.position.z += (dz / dist) * step;
      const targetRot = Math.atan2(dx, dz);
      let dr = targetRot - c.group.rotation.y;
      while (dr > Math.PI) dr -= Math.PI * 2;
      while (dr < -Math.PI) dr += Math.PI * 2;
      c.group.rotation.y += dr * Math.min(1, dt * 8);
      c.walkPhase += dt * 9;
      const s = Math.sin(c.walkPhase);
      pt.thighL = s * 0.55; pt.thighR = -s * 0.55;
      pt.shinL = 0.25 + Math.max(0, -s) * 0.5; pt.shinR = 0.25 + Math.max(0, s) * 0.5;
      pt.shL = -s * 0.45; pt.shR = s * 0.45;
      pt.foreL = -0.15; pt.foreR = -0.15;
      pt.rigY = Math.abs(Math.cos(c.walkPhase)) * 0.045;
      pt.headX = 0; pt.headY = 0;
    } else if (c.seat) {
      pt.thighL = -1.5; pt.thighR = -1.5; pt.shinL = 1.45; pt.shinR = 1.45;
      pt.shL = -0.25; pt.shR = -0.25; pt.foreL = -0.25; pt.foreR = -0.25;
      pt.rigY = -0.33 + Math.sin(t * 1.8 + c.walkPhase) * 0.008;
      pt.headY = Math.sin(t * 0.4 + c.walkPhase) * 0.25;
      pt.headX = 0;
      let dr = c.seat.angle - c.group.rotation.y;
      while (dr > Math.PI) dr -= Math.PI * 2;
      while (dr < -Math.PI) dr += Math.PI * 2;
      c.group.rotation.y += dr * Math.min(1, dt * 6);
    } else {
      pt.thighL = 0; pt.thighR = 0; pt.shinL = 0.06; pt.shinR = 0.06;
      pt.shL = 0.06; pt.shR = 0.06; pt.foreL = -0.1; pt.foreR = -0.1;
      pt.rigY = Math.sin(t * 2 + c.walkPhase) * 0.012;
      pt.headY = Math.sin(t * 0.35 + c.walkPhase) * 0.3;
      pt.headX = 0;
      if (c.trotY !== null && c.trotY !== undefined) {
        let dr = c.trotY - c.group.rotation.y;
        while (dr > Math.PI) dr -= Math.PI * 2;
        while (dr < -Math.PI) dr += Math.PI * 2;
        c.group.rotation.y += dr * Math.min(1, dt * 6);
      }
    }
  } else if (c.mode === 'walk' && c.path.length) {
    // Di chuyển theo đường đi
    const target = c.path[0];
    const dx = target.x - c.group.position.x, dz = target.z - c.group.position.z;
    const dist = Math.hypot(dx, dz);
    const step = c.speed * dt;
    const targetRot = Math.atan2(dx, dz);
    let dr = targetRot - c.group.rotation.y;
    while (dr > Math.PI) dr -= Math.PI * 2;
    while (dr < -Math.PI) dr += Math.PI * 2;
    c.group.rotation.y += dr * Math.min(1, dt * 8);
    if (dist <= step) {
      c.group.position.x = target.x; c.group.position.z = target.z;
      c.path.shift();
      if (!c.path.length) {
        if (c.pendingSeat) { sitDown(c, c.pendingSeat); }
        else { c.mode = 'idle'; }
      }
    } else {
      c.group.position.x += (dx / dist) * step;
      c.group.position.z += (dz / dist) * step;
    }
    c.walkPhase += dt * 9;
    const s = Math.sin(c.walkPhase);
    pt.thighL = s * 0.55; pt.thighR = -s * 0.55;
    pt.shinL = 0.25 + Math.max(0, -s) * 0.5; pt.shinR = 0.25 + Math.max(0, s) * 0.5;
    pt.shL = -s * 0.45; pt.shR = s * 0.45;
    pt.foreL = -0.15; pt.foreR = -0.15;
    pt.rigY = Math.abs(Math.cos(c.walkPhase)) * 0.045;
    pt.headX = 0; pt.headY = 0;
  } else if (c.mode === 'sit') {
    pt.thighL = -1.5; pt.thighR = -1.5; pt.shinL = 1.45; pt.shinR = 1.45;
    pt.shL = -0.25; pt.shR = -0.25; pt.foreL = -0.25; pt.foreR = -0.25;
    pt.rigY = -0.33 + Math.sin(t * 1.8 + c.walkPhase) * 0.008;
    pt.headY = Math.sin(t * 0.4 + c.walkPhase) * 0.25;
    pt.headX = 0;
  } else { // idle đứng
    pt.thighL = 0; pt.thighR = 0; pt.shinL = 0.06; pt.shinR = 0.06;
    pt.shL = 0.06; pt.shR = 0.06; pt.foreL = -0.1; pt.foreR = -0.1;
    pt.rigY = Math.sin(t * 2 + c.walkPhase) * 0.012;
    pt.headY = Math.sin(t * 0.35 + c.walkPhase) * 0.3;
    pt.headX = 0;
  }
  // Uống cà phê: tay phải nâng ly lên miệng (tỉ lệ chibi: khuỷu tay gập nhiều hơn)
  if (c.drink > 0) {
    c.drinkTimer += dt;
    const d = Math.min(1, c.drinkTimer / 2.4);
    const raise = smoothstep(0, 0.35, d) - smoothstep(0.65, 1, d);
    pt.shR = -1.3 * raise + (pt.shR * (1 - raise));
    pt.foreR = -1.5 * raise + (pt.foreR * (1 - raise));
    pt.headX = -0.22 * raise;
    c.parts.cupG.rotation.x = -0.45 * raise;
    if (d >= 1) { c.drink = 0; c.drinkTimer = 0; c.parts.cupG.rotation.x = 0; }
  }
  // Nội suy tư thế cho mượt
  const k = 1 - Math.exp(-dt * 9);
  for (const key in pt) p[key] += (pt[key] - p[key]) * k;
  const P = c.parts;
  P.legL.thigh.rotation.x = p.thighL; P.legR.thigh.rotation.x = p.thighR;
  P.legL.shin.rotation.x = p.shinL; P.legR.shin.rotation.x = p.shinR;
  P.armL.upper.rotation.x = p.shL; P.armR.upper.rotation.x = p.shR;
  P.armL.fore.rotation.x = p.foreL; P.armR.fore.rotation.x = p.foreR;
  c.rig.position.y = p.rigY;
  P.head.rotation.x = p.headX; P.head.rotation.y = p.headY;
  // Bong bóng chat hết hạn thì ẩn
  if (c.bubbleEl && performance.now() > c.bubbleUntil) { c.bubbleEl.remove(); c.bubbleEl = null; }
}
function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function startDrink(c) { if (!c.drink) { c.drink = 1; c.drinkTimer = 0; } }

/* ============ CHAT + BONG BÓNG 3D ============ */
function escapeHtml(s) { return s.replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])); }
function log(html, cls = '') {
  const d = document.createElement('div');
  if (cls) d.className = cls;
  d.innerHTML = html;
  const box = $('chat-log');
  box.appendChild(d);
  while (box.children.length > 80) box.removeChild(box.firstChild);
  box.scrollTop = box.scrollHeight;
}
function showBubble(id, text) {
  const c = state.players.get(id);
  if (!c) return;
  if (!c.bubbleEl) {
    const d = document.createElement('div');
    d.className = 'bubble';
    $('bubbles').appendChild(d);
    c.bubbleEl = d;
  }
  c.bubbleEl.innerHTML = `<b>${escapeHtml(c.name)}</b> ${escapeHtml(text)}`;
  c.bubbleEl.style.display = 'block';
  c.bubbleUntil = performance.now() + 5200;
}
function say(id, text) {
  const c = state.players.get(id);
  if (!c) return;
  showBubble(id, text);
  log(`<b>${escapeHtml(c.name)}:</b> ${escapeHtml(text)}`, id === 'me' ? 'me' : '');
}
/* Gửi tin nhắn thật cho cả quán qua Firebase */
function sendMessage(text) {
  text = (text || '').trim();
  if (!text || !state.entered) return;
  say('me', text);
  const me = state.players.get('me');
  if (me) me._lastMsg = { text, at: Date.now() };
  publishMe(true);
  if (fbReady) {
    // Tạo key trước rồi mới ghi: SDK phát sự kiện local ngay trong set(),
    // nếu add key sau set() thì tin của chính mình sẽ hiện 2 lần trong log.
    const ref = fbDb.ref(`rooms/${ROOM}/chat`).push();
    myChatKeys.add(ref.key);
    ref.set({ name: state.myName, text, at: Date.now() });
  }
}
function sendChat() {
  const input = $('chat-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  sendMessage(text);
}
$('chat-send').addEventListener('click', sendChat);
$('chat-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });
/* Điện thoại: chat thu gọn thành nút 💬 nổi, bấm mới mở để khỏi che màn hình */
if (matchMedia('(max-width: 640px)').matches) $('chat-panel').classList.add('mobile-hidden');
$('btn-chat-toggle').addEventListener('click', () => {
  const p = $('chat-panel');
  p.classList.toggle('mobile-hidden');
  if (!p.classList.contains('mobile-hidden')) $('chat-input').focus();
});

/* ============ CLICK TRONG QUÁN 3D ============ */
const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();
floor.userData.floor = true; terraceFloor.userData.floor = true;
clickable.push(floor, terraceFloor, tvScreen);
let downX = 0, downY = 0, downType = 'mouse';
renderer.domElement.addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; downType = e.pointerType; });
renderer.domElement.addEventListener('pointerup', (e) => {
  // Cảm ứng: cho phép lệch nhiều hơn khi xoay quán để khỏi bấm nhầm ghế
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > (downType === 'touch' ? 14 : 6)) return;
  if (!state.entered) return;
  ptr.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const hits = ray.intersectObjects(clickable, false);
  if (!hits.length) return;
  const o = hits[0].object;
  const me = state.players.get('me');
  if (o.userData.charId && o.userData.charId !== 'me') { openProfile(o.userData.charId, e.clientX, e.clientY); return; }
  // Tivi không cho bấm tương tác: bấm vào tivi không làm gì cả
  if (o.userData.seat) {
    const s = o.userData.seat;
    if (s.occupiedBy && s.occupiedBy !== 'me') { toast('Ghế này đã có người ngồi rồi, chọn ghế khác nhé'); return; }
    if (me) { walkTo(me, s.x, s.z, s); showZone(s.zone); }
    return;
  }
  if (o.userData.floor && me) walkTo(me, hits[0].point.x, hits[0].point.z);
});

/* ============ HỒ SƠ + KẾT BẠN ============ */
let profileId = null;
function openProfile(id, x, y) {
  const c = state.players.get(id);
  if (!c) return;
  profileId = id;
  $('profile-name').textContent = c.name + (state.friends.has(id) ? ' 💛' : '');
  $('profile-desc').textContent = `${c.spec.desc} • ${c.spec.gender}${c.seat ? ' • Đang ngồi ở ' + ZONE_NAMES[c.seat.zone] : ''}`;
  $('profile-color').style.background = '#' + c.spec.shirt.toString(16).padStart(6, '0');
  $('btn-friend').textContent = state.friends.has(id) ? '💔 Hủy kết bạn' : '🤝 Kết bạn';
  const p = $('profile');
  p.classList.remove('hidden');
  const pw = Math.min(250, innerWidth - 24);
  p.style.left = Math.max(12, Math.min(x + 12, innerWidth - pw - 12)) + 'px';
  p.style.top = Math.min(y + 12, innerHeight - 220) + 'px';
}
$('profile-close').addEventListener('click', () => $('profile').classList.add('hidden'));
$('btn-hello').addEventListener('click', () => {
  const c = state.players.get(profileId);
  if (!c) return;
  $('profile').classList.add('hidden');
  // Gửi lời chào thật vào chat chung — người kia sẽ thấy
  sendMessage(`Chào ${c.name} nhé! 👋`);
});
$('btn-friend').addEventListener('click', () => {
  if (!profileId) return;
  const c = state.players.get(profileId);
  if (state.friends.has(profileId)) {
    state.friends.delete(profileId);
    toast(`Đã hủy kết bạn với ${c.name}`);
  } else {
    state.friends.add(profileId);
    toast(`Đã kết bạn với ${c.name} 💛`);
  }
  localStorage.setItem('cafe3d_friends', JSON.stringify([...state.friends]));
  openProfile(profileId, 0, 0);
  $('profile').classList.add('hidden');
});

/* ============ TIVI YOUTUBE ============ */
function extractVideoId(url) {
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/) || url.match(/^([\w-]{11})$/);
  return m ? m[1] : null;
}
function setVideo(id, title) {
  state.videoId = id;
  state.videoTitle = title || 'Video YouTube';
  if (!loadIntoPlayer(ytPanelPlayer, id)) $('tv-frame').src = panelUrl(id);
  if (ytPlayerReady) { ytPlayer.loadVideoById(id); loadedVideoId = id; applyVolume(); setTimeout(() => captionsOff(ytPlayer), 600); }
  else if (tv3dFrame.getAttribute('src') !== tv3dUrl()) tv3dFrame.src = tv3dUrl();
  drawTV(0);
}
function openTV() { $('tv-panel').classList.remove('hidden'); createPanelPlayer(); }
$('btn-tv').addEventListener('click', openTV);
$('tv-close').addEventListener('click', () => $('tv-panel').classList.add('hidden'));
$('tv-play').addEventListener('click', () => {
  const id = extractVideoId($('tv-url').value.trim());
  if (id) { $('tv-url').value = ''; addToQueue(id, state.myName || 'Khách'); }
  else toast('Link YouTube chưa đúng, thử lại nhé');
});
$('tv-skip').addEventListener('click', () => {
  if (fbReady) {
    if (sharedQueue.length) {
      const first = sharedQueue[0];
      fbDb.ref(`rooms/${ROOM}/tv/queue/${first.key}`).remove();
      setSharedCurrent(first.id, first.by);
    } else toast('Hết hàng chờ rồi, dán link để thêm video nhé');
    return;
  }
  if (tvQueueIndex >= 0 && tvQueueIndex < tvQueue.length - 1) skipToQueue(tvQueueIndex + 1);
  else toast('Hết hàng chờ rồi, dán link để thêm video nhé');
});
$('tv-volume').addEventListener('input', (e) => setMyVolume(parseInt(e.target.value, 10)));
$('tv-mute').addEventListener('click', toggleMyMute);
$('btn-sound').addEventListener('click', toggleMyMute);

/* ============ NÚT ĐIỀU KHIỂN ============ */
$('btn-coffee').addEventListener('click', () => {
  const me = state.players.get('me');
  if (!me) return;
  if (me.mode !== 'sit') { toast('Ngồi xuống ghế trống rồi hẵng gọi cà phê nhé ☕'); return; }
  startDrink(me);
  toast('Cà phê của bạn đây, nhân vật sẽ nâng ly uống ☕');
  publishMe(true);
  setTimeout(() => publishMe(true), 3000);
});
const CAM_MODES = [
  { pos: [0, 15, 24], target: [0, 1, 2], label: 'Toàn cảnh quán' },
  { pos: null, target: null, label: 'Theo chân bạn' },
  { pos: [0, 3.4, 4], target: [0, 3.4, -9.7], label: 'Nhìn lên tivi' },
];
$('btn-cam').addEventListener('click', () => {
  state.camMode = (state.camMode + 1) % CAM_MODES.length;
  const m = CAM_MODES[state.camMode];
  if (m.pos) {
    const pos = (state.camMode === 0 && IS_MOBILE) ? [0, 12, 19] : m.pos;
    camera.position.set(...pos); controls.target.set(...m.target);
  }
  toast('Góc nhìn: ' + m.label);
});
$('btn-change-char').addEventListener('click', () => {
  $('player-name').value = state.myName;
  $('welcome').classList.remove('hidden');
});
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 3200);
}
function showZone(zone) {
  const z = $('zone-label');
  z.textContent = '📍 ' + ZONE_NAMES[zone];
  z.style.opacity = 1;
  clearTimeout(z._timer);
  z._timer = setTimeout(() => { z.style.opacity = 0; }, 2600);
}

/* ============ MÀN CHÀO — XEM TRƯỚC NHÂN VẬT 3D ============ */
const pvRenderer = new THREE.WebGLRenderer({ canvas: $('char-preview'), antialias: true, alpha: true });
pvRenderer.setSize(280, 280, false);
const pvScene = new THREE.Scene();
pvScene.add(new THREE.HemisphereLight(0xffffff, 0x333344, 1.3));
const pvDir = new THREE.DirectionalLight(0xffffff, 1.6);
pvDir.position.set(3, 5, 4); pvScene.add(pvDir);
const pvCam = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
pvCam.position.set(0, 1.6, 4.2); pvCam.lookAt(0, 0.9, 0);
const pvDisc = new THREE.Mesh(new THREE.CircleGeometry(0.95, 28), new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.9 }));
pvDisc.rotation.x = -Math.PI / 2; pvScene.add(pvDisc);
let pvChar = null;
function showPreview(i, outfitId) {
  if (pvChar) pvScene.remove(pvChar.group);
  const spec = { ...CHARACTERS[i], outfitId: outfitId || state.myOutfit || CHARACTERS[i].outfitId };
  const b = buildCharacter(spec);
  pvScene.add(b.group);
  pvChar = b;
}
/* Ô chọn trang phục ở màn chào: mỗi nhân vật có 4 bộ, bấm là xem trước ngay */
function renderOutfits(charIdx) {
  const spec = CHARACTERS[charIdx];
  const grid = $('outfit-grid');
  grid.innerHTML = '';
  Object.entries(OUTFITS[spec.outfit]).forEach(([id, o]) => {
    const b = document.createElement('button');
    b.className = 'outfit-btn' + (id === state.myOutfit ? ' active' : '');
    b.textContent = o.label;
    b.addEventListener('click', () => {
      state.myOutfit = id;
      localStorage.setItem('cafe3d_outfit_' + charIdx, id);
      renderOutfits(charIdx);
      showPreview(charIdx, id);
    });
    grid.appendChild(b);
  });
}
const grid = $('char-grid');
CHARACTERS.forEach((ch, i) => {
  const btn = document.createElement('button');
  btn.className = 'char-card' + (i === 0 ? ' selected' : '');
  btn.innerHTML = `<b>${ch.name}</b><small>${ch.gender}</small>`;
  btn.addEventListener('click', () => {
    state.myChar = i;
    state.myOutfit = localStorage.getItem('cafe3d_outfit_' + i) || ch.outfitId;
    grid.querySelectorAll('.char-card').forEach((el) => el.classList.remove('selected'));
    btn.classList.add('selected');
    renderOutfits(i);
    showPreview(i);
  });
  grid.appendChild(btn);
});
$('btn-random').addEventListener('click', () => {
  $('player-name').value = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
});
function removeCharacter(id) {
  const c = state.players.get(id);
  if (!c) return;
  if (c.seat) freeSeat(c.seat);
  if (c.bubbleEl) c.bubbleEl.remove();
  scene.remove(c.group);
  for (let i = clickable.length - 1; i >= 0; i--) {
    if (clickable[i].userData.charId === id) clickable.splice(i, 1);
  }
  state.players.delete(id);
  updateOnlineCount();
}
function enterCafe() {
  const name = $('player-name').value.trim() || RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
  state.myName = name;
  $('welcome').classList.add('hidden');
  if (state.players.has('me')) removeCharacter('me');
  spawnCharacter('me', name, { ...CHARACTERS[state.myChar], outfitId: state.myOutfit || CHARACTERS[state.myChar].outfitId }, { x: 0, z: 15.5 });
  state.entered = true;
  localStorage.setItem('cafe3d_name', name);
  localStorage.setItem('cafe3d_char', String(state.myChar));
  localStorage.setItem('cafe3d_outfit_' + state.myChar, state.myOutfit || CHARACTERS[state.myChar].outfitId);
  camera.position.set(0, IS_MOBILE ? 8 : 9, IS_MOBILE ? 15 : 20);
  controls.target.set(0, 1, 8);
  log(`<span class="sys">🎉 ${escapeHtml(name)} vừa vào quán! Có ${state.players.size} người đang ở đây.</span>`);
  joinFirebase();
  toast('Chào mừng đến quán! Bấm vào ghế trống để ngồi xuống ☕');
  // Bật tiếng ngay trong thao tác bấm "Vào quán" của người dùng: trình duyệt chỉ
  // cho bật tiếng khi có thao tác thật, gọi trong setTimeout hay lúc tải trang
  // sẽ bị chặn rồi thanh trượt hiển thị sai là đang có tiếng.
  applyVolume();
  setTimeout(syncVolumeUI, 800);
}
$('btn-enter').addEventListener('click', enterCafe);
$('player-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') enterCafe(); });

/* ============ KHỞI TẠO QUÁN ============ */
state.myOutfit = localStorage.getItem('cafe3d_outfit_0') || CHARACTERS[0].outfitId;
renderOutfits(0);
showPreview(0);
const savedName = localStorage.getItem('cafe3d_name');
if (savedName) $('player-name').value = savedName;
const savedChar = parseInt(localStorage.getItem('cafe3d_char') || '0', 10);
if (CHARACTERS[savedChar]) {
  state.myChar = savedChar;
  state.myOutfit = localStorage.getItem('cafe3d_outfit_' + savedChar) || CHARACTERS[savedChar].outfitId;
  grid.querySelectorAll('.char-card').forEach((el, i) => el.classList.toggle('selected', i === savedChar));
  renderOutfits(savedChar);
  showPreview(savedChar);
}
log('<span class="sys">☕ Chào mừng đến Café Kết Bạn 3D — quán có 100 ghế, chọn nhân vật rồi vào chơi nhé!</span>');
fbInit();
loadYouTubeAPI();
renderQueue();
updateSoundUI();

/* ---- Vào nhanh để test: ?autojoin=Tên&char=0&sit=1 ---- */
const qp = new URLSearchParams(location.search);
if (qp.has('autojoin')) {
  $('player-name').value = qp.get('autojoin') || 'Khách Test';
  const ch = parseInt(qp.get('char') || '0', 10);
  if (CHARACTERS[ch]) {
    state.myChar = ch;
    const outfitParam = qp.get('outfit');
    state.myOutfit = (outfitParam && OUTFITS[CHARACTERS[ch].outfit]?.[outfitParam]) ? outfitParam : (localStorage.getItem('cafe3d_outfit_' + ch) || CHARACTERS[ch].outfitId);
    grid.querySelectorAll('.char-card').forEach((el, i) => el.classList.toggle('selected', i === ch));
    renderOutfits(ch);
    showPreview(ch);
  }
  setTimeout(() => {
    enterCafe();
    if (qp.has('sit')) {
      setTimeout(() => {
        const me = state.players.get('me');
        const s = freeSeatNear('hall');
        if (me && s) { walkTo(me, s.x, s.z, s); showZone(s.zone); }
        if (qp.has('drink')) setInterval(() => { const m2 = state.players.get('me'); if (m2 && m2.mode === 'sit') startDrink(m2); }, 3000);
        if (qp.has('closeup')) setTimeout(() => {
          const m3 = state.players.get('me');
          if (m3) {
            state.camMode = 1;
            camera.position.set(m3.group.position.x + 2.5, 3.2, m3.group.position.z + 4.5);
            controls.target.set(m3.group.position.x, 1.2, m3.group.position.z);
          }
        }, 6000);
      }, 1200);
    }
    if (qp.has('sitnow')) {
      setTimeout(() => {
        const me = state.players.get('me');
        const s = freeSeatNear('hall');
        if (me && s) { sitDown(me, s, true); showZone(s.zone); }
        if (qp.has('drink')) setInterval(() => { const m2 = state.players.get('me'); if (m2 && m2.mode === 'sit') startDrink(m2); }, 2500);
        if (qp.has('closeup')) setTimeout(() => {
          const m3 = state.players.get('me');
          if (m3) {
            state.camMode = 1;
            camera.position.set(m3.group.position.x + 2.2, 2.6, m3.group.position.z + 3.8);
            controls.target.set(m3.group.position.x, 1.1, m3.group.position.z);
          }
        }, 1500);
      }, 1200);
    }
  }, 600);
}

/* Chế độ test nhanh: ?fast=1 (cho phép bước thời gian lớn khi fps thấp) */
const FAST = new URLSearchParams(location.search).has('fast');

/* ============ VÒNG LẶP CHÍNH ============ */
const clock = new THREE.Clock();
let tvTimer = 0;
const _pv = new THREE.Vector3();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), FAST ? 0.5 : 0.05);
  const t = clock.elapsedTime;
  for (const c of state.players.values()) updateCharacter(c, dt, t);
  // Gửi vị trí của mình lên Firebase khi đang đi (giới hạn 4 lần/giây)
  if (state.entered) {
    const me = state.players.get('me');
    if (me && me.mode === 'walk') publishMe();
  }
  tvTimer += dt;
  if (tvTimer > 0.12) { tvTimer = 0; drawTV(t); }
  // Bong bóng chat bám theo đầu nhân vật 3D
  for (const c of state.players.values()) {
    if (!c.bubbleEl) continue;
    c.parts.head.getWorldPosition(_pv);
    _pv.y += 0.4;
    _pv.project(camera);
    if (_pv.z > 1) { c.bubbleEl.style.display = 'none'; continue; }
    c.bubbleEl.style.display = 'block';
    c.bubbleEl.style.left = ((_pv.x * 0.5 + 0.5) * innerWidth) + 'px';
    c.bubbleEl.style.top = ((-_pv.y * 0.5 + 0.5) * innerHeight) + 'px';
  }
  // Camera theo chân người chơi
  if (state.camMode === 1) {
    const me = state.players.get('me');
    if (me) {
      _pv.set(me.group.position.x, 1.3, me.group.position.z);
      const dx = (_pv.x - controls.target.x) * 0.07;
      const dy = (_pv.y - controls.target.y) * 0.07;
      const dz = (_pv.z - controls.target.z) * 0.07;
      controls.target.x += dx; controls.target.y += dy; controls.target.z += dz;
      camera.position.x += dx; camera.position.y += dy; camera.position.z += dz;
    }
  }
  controls.update();
  renderer.render(scene, camera);
  cssRenderer.render(scene, camera);
  if (pvChar && !$('welcome').classList.contains('hidden')) {
    pvChar.group.rotation.y += dt * 0.8;
    pvRenderer.render(pvScene, pvCam);
  }
}
animate();

/* Debug nhanh: window.__cafeDebug() -> trạng thái từng người */
window.__cafeFront = () => {
  const me = state.players.get('me');
  if (!me) return;
  const a = me.group.rotation.y;
  state.camMode = 1;
  camera.position.set(me.group.position.x + Math.sin(a) * 3, 2.4, me.group.position.z + Math.cos(a) * 3);
  controls.target.set(me.group.position.x, 1.2, me.group.position.z);
};
window.__cafeDebug = () => [...state.players.values()].map((c) => ({
  id: c.id, mode: c.mode, x: +c.group.position.x.toFixed(1), z: +c.group.position.z.toFixed(1),
  path: c.path.length, seat: c.seat ? c.seat.id : null, drink: c.drink,
}));
window.__cafeTV = { isOn: () => true };
window.__cafeQueue = {
  add: (id) => addToQueue(id, 'Test'),
  next: () => playNextInQueue(),
  list: () => ({ queue: tvQueue.map((q) => q.id), index: tvQueueIndex, current: state.videoId }),
  volume: (v) => setMyVolume(v),
  mute: () => toggleMyMute(),
};
window.__cafeFps = () => new Promise((res) => {
  let n = 0; const t0 = performance.now();
  const tick = () => { n++; if (performance.now() - t0 < 5000) requestAnimationFrame(tick); else res(+(n / 5).toFixed(1)); };
  requestAnimationFrame(tick);
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  cssRenderer.setSize(innerWidth, innerHeight);
  if (innerWidth > 640) $('chat-panel').classList.remove('mobile-hidden');
});
