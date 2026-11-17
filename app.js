import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { TEX } from './vendor/textures.js'; // texture ảnh thật (sàn gỗ, gạch, đá, cỏ) dạng base64

/* ---- Nhân vật GLB thật tải trên mạng (Jake + Miku) ----
   Mỗi nhân vật là 1 file GLB duy nhất (đã gộp Idle + Walk, texture hạ 4K->2K):
   - Jake: nam, file Meshy AI "Desolate City Survivor", 24 xương, cao 1,70m
   - Miku: nữ mèo, file Meshy AI "Cat Girl Miku", 24 xương, cao 1,70m
   Cả 2 đều là 1 mesh liền (quần áo/tai/đuôi/gậy dính liền, không tách được),
   mặt hướng +Z. Tải trước ở nền để lúc chọn nhân vật là có ngay. */
const GLB_FILES = { jake: './vendor/jake.glb', miku: './vendor/miku.glb' };
const glbData = { jake: null, miku: null };
const glbPromises = {};
for (const [key, url] of Object.entries(GLB_FILES)) {
  glbPromises[key] = new Promise((resolve) => {
    new GLTFLoader().load(url,
      (g) => { glbData[key] = g; resolve(g); },
      undefined,
      () => { console.warn('Không tải được GLB', key, ', dùng nhân vật thường.'); resolve(null); });
  });
}

/* ============ DỮ LIỆU ============ */
/* CHỈ 2 nhân vật — Jake (nam) và Miku (nữ), đều là model GLB thật.
   Milo/Luna/Chibi đã gỡ khỏi màn chào (code dựng nhân vật procedural
   Milo/Luna vẫn còn trong file nhưng không còn lựa chọn nào dùng tới). */
const CHARACTERS = [
  { name: 'Jake', gender: 'Nam', outfit: 'glb', outfitId: 'default', desc: 'Người sống sót thành phố hoang tàn, áo da nâu, gậy bóng chày.', glb: 'jake' },
  { name: 'Miku', gender: 'Nữ', outfit: 'glb', outfitId: 'default', desc: 'Mèo trắng tai mèo, áo hồng dấu chân mèo, đuôi dài.', glb: 'miku' },
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
    dark: {
      label: 'Hắc Ám',
      hair: { type: 'spiky' },
      top: { type: 'denim', main: 0x1f2937, pocket: 0x111827, shirt: 0xffffff },
      bottom: { type: 'cargo', main: 0x111827, pocket: 0x1f2937, belt: 0x111827, chain: true },
      shoes: { type: 'boots', main: 0x111827, sole: 0x000000, laces: true },
      tattoo: { main: 0x111827 },
      necklace: { main: 0xd1d5db },
      bracelet: { main: 0xd1d5db },
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
    white: {
      label: 'Trắng',
      hair: { type: 'long' },
      top: { type: 'dress', main: 0xf5f5f4, belt: 0x111827, blazer: 0xffffff },
      bottom: { type: 'dress', main: 0xf5f5f4 },
      shoes: { type: 'maryjane', main: 0x111827 },
      glasses: { main: 0x111827 },
      lips: 0xdc2626,
      earrings: { main: 0xfbbf24 },
      bracelet: { main: 0xfbbf24 },
    },
  },
  // Chibi dùng thân GLB có sẵn mặt + tóc, không dùng hệ đồ procedural
  chibi: {
    default: {
      label: 'Mặc định',
      hair: { type: 'short' },
      top: { type: 'sweater', main: 0xf2c89b },
      bottom: { type: 'shorts', main: 0xf2c89b },
      shoes: { type: 'sandals', main: 0xf2c89b },
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
  camMode: 0, // 0 toàn cảnh, 1 theo mình, 2 tivi, 3 góc nhìn thứ nhất
  fpYaw: 0, fpPitch: 0, // góc nhìn thứ nhất: lệch hướng nhìn khi kéo chuột/chạm
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
let publishCount = 0; // đếm số lần gửi vị trí lên Firebase (để kiểm tra đồng bộ)
window.__cafeNet = () => ({ fbReady, publishCount, lastPublish, entered: state.entered });
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
  // Realtime: gửi vị trí tối đa 10 lần/giây khi đang đi (trước đây 4 lần/giây).
  // Gửi từng khung hình (60 lần/giây) thì Firebase + điện thoại của 100 người
  // không chịu nổi, còn 10 lần/giây + trượt mượt ở máy người nhận là đủ
  // nhìn như realtime rồi.
  if (now || t - lastPublish >= 100) { lastPublish = t; publishCount++; myPlayerRef.set(myStateData()); }
}
function listenPlayers() {
  const ref = fbDb.ref(`rooms/${ROOM}/players`);
  ref.once('value', () => { fbPlayersReady = true; });
  ref.on('child_added', async (snap) => {
    const id = snap.key, d = snap.val();
    if (!d || id === myFbId) return;
    if (Date.now() - (d.at || 0) > 90000) { snap.ref.remove(); return; }
    if (state.players.has(id)) return;
    const base = CHARACTERS[d.char] || CHARACTERS[0];
    const spec = { ...base, outfitId: d.outfit || base.outfitId };
    // Người kia là Jake/Miku (GLB) mà file GLB chưa tải xong thì CHỜ tải xong
    // rồi mới spawn — trước đây spawn ngay nên rơi vào Milo tạm, rồi không bao
    // giờ dựng lại, thành ra 1 máy thấy người kia là Milo / hoặc không thấy đúng.
    if (spec.glb && !glbData[spec.glb]) await glbPromises[spec.glb];
    if (state.players.has(id)) return;
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
    // Người kia đổi nhân vật / trang phục -> dựng lại nhân vật cho họ.
    // Cả trường hợp trước đây spawn tạm bằng Milo vì GLB chưa tải xong
    // (giờ GLB đã có mà c vẫn không phải GLB) thì cũng dựng lại cho đúng.
    const base = CHARACTERS[d.char] || CHARACTERS[0];
    const newOutfit = d.outfit || base.outfitId;
    if (c.spec.name !== base.name || c.spec.outfitId !== newOutfit || (base.glb && !c.isGLB && glbData[base.glb])) {
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
scene.background = null; // nền trong suốt để lớp tivi (CSS3D, nằm dưới canvas WebGL) hiện qua lỗ màn hình
scene.fog = new THREE.Fog(0x14102b, 45, 90);

const camera = new THREE.PerspectiveCamera(IS_MOBILE && IS_PORTRAIT ? 68 : 55, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, IS_MOBILE ? 12 : 15, IS_MOBILE ? 19 : 24);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0); // canvas trong suốt: tivi nằm dưới vẫn hiện qua lỗ màn hình
// Ánh sáng điện ảnh: tone mapping ACES cho màu ấm, mềm như phim; environment
// (RoomEnvironment qua PMREM) cho vật liệu có phản xạ thật thay vì màu phẳng.
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45;
// Canvas WebGL PHẢI nằm trên lớp video CSS3D (cả hai đều positioned, z-index quyết định
// thứ tự vẽ — chỉ đổi thứ tự DOM thôi chưa đủ vì div CSS3D absolute luôn vẽ trên
// canvas static). Nhân vật 3D trong canvas nhờ vậy mới che được video tivi.
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.zIndex = '1';
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

// Renderer CSS3D: chiếu video YouTube thật lên màn hình tivi trong game.
// Đặt lớp CSS3D (video) NẰM DƯỚI canvas WebGL để nhân vật 3D đứng trước tivi
// thì che được video (nhân vật ở trên, màn hình ở dưới), thay vì video đè mất nhân vật.
const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(innerWidth, innerHeight);
cssRenderer.domElement.style.position = 'absolute';
cssRenderer.domElement.style.top = '0';
cssRenderer.domElement.style.left = '0';
cssRenderer.domElement.style.pointerEvents = 'none';
cssRenderer.domElement.style.zIndex = '0'; // lớp video nằm dưới canvas WebGL (z-index 1)
container.insertBefore(cssRenderer.domElement, renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffe8c9, 0x4a3226, 0.7));
const sun = new THREE.DirectionalLight(0xffdfb0, 2.2);
sun.position.set(14, 22, 10);
sun.castShadow = !LOWFX;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -22; sun.shadow.camera.right = 22;
sun.shadow.camera.top = 22; sun.shadow.camera.bottom = -22;
// Bóng thật, mềm và sạch: bias chống sọc, normalBias chống acne trên mặt cong,
// radius làm mềm mép bóng (chỉ có tác dụng với PCFSoftShadowMap).
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
sun.shadow.radius = 4;
scene.add(sun);
const warm1 = new THREE.PointLight(0xffb46b, 60, 30, 1.8); warm1.position.set(0, 5.5, -2); scene.add(warm1);
const warm2 = new THREE.PointLight(0x7dd3fc, 40, 26, 1.8); warm2.position.set(0, 5, 10); scene.add(warm2);
const warm3 = new THREE.PointLight(0xf472b6, 35, 24, 1.8); warm3.position.set(-13, 4.5, 0); scene.add(warm3);

/* ============ VẬT LIỆU DÙNG CHUNG ============ */
// Texture ảnh thật (data URI): tải không đồng bộ, Three tự cập nhật khi ảnh về
// (phải đứng trước MAT vì MAT dùng photoTex)
const _texLoader = new THREE.TextureLoader();
function photoTex(uri, rx = 1, ry = 1) {
  const t = _texLoader.load(uri);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
// Cel-shading kiểu Genshin: ánh sáng chia thành 3 vùng rõ rệt (sáng / nửa tối /
// tối) thay vì chuyển mượt như thật. MeshToonMaterial + gradient map 3 bậc.
const TOON_GRAD = (() => {
  const data = new Uint8Array([90, 165, 255]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter; tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();
function toonMat(color, opts = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: TOON_GRAD, ...opts });
}
// Viền đậm kiểu anime (inverted hull): 1 bản sao đen, vẽ mặt sau, phóng to nhẹ
const OUTLINE_MAT = new THREE.MeshBasicMaterial({ color: 0x1a1a2e, side: THREE.BackSide });
function addOutline(parent, geo, scale = 1.045) {
  const o = new THREE.Mesh(geo, OUTLINE_MAT);
  o.scale.setScalar(scale);
  parent.add(o);
  return o;
}
// Mống mắt anime: texture vẽ tay — vòng ngoài đậm, giữa sáng, có tia hướng tâm
function irisTexture(colorHex) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const col = '#' + colorHex.toString(16).padStart(6, '0');
  // Nền tối
  g.fillStyle = '#1a1210'; g.fillRect(0, 0, 128, 128);
  // Vòng màu chính
  const grad = g.createRadialGradient(64, 64, 8, 64, 64, 62);
  grad.addColorStop(0, '#241a12');
  grad.addColorStop(0.35, col);
  grad.addColorStop(0.8, col);
  grad.addColorStop(1, '#0d0a08');
  g.fillStyle = grad; g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill();
  // Tia hướng tâm (tạo chiều sâu cho mắt anime)
  g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 3;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    g.beginPath();
    g.moveTo(64 + Math.cos(a) * 18, 64 + Math.sin(a) * 18);
    g.lineTo(64 + Math.cos(a) * 56, 64 + Math.sin(a) * 56);
    g.stroke();
  }
  // Vòng sáng trên (ánh sáng hắt vào mắt)
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.beginPath(); g.ellipse(64, 30, 34, 14, 0, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const MAT = {
  wood: new THREE.MeshStandardMaterial({ map: tableWoodTexture(), roughness: 0.55 }),
  woodDark: new THREE.MeshStandardMaterial({ color: 0x4a2c14, roughness: 0.6 }),
  // Lưng ghế là vỏ trụ mỏng, nhìn được cả 2 mặt
  woodBack: new THREE.MeshStandardMaterial({ color: 0x4a2c14, roughness: 0.6, side: THREE.DoubleSide }),
  cushion: new THREE.MeshStandardMaterial({ map: fabricTexture('#e8d5b5'), roughness: 0.95 }),
  black: new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5, metalness: 0.3 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.35, metalness: 0.7 }),
  wall: new THREE.MeshStandardMaterial({ map: plasterTexture('#2d2350'), roughness: 0.95 }),
  wallWarm: new THREE.MeshStandardMaterial({ map: plasterTexture('#4a2c5a'), roughness: 0.95 }),
  neonCyan: new THREE.MeshStandardMaterial({ color: 0x0e7490, emissive: 0x22d3ee, emissiveIntensity: 2.2 }),
  neonPink: new THREE.MeshStandardMaterial({ color: 0x9d174d, emissive: 0xf472b6, emissiveIntensity: 2.2 }),
  neonAmber: new THREE.MeshStandardMaterial({ color: 0x92400e, emissive: 0xfbbf24, emissiveIntensity: 2.0 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.9 }),
  leaf2: new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.9 }),
  pot: new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 }),
  counter: new THREE.MeshStandardMaterial({ map: photoTex(TEX.woodFloor, 1, 2), roughness: 0.55 }),
  counterTop: new THREE.MeshStandardMaterial({ map: photoTex(TEX.marble, 2, 1), roughness: 0.25 }),
  sofa: new THREE.MeshStandardMaterial({ map: fabricTexture('#7c3aed'), roughness: 0.95 }),
  sofa2: new THREE.MeshStandardMaterial({ map: fabricTexture('#db2777'), roughness: 0.95 }),
  rug: new THREE.MeshStandardMaterial({ color: 0xbe185d, roughness: 1 }),
  rug2: new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 1 }),
  cupWhite: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }),
  coffee: new THREE.MeshStandardMaterial({ color: 0x3b2314, roughness: 0.2 }),
};
/* Chân bàn + mặt bàn tiện bằng lathe (đường cong như đồ gỗ thật, không còn
   là trụ tròn thô): đế loe, thân thon, cổ phình, mép bàn bo tròn. */
const tableTopGeo = new THREE.LatheGeometry([
  new THREE.Vector2(0.0, 0.0), new THREE.Vector2(0.6, 0.0), new THREE.Vector2(0.74, 0.015),
  new THREE.Vector2(0.78, 0.035), new THREE.Vector2(0.78, 0.055), new THREE.Vector2(0.72, 0.075),
  new THREE.Vector2(0.0, 0.075),
], 32);
const tableLegGeo = new THREE.LatheGeometry([
  new THREE.Vector2(0.0, 0.0), new THREE.Vector2(0.4, 0.0), new THREE.Vector2(0.4, 0.035),
  new THREE.Vector2(0.13, 0.06), new THREE.Vector2(0.085, 0.2), new THREE.Vector2(0.11, 0.4),
  new THREE.Vector2(0.07, 0.55), new THREE.Vector2(0.12, 0.65), new THREE.Vector2(0.28, 0.68),
  new THREE.Vector2(0.28, 0.7),
], 20);
// Lưng ghế cong (vỏ trụ mở) ôm lưng người ngồi; đệm ghế bo tròn; chân ghế thon, hơi xòe
// Vỏ trụ mở theo hướng -Z (theta quanh PI) để lõm ôm lưng người ngồi phía +Z
const chairBackGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.55, 16, 1, true, Math.PI - 0.85, 1.7);
const chairCushionGeo = new THREE.SphereGeometry(0.26, 18, 12);
const chairLegGeo = new THREE.CylinderGeometry(0.03, 0.022, 0.45, 8);
// Chậu cây tiện (lathe): miệng loe, thân thon
const potGeo = new THREE.LatheGeometry([
  new THREE.Vector2(0.0, 0.0), new THREE.Vector2(0.14, 0.0), new THREE.Vector2(0.17, 0.03),
  new THREE.Vector2(0.2, 0.2), new THREE.Vector2(0.22, 0.3), new THREE.Vector2(0.23, 0.32),
  new THREE.Vector2(0.2, 0.34),
], 16);
// Chao đèn treo (lathe): hình chuông, miệng loe ở dưới, cổ nhỏ ở trên
const lampShadeGeo = new THREE.LatheGeometry([
  new THREE.Vector2(0.3, 0.0), new THREE.Vector2(0.31, 0.02), new THREE.Vector2(0.28, 0.04),
  new THREE.Vector2(0.18, 0.14), new THREE.Vector2(0.08, 0.24), new THREE.Vector2(0.05, 0.28),
  new THREE.Vector2(0.02, 0.28),
], 20);
const GEO = {
  tableTop: tableTopGeo,
  tableLeg: tableLegGeo,
  tableBase: new THREE.CylinderGeometry(0.42, 0.46, 0.05, 20),
  chairSeat: new THREE.BoxGeometry(0.44, 0.07, 0.44),
  chairBack: chairBackGeo,
  chairCushion: chairCushionGeo,
  chairLeg: chairLegGeo,
  cup: new THREE.CylinderGeometry(0.05, 0.04, 0.1, 12),
  pot: potGeo,
  bush: new THREE.SphereGeometry(0.42, 12, 10),
  lampShade: lampShadeGeo,
  bulb: new THREE.SphereGeometry(0.09, 10, 8),
};
function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  return m;
}
function addMesh(mesh, parent = scene) { mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh; }

