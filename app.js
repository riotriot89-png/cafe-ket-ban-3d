import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ============ DỮ LIỆU ============ */
const CHARACTERS = [
  { name: 'Milo',  gender: 'Nam', desc: 'Năng động, thích cà phê đen và nhạc lofi.', skin: 0xf2c89b, hair: 0x2b1a12, hairStyle: 'spiky', shirt: 0xe11d48, pants: 0x1e293b },
  { name: 'Luna',  gender: 'Nữ', desc: 'Dịu dàng, hay ngồi sân vườn đọc sách.', skin: 0xffe0bd, hair: 0x3b2f2f, hairStyle: 'long',  shirt: 0x7c3aed, pants: 0x334155 },
  { name: 'Felix', gender: 'Nam', desc: 'Game thủ, team nào cũng cân được.', skin: 0xe8b07f, hair: 0x111111, hairStyle: 'cap',   shirt: 0x0891b2, pants: 0x111827 },
  { name: 'Nala',  gender: 'Nữ', desc: 'Vui tính, cười là cả quán sáng lên.', skin: 0xc68642, hair: 0x1c1410, hairStyle: 'bun',   shirt: 0xdb2777, pants: 0x1f2937 },
  { name: 'Oscar', gender: 'Nam', desc: 'Trầm tính, thích góc lounge yên tĩnh.', skin: 0xf2c89b, hair: 0x6b4a2f, hairStyle: 'short', shirt: 0x059669, pants: 0x374151 },
  { name: 'Ruby',  gender: 'Nữ', desc: 'Mê chụp ảnh, quán đẹp là có mặt.', skin: 0xffe0bd, hair: 0xb45309, hairStyle: 'bob',   shirt: 0xf59e0b, pants: 0x78350f },
  { name: 'Leo',   gender: 'Nam', desc: 'Hay kể chuyện, ngồi đâu cũng thành tâm điểm.', skin: 0xd99a5b, hair: 0x292524, hairStyle: 'curly', shirt: 0x4f46e5, pants: 0x1e293b },
  { name: 'Mia',   gender: 'Nữ', desc: 'Nhẹ nhàng, thích nghe nhạc và ngắm hoàng hôn.', skin: 0xf2c89b, hair: 0x451a03, hairStyle: 'ponytail', shirt: 0xec4899, pants: 0x334155 },
];
const BOT_NAMES = ['An Nhiên','Bình Minh','Chi Mai','Dũng','Hà My','Khánh Duy','Thu Thảo','Minh Quân','Phương Anh','Tuấn Anh','Ngọc Trâm','Hoàng Nam','Thanh Hằng','Đức Anh','Lan Phương','Quốc Bảo','Diệu Linh','Hữu Phúc','Mai Chi','Việt Hoàng','Kim Ngân','Gia Huy','Thùy Dương','Nhật Minh','Ánh Tuyết','Tiến Đạt','Hồng Nhung','Phúc Lâm','Cẩm Tú','Mạnh Hùng','Yến Nhi','Bảo Trân','Hải Đăng','Quỳnh Anh','Sơn Tùng','Linh Đan','Thanh Sơn','Mỹ Linh','Anh Khoa','Trà My'];
const RANDOM_NAMES = ['Minh Anh','Thu Hằng','Quốc Anh','Lan Chi','Hoàng Phúc','Thảo Nguyên','Đức Huy','Phương Thảo'];
const BOT_LINES = [
  'Cà phê ở đây ngon thật, mọi người thử chưa?',
  'Ai nghe nhạc lofi với mình không?',
  'Hôm nay quán đông vui quá!',
  'Mình mới vào quán, có ai làm quen không?',
  'Ngồi sân vườn chill ghê, gió mát lắm.',
  'Tivi đang chiếu nhạc hay quá!',
  'Ai rủ mình chơi game không?',
  'Ly cà phê này là ly thứ 3 của mình rồi đó.',
  'Quán này view đẹp, ngồi cả buổi không chán.',
  'Mình thích góc lounge, yên tĩnh mà ấm.',
  'Có ai biết bài này tên gì không?',
  'Chào mọi người, mình là khách mới!',
  'Trời đẹp thế này mà không ra sân vườn thì phí.',
  'Ai muốn đổi bàn ngồi chung cho vui không?',
  'Cô Lan pha cà phê ngon nhất khu này luôn.',
];
const REPLIES = [
  { keys: ['chào', 'hello', 'hi ', 'xin chào'], text: ['Chào bạn! Ngồi xuống đây chơi với tụi mình nè.', 'Chào chào! Bạn uống gì chưa?'] },
  { keys: ['cà phê', 'cafe', 'coffee'], text: ['Cà phê ở đây ngon lắm, mình gọi thêm ly nữa đây.', 'Mình cũng đang uống cà phê nè, thơm ghê!'] },
  { keys: ['tên'], text: ['Mình tên là {name}, rất vui được gặp bạn!', 'Tên mình là {name}, bạn tên gì?'] },
  { keys: ['nhạc', 'music', 'bài'], text: ['Tivi đang mở nhạc lofi đó, nghe chill lắm.', 'Mình thích nghe nhạc ở quán này, loa hay ghê.'] },
  { keys: ['buồn', 'chán'], text: ['Đừng buồn, ngồi đây tán gẫu với mọi người cho vui nè.', 'Ra sân vườn ngồi hít gió cho đỡ buồn đi bạn.'] },
  { keys: ['đẹp', 'xinh'], text: ['Cảm ơn bạn nha! Quán này lên hình cũng đẹp lắm.'] },
  { keys: ['game', 'chơi'], text: ['Chơi game gì? Mình tham gia với!', 'Mình rảnh nè, chơi gì cũng được.'] },
];
const ZONE_NAMES = { hall: 'Sảnh chính', terrace: 'Sân vườn', lounge: 'Lounge' };

