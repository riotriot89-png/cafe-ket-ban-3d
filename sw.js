/* Service worker cho Café Kết Bạn: cho phép "Thêm vào Màn hình chính" và
   chạy offline từ bộ nhớ đệm. Chiến lược network-first: có mạng thì luôn lấy
   bản mới nhất (không bị kẹt bản cũ), mất mạng mới dùng bản đã lưu. Chỉ lưu
   file cùng nguồn (không chạm Firebase/YouTube). */
const CACHE = 'cafe-ket-ban-v1';
const ASSETS = [
  './', 'index.html', 'style.css', 'app.js', 'manifest.json',
  'vendor/three.module.js', 'vendor/OrbitControls.js', 'vendor/CSS3DRenderer.js',
  'vendor/firebase-app-compat.js', 'vendor/firebase-database-compat.js',
  'icons/icon-192.png', 'icons/icon-512.png',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(fetch(e.request).then((res) => {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(e.request, copy));
    return res;
  }).catch(() => caches.match(e.request)));
});