/* ============ TEXTURE VẼ BẰNG CANVAS (vân gỗ, gạch, đá, vải) ============
   Dùng canvas vẽ texture thay vì màu phẳng: sàn gỗ có vân + mắt gỗ,
   tường gạch/thạch cao, mặt quầy đá cẩm thạch, sofa vải dệt, thảm hoa văn. */
function canvasTex(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function shade(hex, f) { // làm sáng/tối một màu hex theo hệ số f
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, ((n >> 16) & 255) * f));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 255) * f));
  const b = Math.min(255, Math.max(0, (n & 255) * f));
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
// Sàn gỗ: từng tấm ván tông khác nhau, vân gỗ lượn sóng, mắt gỗ, khe tối
function woodFloorTexture() {
  return canvasTex(512, 512, (g) => {
    const rows = 8, rh = 512 / rows;
    for (let r = 0; r < rows; r++) {
      g.fillStyle = shade('#8a5a33', 0.85 + Math.random() * 0.35);
      g.fillRect(0, r * rh, 512, rh);
      for (let i = 0; i < 9; i++) {
        g.strokeStyle = `rgba(60,30,10,${0.05 + Math.random() * 0.1})`;
        g.lineWidth = 1 + Math.random() * 2;
        g.beginPath();
        const y0 = r * rh + Math.random() * rh;
        g.moveTo(0, y0);
        for (let x = 0; x <= 512; x += 64) g.lineTo(x, y0 + Math.sin(x * 0.02 + i) * 4 + (Math.random() - 0.5) * 3);
        g.stroke();
      }
      if (Math.random() < 0.5) {
        const kx = Math.random() * 512, ky = r * rh + rh / 2;
        for (let k = 4; k > 0; k--) {
          g.strokeStyle = 'rgba(50,25,8,0.18)'; g.beginPath();
          g.ellipse(kx, ky, k * 4, k * 2.2, 0, 0, Math.PI * 2); g.stroke();
        }
      }
      g.fillStyle = 'rgba(30,15,5,0.55)'; g.fillRect(0, r * rh, 512, 2);
      g.fillRect((r * 173) % 512, r * rh, 2, rh);
    }
  }, 5, 4);
}
// Mặt bàn tròn: vân gỗ tỏa tròn từ tâm
function tableWoodTexture() {
  return canvasTex(256, 256, (g) => {
    g.fillStyle = '#9c6b3f'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = `rgba(70,40,15,${0.06 + Math.random() * 0.12})`;
      g.lineWidth = 1 + Math.random() * 2.5;
      g.beginPath();
      g.arc(128, 128, 8 + i * 5 + Math.random() * 4, Math.random() * 2, Math.random() * 2 + Math.PI * 1.2);
      g.stroke();
    }
    g.strokeStyle = 'rgba(50,28,10,0.5)'; g.lineWidth = 6;
    g.beginPath(); g.arc(128, 128, 124, 0, Math.PI * 2); g.stroke();
  });
}
// Tường gạch: viên gạch tông ấm khác nhau, mạch vữa sáng
function brickTexture() {
  return canvasTex(512, 512, (g) => {
    g.fillStyle = '#d8c9b8'; g.fillRect(0, 0, 512, 512);
    const bh = 32, bw = 84;
    for (let y = 0, row = 0; y < 512; y += bh, row++) {
      for (let x = -bw; x < 512 + bw; x += bw) {
        const ox = row % 2 ? x + bw / 2 : x;
        g.fillStyle = shade('#9a5a44', 0.85 + Math.random() * 0.35);
        g.fillRect(ox + 2, y + 2, bw - 4, bh - 4);
        g.fillStyle = 'rgba(255,255,255,0.06)';
        g.fillRect(ox + 2, y + 2, bw - 4, 5);
      }
    }
  }, 6, 2);
}
// Thạch cao: nền ấm + nhiễu mịn + vài vết loang nhẹ
function plasterTexture(base) {
  return canvasTex(256, 256, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.05})`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
    }
    for (let i = 0; i < 5; i++) {
      const grad = g.createRadialGradient(Math.random() * 256, Math.random() * 256, 4, 128, 128, 90);
      grad.addColorStop(0, 'rgba(0,0,0,0.05)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
    }
  }, 4, 2);
}
// Đá cẩm thạch trắng: nền sáng + vân xám loang
function marbleTexture() {
  return canvasTex(512, 512, (g) => {
    g.fillStyle = '#f1ede6'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 14; i++) {
      g.strokeStyle = `rgba(120,120,130,${0.12 + Math.random() * 0.2})`;
      g.lineWidth = 0.8 + Math.random() * 2;
      g.beginPath();
      let x = Math.random() * 512, y = Math.random() * 512;
      g.moveTo(x, y);
      for (let s = 0; s < 6; s++) { x += (Math.random() - 0.5) * 220; y += (Math.random() - 0.5) * 220; g.lineTo(x, y); }
      g.stroke();
    }
    for (let i = 0; i < 800; i++) {
      g.fillStyle = `rgba(150,150,160,${Math.random() * 0.06})`;
      g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
  }, 2, 1);
}
// Vải dệt: sợi ngang dọc + nhiễu
function fabricTexture(base) {
  return canvasTex(256, 256, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 3) { g.fillStyle = 'rgba(0,0,0,0.07)'; g.fillRect(0, y, 256, 1); }
    for (let x = 0; x < 256; x += 3) { g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(x, 0, 1, 256); }
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
    }
  }, 2, 2);
}
// Thảm: viền hoa văn + họa tiết trung tâm
function rugTexture(c1, c2) {
  return canvasTex(512, 512, (g) => {
    g.fillStyle = c1; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = c2; g.lineWidth = 10; g.strokeRect(18, 18, 476, 476);
    g.lineWidth = 3; g.strokeRect(44, 44, 424, 424);
    g.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
      g.save(); g.translate(256, 256); g.rotate(i * Math.PI / 2);
      g.beginPath(); g.moveTo(0, -90); g.lineTo(34, -34); g.lineTo(90, 0); g.lineTo(34, 34); g.lineTo(0, 90); g.lineTo(-34, 34); g.lineTo(-90, 0); g.lineTo(-34, -34); g.closePath(); g.stroke();
      g.restore();
    }
    g.beginPath(); g.arc(256, 256, 52, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(256, 256, 30, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 1500; i++) {
      g.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
      g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
  });
}
// Sàn đá sân vườn: viên đá xám, mạch tối
function stoneTileTexture() {
  return canvasTex(512, 512, (g) => {
    g.fillStyle = '#5b6470'; g.fillRect(0, 0, 512, 512);
    const s = 128;
    for (let y = 0; y < 512; y += s) for (let x = 0; x < 512; x += s) {
      g.fillStyle = shade('#6b7280', 0.85 + Math.random() * 0.3);
      g.fillRect(x + 3, y + 3, s - 6, s - 6);
      for (let i = 0; i < 12; i++) {
        g.strokeStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.08})`;
        g.beginPath(); const sx = x + Math.random() * s, sy = y + Math.random() * s;
        g.moveTo(sx, sy); g.lineTo(sx + 20 + Math.random() * 30, sy + (Math.random() - 0.5) * 10); g.stroke();
      }
    }
  }, 5, 2);
}
function plankTexture(base, line) {
  return woodFloorTexture();
}
const floor = new THREE.Mesh(new THREE.PlaneGeometry(34, 26), new THREE.MeshStandardMaterial({ map: photoTex(TEX.woodFloor, 6, 5), roughness: 0.7 }));
floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 3); floor.receiveShadow = true; scene.add(floor);
const terraceFloor = new THREE.Mesh(new THREE.PlaneGeometry(34, 9.5), new THREE.MeshStandardMaterial({ map: photoTex(TEX.grass, 7, 2), roughness: 0.95 }));
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
// Trần gỗ + dầm (đèn treo giờ có chỗ bám, không còn lơ lửng giữa trời)
// Nhóm trần được ẩn khi camera ở trên trần (góc toàn cảnh) để khỏi che tầm nhìn
const ceilingGroup = new THREE.Group(); scene.add(ceilingGroup);
{
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(34, 26), new THREE.MeshStandardMaterial({ map: photoTex(TEX.woodFloor, 6, 5), color: 0x8a6a4a, roughness: 0.9 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 7, 3); ceilingGroup.add(ceil);
  [-12, -6, 0, 6, 12].forEach((x) => {
    const beam = box(0.35, 0.3, 26, MAT.woodDark, x, 6.85, 3); ceilingGroup.add(beam);
  });
}
// Chân tường trắng chạy dọc chân tường
{
  const bb = new THREE.MeshStandardMaterial({ color: 0xf5f5f4, roughness: 0.6 });
  const b1 = box(34, 0.25, 0.08, bb, 0, 0.125, -9.72); scene.add(b1);
  const b2 = box(0.08, 0.25, 26, bb, -16.72, 0.125, 3); scene.add(b2);
  const b3 = box(0.08, 0.25, 26, bb, 16.72, 0.125, 3); scene.add(b3);
}
// Cửa sổ 2 bên tường: khung gỗ + bầu trời thành phố + rèm vải
function skyTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 320;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 320);
  grad.addColorStop(0, '#7dd3fc'); grad.addColorStop(0.6, '#bae6fd'); grad.addColorStop(1, '#fef3c7');
  g.fillStyle = grad; g.fillRect(0, 0, 512, 320);
  g.fillStyle = '#fef9c3'; g.beginPath(); g.arc(400, 70, 34, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.9)';
  [[100, 80, 60], [180, 60, 44], [300, 120, 70], [90, 150, 50]].forEach(([x, y, r]) => {
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.arc(x + r * 0.8, y + 6, r * 0.7, 0, Math.PI * 2); g.fill();
  });
  g.fillStyle = '#475569';
  let x = 0;
  while (x < 512) { const w = 30 + Math.random() * 50, h = 40 + Math.random() * 90; g.fillRect(x, 320 - h, w, h); x += w + 6; }
  g.fillStyle = '#334155'; g.fillRect(0, 300, 512, 20);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const skyTex = skyTexture();
[[-16.7, 0, Math.PI / 2], [-16.7, 6, Math.PI / 2], [16.7, 0, -Math.PI / 2], [16.7, 6, -Math.PI / 2]].forEach(([x, z, ry]) => {
  const frame = box(0.1, 2.8, 4.4, MAT.woodDark, x, 3.6, z); scene.add(frame);
  const view = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.4), new THREE.MeshBasicMaterial({ map: skyTex }));
  view.position.set(x + (ry > 0 ? 0.06 : -0.06), 3.6, z); view.rotation.y = ry; scene.add(view);
  // Rèm vải 2 bên cửa sổ
  [-2.3, 2.3].forEach((dz) => {
    const curtain = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 2.9), new THREE.MeshStandardMaterial({ map: fabricTexture('#f472b6'), roughness: 1, side: THREE.DoubleSide }));
    curtain.position.set(x + (ry > 0 ? 0.12 : -0.12), 3.55, z + dz); curtain.rotation.y = ry; scene.add(curtain);
  });
});
// Tranh treo tường: khung gỗ + tranh vẽ
function artTexture(kind) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 320;
  const g = c.getContext('2d');
  if (kind === 'coffee') {
    g.fillStyle = '#fef3c7'; g.fillRect(0, 0, 256, 320);
    g.fillStyle = '#92400e'; g.beginPath(); g.ellipse(128, 200, 62, 52, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff7ed'; g.fillRect(66, 150, 124, 18);
    g.strokeStyle = '#92400e'; g.lineWidth = 10;
    g.beginPath(); g.arc(196, 200, 26, -Math.PI / 2, Math.PI / 2); g.stroke();
    g.strokeStyle = 'rgba(146,64,14,0.6)'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(110, 130); g.bezierCurveTo(100, 100, 120, 90, 110, 60); g.stroke();
    g.beginPath(); g.moveTo(150, 130); g.bezierCurveTo(140, 100, 160, 90, 150, 60); g.stroke();
    g.fillStyle = '#78350f'; g.fillRect(40, 260, 176, 10);
  } else {
    const grad = g.createLinearGradient(0, 0, 0, 320);
    grad.addColorStop(0, '#f97316'); grad.addColorStop(0.55, '#fbbf24'); grad.addColorStop(1, '#fef3c7');
    g.fillStyle = grad; g.fillRect(0, 0, 256, 320);
    g.fillStyle = '#fff7ed'; g.beginPath(); g.arc(128, 120, 34, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#7c2d12';
    g.beginPath(); g.moveTo(0, 320); g.lineTo(90, 170); g.lineTo(180, 320); g.closePath(); g.fill();
    g.fillStyle = '#9a3412';
    g.beginPath(); g.moveTo(110, 320); g.lineTo(200, 200); g.lineTo(256, 320); g.closePath(); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
[['coffee', -14.5, 3.2], ['sunset', 8.5, 5.2]].forEach(([kind, x, y]) => {
  const frame = box(1.5, 1.9, 0.08, MAT.woodDark, x, y, -9.7); scene.add(frame);
  const art = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.7), new THREE.MeshBasicMaterial({ map: artTexture(kind) }));
  art.position.set(x, y, -9.65); scene.add(art);
});
// Đồng hồ treo tường
{
  const clock = new THREE.Group();
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }));
  clock.add(face);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 10, 32), MAT.black); clock.add(rim);
  const hour = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.01), MAT.black);
  hour.position.y = 0.08; hour.rotation.z = -0.9; clock.add(hour);
  const min = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.32, 0.01), MAT.black);
  min.position.y = 0.12; min.rotation.z = 0.7; clock.add(min);
  clock.position.set(11.5, 5.4, -9.7); scene.add(clock);
}