/* ============ TRẠNG THÁI ============ */
const state = {
  myId: 'me', myName: '', myChar: 0, entered: false,
  players: new Map(), // id -> charObj
  seats: [],          // {id, table, zone, x, z, angle, occupiedBy, cup}
  friends: new Set(JSON.parse(localStorage.getItem('cafe3d_friends') || '[]')),
  videoId: 'jfKfPfyJRdk', videoTitle: 'Lofi Girl — beats to relax/study to',
  camMode: 0, // 0 toàn cảnh, 1 theo mình, 2 tivi
};
const $ = (id) => document.getElementById(id);

/* Chế độ nhẹ cho máy yếu: ?lowfx=1 (tắt bóng đổ, pixel ratio 1) */
const LOWFX = new URLSearchParams(location.search).has('lowfx');

/* ============ SCENE ============ */
const container = $('scene-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x14102b);
scene.fog = new THREE.Fog(0x14102b, 45, 90);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 15, 24);
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
controls.update();

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
neonStrip(0, 0.35, -9.7, 30, true, MAT.neonAmber);
// Bảng hiệu neon
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
sign.position.set(0, 5.6, -9.68); scene.add(sign);

/* ============ TIVI 3D (MÀN HÌNH LỚN TRÊN TƯỜNG) ============ */
const tvCanvas = document.createElement('canvas'); tvCanvas.width = 1024; tvCanvas.height = 576;
const tvCtx = tvCanvas.getContext('2d');
const tvTexture = new THREE.CanvasTexture(tvCanvas);
const tvScreen = new THREE.Mesh(
  new THREE.PlaneGeometry(7.2, 4.05),
  new THREE.MeshBasicMaterial({ map: tvTexture })
);
tvScreen.position.set(0, 3.1, -9.66); tvScreen.userData.isTV = true; scene.add(tvScreen);
const tvFrame = box(7.6, 4.45, 0.12, MAT.black, 0, 3.1, -9.78); scene.add(tvFrame);
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
  g.fillText('Bấm vào tivi để mở trình phát', W / 2, 250);
  tvTexture.needsUpdate = true;
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
  body: new THREE.CapsuleGeometry(0.23, 0.42, 4, 14),
  head: new THREE.SphereGeometry(0.21, 20, 16),
  eye: new THREE.SphereGeometry(0.028, 8, 6),
  thigh: new THREE.CylinderGeometry(0.085, 0.07, 0.4, 10),
  shin: new THREE.CylinderGeometry(0.07, 0.06, 0.4, 10),
  upperArm: new THREE.CylinderGeometry(0.07, 0.06, 0.3, 10),
  foreArm: new THREE.CylinderGeometry(0.06, 0.05, 0.3, 10),
  cup: new THREE.CylinderGeometry(0.055, 0.045, 0.11, 12),
  coffeeTop: new THREE.CylinderGeometry(0.048, 0.048, 0.012, 12),
  hairCap: new THREE.SphereGeometry(0.225, 16, 12),
  hairBun: new THREE.SphereGeometry(0.09, 10, 8),
  hairCone: new THREE.ConeGeometry(0.07, 0.22, 8),
  capTop: new THREE.CylinderGeometry(0.23, 0.23, 0.05, 16),
  capBrim: new THREE.BoxGeometry(0.3, 0.03, 0.22),
};
SHARED_GEO.thigh.translate(0, -0.2, 0);
SHARED_GEO.shin.translate(0, -0.2, 0);
SHARED_GEO.upperArm.translate(0, -0.15, 0);
SHARED_GEO.foreArm.translate(0, -0.15, 0);