/* ============ TIVI 3D (MÀN HÌNH LỚN TRÊN TƯỜNG) ============ */
const tvCanvas = document.createElement('canvas'); tvCanvas.width = 1024; tvCanvas.height = 576;
const tvCtx = tvCanvas.getContext('2d');
const tvTexture = new THREE.CanvasTexture(tvCanvas);
const tvScreen = new THREE.Mesh(
  new THREE.PlaneGeometry(12, 6.75),
  // "Lỗ" màn hình: chỉ ghi depth để che tường sau, không vẽ màu nên canvas trong suốt
  // ở đây và video YouTube (lớp CSS3D nằm dưới canvas) hiện qua; nhân vật 3D đứng
  // trước tivi sẽ vẽ đè lên video vì canvas WebGL nằm trên lớp CSS3D.
  // renderOrder = -1 để lỗ được vẽ TRƯỚC tường (opaque sort theo material trước
  // rồi mới theo độ sâu, nên không có renderOrder thì tường vẽ trước và lỗ không
  // xóa được màu tường đã vẽ).
  new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true })
);
tvScreen.renderOrder = -1;
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
tv3dObj.position.set(0, 3.4, -9.7); // trùng đúng mặt phẳng lỗ màn hình để video khớp khung
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
// + bù thời gian đã trôi qua để nhân vật đi tiếp (không đứng yên khi tab ra ngoài)
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = performance.now(); return; }
  if (ytPlayerReady) {
    ytPlayer.playVideo();
    applyVolume();
  }
  if (!hiddenAt || !state.entered) return;
  const elapsed = Math.min((performance.now() - hiddenAt) / 1000, 15); // tối đa 15s
  hiddenAt = 0;
  const me = state.players.get('me');
  if (!me) return;
  // Mô phỏng lại thời gian đã trôi qua để nhân vật đi tiếp tới nơi (đi bộ, uống)
  const t0 = performance.now() / 1000;
  for (let s = 0; s < elapsed; s += 0.05) updateCharacter(me, 0.05, t0 + s);
  publishMe(true); // gửi vị trí mới lên Firebase ngay để người khác thấy mình đã tới nơi
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
// Tường gạch điểm nhấn sau quầy bar
const barBrick = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 4.5), new THREE.MeshStandardMaterial({ map: photoTex(TEX.brick, 3, 2), roughness: 0.9 }));
barBrick.position.set(16.7, 2.6, -5.5); barBrick.rotation.y = -Math.PI / 2; barBrick.receiveShadow = true; scene.add(barBrick);
// Kệ gỗ + chai lọ trên tường sau quầy
const bottleColors = [0x166534, 0x92400e, 0x1e40af, 0x7c2d12, 0x065f46];
[2.1, 3.0].forEach((sy) => {
  const shelf = box(0.28, 0.06, 5.5, MAT.woodDark, 16.4, sy, -5.5); scene.add(shelf);
  for (let i = 0; i < 7; i++) {
    const bx = 16.4, bz = -7.8 + i * 0.78;
    const bottle = new THREE.Mesh(new THREE.LatheGeometry([
      new THREE.Vector2(0.0, 0.0), new THREE.Vector2(0.09, 0.0), new THREE.Vector2(0.1, 0.02),
      new THREE.Vector2(0.1, 0.3), new THREE.Vector2(0.045, 0.42), new THREE.Vector2(0.04, 0.5),
    ], 12), new THREE.MeshStandardMaterial({ color: bottleColors[(i + (sy > 2.5 ? 2 : 0)) % bottleColors.length], roughness: 0.15, metalness: 0.1 }));
    bottle.position.set(bx, sy + 0.03, bz); bottle.castShadow = true; scene.add(bottle);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 10), MAT.black);
    cap.position.set(bx, sy + 0.55, bz); scene.add(cap);
  }
});
// Máy pha cà phê espresso trên quầy: thân kim loại bo, vòi + ly
{
  const m = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.5), MAT.metal);
  body.position.y = 0.28; body.castShadow = true; m.add(body);
  const topBox = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.42), MAT.black);
  topBox.position.y = 0.6; m.add(topBox);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.08, 12), MAT.black);
  head.position.set(0, 0.12, 0.28); m.add(head);
  const cupM = new THREE.Mesh(GEO.cup, MAT.cupWhite);
  cupM.scale.setScalar(1.4); cupM.position.set(0, 0.05, 0.28); m.add(cupM);
  m.position.set(14.6, 1.18, -3.2); m.rotation.y = -Math.PI / 2; scene.add(m);
}
// Ghế đẩu quầy: đệm tròn bo + chân kim loại + vòng gác chân
for (let i = 0; i < 4; i++) {
  const sx = 12.6, sz = -8 + i * 1.7;
  const stoolSeat = new THREE.Mesh(new THREE.SphereGeometry(0.27, 18, 12), MAT.cushion);
  stoolSeat.scale.set(1, 0.35, 1); stoolSeat.position.set(sx, 0.76, sz); stoolSeat.castShadow = true; scene.add(stoolSeat);
  const sleg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8), MAT.metal);
  sleg.position.set(sx, 0.36, sz); addMesh(sleg);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.015, 8, 20), MAT.metal);
  ring.rotation.x = Math.PI / 2; ring.position.set(sx, 0.25, sz); scene.add(ring);
  const sbase = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.04, 16), MAT.black);
  sbase.position.set(sx, 0.02, sz); scene.add(sbase);
}

/* ============ BÀN + GHẾ — 25 BÀN × 4 GHẾ = 100 CHỖ ============ */
const clickable = []; // mesh -> seat / tv / char
function makeTable(tx, tz, zone) {
  const top = new THREE.Mesh(GEO.tableTop, MAT.wood); top.position.set(tx, 0.7, tz); addMesh(top);
  const leg = new THREE.Mesh(GEO.tableLeg, MAT.woodDark); leg.position.set(tx, 0, tz); addMesh(leg);
  // ly trang trí giữa bàn
  const cup = new THREE.Mesh(GEO.cup, MAT.cupWhite); cup.position.set(tx + 0.18, 0.82, tz - 0.1); addMesh(cup);
  // Đồ đặt bàn cho giống thật: đĩa nhỏ + bình hoa mini
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.02, 18), MAT.cupWhite);
  plate.position.set(tx - 0.22, 0.79, tz + 0.18); addMesh(plate);
  const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.14, 10), new THREE.MeshStandardMaterial({ color: 0x7dd3fc, roughness: 0.15 }));
  vase.position.set(tx + 0.32, 0.85, tz + 0.18); addMesh(vase);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.14, 6), MAT.leaf);
  stem.position.set(tx + 0.32, 0.97, tz + 0.18); scene.add(stem);
  const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.6 }));
  bloom.position.set(tx + 0.32, 1.05, tz + 0.18); scene.add(bloom);
  // 4 ghế ở nửa dưới (phía nam) của bàn, tất cả hướng mặt lên trên (về phía tivi)
  for (let s = 0; s < 4; s++) {
    const a = Math.PI * (s + 1) / 5; // 36°, 72°, 108°, 144°: nửa dưới của bàn
    const sx = tx + Math.cos(a) * 1.15, sz = tz + Math.sin(a) * 1.15;
    const chair = new THREE.Group();
    // Khung ghế gỗ + đệm ngồi vải bo tròn
    const seat = new THREE.Mesh(GEO.chairSeat, MAT.woodDark); seat.position.y = 0.45; seat.castShadow = true; chair.add(seat);
    const cushion = new THREE.Mesh(GEO.chairCushion, MAT.cushion);
    cushion.scale.set(0.95, 0.35, 0.95); cushion.position.y = 0.5; cushion.castShadow = true; chair.add(cushion);
    // Lưng ghế cong ôm lưng, hơi ngả ra sau
    const back = new THREE.Mesh(GEO.chairBack, MAT.woodBack);
    back.position.set(0, 0.78, -0.21); back.rotation.x = -0.1; back.castShadow = true; chair.add(back);
    // Chân ghế thon, hơi xòe ra ngoài
    [[-0.19, -0.19, 0.06, -0.06], [0.19, -0.19, -0.06, -0.06], [-0.19, 0.19, 0.06, 0.06], [0.19, 0.19, -0.06, 0.06]].forEach(([lx, lz, rx, rz]) => {
      const l = new THREE.Mesh(GEO.chairLeg, MAT.black);
      l.position.set(lx, 0.22, lz); l.rotation.x = rx; l.rotation.z = rz; chair.add(l);
    });
    chair.position.set(sx, 0, sz);
    // Ghế hướng mặt lên trên (về phía tivi, -z): lưng ghế quay về phía người xem
    chair.rotation.y = Math.PI;
    scene.add(chair);
    // ly cà phê hiện khi có người ngồi: đặt trên bàn ngay trước mặt người ngồi
    const tableCup = new THREE.Mesh(GEO.cup, MAT.cupWhite);
    tableCup.position.set(tx + Math.cos(a) * 0.6, 0.82, tz + Math.sin(a) * 0.6);
    tableCup.visible = false; scene.add(tableCup);
    const seatObj = { id: state.seats.length, table: { x: tx, z: tz }, zone, x: sx, z: sz, angle: Math.PI, occupiedBy: null, cup: tableCup, chair };
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
  const rug = new THREE.Mesh(new THREE.CircleGeometry(2.1, 32), new THREE.MeshStandardMaterial({ map: rugTexture(i % 2 ? '#0369a1' : '#be185d', i % 2 ? '#bae6fd' : '#f9a8d4'), roughness: 1 }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(x, 0.02, z); rug.receiveShadow = true; scene.add(rug);
});
// Sofa lounge: đệm ngồi + đệm lưng bo tròn (ellipsoid), tay vịn bo, chân gỗ
function makeSofa(x, z, mat) {
  const sofa = new THREE.Group();
  sofa.add(box(0.95, 0.4, 2.4, mat, 0, 0.25, 0)); // khung đế
  [-0.6, 0.6].forEach((dz) => { // đệm ngồi bo tròn
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), mat);
    c.scale.set(0.9, 0.32, 1.05); c.position.set(0, 0.48, dz); c.castShadow = true; sofa.add(c);
  });
  [-0.6, 0.6].forEach((dz) => { // đệm lưng bo tròn, hơi ngả
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), mat);
    c.scale.set(0.55, 0.75, 1.0); c.position.set(0, 0.85, dz); c.rotation.x = -0.18; c.castShadow = true; sofa.add(c);
  });
  [-1.15, 1.15].forEach((dz) => { // tay vịn bo tròn 2 đầu
    const a = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 12), mat);
    a.scale.set(0.95, 0.55, 0.75); a.position.set(0, 0.62, dz); a.castShadow = true; sofa.add(a);
  });
  [[-0.4, -1.05], [0.4, -1.05], [-0.4, 1.05], [0.4, 1.05]].forEach(([lx, lz]) => { // chân gỗ
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.12, 8), MAT.woodDark);
    l.position.set(lx, 0.06, lz); sofa.add(l);
  });
  sofa.position.set(x, 0, z); sofa.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
  scene.add(sofa);
}
makeSofa(-15.2, -1.5, MAT.sofa); makeSofa(-15.2, 1.5, MAT.sofa2); makeSofa(15.2, -1.5, MAT.sofa);

/* ============ CÂY + ĐÈN TREO + DÂY ĐÈN ============ */
function makePlant(x, z, s = 1) {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(GEO.pot, MAT.pot); pot.position.y = 0; pot.scale.setScalar(s); addMesh(pot, g);
  // Tán lá đầy hơn: cụm cầu xanh đậm/nhạt xen kẽ, hơi dẹt
  const blobs = [
    [0, 0.85, 0, 1], [0.28, 0.68, 0.12, 0.72], [-0.26, 0.7, -0.1, 0.78],
    [0.12, 0.95, -0.15, 0.6], [-0.14, 0.92, 0.16, 0.62], [0, 0.6, 0.28, 0.55],
    [0.05, 0.62, -0.28, 0.55],
  ];
  blobs.forEach(([bx, by, bz, bs], i) => {
    const b = new THREE.Mesh(GEO.bush, i % 2 ? MAT.leaf2 : MAT.leaf);
    b.position.set(bx * s, by * s, bz * s); b.scale.set(bs * s, bs * s * 0.85, bs * s); addMesh(b, g);
  });
  g.position.set(x, 0, z); scene.add(g);
}
[[-16, -8.5], [16, -8.5], [-16, 6], [16, 6], [-16, 14.5], [16, 14.5], [-10, 14.8], [10, 14.8]].forEach(([x, z]) => makePlant(x, z));
HALL_X.forEach((x) => HALL_Z.forEach((z) => {
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.2, 6), MAT.black);
  cord.position.set(x, 5.9, z); scene.add(cord);
  const shade = new THREE.Mesh(GEO.lampShade, new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.7, side: THREE.DoubleSide }));
  shade.position.set(x, 4.62, z); addMesh(shade);
  const bulb = new THREE.Mesh(GEO.bulb, new THREE.MeshStandardMaterial({ color: 0xfff7cc, emissive: 0xffdf80, emissiveIntensity: 3 }));
  bulb.position.set(x, 4.68, z); scene.add(bulb);
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
// Sân vườn: luống hoa dọc 2 biên + hàng rào cây cuối sân
{
  const flowerColors = [0xf472b6, 0xfacc15, 0xffffff, 0xfb7185, 0xc084fc];
  for (let x = -15; x <= 15; x += 1.2) {
    [-16, 16].forEach((zEdge) => {
      const z = zEdge + (Math.random() - 0.5) * 0.5;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6), MAT.leaf);
      stem.position.set(x, 0.15, z); scene.add(stem);
      const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshStandardMaterial({ color: flowerColors[Math.floor(Math.random() * flowerColors.length)], roughness: 0.6 }));
      bloom.position.set(x, 0.34, z); scene.add(bloom);
    });
  }
  // Hàng rào cây (hedge) cuối sân
  for (let x = -16; x <= 16; x += 1.1) {
    const h = new THREE.Mesh(GEO.bush, Math.random() < 0.5 ? MAT.leaf : MAT.leaf2);
    h.position.set(x, 0.4, 15.8); h.scale.set(1.1, 0.85, 0.9); addMesh(h);
  }
}
// Chùm sáng ấm dưới mỗi đèn treo (hình nón trong suốt, cộng sáng) cho cảm giác
// ánh đèn có thể tích chứ không chỉ là chấm sáng
{
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xffc978, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  HALL_X.forEach((x) => HALL_Z.forEach((z) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.5, 4.4, 20, 1, true), coneMat);
    cone.position.set(x, 2.55, z); scene.add(cone);
  }));
}
// Bụi bay lơ lửng trong ánh sáng (Points nhỏ, cộng sáng)
{
  const N = 220, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 32;
    pos[i * 3 + 1] = 0.5 + Math.random() * 5.5;
    pos[i * 3 + 2] = -9 + Math.random() * 24;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffe9b8, size: 0.045, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  dust.name = 'dust';
  scene.add(dust);
}
// Bóng tiếp xúc dưới mỗi bàn (đĩa mờ) để bàn ghế "đứng" chắc trên sàn
{
  const contactMat = new THREE.MeshBasicMaterial({ map: makeShadowTexture(), transparent: true, depthWrite: false, opacity: 0.85 });
  const tableSpots = [];
  HALL_X.forEach((x) => HALL_Z.forEach((z) => tableSpots.push([x, z])));
  HALL_X.forEach((x) => TERR_Z.forEach((z) => tableSpots.push([x, z])));
  [[-13, -4], [-13, 4], [13, -4], [13, 0], [13, 4]].forEach(([x, z]) => tableSpots.push([x, z]));
  tableSpots.forEach(([x, z]) => {
    const disc = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), contactMat);
    disc.rotation.x = -Math.PI / 2; disc.position.set(x, 0.015, z); scene.add(disc);
  });
}