function hairFor(style, spec, head) {
  const hm = new THREE.MeshStandardMaterial({ color: spec.hair, roughness: 0.85 });
  const g = new THREE.Group();
  const add = (mesh, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz); mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true; g.add(mesh); return mesh;
  };
  if (style === 'short') {
    add(new THREE.Mesh(SHARED_GEO.hairCap, hm), 0, 0.05, -0.02, 0, 0, 0, 1, 0.75, 1);
  } else if (style === 'long') {
    add(new THREE.Mesh(SHARED_GEO.hairCap, hm), 0, 0.05, -0.02, 0, 0, 0, 1, 0.8, 1);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.55, 0.1), hm), 0, -0.28, -0.16);
  } else if (style === 'spiky') {
    add(new THREE.Mesh(SHARED_GEO.hairCap, hm), 0, 0.04, -0.02, 0, 0, 0, 1, 0.7, 1);
    [[0, 0.24, 0], [-0.12, 0.2, 0.05], [0.12, 0.2, 0.05], [0, 0.2, -0.12]].forEach(([x, y, z]) =>
      add(new THREE.Mesh(SHARED_GEO.hairCone, hm), x, y, z, x * -1.2, 0, x * 1.2));
  } else if (style === 'bun') {
    add(new THREE.Mesh(SHARED_GEO.hairCap, hm), 0, 0.05, -0.02, 0, 0, 0, 1, 0.75, 1);
    add(new THREE.Mesh(SHARED_GEO.hairBun, hm), 0, 0.26, -0.08);
  } else if (style === 'bob') {
    add(new THREE.Mesh(SHARED_GEO.hairCap, hm), 0, 0.05, -0.02, 0, 0, 0, 1, 0.85, 1);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.3, 0.12), hm), -0.2, -0.08, 0.05);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.3, 0.12), hm), 0.2, -0.08, 0.05);
  } else if (style === 'curly') {
    [[0, 0.2, 0], [-0.13, 0.14, 0.06], [0.13, 0.14, 0.06], [-0.07, 0.16, -0.12], [0.08, 0.15, -0.12]].forEach(([x, y, z]) =>
      add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), hm), x, y, z));
  } else if (style === 'cap') {
    const capMat = new THREE.MeshStandardMaterial({ color: spec.shirt, roughness: 0.7 });
    add(new THREE.Mesh(SHARED_GEO.capTop, capMat), 0, 0.16, 0);
    add(new THREE.Mesh(SHARED_GEO.capBrim, capMat), 0, 0.13, 0.24);
  } else if (style === 'ponytail') {
    add(new THREE.Mesh(SHARED_GEO.hairCap, hm), 0, 0.05, -0.02, 0, 0, 0, 1, 0.75, 1);
    const tail = add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.42, 8), hm), 0, -0.12, -0.26, 0.5, 0, 0);
    tail.geometry = new THREE.CylinderGeometry(0.06, 0.04, 0.42, 8);
  }
  head.add(g);
  return g;
}