/* ============ NHÂN VẬT 3D (LOW-POLY, CÓ KHỚP TAY CHÂN) ============ */
const SHARED_GEO = {
  body: new THREE.CapsuleGeometry(0.19, 0.34, 4, 14),
  head: new THREE.SphereGeometry(0.19, 24, 18), // đầu nhỏ lại kiểu anime (trước 0.26 chibi)
  eye: new THREE.SphereGeometry(0.04, 10, 8),
  blush: new THREE.SphereGeometry(0.04, 10, 8),
  ear: new THREE.SphereGeometry(0.045, 10, 8),
  smile: new THREE.TorusGeometry(0.035, 0.01, 8, 16, Math.PI),
  thigh: new THREE.CylinderGeometry(0.065, 0.052, 0.44, 10), // chân dài hơn
  shin: new THREE.CylinderGeometry(0.052, 0.042, 0.42, 10),
  upperArm: new THREE.CylinderGeometry(0.045, 0.038, 0.30, 10), // tay dài hơn
  foreArm: new THREE.CylinderGeometry(0.038, 0.033, 0.28, 10),
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
  // Chi tiết pack 14_power_couples: ve áo, áo sơ mi trong, mắt xích, mặt dây chuyền,
  // vòng tay, mắt kính, khuyên tai ngôi sao, dây giày
  lapel: new THREE.BoxGeometry(0.07, 0.24, 0.015),
  shirtV: new THREE.BoxGeometry(0.13, 0.36, 0.015),
  chainLink: new THREE.TorusGeometry(0.022, 0.007, 6, 10),
  pendant: new THREE.BoxGeometry(0.04, 0.05, 0.015),
  bracelet: new THREE.TorusGeometry(0.042, 0.008, 6, 16),
  lens: new THREE.BoxGeometry(0.085, 0.05, 0.02),
  star: new THREE.OctahedronGeometry(0.025),
  lace: new THREE.BoxGeometry(0.08, 0.012, 0.01),
};
SHARED_GEO.thigh.translate(0, -0.22, 0);
SHARED_GEO.shin.translate(0, -0.21, 0);
SHARED_GEO.upperArm.translate(0, -0.15, 0);
// Thân anime thon dài có eo (lathe): hông - eo - ngực - vai, cao 0.56
SHARED_GEO.torso = new THREE.LatheGeometry([
  new THREE.Vector2(0.0, -0.28), new THREE.Vector2(0.13, -0.28), new THREE.Vector2(0.155, -0.18),
  new THREE.Vector2(0.135, 0.0), new THREE.Vector2(0.155, 0.12), new THREE.Vector2(0.14, 0.2),
  new THREE.Vector2(0.085, 0.28), new THREE.Vector2(0.0, 0.28),
], 20);
// Bàn tay nhỏ hơn, thon hơn
SHARED_GEO.hand = new THREE.SphereGeometry(0.045, 12, 10);
// Giày bo tròn (không còn hộp vuông): thân giày + đế
SHARED_GEO.shoeRound = new THREE.SphereGeometry(0.09, 16, 12);
SHARED_GEO.shoeRound.scale(1, 0.62, 1.7);
SHARED_GEO.soleRound = new THREE.SphereGeometry(0.09, 16, 12);
SHARED_GEO.soleRound.scale(1.06, 0.28, 1.78);
// Váy xòe (lathe): eo nhỏ, xòe dần xuống, mép bo
SHARED_GEO.skirtLathe = new THREE.LatheGeometry([
  new THREE.Vector2(0.0, 0.0), new THREE.Vector2(0.2, 0.0), new THREE.Vector2(0.22, -0.06),
  new THREE.Vector2(0.28, -0.18), new THREE.Vector2(0.37, -0.32), new THREE.Vector2(0.38, -0.34),
  new THREE.Vector2(0.36, -0.35),
], 24);
// Váy liền dài (lathe)
SHARED_GEO.dressLathe = new THREE.LatheGeometry([
  new THREE.Vector2(0.0, 0.0), new THREE.Vector2(0.19, 0.0), new THREE.Vector2(0.2, -0.1),
  new THREE.Vector2(0.24, -0.3), new THREE.Vector2(0.33, -0.55), new THREE.Vector2(0.42, -0.68),
  new THREE.Vector2(0.43, -0.7), new THREE.Vector2(0.41, -0.71),
], 24);
// Mắt anime: to và cao hơn, mống mắt gradient, mi trên dày, lông mày mảnh
SHARED_GEO.eyeWhite = new THREE.SphereGeometry(0.05, 14, 10);
SHARED_GEO.iris = new THREE.SphereGeometry(0.032, 12, 10);
SHARED_GEO.pupil = new THREE.SphereGeometry(0.015, 10, 8);
SHARED_GEO.glint = new THREE.SphereGeometry(0.011, 8, 6);
SHARED_GEO.glint2 = new THREE.SphereGeometry(0.006, 8, 6);
SHARED_GEO.lash = new THREE.TorusGeometry(0.05, 0.013, 8, 16, Math.PI * 0.75);
SHARED_GEO.lashLower = new THREE.TorusGeometry(0.048, 0.006, 8, 16, Math.PI * 0.5);
SHARED_GEO.brow = new THREE.BoxGeometry(0.075, 0.012, 0.015);
SHARED_GEO.nose = new THREE.SphereGeometry(0.014, 8, 6);
// Cổ mảnh hơn, ngón cái, môi dưới
SHARED_GEO.neck = new THREE.CylinderGeometry(0.06, 0.07, 0.16, 12);
SHARED_GEO.thumb = new THREE.SphereGeometry(0.018, 8, 6);
SHARED_GEO.lip = new THREE.SphereGeometry(0.028, 12, 8);
// Tóc Genshin: lọn tóc hình giọt nước (nhọn ở ngọn, phồng ở gốc) để xếp lớp
SHARED_GEO.hairLock = new THREE.LatheGeometry([
  new THREE.Vector2(0.0, 0.0), new THREE.Vector2(0.05, 0.03), new THREE.Vector2(0.065, 0.12),
  new THREE.Vector2(0.055, 0.22), new THREE.Vector2(0.028, 0.3), new THREE.Vector2(0.0, 0.33),
], 12);
SHARED_GEO.hairBackVol = new THREE.SphereGeometry(0.2, 20, 14);
SHARED_GEO.bangLock = new THREE.CylinderGeometry(0.03, 0.016, 0.12, 8);
// Chi tiết quần áo: dây rút, khuy, gấu áo, sọc hông
SHARED_GEO.drawstring = new THREE.CylinderGeometry(0.012, 0.012, 0.12, 6);
SHARED_GEO.button = new THREE.SphereGeometry(0.018, 8, 6);
SHARED_GEO.hemBand = new THREE.TorusGeometry(0.19, 0.018, 8, 20);
SHARED_GEO.sideStripe = new THREE.BoxGeometry(0.03, 0.36, 0.02);

// Bóng mềm dưới chân: gradient tròn (đậm ở giữa, mờ dần ra mép) để bóng
// trông như bóng thật chứ không phải đĩa đen cứng có viền; mềm hơn và rộng
// hơn bản cũ để hòa với bóng thật của mặt trời
function makeShadowTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0,0,0,0.32)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0.16)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(cv);
}
const SHADOW_TEX = makeShadowTexture();
SHARED_GEO.foreArm.translate(0, -0.14, 0);

/* ---- Trang phục + phụ kiện: mỗi loại món đồ là 1 hàm dựng riêng,
   buildOutfit chỉ việc tra bảng OUTFITS rồi gọi đúng hàm theo type ---- */
function buildOutfit(spec, outfit, P, M) {
  const add = (parent, mesh, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz); mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true; parent.add(mesh); return mesh;
  };
  const mat = (c, r = 0.7) => toonMat(c);
  const white = toonMat(0xffffff);
  /* Tóc Genshin: nhiều lớp, lọn tóc hình giọt nước, highlight sáng ở lớp trên */
  // Lớp tóc sau đầu (độ phồng) cho các kiểu tóc ngắn
  if (['short', 'spiky', 'curly', 'bob'].includes(outfit.hair?.type)) {
    add(P.head, new THREE.Mesh(SHARED_GEO.hairBackVol, M.hairMat), 0, 0.03, -0.05, 0, 0, 0, 1, 0.95, 0.9);
  }
  if (outfit.hair?.type === 'spiky') {
    add(P.head, new THREE.Mesh(SHARED_GEO.hairShort, M.hairMat), 0, 0.07, -0.01, 0, 0, 0, 1, 0.55, 1);
    // Gai nhọn tỏa ra quanh đỉnh đầu
    [[-0.16, 0.02, -0.08, 0.9], [0.16, 0.02, -0.08, -0.9], [0, 0.0, -0.17, 0], [-0.1, 0.12, 0.02, 0.5], [0.1, 0.12, 0.02, -0.5], [0, 0.14, -0.05, 0]].forEach(([x, y, z, rz]) =>
      add(P.head, new THREE.Mesh(SHARED_GEO.hairCone, M.hairMat), x, y, z, 0, 0, rz));
    // Lọn highlight trên đỉnh
    [[-0.06, 0.14, 0.03, 0.4], [0.06, 0.14, 0.03, -0.4]].forEach(([x, y, z, rz]) =>
      add(P.head, new THREE.Mesh(SHARED_GEO.hairCone, M.hairHi), x, y, z, 0, 0, rz));
    // Mái ngang vài lọn
    [-0.09, 0, 0.09].forEach((x) =>
      add(P.head, new THREE.Mesh(SHARED_GEO.bangLock, M.hairMat), x, 0.09, 0.15, 0.25, 0, 0));
  } else if (outfit.hair?.type === 'short') {
    add(P.head, new THREE.Mesh(SHARED_GEO.hairShort, M.hairMat), 0, 0.07, -0.01, 0, 0, 0, 1, 0.5, 1);
    [-0.1, -0.035, 0.035, 0.1].forEach((x) =>
      add(P.head, new THREE.Mesh(SHARED_GEO.bangLock, M.hairMat), x, 0.07, 0.15, 0.3, 0, 0));
    // Lọn highlight mái
    add(P.head, new THREE.Mesh(SHARED_GEO.bangLock, M.hairHi), 0, 0.1, 0.15, 0.25, 0, 0);
  } else if (outfit.hair?.type === 'curly') {
    [[0, 0.15, 0], [-0.1, 0.1, 0.04], [0.1, 0.1, 0.04], [-0.05, 0.12, -0.09], [0.06, 0.11, -0.09], [-0.15, 0.03, -0.03], [0.15, 0.03, -0.03], [0, 0.07, -0.15]].forEach(([x, y, z]) =>
      add(P.head, new THREE.Mesh(SHARED_GEO.curl, M.hairMat), x, y, z));
    // Lọn xoăn highlight trên đỉnh
    [[-0.05, 0.17, 0.02], [0.06, 0.16, 0.02]].forEach(([x, y, z]) =>
      add(P.head, new THREE.Mesh(SHARED_GEO.curl, M.hairHi), x, y, z));
  } else if (outfit.hair?.type === 'bob') {
    add(P.head, new THREE.Mesh(SHARED_GEO.hairShort, M.hairMat), 0, 0.06, -0.01, 0, 0, 0, 1, 0.7, 1);
    [-0.15, 0.15].forEach((x) =>
      add(P.head, new THREE.Mesh(SHARED_GEO.bobSide, M.hairMat), x, -0.06, 0.03));
    // Lọn highlight 2 bên
    [-0.13, 0.13].forEach((x) =>
      add(P.head, new THREE.Mesh(SHARED_GEO.bobSide, M.hairHi), x, 0.02, 0.08, 0, 0, 0, 0.8, 0.8, 0.8));
  } else if (outfit.hair?.type === 'ponytail') {
    add(P.head, new THREE.Mesh(SHARED_GEO.hairShort, M.hairMat), 0, 0.07, -0.01, 0, 0, 0, 1, 0.6, 1);
    add(P.head, new THREE.Mesh(SHARED_GEO.tail, M.hairMat), 0, -0.1, -0.2, 0.5, 0, 0);
    add(P.head, new THREE.Mesh(SHARED_GEO.tailTie, mat(0xec4899)), 0, 0.04, -0.19);
    // Lọn tóc đuôi ngựa highlight
    add(P.head, new THREE.Mesh(SHARED_GEO.hairLock, M.hairHi), 0.05, -0.05, -0.22, 0.6, 0, 0, 0.8, 0.8, 0.8);
  } else if (outfit.hair?.type === 'bun') {
    add(P.head, new THREE.Mesh(SHARED_GEO.hairShort, M.hairMat), 0, 0.07, -0.01, 0, 0, 0, 1, 0.6, 1);
    add(P.head, new THREE.Mesh(SHARED_GEO.bun, M.hairMat), 0, 0.2, -0.03);
    add(P.head, new THREE.Mesh(SHARED_GEO.bun, M.hairHi), 0, 0.24, 0.02, 0, 0, 0, 0.6, 0.6, 0.6);
  } else if (outfit.hair?.type === 'long') {
    add(P.head, new THREE.Mesh(SHARED_GEO.bang, M.hairMat), 0, 0.09, -0.02, 0, 0, 0, 1, 0.5, 1);
    add(P.head, new THREE.Mesh(SHARED_GEO.hairBack, M.hairMat), 0, -0.18, -0.15, 0, 0, 0, 1, 1, 0.5);
    // 2 lọn tóc dài 2 bên (hình giọt nước) + highlight
    [-0.18, 0.18].forEach((x) => {
      add(P.head, new THREE.Mesh(SHARED_GEO.hairLock, M.hairMat), x, -0.1, 0.06, 0.15, 0, x > 0 ? -0.15 : 0.15);
      add(P.head, new THREE.Mesh(SHARED_GEO.hairLock, M.hairHi), x * 0.85, -0.05, 0.1, 0.1, 0, x > 0 ? -0.2 : 0.2, 0.7, 0.7, 0.7);
    });
    if (outfit.hair.bow) {
      const bowM = mat(outfit.hair.bow);
      add(P.head, new THREE.Mesh(SHARED_GEO.bowWing, bowM), 0.08, 0.14, 0.08, 0, 0, 0.5);
      add(P.head, new THREE.Mesh(SHARED_GEO.bowWing, bowM), 0.18, 0.14, 0.06, 0, 0, -0.5);
      add(P.head, new THREE.Mesh(SHARED_GEO.bowKnot, bowM), 0.13, 0.14, 0.08);
    }
  }
  /* Nón (tỉ lệ theo đầu nhỏ r 0.19) */
  if (outfit.hat?.type === 'snapback') {
    add(P.head, new THREE.Mesh(SHARED_GEO.capTop, mat(outfit.hat.main)), 0, 0.07, -0.01, 0, 0, 0, 1, 0.55, 1);
    add(P.head, new THREE.Mesh(SHARED_GEO.capBrim, mat(outfit.hat.brim)), 0, 0.06, 0.2, 0.1, 0, 0);
    add(P.head, new THREE.Mesh(SHARED_GEO.capBtn, mat(outfit.hat.main)), 0, 0.18, 0);
    add(P.head, new THREE.Mesh(SHARED_GEO.capLogo, mat(outfit.hat.logo)), 0, 0.1, 0.18);
  } else if (outfit.hat?.type === 'beret') {
    add(P.head, new THREE.Mesh(SHARED_GEO.beret, mat(outfit.hat.main)), 0.06, 0.15, 0, 0, 0, -0.25, 1, 0.35, 1);
    add(P.head, new THREE.Mesh(SHARED_GEO.beretStem, mat(outfit.hat.main)), 0.1, 0.22, 0, 0, 0, -0.25);
  } else if (outfit.hat?.type === 'beanie') {
    add(P.head, new THREE.Mesh(SHARED_GEO.beanieDome, mat(outfit.hat.main)), 0, 0.09, 0, 0, 0, 0, 1, 0.6, 1);
    add(P.head, new THREE.Mesh(SHARED_GEO.beanieBrim, mat(outfit.hat.main)), 0, 0.06, 0);
    add(P.head, new THREE.Mesh(SHARED_GEO.pom, mat(outfit.hat.pom)), 0, 0.22, 0);
  } else if (outfit.hat?.type === 'sunhat') {
    add(P.head, new THREE.Mesh(SHARED_GEO.sunBrim, mat(outfit.hat.main)), 0, 0.1, 0);
    add(P.head, new THREE.Mesh(SHARED_GEO.sunDome, mat(outfit.hat.main)), 0, 0.1, 0, 0, 0, 0, 1, 0.7, 1);
    add(P.head, new THREE.Mesh(SHARED_GEO.sunBand, mat(outfit.hat.band)), 0, 0.12, 0, Math.PI / 2, 0, 0);
  } else if (outfit.hat?.type === 'headband') {
    add(P.head, new THREE.Mesh(SHARED_GEO.headband, mat(outfit.hat.main)), 0, 0.07, 0, 0.25, 0, 0);
  }
  /* Áo (thân giờ ở y 1.18, vai 1.46 — dời chi tiết lên ~0.18) */
  if (outfit.top?.type === 'hoodie') {
    add(P.rig, new THREE.Mesh(SHARED_GEO.hood, M.shirt), 0, 1.46, -0.12, 0, 0, 0, 1, 0.6, 0.7);
    add(P.rig, new THREE.Mesh(SHARED_GEO.pocket, mat(outfit.top.pocket)), 0, 1.06, 0.15);
    [-0.05, 0.05].forEach((x) =>
      add(P.rig, new THREE.Mesh(SHARED_GEO.drawstring, mat(outfit.top.pocket)), x, 1.38, 0.16, 0.12, 0, 0));
    add(P.rig, new THREE.Mesh(SHARED_GEO.hemBand, mat(outfit.top.pocket)), 0, 1.0, 0, Math.PI / 2, 0, 0);
  } else if (outfit.top?.type === 'blouse') {
    add(P.rig, new THREE.Mesh(SHARED_GEO.collar, white), 0, 1.42, 0, Math.PI / 2, 0, 0);
    [1.36, 1.26, 1.16, 1.06].forEach((y) =>
      add(P.rig, new THREE.Mesh(SHARED_GEO.button, white), 0, y, 0.16));
  } else if (outfit.top?.type === 'denim') {
    add(P.rig, new THREE.Mesh(SHARED_GEO.collar, mat(outfit.top.pocket)), 0, 1.42, 0, Math.PI / 2, 0, 0);
    [-0.075, 0.075].forEach((x) =>
      add(P.rig, new THREE.Mesh(SHARED_GEO.chestPocket, mat(outfit.top.pocket)), x, 1.33, 0.155));
    // Áo khoác mở để lộ áo sơ mi trắng + ve áo (pack char 2: denim đen + sơ mi trắng)
    if (outfit.top.shirt) {
      add(P.rig, new THREE.Mesh(SHARED_GEO.shirtV, mat(outfit.top.shirt)), 0, 1.24, 0.155);
      add(P.rig, new THREE.Mesh(SHARED_GEO.lapel, mat(outfit.top.main)), -0.09, 1.36, 0.16, 0, 0, 0.35);
      add(P.rig, new THREE.Mesh(SHARED_GEO.lapel, mat(outfit.top.main)), 0.09, 1.36, 0.16, 0, 0, -0.35);
    } else {
      add(P.rig, new THREE.Mesh(SHARED_GEO.zipper, mat(outfit.top.pocket)), 0, 1.23, 0.16);
    }
    [1.38, 1.28, 1.18, 1.08].forEach((y) =>
      add(P.rig, new THREE.Mesh(SHARED_GEO.button, mat(0xd1d5db)), 0.02, y, 0.165));
  } else if (outfit.top?.type === 'sport') {
    add(P.rig, new THREE.Mesh(SHARED_GEO.stripe, mat(outfit.top.stripe)), 0, 1.33, 0.155);
    add(P.rig, new THREE.Mesh(SHARED_GEO.collar, white), 0, 1.42, 0, Math.PI / 2, 0, 0);
    [-0.14, 0.14].forEach((x) =>
      add(P.rig, new THREE.Mesh(SHARED_GEO.sideStripe, mat(outfit.top.stripe)), x, 1.23, 0.02, 0, 0, 0));
  } else if (outfit.top?.type === 'sweater') {
    add(P.rig, new THREE.Mesh(SHARED_GEO.turtle, M.shirt), 0, 1.52, 0);
    add(P.rig, new THREE.Mesh(SHARED_GEO.hemBand, M.shirt), 0, 1.0, 0, Math.PI / 2, 0, 0);
  } else if (outfit.top?.type === 'dress') {
    add(P.rig, new THREE.Mesh(SHARED_GEO.dressLathe, M.shirt), 0, 1.36, 0);
    add(P.rig, new THREE.Mesh(SHARED_GEO.dressBelt, mat(outfit.top.belt)), 0, 1.18, 0, Math.PI / 2, 0, 0);
    // Áo blazer trắng khoác ngoài váy (pack char 1): ve áo + khuy + túi ngực
    if (outfit.top.blazer) {
      const blazerM = mat(outfit.top.blazer);
      add(P.rig, new THREE.Mesh(SHARED_GEO.lapel, blazerM), -0.09, 1.36, 0.16, 0, 0, 0.35);
      add(P.rig, new THREE.Mesh(SHARED_GEO.lapel, blazerM), 0.09, 1.36, 0.16, 0, 0, -0.35);
      [1.38, 1.26, 1.14].forEach((y) =>
        add(P.rig, new THREE.Mesh(SHARED_GEO.button, mat(0x111827)), 0, y, 0.165));
      add(P.rig, new THREE.Mesh(SHARED_GEO.chestPocket, blazerM), -0.1, 1.3, 0.16);
    }
  }
  /* Quần / váy (hông giờ ở y 0.90) */
  if (outfit.bottom?.type === 'cargo') {
    [P.legL, P.legR].forEach((leg) =>
      add(leg.thigh, new THREE.Mesh(SHARED_GEO.cargoPocket, mat(outfit.bottom.pocket)), 0.02, -0.14, 0.06));
    // Thắt lưng + khóa + dây xích treo hông (pack char 2: belt + chain)
    if (outfit.bottom.belt) {
      add(P.rig, new THREE.Mesh(SHARED_GEO.belt, mat(outfit.bottom.belt)), 0, 0.95, 0, Math.PI / 2, 0, 0);
      add(P.rig, new THREE.Mesh(SHARED_GEO.buckle, mat(0xd1d5db)), 0, 0.95, 0.17);
    }
    if (outfit.bottom.chain) {
      // Dây xích treo từ thắt lưng xuống đùi phải: 5 mắt xích bạc
      for (let i = 0; i < 5; i++) {
        add(P.rig, new THREE.Mesh(SHARED_GEO.chainLink, mat(0xd1d5db)), 0.16, 0.9 - i * 0.045, 0.16, 0, 0, i % 2 ? Math.PI / 2 : 0);
      }
    }
  } else if (outfit.bottom?.type === 'skirt') {
    add(P.rig, new THREE.Mesh(SHARED_GEO.skirtLathe, mat(outfit.bottom.main, 0.8)), 0, 0.9, 0);
    add(P.rig, new THREE.Mesh(SHARED_GEO.waistband, mat(outfit.bottom.band)), 0, 0.89, 0, Math.PI / 2, 0, 0);
    // Lớp váy ngoài xòe hơn (kiểu Genshin 2 lớp): đặt thấp xuống để mép trên
    // giấu trong váy chính, chỉ mép dưới xòe ra ngoài tạo lớp kép ở gấu váy
    add(P.rig, new THREE.Mesh(SHARED_GEO.skirtLathe, mat(outfit.bottom.band, 0.8)), 0, 0.84, 0, 0, 0, 0, 1.1, 0.8, 1.1);
  } else if (outfit.bottom?.type === 'jeans') {
    add(P.rig, new THREE.Mesh(SHARED_GEO.belt, mat(0x111827)), 0, 0.95, 0, Math.PI / 2, 0, 0);
    add(P.rig, new THREE.Mesh(SHARED_GEO.buckle, mat(0xfacc15)), 0, 0.95, 0.17);
  } else if (outfit.bottom?.type === 'shorts') {
    [P.legL, P.legR].forEach((leg) =>
      add(leg.thigh, new THREE.Mesh(SHARED_GEO.shortsLeg, mat(outfit.bottom.main, 0.85)), 0, -0.09, 0));
  }
  /* Túi xách */
  if (outfit.bag?.type === 'crossbody') {
    const bagM = mat(outfit.bag.main);
    add(P.rig, new THREE.Mesh(SHARED_GEO.bagStrap, bagM), 0, 1.2, 0.17, 0, 0, -0.83);
    add(P.rig, new THREE.Mesh(SHARED_GEO.bag, bagM), 0.19, 1.0, 0.08, 0, 0, -0.15);
  }
  /* Phụ kiện pack 14_power_couples: dây chuyền, vòng tay, kính râm, khuyên tai sao */
  if (outfit.necklace) {
    const nM = mat(outfit.necklace.main);
    add(P.rig, new THREE.Mesh(SHARED_GEO.collar, nM), 0, 1.44, 0, Math.PI / 2, 0, 0, 0.55, 0.55, 0.55);
    add(P.rig, new THREE.Mesh(SHARED_GEO.pendant, nM), 0, 1.32, 0.17);
  }
  if (outfit.bracelet) {
    const bM = mat(outfit.bracelet.main);
    [P.armL, P.armR].forEach((arm) =>
      add(arm.fore, new THREE.Mesh(SHARED_GEO.bracelet, bM), 0, -0.24, 0, Math.PI / 2, 0, 0));
  }
  if (outfit.glasses) {
    const gM = mat(outfit.glasses.main);
    // Kính râm to che cả mắt (đặt trước cả điểm sáng mắt ở z 0.19)
    [-0.07, 0.07].forEach((x) =>
      add(P.head, new THREE.Mesh(SHARED_GEO.lens, gM), x, 0.03, 0.21, 0, 0, 0, 1.25, 1.3, 1));
    add(P.head, new THREE.Mesh(SHARED_GEO.lens, gM), 0, 0.035, 0.21, 0, 0, 0, 0.3, 0.5, 1);
  }
  if (outfit.earrings) {
    const eM = mat(outfit.earrings.main);
    // Khuyên tai sao treo thấp ra trước để khỏi bị tóc dài che
    [-0.19, 0.19].forEach((x) =>
      add(P.head, new THREE.Mesh(SHARED_GEO.star, eM), x, -0.12, 0.06));
  }
  /* Giày (cẳng chân giờ dài 0.42 — giày ở cuối cẳng) */
  [P.legL, P.legR].forEach((leg) => {
    if (outfit.shoes?.type === 'sneakers') {
      add(leg.shin, new THREE.Mesh(SHARED_GEO.shoeRound, mat(outfit.shoes.main, 0.5)), 0, -0.38, 0.05);
      add(leg.shin, new THREE.Mesh(SHARED_GEO.soleRound, mat(outfit.shoes.sole)), 0, -0.42, 0.05);
    } else if (outfit.shoes?.type === 'maryjane') {
      add(leg.shin, new THREE.Mesh(SHARED_GEO.sock, white), 0, -0.22, 0);
      add(leg.shin, new THREE.Mesh(SHARED_GEO.shoeRound, mat(outfit.shoes.main, 0.5)), 0, -0.38, 0.05);
      add(leg.shin, new THREE.Mesh(SHARED_GEO.strap, mat(outfit.shoes.main)), 0, -0.34, 0.04);
    } else if (outfit.shoes?.type === 'boots') {
      add(leg.shin, new THREE.Mesh(SHARED_GEO.bootShaft, mat(outfit.shoes.main, 0.6)), 0, -0.27, 0);
      add(leg.shin, new THREE.Mesh(SHARED_GEO.shoeRound, mat(outfit.shoes.main, 0.5)), 0, -0.38, 0.05);
      add(leg.shin, new THREE.Mesh(SHARED_GEO.soleRound, mat(outfit.shoes.sole)), 0, -0.42, 0.05);
      // Dây giày buộc ngang cổ bốt (pack char 2: lace-up boots)
      if (outfit.shoes.laces) {
        [-0.22, -0.26, -0.3].forEach((y) =>
          add(leg.shin, new THREE.Mesh(SHARED_GEO.lace, mat(0x111827)), 0, y, 0.065));
      }
    } else if (outfit.shoes?.type === 'sandals') {
      add(leg.shin, new THREE.Mesh(SHARED_GEO.soleRound, mat(outfit.shoes.main, 0.6)), 0, -0.42, 0.05);
      add(leg.shin, new THREE.Mesh(SHARED_GEO.sandalStrap, mat(outfit.shoes.main)), 0, -0.37, 0.08);
    }
  });
}

/* ---- Nhân vật GLB thật (Jake / Miku, file Meshy AI) ----
   Clone GLB đã tải trước, gắn mixer. Cả 2 cao 1,70m, chân ở y=0 nên không
   cần scale/nâng như Chibi trước đây. Mặt hướng +Z (đã kiểm chứng bằng
   render trước/sau: camera +Z thấy mặt, -Z thấy lưng/đuôi).
   Sit/Drink KHÔNG có clip sẵn trong file gốc -> làm bằng code (xem
   updateGLBCharacter): sau mixer.update() sẽ xoay trực tiếp xương đùi/cẳng/
   tay phải theo góc đã đo bằng ảnh test thật (đùi rotateX -1.5, cẳng +1.45,
   tay uống -1.30/-1.55). Không làm clip Blender vì tail xương Meshy bị rác
   (hướng tail vô nghĩa) nên trục xoay trong Blender đoán không ra. */
function buildGLBCharacter(spec) {
  const group = new THREE.Group();
  const model = SkeletonUtils.clone(glbData[spec.glb].scene);
  group.add(model);
  // Tìm xương cần dùng (tên xương Jake và Miku giống hệt nhau)
  const bones = {};
  model.traverse((o) => { if (o.isBone) bones[o.name] = o; });
  const headBone = bones.Head || model;
  const handBoneR = bones.RightHand;
  // Ly cà phê gắn vào tay phải (hiện khi uống, như nhân vật thường)
  const cupG = new THREE.Group(); cupG.position.set(0, -0.08, 0.05);
  const cupM = new THREE.Mesh(SHARED_GEO.cup, MAT.cupWhite); cupM.castShadow = true; cupG.add(cupM);
  const cof = new THREE.Mesh(SHARED_GEO.coffeeTop, MAT.coffee); cof.position.y = 0.04; cupG.add(cof);
  cupG.visible = false;
  if (handBoneR) handBoneR.add(cupG); else model.add(cupG);
  // Bóng mềm dưới chân
  const shadowDisc = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.95), new THREE.MeshBasicMaterial({ map: SHADOW_TEX, transparent: true, depthWrite: false }));
  shadowDisc.rotation.x = -Math.PI / 2; shadowDisc.position.set(-0.12, 0.02, -0.08); group.add(shadowDisc);
  // Animation mixer + các clip (Idle, Walk đã gộp trong file)
  const mixer = new THREE.AnimationMixer(model);
  const clips = {};
  glbData[spec.glb].animations.forEach((clip) => { clips[clip.name] = mixer.clipAction(clip); });
  // Thu thập chất liệu để làm mờ khi che tầm nhìn (như nhân vật thường).
  // QUAN TRỌNG: SkeletonUtils.clone() share material giữa các bản clone,
  // nên phải clone material riêng cho từng người, không thì mờ 1 người là
  // mờ cả quán (cùng 1 material instance).
  const mats = [];
  model.traverse((o) => {
    if (o.isMesh && o.material && o.material !== MAT.cupWhite && o.material !== MAT.coffee) {
      o.material = o.material.clone();
      o.material.baseOpacity = o.material.opacity;
      o.material.userData.keepTransparent = o.material.transparent;
      if (!mats.includes(o.material)) mats.push(o.material);
    }
    if (o.isMesh) o.castShadow = true;
  });
  // Xương dùng cho tư thế ngồi/uống bằng code + tư thế gốc (bind pose) của chúng.
  // Mixer ghi đè quaternion mỗi frame nên phải lưu base để tính target tuyệt đối.
  const poseBones = {};
  const POSE_NAMES = { thighL: 'LeftUpLeg', thighR: 'RightUpLeg', shinL: 'LeftLeg', shinR: 'RightLeg', armR: 'RightArm', foreR: 'RightForeArm', head: 'Head' };
  for (const [key, name] of Object.entries(POSE_NAMES)) {
    if (bones[name]) poseBones[key] = { bone: bones[name], base: bones[name].quaternion.clone() };
  }
  const hipsRestY = bones.Hips ? bones.Hips.position.y : 0.95;
  // parts giả lập đủ cho code chung (tên/bong bóng dùng head, uống dùng cupG)
  const dummy = () => ({ rotation: { x: 0 }, position: { x: 0, y: 0, z: 0 } });
  const parts = {
    body: dummy(), head: headBone, cupG,
    legL: { thigh: dummy(), shin: dummy() }, legR: { thigh: dummy(), shin: dummy() },
    armL: { upper: dummy(), fore: dummy() }, armR: { upper: dummy(), fore: dummy() },
  };
  return { group, rig: group, mats, parts, mixer, clips, isGLB: true, headBone, bones, poseBones, hipsRestY, _sitK: 0 };
}