function buildCharacter(spec) {
  const skin = new THREE.MeshStandardMaterial({ color: spec.skin, roughness: 0.65 });
  const shirt = new THREE.MeshStandardMaterial({ color: spec.shirt, roughness: 0.8 });
  const pants = new THREE.MeshStandardMaterial({ color: spec.pants, roughness: 0.85 });
  const group = new THREE.Group();
  const rig = new THREE.Group(); group.add(rig);
  // Chân 2 đoạn (đùi + cẳng) để ngồi được tự nhiên
  function makeLeg(side) {
    const thigh = new THREE.Group(); thigh.position.set(0.11 * side, 0.8, 0); rig.add(thigh);
    const tm = new THREE.Mesh(SHARED_GEO.thigh, pants); tm.castShadow = true; thigh.add(tm);
    const shin = new THREE.Group(); shin.position.set(0, -0.4, 0); thigh.add(shin);
    const sm = new THREE.Mesh(SHARED_GEO.shin, pants); sm.castShadow = true; shin.add(sm);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.22), MAT.black);
    foot.position.set(0, -0.4, 0.05); foot.castShadow = true; shin.add(foot);
    return { thigh, shin };
  }
  const legL = makeLeg(-1), legR = makeLeg(1);
  // Thân
  const body = new THREE.Mesh(SHARED_GEO.body, shirt); body.position.y = 1.12; body.castShadow = true; rig.add(body);
  // Tay 2 đoạn, tay phải cầm ly
  function makeArm(side) {
    const upper = new THREE.Group(); upper.position.set(0.3 * side, 1.38, 0); rig.add(upper);
    const um = new THREE.Mesh(SHARED_GEO.upperArm, shirt); um.castShadow = true; upper.add(um);
    const fore = new THREE.Group(); fore.position.set(0, -0.3, 0); upper.add(fore);
    const fm = new THREE.Mesh(SHARED_GEO.foreArm, skin); fm.castShadow = true; fore.add(fm);
    return { upper, fore };
  }
  const armL = makeArm(-1), armR = makeArm(1);
  const cupG = new THREE.Group(); cupG.position.set(0, -0.32, 0.04);
  const cupM = new THREE.Mesh(SHARED_GEO.cup, MAT.cupWhite); cupM.castShadow = true; cupG.add(cupM);
  const cof = new THREE.Mesh(SHARED_GEO.coffeeTop, MAT.coffee); cof.position.y = 0.05; cupG.add(cof);
  armR.fore.add(cupG);
  // Đầu + tóc + mắt
  const head = new THREE.Group(); head.position.y = 1.62; rig.add(head);
  const headM = new THREE.Mesh(SHARED_GEO.head, skin); headM.castShadow = true; head.add(headM);
  const eyeM = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.3 });
  [-0.075, 0.075].forEach((x) => {
    const e = new THREE.Mesh(SHARED_GEO.eye, eyeM); e.position.set(x, 0.02, 0.19); head.add(e);
  });
  hairFor(spec.hairStyle, spec, head);
  // Bóng dưới chân
  const shadowDisc = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }));
  shadowDisc.rotation.x = -Math.PI / 2; shadowDisc.position.y = 0.01; group.add(shadowDisc);
  return { group, rig, parts: { body, head, legL, legR, armL, armR, cupG } };
}

function spawnCharacter(id, name, spec, opts = {}) {
  const built = buildCharacter(spec);
  const c = {
    id, name, spec, ...built, isBot: !!opts.bot,
    mode: 'idle', path: [], pendingSeat: null, seat: null,
    speed: 2.3 + Math.random() * 0.5, walkPhase: Math.random() * 10,
    drink: 0, drinkTimer: 0, bubbleUntil: 0, bubbleEl: null,
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
    c.pose = { ...c.poseTarget, thighL: -1.5, thighR: -1.5, shinL: 1.45, shinR: 1.45, rigY: -0.35, shL: -0.25, shR: -0.25 };
  }
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
}
function freeSeatNear(zone) {
  const list = state.seats.filter((s) => !s.occupiedBy && (!zone || s.zone === zone));
  return list.length ? list[Math.floor(Math.random() * list.length)] : null;
}