function buildCharacter(spec) {
  if (spec.glb) {
    if (!glbData[spec.glb]) return buildCharacter({ ...spec, glb: null, outfit: 'male', outfitId: 'street' }); // GLB chưa tải xong/lỗi: tạm dùng Milo
    return buildGLBCharacter(spec);
  }
  const outfit = OUTFITS[spec.outfit]?.[spec.outfitId] || Object.values(OUTFITS[spec.outfit])[0];
  // Cel-shading kiểu Genshin: da/áo/tóc dùng toon material (3 vùng sáng rõ rệt)
  const skin = toonMat(spec.skin);
  const shirt = toonMat(outfit.top.main);
  // Váy, váy liền và quần đùi để chân trần nên chân dùng màu da
  const legsSkin = ['skirt', 'dress', 'shorts'].includes(outfit.bottom.type);
  const pants = toonMat(legsSkin ? spec.skin : outfit.bottom.main);
  const hairMat = toonMat(spec.hair);
  // Màu highlight cho tóc (sáng hơn ~45% để làm lọn tóc nổi)
  const hairHi = toonMat(lightenHex(spec.hair, 0.45));
  const group = new THREE.Group();
  const rig = new THREE.Group(); group.add(rig);
  // Chân dài kiểu anime (đùi 0.44 + cẳng 0.42) — hông ở y 0.90, nhân vật cao ~1,85
  function makeLeg(side) {
    const thigh = new THREE.Group(); thigh.position.set(0.085 * side, 0.9, 0); rig.add(thigh);
    const tm = new THREE.Mesh(SHARED_GEO.thigh, pants); tm.castShadow = true; thigh.add(tm);
    const shin = new THREE.Group(); shin.position.set(0, -0.44, 0); thigh.add(shin);
    const sm = new THREE.Mesh(SHARED_GEO.shin, pants); sm.castShadow = true; shin.add(sm);
    return { thigh, shin };
  }
  const legL = makeLeg(-1), legR = makeLeg(1);
  // Thân anime thon dài có eo (lathe), tâm ở y 1.18 (0.90–1.46)
  const body = new THREE.Mesh(SHARED_GEO.torso, shirt); body.position.y = 1.18; body.castShadow = true; rig.add(body);
  // Tay dài kiểu anime, tay phải cầm ly; bàn tay thon có ngón cái
  function makeArm(side) {
    const upper = new THREE.Group(); upper.position.set(0.2 * side, 1.42, 0); rig.add(upper);
    const um = new THREE.Mesh(SHARED_GEO.upperArm, shirt); um.castShadow = true; upper.add(um);
    const fore = new THREE.Group(); fore.position.set(0, -0.3, 0); upper.add(fore);
    const fm = new THREE.Mesh(SHARED_GEO.foreArm, skin); fm.castShadow = true; fore.add(fm);
    // Hình xăm tribal quấn cẳng tay (pack 14_power_couples: tattoo rồng/hoa/văn)
    if (outfit.tattoo) {
      const tat = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.038, 0.09, 10), toonMat(outfit.tattoo.main ?? 0x111827));
      tat.position.y = -0.14; tat.castShadow = true; fore.add(tat);
    }
    const hand = new THREE.Mesh(SHARED_GEO.hand, skin); hand.position.set(0, -0.28, 0); hand.castShadow = true; fore.add(hand);
    const thumb = new THREE.Mesh(SHARED_GEO.thumb, skin); thumb.position.set(-0.04 * side, -0.27, 0.025); fore.add(thumb);
    return { upper, fore };
  }
  const armL = makeArm(-1), armR = makeArm(1);
  const cupG = new THREE.Group(); cupG.position.set(0, -0.28, 0.04);
  const cupM = new THREE.Mesh(SHARED_GEO.cup, MAT.cupWhite); cupM.castShadow = true; cupG.add(cupM);
  const cof = new THREE.Mesh(SHARED_GEO.coffeeTop, MAT.coffee); cof.position.y = 0.04; cupG.add(cof);
  armR.fore.add(cupG);
  cupG.visible = false; // bình thường tay không cầm ly, chỉ cầm khi đang uống
  // Đầu anime: nhỏ hơn (r 0.19), mắt to lấp lánh, mi dày, lông mày mảnh, môi, má hồng
  const head = new THREE.Group(); head.position.y = 1.66; rig.add(head);
  const headM = new THREE.Mesh(SHARED_GEO.head, skin); headM.castShadow = true; head.add(headM);
  addOutline(head, SHARED_GEO.head, 1.04); // viền đậm quanh đầu kiểu anime
  const neck = new THREE.Mesh(SHARED_GEO.neck, skin); neck.position.y = -0.16; head.add(neck);
  const eyeWhiteM = toonMat(0xffffff);
  const irisM = new THREE.MeshToonMaterial({ map: irisTexture(spec.eye ?? 0x5b3a1e), gradientMap: TOON_GRAD });
  const darkM = toonMat(0x111111);
  const glintM = new THREE.MeshBasicMaterial({ color: 0xffffff });
  [-0.07, 0.07].forEach((x) => {
    const w = new THREE.Mesh(SHARED_GEO.eyeWhite, eyeWhiteM);
    w.position.set(x, 0.03, 0.155); w.scale.set(1, 1.35, 0.4); head.add(w);
    const ir = new THREE.Mesh(SHARED_GEO.iris, irisM);
    ir.position.set(x, 0.028, 0.172); ir.scale.set(1, 1.25, 0.45); head.add(ir);
    const pu = new THREE.Mesh(SHARED_GEO.pupil, darkM);
    pu.position.set(x, 0.028, 0.185); pu.scale.set(1, 1.3, 0.45); head.add(pu);
    const gl = new THREE.Mesh(SHARED_GEO.glint, glintM);
    gl.position.set(x + 0.012, 0.048, 0.19); head.add(gl);
    const gl2 = new THREE.Mesh(SHARED_GEO.glint2, glintM);
    gl2.position.set(x - 0.014, 0.012, 0.19); head.add(gl2);
    // Mi trên dày + mi dưới mảnh
    const lash = new THREE.Mesh(SHARED_GEO.lash, darkM);
    lash.position.set(x, 0.062, 0.162); lash.rotation.set(0.2, 0, Math.PI * 0.12); head.add(lash);
    const lashLo = new THREE.Mesh(SHARED_GEO.lashLower, darkM);
    lashLo.position.set(x, -0.012, 0.16); lashLo.rotation.set(0.15, 0, Math.PI * 1.15); head.add(lashLo);
    const brow = new THREE.Mesh(SHARED_GEO.brow, hairMat);
    brow.position.set(x, 0.105, 0.165); brow.rotation.z = x < 0 ? 0.1 : -0.1; head.add(brow);
  });
  const nose = new THREE.Mesh(SHARED_GEO.nose, skin); nose.position.set(0, -0.015, 0.185); head.add(nose);
  // Môi dưới hồng, hơi mọng (đỏ đậm nếu bộ đồ yêu cầu — pack char 1: môi đỏ)
  const lipM = toonMat(outfit.lips ?? 0xe87a7a);
  const lip = new THREE.Mesh(SHARED_GEO.lip, lipM);
  lip.position.set(0, -0.095, 0.172); lip.scale.set(1.1, 0.5, 0.45); head.add(lip);
  const blushM = new THREE.MeshToonMaterial({ color: 0xfda4af, gradientMap: TOON_GRAD, transparent: true, opacity: 0.65 });
  [-0.12, 0.12].forEach((x) => {
    const b = new THREE.Mesh(SHARED_GEO.blush, blushM);
    b.position.set(x, -0.035, 0.145); b.scale.set(1, 0.7, 0.35); head.add(b);
  });
  [-0.185, 0.185].forEach((x) => {
    const ear = new THREE.Mesh(SHARED_GEO.ear, skin); ear.position.set(x, 0.01, 0); head.add(ear);
  });
  const smile = new THREE.Mesh(SHARED_GEO.smile, darkM);
  smile.position.set(0, -0.06, 0.175); smile.rotation.set(0.15, 0, Math.PI); head.add(smile);
  // Trang phục + phụ kiện theo bảng OUTFITS
  buildOutfit(spec, outfit, { rig, head, legL, legR, body, armL, armR }, { skin, shirt, pants, hairMat, hairHi });
  // Bóng mềm dưới chân (gradient mờ dần, không viền cứng): hơi bầu dục và
  // lệch nhẹ ngược hướng mặt trời (mặt trời ở (14,22,10) nên bóng đổ về -x,-z)
  const shadowDisc = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.95), new THREE.MeshBasicMaterial({ map: SHADOW_TEX, transparent: true, depthWrite: false }));
  shadowDisc.rotation.x = -Math.PI / 2; shadowDisc.position.set(-0.12, 0.02, -0.08); group.add(shadowDisc);
  // Thu thập chất liệu riêng của nhân vật để làm mờ khi che tầm nhìn
  const mats = [];
  group.traverse((o) => {
    if (o.isMesh && o.material && o.material !== MAT.cupWhite && o.material !== MAT.coffee && !mats.includes(o.material)) {
      o.material.baseOpacity = o.material.opacity;
      // Nhớ chất liệu nào vốn đã trong suốt (vd bóng mềm dùng texture alpha) để
      // lúc làm mờ không tắt nhầm transparent, làm bóng thành hình đen đặc
      o.material.userData.keepTransparent = o.material.transparent;
      mats.push(o.material);
    }
  });
  return { group, rig, mats, parts: { body, head, legL, legR, armL, armR, cupG } };
}
// Làm sáng một màu hex (0xRRGGBB) về phía trắng theo hệ số f (0..1)
function lightenHex(hex, f) {
  const r = Math.min(255, ((hex >> 16) & 255) + (255 - ((hex >> 16) & 255)) * f);
  const g = Math.min(255, ((hex >> 8) & 255) + (255 - ((hex >> 8) & 255)) * f);
  const b = Math.min(255, (hex & 255) + (255 - (hex & 255)) * f);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

function spawnCharacter(id, name, spec, opts = {}) {
  const built = buildCharacter(spec);
  const c = {
    id, name, spec, ...built,
    mode: 'idle', path: [], pendingSeat: null, seat: null,
    speed: 2.3 + Math.random() * 0.5, walkPhase: Math.random() * 10,
    drink: 0, drinkTimer: 0, bubbleUntil: 0, bubbleEl: null, nameEl: null,
    isRemote: false, tx: null, tz: null, trotY: null, _lastMsg: null, _shownMsgAt: 0, _lastDrink: 0,
    pose: { thighL: 0, thighR: 0, shinL: 0, shinR: 0, shL: 0, shR: 0, foreL: 0, foreR: 0, rigY: 0, headX: 0, headY: 0 },
    poseTarget: { thighL: 0, thighR: 0, shinL: 0.08, shinR: 0.08, shL: 0.06, shR: 0.06, foreL: -0.1, foreR: -0.1, rigY: 0, headX: 0, headY: 0 },
  };
  c.group.position.set(opts.x ?? 0, 0, opts.z ?? 15.5);
  c.group.rotation.y = opts.rotY ?? Math.PI;
  scene.add(c.group);
  // Tên trên đầu nhân vật (như game)
  const tag = document.createElement('div');
  tag.className = 'nametag'; tag.textContent = name;
  $('nametags').appendChild(tag);
  c.nameEl = tag;
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
    c.pose = { ...c.poseTarget, thighL: -1.5, thighR: -1.5, shinL: 1.45, shinR: 1.45, rigY: -0.42, shL: -0.25, shR: -0.25 };
    if (c.isGLB) c._sitK = 1; // ngồi ngay: vào thẳng tư thế ngồi, khỏi lerp từ đứng
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
/* ---- Animation cho nhân vật GLB (Jake/Miku) qua AnimationMixer ----
   Clip thật chỉ có Idle + Walk (đã gộp trong file). Ngồi/Uống không có clip
   nên làm bằng code: sau mixer.update() sẽ slerp xương về tư thế mục tiêu
   (tính từ bind pose, góc đo bằng ảnh test thật). _curAnim báo trạng thái
   thật (Drink/Sit/Walk/Idle) để hook kiểm chứng đọc được, dù mixer bên
   dưới vẫn chạy Idle khi ngồi/uống. */
const _qTmp = new THREE.Quaternion();
const _eTmp = new THREE.Euler();
function playGLBAnim(c, name) {
  const next = c.clips?.[name];
  if (!next) return;
  if (c._curAction === next && next.isRunning()) return;
  const prev = c._curAction;
  if (prev && prev !== next) prev.fadeOut(0.25);
  next.reset();
  next.setLoop(THREE.LoopRepeat, Infinity);
  next.fadeIn(0.25).play();
  c._curAction = next;
}
function glbPoseTo(c, key, angleX, k) {
  const pb = c.poseBones?.[key];
  if (!pb || k <= 0) return;
  _eTmp.set(angleX, 0, 0);
  _qTmp.setFromEuler(_eTmp);
  _qTmp.premultiply(pb.base);
  pb.bone.quaternion.slerp(_qTmp, Math.min(1, k));
}
function updateGLBCharacter(c, dt) {
  // Phát hiện người thật đang đi (di chuyển vị trí giữa 2 frame)
  const moved = c._prevX !== undefined && (Math.abs(c.group.position.x - c._prevX) > 0.001 || Math.abs(c.group.position.z - c._prevZ) > 0.001);
  c._prevX = c.group.position.x; c._prevZ = c.group.position.z;
  const walking = c.mode === 'walk' || (c.mode === 'free' && c.moveDir) || moved;
  const clip = walking ? 'Walk' : 'Idle';
  playGLBAnim(c, clip);
  c.mixer.update(dt);
  // Trạng thái báo ra ngoài (hook __cafePose/__cafeDebug đọc)
  c._curAnim = c.drink > 0 ? 'Drink' : c.mode === 'sit' ? 'Sit' : clip;
  // Ngồi: đùi gập về trước -1.5, cẳng gập +1.45 (cẳng gần như đứng thẳng),
  // hông hạ từ ~0.95 xuống ~0.48 (vừa tầm ghế). Lerp mượt theo _sitK.
  const kSit = 1 - Math.exp(-dt * 9);
  c._sitK = (c._sitK ?? 0) + ((c.mode === 'sit' ? 1 : 0) - (c._sitK ?? 0)) * kSit;
  glbPoseTo(c, 'thighL', -1.5, c._sitK);
  glbPoseTo(c, 'thighR', -1.5, c._sitK);
  glbPoseTo(c, 'shinL', 1.45, c._sitK);
  glbPoseTo(c, 'shinR', 1.45, c._sitK);
  if (c.bones?.Hips) {
    const targetY = c.hipsRestY - 0.47 * (c._sitK ?? 0);
    c.bones.Hips.position.y += (targetY - c.bones.Hips.position.y) * kSit;
  }
  // Uống: tay phải đưa ly lên miệng theo đúng keyframe của quán (3,6s).
  // Góc đo bằng ảnh test: vai -1.30 + khuỷu -1.55 đưa bàn tay lên ngang mặt.
  if (c.drink > 0) {
    const d = Math.min(1, c.drinkTimer / 3.6);
    const keys = [
      [0.00, 0, 0], [0.25, -0.95, -0.35], [0.50, -1.30, -1.55],
      [0.75, -1.30, -1.55], [0.90, -0.95, -0.35], [1.00, 0, 0],
    ];
    let i = 0;
    while (i < keys.length - 2 && d > keys[i + 1][0]) i++;
    const [t0, s0, f0] = keys[i], [t1, s1, f1] = keys[i + 1];
    const kk = smoothstep(0, 1, (d - t0) / Math.max(0.001, t1 - t0));
    const shR = s0 + (s1 - s0) * kk, foreR = f0 + (f1 - f0) * kk;
    // Mở dần lúc bắt đầu cầm ly, khép dần lúc đặt ly xuống
    const env = smoothstep(0, 0.15, d) * (1 - smoothstep(0.9, 1, d));
    glbPoseTo(c, 'armR', shR, env);
    glbPoseTo(c, 'foreR', foreR, env);
    glbPoseTo(c, 'head', -0.22 * smoothstep(0.4, 0.55, d) * (1 - smoothstep(0.8, 0.95, d)), 1);
  }
}
function updateCharacter(c, dt, t) {
  const p = c.pose, pt = c.poseTarget;
  // Người thật khác: trượt mượt tới vị trí họ gửi lên Firebase
  if (c.isRemote) {
    const dx = (c.tx ?? c.group.position.x) - c.group.position.x;
    const dz = (c.tz ?? c.group.position.z) - c.group.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.12) {
      const step = Math.min(dist, c.speed * dt * 2.4); // trượt nhanh hơn để đuổi kịp vị trí thật (trước 1.6x)
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
      pt.rigY = -0.42 + Math.sin(t * 1.8 + c.walkPhase) * 0.008;
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
  } else if (c.mode === 'free' && c.moveDir) {
    // Di chuyển tự do (WASD / joystick): đi thẳng theo hướng nhập,
    // không va chạm gì cả — xuyên bàn ghế thoải mái, chỉ kẹp trong tường quán
    // để khỏi rơi ra ngoài sàn
    const step = c.speed * dt;
    c.group.position.x = Math.max(-16.5, Math.min(16.5, c.group.position.x + c.moveDir.x * step));
    c.group.position.z = Math.max(-9.5, Math.min(16.5, c.group.position.z + c.moveDir.z * step));
    const targetRot = Math.atan2(c.moveDir.x, c.moveDir.z);
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
  } else if (c.mode === 'sit') {
    pt.thighL = -1.5; pt.thighR = -1.5; pt.shinL = 1.45; pt.shinR = 1.45;
    pt.shL = -0.25; pt.shR = -0.25; pt.foreL = -0.25; pt.foreR = -0.25;
    pt.rigY = -0.42 + Math.sin(t * 1.8 + c.walkPhase) * 0.008;
    pt.headY = Math.sin(t * 0.4 + c.walkPhase) * 0.25;
    pt.headX = 0;
  } else { // idle đứng
    pt.thighL = 0; pt.thighR = 0; pt.shinL = 0.06; pt.shinR = 0.06;
    pt.shL = 0.06; pt.shR = 0.06; pt.foreL = -0.1; pt.foreR = -0.1;
    pt.rigY = Math.sin(t * 2 + c.walkPhase) * 0.012;
    pt.headY = Math.sin(t * 0.35 + c.walkPhase) * 0.3;
    pt.headX = 0;
  }
  // Uống trà/cà phê kiểu thật: với tay xuống bàn cầm ly lên, đưa lên miệng
  // uống từng ngụm, rồi đặt ly xuống bàn (ly rời khỏi bàn và trở lại bàn)
  if (c.drink > 0) {
    c.drinkTimer += dt;
    const d = Math.min(1, c.drinkTimer / 3.6);
    // Khung hình tay phải [thời điểm, vai, khuỷu]: với xuống bàn -> nâng lên miệng
    // -> giữ ở miệng uống -> hạ xuống đặt ly -> về tư thế ngồi
    const keys = [
      [0.00, pt.shR, pt.foreR],
      [0.25, -0.95, -0.35],
      [0.50, -1.30, -1.55],
      [0.75, -1.30, -1.55],
      [0.90, -0.95, -0.35],
      [1.00, pt.shR, pt.foreR],
    ];
    let i = 0;
    while (i < keys.length - 2 && d > keys[i + 1][0]) i++;
    const [t0, s0, f0] = keys[i], [t1, s1, f1] = keys[i + 1];
    const k = smoothstep(0, 1, (d - t0) / Math.max(0.001, t1 - t0));
    pt.shR = s0 + (s1 - s0) * k;
    pt.foreR = f0 + (f1 - f0) * k;
    // Đầu ngửa nhẹ khi uống
    pt.headX = -0.22 * smoothstep(0.4, 0.55, d) * (1 - smoothstep(0.8, 0.95, d));
    // Ly nghiêng khi uống (nhấp từng ngụm)
    const sip = smoothstep(0.5, 0.6, d) * (1 - smoothstep(0.7, 0.8, d));
    if (c.parts.cupG) c.parts.cupG.rotation.x = -0.45 - 0.35 * sip;
    // Cầm ly: ly rời khỏi bàn khi tay chạm bàn, trả lại bàn khi đặt xuống
    const hasCup = d >= 0.25 && d < 0.9;
    if (c.parts.cupG) c.parts.cupG.visible = hasCup;
    if (c.seat) c.seat.cup.visible = !hasCup;
    if (d >= 1) { c.drink = 0; c.drinkTimer = 0; if (c.parts.cupG) { c.parts.cupG.rotation.x = 0; c.parts.cupG.visible = false; } if (c.seat) c.seat.cup.visible = true; }
  }
  // Nhân vật GLB (Jake/Miku): dùng AnimationMixer + overlay tư thế ngồi/uống bằng code
  if (c.isGLB) {
    updateGLBCharacter(c, dt);
    if (c.bubbleEl && performance.now() > c.bubbleUntil) { c.bubbleEl.remove(); c.bubbleEl = null; }
    return;
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
if (IS_MOBILE) $('chat-panel').classList.add('mobile-hidden');
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
let fpDown = false, fpLastX = 0, fpLastY = 0; // kéo để nhìn quanh ở góc nhìn thứ nhất
renderer.domElement.addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; downType = e.pointerType; fpDown = true; fpLastX = e.clientX; fpLastY = e.clientY; });
renderer.domElement.addEventListener('pointermove', (e) => {
  if (!fpDown || state.camMode !== 3) return;
  const dx = e.clientX - fpLastX, dy = e.clientY - fpLastY;
  fpLastX = e.clientX; fpLastY = e.clientY;
  state.fpYaw -= dx * 0.005;
  state.fpPitch = Math.max(-0.6, Math.min(0.6, state.fpPitch - dy * 0.005));
});
renderer.domElement.addEventListener('pointerup', (e) => {
  fpDown = false;
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

/* ============ DI CHUYỂN TỰ DO: WASD (PC) + JOYSTICK (ĐIỆN THOẠI) + NÚT NGỒI ============ */
function standUp(c) {
  if (!c) return;
  if (c.seat) freeSeat(c.seat);
  c.seat = null; c.mode = 'idle'; c.path = []; c.pendingSeat = null;
  if (c.id === 'me') publishMe(true);
}
// Hướng di chuyển theo camera (WASD/joystick): W = xa camera, S = về phía camera
const keysDown = new Set();
let joyActive = false, joyVec = { x: 0, y: 0 };
let _lastMoveDir = null; // hướng đi lần trước — đổi hướng thì gửi ngay, khỏi chờ 100ms
function camForward() {
  const f = new THREE.Vector3();
  camera.getWorldDirection(f);
  f.y = 0;
  if (f.lengthSq() < 0.001) f.set(0, 0, -1);
  return f.normalize();
}
// Chạy mỗi khung hình: đọc phím/joystick hiện tại, tính hướng theo camera lúc đó
function updateMyMovement() {
  const me = state.players.get('me');
  if (!me || !state.entered) return;
  let fz = 0, rx = 0;
  if (keysDown.has('w') || keysDown.has('arrowup')) fz += 1;
  if (keysDown.has('s') || keysDown.has('arrowdown')) fz -= 1;
  if (keysDown.has('d') || keysDown.has('arrowright')) rx += 1;
  if (keysDown.has('a') || keysDown.has('arrowleft')) rx -= 1;
  if (joyActive) { fz += -joyVec.y; rx += joyVec.x; }
  if (!fz && !rx) {
    if (me.mode === 'free') { me.mode = 'idle'; me.moveDir = null; _lastMoveDir = null; publishMe(true); /* gửi vị trí cuối ngay, khỏi chờ nhịp tim 15s */ }
    return;
  }
  // Đang ngồi mà bấm di chuyển thì đứng dậy rồi đi
  if (me.mode === 'sit') standUp(me);
  const f = camForward();
  const r = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0));
  const dir = new THREE.Vector3().addScaledVector(f, fz).addScaledVector(r, rx);
  dir.y = 0;
  if (dir.lengthSq() < 0.001) return;
  dir.normalize();
  // Đổi hướng đột ngột (quay đầu, rẽ) thì gửi ngay để máy kia thấy mình quay
  // đầu liền, không phải chờ tới lượt gửi 100ms sau.
  if (!_lastMoveDir || (_lastMoveDir.x * dir.x + _lastMoveDir.z * dir.z) < 0.85) publishMe(true);
  _lastMoveDir = { x: dir.x, z: dir.z };
  me.moveDir = { x: dir.x, z: dir.z };
  me.mode = 'free';
  me.path = []; me.pendingSeat = null;
}
window.addEventListener('keydown', (e) => {
  if (!state.entered || document.activeElement === $('chat-input')) return;
  const k = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
    keysDown.add(k);
    e.preventDefault();
  }
});
window.addEventListener('keyup', (e) => keysDown.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keysDown.clear());
// Joystick: kéo nút tròn để di chuyển (chỉ hiện trên điện thoại/cảm ứng)
function initJoystick() {
  const joy = $('joystick'), knob = $('joy-knob');
  if (!joy || !knob) return;
  const R = 44; // bán kính kéo tối đa (px)
  let pid = null;
  const setKnob = (dx, dy) => {
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  };
  const updateFromEvent = (e) => {
    const rect = joy.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const len = Math.hypot(dx, dy);
    if (len > R) { dx = (dx / len) * R; dy = (dy / len) * R; }
    setKnob(dx, dy);
    joyVec = { x: dx / R, y: dy / R };
    joyActive = true;
  };
  joy.addEventListener('pointerdown', (e) => {
    pid = e.pointerId;
    joy.setPointerCapture(pid);
    updateFromEvent(e);
    e.preventDefault();
  });
  joy.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pid) return;
    updateFromEvent(e);
    e.preventDefault();
  });
  const endJoy = (e) => {
    if (e.pointerId !== pid) return;
    pid = null; joyActive = false; joyVec = { x: 0, y: 0 };
    setKnob(0, 0);
  };
  joy.addEventListener('pointerup', endJoy);
  joy.addEventListener('pointercancel', endJoy);
  // Chỉ hiện joystick trên thiết bị cảm ứng
  joy.classList.toggle('hidden', !IS_MOBILE);
}
// Nút Ngồi: lại gần ghế trống thì hiện, bấm là ngồi vào ghế gần nhất;
// đang ngồi thì nút đổi thành Đứng dậy
let nearSeat = null;
function updateSitButton() {
  const btn = $('btn-sit');
  const me = state.players.get('me');
  if (!btn || !me || !state.entered) { if (btn) btn.classList.add('hidden'); nearSeat = null; return; }
  if (me.mode === 'sit') {
    btn.textContent = '🚶 Đứng dậy';
    btn.classList.remove('hidden');
    nearSeat = null;
    return;
  }
  // Tìm ghế trống gần nhất (trong 1,8m)
  let best = null, bestD = 1.8;
  for (const s of state.seats) {
    if (s.occupiedBy) continue;
    const d = Math.hypot(s.x - me.group.position.x, s.z - me.group.position.z);
    if (d < bestD) { bestD = d; best = s; }
  }
  nearSeat = best;
  if (best) {
    btn.textContent = '🪑 Ngồi xuống';
    btn.classList.remove('hidden');
  } else {
    btn.classList.add('hidden');
  }
}

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
// Nút Ngồi / Đứng dậy (hiện khi lại gần ghế trống hoặc đang ngồi)
$('btn-sit').addEventListener('click', () => {
  const me = state.players.get('me');
  if (!me) return;
  if (me.mode === 'sit') { standUp(me); toast('Đã đứng dậy, đi dạo tiếp nhé 🚶'); return; }
  if (nearSeat) { walkTo(me, nearSeat.x, nearSeat.z, nearSeat); showZone(nearSeat.zone); }
});
const CAM_MODES = [
  { pos: [0, 15, 24], target: [0, 1, 2], label: 'Toàn cảnh quán' },
  { pos: null, target: null, label: 'Theo chân bạn' },
  { pos: [0, 3.4, 4], target: [0, 3.4, -9.7], label: 'Nhìn lên tivi' },
  { pos: null, target: null, label: 'Góc nhìn thứ nhất' },
];
$('btn-cam').addEventListener('click', () => {
  state.camMode = (state.camMode + 1) % CAM_MODES.length;
  if (state.camMode === 3) { state.fpYaw = 0; state.fpPitch = 0; } // mới vào góc thứ nhất: nhìn thẳng hướng nhân vật
  const m = CAM_MODES[state.camMode];
  if (m.pos) {
    const pos = (state.camMode === 0 && IS_MOBILE) ? (isPortraitPhone() ? [0, 12, 19] : [0, 13, 22]) : m.pos;
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
pvCam.position.set(0, 1.55, 4.2); pvCam.lookAt(0, 0.85, 0); // Jake/Miku cao 1,70m
const pvDisc = new THREE.Mesh(new THREE.CircleGeometry(0.95, 28), new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.9 }));
pvDisc.rotation.x = -Math.PI / 2; pvScene.add(pvDisc);
const pvClock = new THREE.Clock(); // đồng hồ riêng cho animation xem trước
let pvChar = null;
let pvGen = 0; // chống race: showPreview gọi đồng thời (init + bấm chọn) phải
// chờ GLB xong mới xóa nhân vật cũ — xóa trước await thì các lần gọi sau
// không thấy nhân vật cũ để xóa, Jake và Miku chồng lên nhau trong khung xem trước.
async function showPreview(i, outfitId) {
  const gen = ++pvGen;
  const spec = { ...CHARACTERS[i], outfitId: outfitId || state.myOutfit || CHARACTERS[i].outfitId };
  // Nhân vật GLB cần file tải xong mới dựng được: chờ 1 nhịp rồi dựng lại
  if (spec.glb && !glbData[spec.glb]) await glbPromises[spec.glb];
  if (gen !== pvGen) return; // đã có lần xem trước mới hơn, bỏ lần này
  if (pvChar) pvScene.remove(pvChar.group);
  const b = buildCharacter(spec);
  pvScene.add(b.group);
  pvChar = b;
}
/* Ô chọn trang phục ở màn chào — Jake/Miku là model GLB liền khối, đồ gốc
   dính trong file nên chỉ có 1 bộ "Mặc định", không còn lưới chọn đồ nữa. */
function renderOutfits(charIdx) {
  const spec = CHARACTERS[charIdx];
  const grid = $('outfit-grid');
  grid.innerHTML = '';
  const label = $('outfit-label');
  if (spec.glb) {
    if (label) label.classList.add('hidden');
    grid.classList.add('hidden');
    return;
  }
  if (label) label.classList.remove('hidden');
  grid.classList.remove('hidden');
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
  if (c.nameEl) c.nameEl.remove();
  scene.remove(c.group);
  for (let i = clickable.length - 1; i >= 0; i--) {
    if (clickable[i].userData.charId === id) clickable.splice(i, 1);
  }
  state.players.delete(id);
  updateOnlineCount();
}
async function enterCafe() {
  const name = $('player-name').value.trim() || RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
  state.myName = name;
  $('welcome').classList.add('hidden');
  if (state.players.has('me')) removeCharacter('me');
  // Nhân vật GLB cần file tải xong mới vào được
  const spec = { ...CHARACTERS[state.myChar], outfitId: state.myOutfit || CHARACTERS[state.myChar].outfitId };
  if (spec.glb && !glbData[spec.glb]) await glbPromises[spec.glb];
  spawnCharacter('me', name, spec, { x: 0, z: 15.5 });
  state.entered = true;
  localStorage.setItem('cafe3d_name', name);
  localStorage.setItem('cafe3d_char', String(state.myChar));
  localStorage.setItem('cafe3d_outfit_' + state.myChar, state.myOutfit || CHARACTERS[state.myChar].outfitId);
  // Điện thoại xoay ngang: camera lùi ra cao hơn một chút để thấy trọn quán
  const enterPos = IS_MOBILE ? (isPortraitPhone() ? [0, 8, 15] : [0, 10, 19]) : [0, 9, 20];
  camera.position.set(...enterPos);
  controls.target.set(0, 1, 8);
  log(`<span class="sys">🎉 ${escapeHtml(name)} vừa vào quán! Có ${state.players.size} người đang ở đây.</span>`);
  joinFirebase();
  toast('Chào mừng đến quán! Bấm vào ghế trống để ngồi xuống ☕');
  // Bật tiếng ngay trong thao tác bấm "Vào quán" của người dùng: trình duyệt chỉ
  // cho bật tiếng khi có thao tác thật, gọi trong setTimeout hay lúc tải trang
  // sẽ bị chặn rồi thanh trượt hiển thị sai là đang có tiếng.
  applyVolume();
  setTimeout(syncVolumeUI, 800);
  // Điện thoại: vào quán là xin toàn màn hình + khóa xoay ngang như game thật
  // (Android cho khóa khi đang toàn màn hình; iPhone dùng màn hình nhắc xoay).
  if (IS_MOBILE && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().then(() => {
      if (screen.orientation?.lock) screen.orientation.lock('landscape').catch(() => {});
    }).catch(() => {});
  }
}
$('btn-enter').addEventListener('click', enterCafe);
$('player-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') enterCafe(); });