/* ---- Hoạt ảnh từng khung hình ---- */
const _v = new THREE.Vector3();
function updateCharacter(c, dt, t) {
  const p = c.pose, pt = c.poseTarget;
  // Di chuyển theo đường đi
  if (c.mode === 'walk' && c.path.length) {
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
    pt.rigY = -0.35 + Math.sin(t * 1.8 + c.walkPhase) * 0.008;
    pt.headY = Math.sin(t * 0.4 + c.walkPhase) * 0.25;
    pt.headX = 0;
  } else { // idle đứng
    pt.thighL = 0; pt.thighR = 0; pt.shinL = 0.06; pt.shinR = 0.06;
    pt.shL = 0.06; pt.shR = 0.06; pt.foreL = -0.1; pt.foreR = -0.1;
    pt.rigY = Math.sin(t * 2 + c.walkPhase) * 0.012;
    pt.headY = Math.sin(t * 0.35 + c.walkPhase) * 0.3;
    pt.headX = 0;
  }
  // Uống cà phê: tay phải nâng ly lên miệng
  if (c.drink > 0) {
    c.drinkTimer += dt;
    const d = Math.min(1, c.drinkTimer / 2.4);
    const raise = smoothstep(0, 0.35, d) - smoothstep(0.65, 1, d);
    pt.shR = -1.9 * raise + (pt.shR * (1 - raise));
    pt.foreR = -0.9 * raise + (pt.foreR * (1 - raise));
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

/* ---- Bot khách quen ---- */
function spawnBots(count) {
  const names = [...BOT_NAMES].sort(() => Math.random() - 0.5);
  for (let i = 0; i < count; i++) {
    const spec = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
    const seat = freeSeatNear();
    if (!seat) break;
    const id = 'bot' + i;
    // Hầu hết ngồi sẵn cho quán đông ngay, vài người đi bộ từ cửa vào cho có sức sống
    if (i < 45) {
      spawnCharacter(id, names[i % names.length], spec, { bot: true, seat });
    } else {
      setTimeout(() => {
        if (state.players.has(id)) return;
        const b = spawnCharacter(id, names[i % names.length], spec, { bot: true, x: -4 + Math.random() * 8, z: 14 + Math.random() * 2.5 });
        const s2 = freeSeatNear();
        if (s2) walkTo(b, s2.x, s2.z, s2);
      }, 500 * (i - 44));
    }
  }
}
setInterval(() => {
  const bots = [...state.players.values()].filter((c) => c.isBot);
  if (!bots.length) return;
  const b = bots[Math.floor(Math.random() * bots.length)];
  const r = Math.random();
  if (r < 0.5) {
    say(b.id, BOT_LINES[Math.floor(Math.random() * BOT_LINES.length)]);
  } else if (r < 0.68 && b.mode === 'sit') {
    const s = freeSeatNear();
    if (s) walkTo(b, s.x, s.z, s);
  } else if (r < 0.85) {
    startDrink(b);
  }
}, 4500);

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
function say(id, text) {
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
  log(`<b>${escapeHtml(c.name)}:</b> ${escapeHtml(text)}`, id === 'me' ? 'me' : '');
}
const ACK = ['Haha đúng rồi!', 'Chuẩn luôn bạn ơi!', 'Ừ ừ, mình cũng nghĩ vậy.', 'Hay quá!', '👍'];
function botReplyTo(text) {
  const low = text.toLowerCase();
  const hit = REPLIES.find((r) => r.keys.some((k) => low.includes(k)));
  const bots = [...state.players.values()].filter((c) => c.isBot);
  if (!bots.length) return;
  const b = bots[Math.floor(Math.random() * bots.length)];
  const reply = hit
    ? hit.text[Math.floor(Math.random() * hit.text.length)].replace('{name}', b.name)
    : ACK[Math.floor(Math.random() * ACK.length)];
  setTimeout(() => say(b.id, reply), 1200 + Math.random() * 1400);
}
function sendChat() {
  const input = $('chat-input');
  const text = input.value.trim();
  if (!text || !state.entered) return;
  input.value = '';
  say('me', text);
  botReplyTo(text);
}
$('chat-send').addEventListener('click', sendChat);
$('chat-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });

/* ============ CLICK TRONG QUÁN 3D ============ */
const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();
floor.userData.floor = true; terraceFloor.userData.floor = true;
clickable.push(floor, terraceFloor, tvScreen);
let downX = 0, downY = 0;
renderer.domElement.addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
  if (!state.entered) return;
  ptr.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const hits = ray.intersectObjects(clickable, false);
  if (!hits.length) return;
  const o = hits[0].object;
  const me = state.players.get('me');
  if (o.userData.charId && o.userData.charId !== 'me') { openProfile(o.userData.charId, e.clientX, e.clientY); return; }
  if (o.userData.isTV) { openTV(); return; }
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
  p.style.left = Math.min(x + 12, innerWidth - 270) + 'px';
  p.style.top = Math.min(y + 12, innerHeight - 220) + 'px';
}
$('profile-close').addEventListener('click', () => $('profile').classList.add('hidden'));
$('btn-hello').addEventListener('click', () => {
  const c = state.players.get(profileId);
  if (!c) return;
  $('profile').classList.add('hidden');
  say('me', `Chào ${c.name} nhé! 👋`);
  setTimeout(() => say(c.id, `Chào ${state.myName}! Ngồi xuống đây chơi với mình nè 😊`), 1300);
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
    setTimeout(() => say(profileId, `Mình đồng ý kết bạn với ${state.myName} nè! 🤝`), 1200);
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
  $('tv-frame').src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1`;
  drawTV(0);
}
function openTV() { $('tv-panel').classList.remove('hidden'); }
$('btn-tv').addEventListener('click', openTV);
$('tv-close').addEventListener('click', () => $('tv-panel').classList.add('hidden'));
$('tv-play').addEventListener('click', () => {
  const id = extractVideoId($('tv-url').value.trim());
  if (id) { setVideo(id, 'Video bạn chọn'); toast('Đã đổi video trên tivi 📺'); }
  else toast('Link YouTube chưa đúng, thử lại nhé');
});
document.querySelectorAll('.tv-preset').forEach((b) => b.addEventListener('click', () => {
  setVideo(b.dataset.vid, b.textContent.trim());
  toast('Đã đổi video trên tivi 📺');
}));

/* ============ NÚT ĐIỀU KHIỂN ============ */
$('btn-coffee').addEventListener('click', () => {
  const me = state.players.get('me');
  if (!me) return;
  if (me.mode !== 'sit') { toast('Ngồi xuống ghế trống rồi hẵng gọi cà phê nhé ☕'); return; }
  startDrink(me);
  say('lan', `Cà phê của ${state.myName} đây, mời bạn! ☕`);
  toast('Cô Lan mang cà phê ra rồi, nhân vật sẽ nâng ly uống ☕');
});
const CAM_MODES = [
  { pos: [0, 15, 24], target: [0, 1, 2], label: 'Toàn cảnh quán' },
  { pos: null, target: null, label: 'Theo chân bạn' },
  { pos: [0, 3.4, 4], target: [0, 3.1, -9.7], label: 'Nhìn lên tivi' },
];
$('btn-cam').addEventListener('click', () => {
  state.camMode = (state.camMode + 1) % CAM_MODES.length;
  const m = CAM_MODES[state.camMode];
  if (m.pos) { camera.position.set(...m.pos); controls.target.set(...m.target); }
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
pvCam.position.set(0, 1.7, 4.4); pvCam.lookAt(0, 1.0, 0);
const pvDisc = new THREE.Mesh(new THREE.CircleGeometry(1.15, 28), new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.9 }));
pvDisc.rotation.x = -Math.PI / 2; pvScene.add(pvDisc);
let pvChar = null;
function showPreview(i) {
  if (pvChar) pvScene.remove(pvChar.group);
  const b = buildCharacter(CHARACTERS[i]);
  pvScene.add(b.group);
  pvChar = b;
}
const grid = $('char-grid');
CHARACTERS.forEach((ch, i) => {
  const btn = document.createElement('button');
  btn.className = 'char-card' + (i === 0 ? ' selected' : '');
  btn.innerHTML = `<b>${ch.name}</b><small>${ch.gender}</small>`;
  btn.addEventListener('click', () => {
    state.myChar = i;
    grid.querySelectorAll('.char-card').forEach((el) => el.classList.remove('selected'));
    btn.classList.add('selected');
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
}
function enterCafe() {
  const name = $('player-name').value.trim() || RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
  state.myName = name;
  $('welcome').classList.add('hidden');
  if (state.players.has('me')) removeCharacter('me');
  spawnCharacter('me', name, CHARACTERS[state.myChar], { x: 0, z: 15.5 });
  state.entered = true;
  localStorage.setItem('cafe3d_name', name);
  localStorage.setItem('cafe3d_char', String(state.myChar));
  camera.position.set(0, 9, 20);
  controls.target.set(0, 1, 8);
  log(`<span class="sys">🎉 ${escapeHtml(name)} vừa vào quán! Có ${state.players.size} người đang ở đây.</span>`);
  setTimeout(() => say('lan', `Chào ${name} đến với Café Kết Bạn! Bấm vào ghế trống để ngồi nhé ☕`), 800);
  toast('Chào mừng đến quán! Bấm vào ghế trống để ngồi xuống ☕');
}
$('btn-enter').addEventListener('click', enterCafe);
$('player-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') enterCafe(); });

/* ============ KHỞI TẠO QUÁN ============ */
const LAN_SPEC = { name: 'Cô Lan', gender: 'Nữ', desc: 'Chủ quán, pha cà phê ngon nhất khu.', skin: 0xf2c89b, hair: 0x9a3412, hairStyle: 'bun', shirt: 0x166534, pants: 0x1f2937 };
spawnCharacter('lan', 'Cô Lan', LAN_SPEC, { x: 12.4, z: -5.5, rotY: -Math.PI / 2 });
spawnBots(50);
showPreview(0);
const savedName = localStorage.getItem('cafe3d_name');
if (savedName) $('player-name').value = savedName;
const savedChar = parseInt(localStorage.getItem('cafe3d_char') || '0', 10);
if (CHARACTERS[savedChar]) {
  state.myChar = savedChar;
  grid.querySelectorAll('.char-card').forEach((el, i) => el.classList.toggle('selected', i === savedChar));
  showPreview(savedChar);
}
log('<span class="sys">☕ Chào mừng đến Café Kết Bạn 3D — quán có 100 ghế, chọn nhân vật rồi vào chơi nhé!</span>');

/* ---- Vào nhanh để test: ?autojoin=Tên&char=0&sit=1 ---- */
const qp = new URLSearchParams(location.search);
if (qp.has('autojoin')) {
  $('player-name').value = qp.get('autojoin') || 'Khách Test';
  const ch = parseInt(qp.get('char') || '0', 10);
  if (CHARACTERS[ch]) {
    state.myChar = ch;
    grid.querySelectorAll('.char-card').forEach((el, i) => el.classList.toggle('selected', i === ch));
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
  if (pvChar && !$('welcome').classList.contains('hidden')) {
    pvChar.group.rotation.y += dt * 0.8;
    pvRenderer.render(pvScene, pvCam);
  }
}
animate();

/* Debug nhanh: window.__cafeDebug() -> trạng thái từng người */
window.__cafeDebug = () => [...state.players.values()].map((c) => ({
  id: c.id, mode: c.mode, x: +c.group.position.x.toFixed(1), z: +c.group.position.z.toFixed(1),
  path: c.path.length, seat: c.seat ? c.seat.id : null, drink: c.drink,
}));
window.__cafeFps = () => new Promise((res) => {
  let n = 0; const t0 = performance.now();
  const tick = () => { n++; if (performance.now() - t0 < 5000) requestAnimationFrame(tick); else res(+(n / 5).toFixed(1)); };
  requestAnimationFrame(tick);
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