/* ============ KHỞI TẠO QUÁN ============ */
// Chỉ gọi showPreview 1 lần ở khối savedChar bên dưới (mặc định là char 0):
// gọi 2 lần sẽ tạo 2 lần xem trước đồng thời, dễ chồng nhân vật lên nhau.
const savedName = localStorage.getItem('cafe3d_name');
if (savedName) $('player-name').value = savedName;
const savedChar = parseInt(localStorage.getItem('cafe3d_char') || '0', 10);
if (CHARACTERS[savedChar]) {
  state.myChar = savedChar;
  state.myOutfit = localStorage.getItem('cafe3d_outfit_' + savedChar) || CHARACTERS[savedChar].outfitId;
  grid.querySelectorAll('.char-card').forEach((el, i) => el.classList.toggle('selected', i === savedChar));
  renderOutfits(savedChar);
  showPreview(savedChar);
} else {
  // Nhân vật đã lưu không còn nữa (vd Milo/Luna/Chibi cũ): về lại Jake
  state.myChar = 0;
  state.myOutfit = CHARACTERS[0].outfitId;
  renderOutfits(0);
  showPreview(0);
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
    if (CHARACTERS[ch].glb) state.myOutfit = 'default'; // Jake/Miku chỉ có 1 bộ mặc định
    grid.querySelectorAll('.char-card').forEach((el, i) => el.classList.toggle('selected', i === ch));
    renderOutfits(ch);
    showPreview(ch);
  }
  setTimeout(async () => {
    await enterCafe(); // chờ GLB (Jake/Miku) rồi mới ngồi/uống
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
const _ct = new THREE.Vector3();
const _cc = new THREE.Vector3();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), FAST ? 0.5 : 0.05);
  const t = clock.elapsedTime;
  // Trần + dầm chỉ hiện khi camera ở dưới trần (góc toàn cảnh từ trên cao thì ẩn)
  if (ceilingGroup) ceilingGroup.visible = camera.position.y < 7;
  // Bụi bay nhẹ nhàng trong ánh sáng
  const dust = scene.getObjectByName('dust');
  if (dust) { dust.rotation.y = t * 0.008; dust.position.y = Math.sin(t * 0.25) * 0.12; }
  updateMyMovement(); // WASD / joystick: di chuyển tự do theo camera
  updateSitButton(); // lại gần ghế trống thì hiện nút Ngồi
  for (const c of state.players.values()) updateCharacter(c, dt, t);
  // Nhân vật nào đứng chắn giữa camera và điểm đang nhìn thì mờ đi,
  // để xoay góc nhìn thoải mái mà không bị nhân vật che màn hình
  for (const c of state.players.values()) {
    _ct.copy(controls.target).sub(camera.position);
    const distTarget = _ct.length();
    _cc.set(c.group.position.x, c.group.position.y + 0.9, c.group.position.z).sub(camera.position);
    const distChar = _cc.length();
    const cos = _ct.normalize().dot(_cc.normalize());
    // Góc "Theo chân bạn" (camMode 1): camera khóa vào nhân vật của mình nên
    // distChar ≈ distTarget, điều kiện distChar < distTarget - 1.5 không bao
    // giờ đúng -> nhân vật của mình không bao giờ mờ. Bỏ giới hạn 6m: ở góc
    // xem tivi camera cách tivi ~13,7m nên nhân vật đứng 7-10m trước tivi
    // cũng phải mờ. Góc nhìn/FOV không đổi, chỉ đổi điều kiện mờ.
    const isMeFollow = c.id === 'me' && state.camMode === 1;
    const blocking = isMeFollow || (cos > 0.9 && distChar < distTarget - 1.5);
    const target = blocking ? 0.12 : 1;
    c._fade = (c._fade ?? 1) + (target - (c._fade ?? 1)) * Math.min(1, dt * 8);
    for (const m of c.mats) {
      m.transparent = m.userData.keepTransparent || c._fade < 0.99;
      m.opacity = (m.baseOpacity ?? 1) * c._fade;
    }
  }
  // Gửi vị trí của mình lên Firebase khi đang đi (giới hạn 4 lần/giây).
  // BUG CŨ: chỉ publish khi mode === 'walk' (đi tự động tới ghế), còn đi tự do
  // WASD/joystick là mode 'free' nên KHÔNG publish — vị trí chỉ gửi theo
  // nhịp tim 15s, người khác thấy mình đứng yên/delay tới 15s, 2 máy không gặp nhau.
  if (state.entered) {
    const me = state.players.get('me');
    if (me && (me.mode === 'walk' || me.mode === 'free')) publishMe();
  }
  tvTimer += dt;
  // Tên + bong bóng chat bám theo đầu nhân vật 3D (tên ở trên đầu, bong bóng ở trên tên)
  for (const c of state.players.values()) {
    const fade = c._fade ?? 1;
    // Tên trên đầu
    if (c.nameEl) {
      if (state.camMode === 3 && c.id === 'me') { c.nameEl.style.display = 'none'; }
      else {
        c.parts.head.getWorldPosition(_pv);
        _pv.y += 0.45;
        _pv.project(camera);
        if (_pv.z > 1) { c.nameEl.style.display = 'none'; }
        else {
          c.nameEl.style.display = 'block';
          c.nameEl.style.opacity = fade;
          c.nameEl.style.left = ((_pv.x * 0.5 + 0.5) * innerWidth) + 'px';
          c.nameEl.style.top = ((-_pv.y * 0.5 + 0.5) * innerHeight) + 'px';
        }
      }
    }
    if (!c.bubbleEl) continue;
    // Góc nhìn thứ nhất: bong bóng của chính mình ở ngay trước mắt nên ẩn đi
    if (state.camMode === 3 && c.id === 'me') { c.bubbleEl.style.display = 'none'; continue; }
    c.parts.head.getWorldPosition(_pv);
    _pv.y += 0.95;
    _pv.project(camera);
    if (_pv.z > 1) { c.bubbleEl.style.display = 'none'; continue; }
    c.bubbleEl.style.display = 'block';
    c.bubbleEl.style.left = ((_pv.x * 0.5 + 0.5) * innerWidth) + 'px';
    c.bubbleEl.style.top = ((-_pv.y * 0.5 + 0.5) * innerHeight) + 'px';
  }
  // Góc nhìn thứ nhất: camera ở đầu nhân vật, kéo để nhìn quanh (không dùng OrbitControls)
  const me = state.players.get('me');
  const isFP = state.camMode === 3 && me;
  if (me) {
    // Jake/Miku là 1 mesh liền (không tách được riêng đầu) -> ẩn cả người ở góc thứ nhất,
    // nhân vật thường thì chỉ ẩn đầu để vẫn thấy tay/thân
    if (me.isGLB) me.group.visible = !isFP;
    else me.parts.head.visible = !isFP;
  }
  controls.enabled = !isFP;
  if (isFP) {
    me.parts.head.getWorldPosition(_pv);
    const yaw = me.group.rotation.y + state.fpYaw;
    const cp = Math.cos(state.fpPitch), sp = Math.sin(state.fpPitch);
    camera.position.set(_pv.x, _pv.y + 0.05, _pv.z);
    camera.lookAt(_pv.x + Math.sin(yaw) * cp * 10, _pv.y + 0.05 + sp * 10, _pv.z + Math.cos(yaw) * cp * 10);
    // Đặt target ảo phía trước để tính mờ nhân vật che tầm nhìn cho đúng
    controls.target.set(_pv.x + Math.sin(yaw) * cp * 8, _pv.y + 0.05 + sp * 8, _pv.z + Math.cos(yaw) * cp * 8);
  } else {
    // Camera theo chân người chơi
    if (state.camMode === 1) {
      const me2 = state.players.get('me');
      if (me2) {
        _pv.set(me2.group.position.x, 1.3, me2.group.position.z);
        const dx = (_pv.x - controls.target.x) * 0.07;
        const dy = (_pv.y - controls.target.y) * 0.07;
        const dz = (_pv.z - controls.target.z) * 0.07;
        controls.target.x += dx; controls.target.y += dy; controls.target.z += dz;
        camera.position.x += dx; camera.position.y += dy; camera.position.z += dz;
      }
    }
    controls.update();
  }
  renderer.render(scene, camera);
  cssRenderer.render(scene, camera);
  if (pvChar && !$('welcome').classList.contains('hidden')) {
    pvChar.group.rotation.y += dt * 0.8;
    // Nhân vật GLB ở màn chào: chạy animation Idle để xem trước sống động.
    // Dùng đồng hồ riêng (không kẹp dt 0.05 như vòng lặp game) để Idle chạy
    // đúng tốc độ thật, tay hạ xuống ngay thay vì kẹt ở tư thế T-pose.
    if (pvChar.isGLB && pvChar.clips?.Idle) {
      if (pvChar._curAction !== pvChar.clips.Idle) playGLBAnim(pvChar, 'Idle');
      pvChar.mixer.update(Math.min(pvClock.getDelta(), 0.25));
    }
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
window.__cafeCam = (x, y, z, tx, ty, tz) => {
  state.camMode = 0;
  controls.minDistance = 0.5; // cho phép camera lại gần để chụp cận mặt (mặc định min 5m)
  camera.position.set(x, y, z);
  controls.target.set(tx, ty, tz);
};
window.__cafeDebug = () => [...state.players.values()].map((c) => ({
  id: c.id, mode: c.mode, x: +c.group.position.x.toFixed(1), z: +c.group.position.z.toFixed(1),
  path: c.path.length, seat: c.seat ? c.seat.id : null, drink: c.drink, fade: +(c._fade ?? 1).toFixed(2),
  rotY: +c.group.rotation.y.toFixed(2), glb: !!c.isGLB,
}));
window.__cafePose = () => {
  const me = state.players.get('me');
  if (!me) return null;
  return {
    drink: me.drink, drinkTimer: +me.drinkTimer.toFixed(2),
    shR: +me.pose.shR.toFixed(2), foreR: +me.pose.foreR.toFixed(2),
    cupInHand: me.parts.cupG.visible, tableCup: me.seat ? me.seat.cup.visible : null,
    glb: !!me.isGLB, anim: me._curAnim || null,
  };
};
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

/* ---- Ép xoay ngang trên điện thoại: hiện màn hình nhắc xoay khi cầm dọc ---- */
function isPortraitPhone() { return IS_MOBILE && innerHeight > innerWidth; }
function checkOrientation() {
  $('rotate-overlay').classList.toggle('hidden', !isPortraitPhone());
  // Cập nhật góc nhìn theo hướng màn hình hiện tại (dọc 68 / ngang 55)
  camera.fov = IS_MOBILE ? (isPortraitPhone() ? 68 : 55) : 55;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  cssRenderer.setSize(innerWidth, innerHeight);
}
addEventListener('orientationchange', () => setTimeout(checkOrientation, 300));

/* ---- Cài đặt game (PWA): nút "Cài đặt game" ở màn chào ---- */
// iOS: iPadOS 13+ báo userAgent là Macintosh nên phải nhận diện thêm bằng cảm ứng
const IS_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const IS_IOS_SAFARI = IS_IOS && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);
let deferredInstall = null;
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstall = e;
  $('btn-install').classList.remove('hidden');
});
$('btn-install').addEventListener('click', async () => {
  if (deferredInstall) {
    deferredInstall.prompt();
    await deferredInstall.userChoice;
    deferredInstall = null;
    $('btn-install').classList.add('hidden');
  } else if (IS_IOS) {
    // iOS không có beforeinstallprompt nên không cài trực tiếp được: hiện bảng hướng
    // dẫn từng bước (toast 3 giây dễ trôi mất nên người dùng tưởng nút không cài được)
    $('ios-install-nonsafari').classList.toggle('hidden', IS_IOS_SAFARI);
    $('ios-install').classList.remove('hidden');
  } else {
    toast('Mở menu trình duyệt rồi chọn "Thêm vào Màn hình chính"');
  }
});
$('ios-install-close').addEventListener('click', () => $('ios-install').classList.add('hidden'));
$('ios-install').addEventListener('click', (e) => { if (e.target.id === 'ios-install') $('ios-install').classList.add('hidden'); });
// iOS không có beforeinstallprompt nên hiện nút luôn để hướng dẫn cách cài
if (IS_IOS) $('btn-install').classList.remove('hidden');
if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

addEventListener('resize', () => {
  checkOrientation();
  if (!IS_MOBILE) $('chat-panel').classList.remove('mobile-hidden');
});
checkOrientation();
initJoystick(); // joystick di chuyển cho điện thoại/cảm ứng
