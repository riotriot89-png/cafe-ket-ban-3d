/* ============ TẠO ẢNH VỚI MUSE — tool tạo ảnh qua Firebase ============
   Web này đã thay thế hoàn toàn quán cà phê 3D cũ (người dùng chốt xóa quán
   ngày 2026-11-20). Không còn Three.js, không còn nhân vật GLB, không còn
   service worker/PWA của quán cũ.

   VÒNG LẶP (không server riêng, không gọi API nào từ web):
   1. Người dùng gõ mô tả trên web -> ghi request vào
      image-tool/requests/{pushId} trên Firebase Realtime Database
      (project cafe-ket-ban, Singapore), status = "pending".
   2. Muse kiểm tra định kỳ, tạo ảnh rồi ghi thêm vào cùng node đó:
      status = "done" | "error", imageResult (data URL JPEG), doneAt.
   3. Web lắng nghe image-tool/requests (mới nhất trước, tối đa 30)
      và tự hiện ảnh khi xong.

   SDK Firebase compat tự chứa trong vendor/ (không dùng CDN ngoài). */

'use strict';

/* --- 0. Hủy service worker của quán cũ (nếu trình duyệt còn giữ) --- */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function (regs) {
    regs.forEach(function (r) { r.unregister().catch(function () {}); });
  }).catch(function () {});
}

/* --- 1. Firebase config (giữ nguyên project cafe-ket-ban cũ) --- */
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
const REQUESTS_PATH = 'image-tool/requests';
const MAX_LISTEN = 30;
const MAX_PROMPT = 500;
const MAX_FILE_MB = 5;
const MAX_IMG_PX = 1024;

let fbDb = null;
let fbReady = false;
let fbConnected = false;

/* --- 2. State --- */
const state = {
  mode: 'generate', // 'generate' | 'edit'
  style: 'real',
  size: 'square',
  imageData: null, // data URL JPEG đã thu nhỏ (chỉ ở chế độ edit)
  imageName: '',
  lastKey: null,
};

/* --- 3. DOM --- */
const $ = function (id) { return document.getElementById(id); };
const els = {
  net: $('net-status'),
  tabGenerate: $('tab-generate'),
  tabEdit: $('tab-edit'),
  uploadBox: $('upload-box'),
  fileInput: $('file-input'),
  uploadPreview: $('upload-preview'),
  previewImg: $('preview-img'),
  previewName: $('preview-name'),
  btnRemoveImg: $('btn-remove-img'),
  promptLabel: $('prompt-label'),
  prompt: $('prompt-input'),
  charCount: $('char-count'),
  styleChips: $('style-chips'),
  sizeChips: $('size-chips'),
  formError: $('form-error'),
  formOk: $('form-ok'),
  btnGenerate: $('btn-generate'),
  listEmpty: $('list-empty'),
  list: $('requests-list'),
};

/* --- 4. Helpers --- */
function showError(msg) {
  els.formError.textContent = msg;
  els.formError.classList.remove('hidden');
}
function hideError() { els.formError.classList.add('hidden'); }
function showOk() { els.formOk.classList.remove('hidden'); }
function hideOk() { els.formOk.classList.add('hidden'); }

function setNetStatus(kind, text) {
  els.net.className = 'net-status ' + kind;
  els.net.textContent = text;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function fmtTime(ms) {
  try { return new Date(ms).toLocaleString('vi-VN'); } catch (e) { return ''; }
}

const STATUS_META = {
  pending:    { cls: 'badge-pending',    label: '⏳ Đang chờ' },
  processing: { cls: 'badge-processing', label: '🎨 Đang tạo' },
  generating: { cls: 'badge-processing', label: '🎨 Đang tạo' },
  done:       { cls: 'badge-done',       label: '✅ Xong' },
  error:      { cls: 'badge-error',      label: '❌ Lỗi' },
};

/* --- 5. Firebase init --- */
function fbInit() {
  try {
    if (!window.firebase || !firebase.initializeApp) {
      setNetStatus('offline', '● Không tải được SDK Firebase — trang vẫn mở được nhưng không gửi được yêu cầu. Thử tải lại trang.');
      return;
    }
    firebase.initializeApp(FIREBASE_CONFIG);
    fbDb = firebase.database();
    fbReady = true;
    fbDb.ref('.info/connected').on('value', function (snap) {
      fbConnected = !!snap.val();
      if (fbConnected) {
        setNetStatus('online', '● Đã kết nối Firebase — gửi yêu cầu là Muse sẽ tạo ảnh.');
      } else {
        setNetStatus('offline', '● Mất kết nối Firebase — kiểm tra mạng rồi thử lại. Yêu cầu đã gửi vẫn được xử lý khi mạng trở lại.');
      }
      validateForm();
    });
    listenRequests();
  } catch (e) {
    console.error('Firebase init lỗi:', e);
    setNetStatus('offline', '● Không nối được Firebase (' + (e && e.message ? e.message : 'lỗi không rõ') + '). Thử tải lại trang.');
  }
}

/* --- 6. Lắng nghe danh sách yêu cầu --- */
function listenRequests() {
  if (!fbDb) return;
  fbDb.ref(REQUESTS_PATH).orderByChild('createdAt').limitToLast(MAX_LISTEN)
    .on('value', function (snap) {
      const items = [];
      snap.forEach(function (child) {
        const v = child.val() || {};
        v._key = child.key;
        items.push(v);
      });
      items.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
      renderList(items);
    }, function (err) {
      console.error('Nghe requests lỗi:', err);
      setNetStatus('offline', '● Không đọc được danh sách yêu cầu từ Firebase (' + (err && err.message ? err.message : 'lỗi không rõ') + ').');
    });
}

function renderList(items) {
  els.listEmpty.classList.toggle('hidden', items.length > 0);
  els.list.innerHTML = '';
  items.forEach(function (it) {
    const meta = STATUS_META[it.status] || STATUS_META.pending;
    const card = document.createElement('div');
    card.className = 'req-card';
    let html = '<div class="req-head">'
      + '<p class="req-prompt">' + esc(it.prompt || '(không có mô tả)') + '</p>'
      + '<span class="badge ' + meta.cls + '">' + meta.label + '</span>'
      + '</div>'
      + '<div class="req-time">' + esc(fmtTime(it.createdAt)) + ' · ' + esc(it.type === 'edit' ? 'Chỉnh ảnh' : 'Tạo ảnh mới') + '</div>';
    if (it.status === 'error' && it.error) {
      html += '<p class="req-error">Lỗi: ' + esc(it.error) + '</p>';
    }
    if (it.status === 'done' && it.imageResult) {
      html += '<div class="req-result"><img src="' + esc(it.imageResult) + '" alt="Ảnh Muse đã tạo">'
        + '<a class="btn-download" href="' + esc(it.imageResult) + '" download="muse-' + esc(it._key || 'image') + '.jpg">⬇️ Tải ảnh xuống</a></div>';
    }
    card.innerHTML = html;
    els.list.appendChild(card);
  });
}

/* --- 7. Chế độ tạo / chỉnh --- */
function setMode(mode) {
  state.mode = mode;
  els.tabGenerate.classList.toggle('active', mode === 'generate');
  els.tabEdit.classList.toggle('active', mode === 'edit');
  els.uploadBox.classList.toggle('hidden', mode !== 'edit');
  els.promptLabel.textContent = mode === 'edit'
    ? 'Mô tả cách chỉnh ảnh'
    : 'Mô tả ảnh bạn muốn tạo';
  els.prompt.placeholder = mode === 'edit'
    ? 'Ví dụ: Đổi nền thành bãi biển hoàng hôn, làm ảnh sáng hơn…'
    : 'Ví dụ: Một chú rồng con màu xanh đang bay trên đảo nhiệt đới lúc hoàng hôn…';
  els.btnGenerate.textContent = mode === 'edit' ? '🖼️ Chỉnh ảnh' : '✨ Tạo ảnh';
  hideError();
  hideOk();
  validateForm();
}
els.tabGenerate.addEventListener('click', function () { setMode('generate'); });
els.tabEdit.addEventListener('click', function () { setMode('edit'); });

/* --- 8. Chọn 1 chip trong nhóm --- */
function bindChipGroup(container, attr, apply) {
  container.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-' + attr + ']');
    if (!btn) return;
    container.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
    btn.classList.add('active');
    apply(btn.getAttribute('data-' + attr));
  });
}
bindChipGroup(els.styleChips, 'style', function (v) { state.style = v; });
bindChipGroup(els.sizeChips, 'size', function (v) { state.size = v; });

/* --- 9. Upload + thu nhỏ ảnh --- */
els.fileInput.addEventListener('change', function () {
  const file = els.fileInput.files && els.fileInput.files[0];
  hideError();
  hideOk();
  if (!file) return;
  if (file.type.indexOf('image/') !== 0) {
    showError('File này không phải ảnh. Hãy chọn file JPG hoặc PNG.');
    els.fileInput.value = '';
    return;
  }
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    showError('Ảnh quá lớn (' + (file.size / 1048576).toFixed(1) + 'MB). Hãy chọn ảnh dưới 5MB.');
    els.fileInput.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = function () {
    const img = new Image();
    img.onload = function () {
      try {
        state.imageData = downscaleToJpeg(img, MAX_IMG_PX, 0.85);
        state.imageName = file.name;
        els.previewImg.src = state.imageData;
        els.previewName.textContent = file.name + ' (đã thu nhỏ về tối đa ' + MAX_IMG_PX + 'px)';
        els.uploadPreview.classList.remove('hidden');
        validateForm();
      } catch (e) {
        console.error('Thu nhỏ ảnh lỗi:', e);
        showError('Không đọc được ảnh này. Hãy thử ảnh khác.');
        state.imageData = null;
      }
    };
    img.onerror = function () { showError('Không đọc được ảnh này. Hãy thử file JPG hoặc PNG khác.'); };
    img.src = reader.result;
  };
  reader.onerror = function () { showError('Không đọc được file. Hãy thử lại.'); };
  reader.readAsDataURL(file);
});

function downscaleToJpeg(img, maxPx, quality) {
  let w = img.naturalWidth, h = img.naturalHeight;
  const scale = Math.min(1, maxPx / Math.max(w, h));
  w = Math.max(1, Math.round(w * scale));
  h = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h); // nền trắng cho ảnh có trong suốt (JPEG không có alpha)
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

els.btnRemoveImg.addEventListener('click', function () {
  state.imageData = null;
  state.imageName = '';
  els.fileInput.value = '';
  els.uploadPreview.classList.add('hidden');
  els.previewImg.removeAttribute('src');
  validateForm();
});

/* --- 10. Form: đếm ký tự + validate --- */
els.prompt.addEventListener('input', function () {
  els.charCount.textContent = els.prompt.value.length;
  hideError();
  hideOk();
  validateForm();
});

function validateForm() {
  const prompt = els.prompt.value.trim();
  let ok = prompt.length > 0;
  if (state.mode === 'edit' && !state.imageData) ok = false;
  if (!fbReady) ok = false; // SDK chưa tải xong thì chưa gửi được
  els.btnGenerate.disabled = !ok;
  return ok;
}

/* --- 11. Gửi yêu cầu lên Firebase --- */
els.btnGenerate.addEventListener('click', function () {
  hideError();
  hideOk();
  const prompt = els.prompt.value.trim();
  if (!prompt) { showError('Hãy gõ mô tả ảnh trước đã.'); return; }
  if (prompt.length > MAX_PROMPT) { showError('Mô tả tối đa ' + MAX_PROMPT + ' ký tự.'); return; }
  if (state.mode === 'edit' && !state.imageData) { showError('Chế độ chỉnh ảnh cần chọn 1 ảnh trước.'); return; }
  if (!fbReady || !fbDb) { showError('Chưa nối được Firebase nên chưa gửi được. Thử tải lại trang.'); return; }
  // Không chặn khi .info/connected báo mất mạng: SDK sẽ xếp hàng và gửi
  // khi mạng trở lại; nếu ghi thật sự thất bại thì .catch bên dưới báo lỗi.

  const req = {
    type: state.mode === 'edit' ? 'edit' : 'generate',
    prompt: prompt,
    style: state.style,
    size: state.size,
    status: 'pending',
    createdAt: Date.now(),
  };
  if (state.mode === 'edit') req.imageData = state.imageData;

  els.btnGenerate.disabled = true;
  els.btnGenerate.textContent = '⏳ Đang gửi…';
  fbDb.ref(REQUESTS_PATH).push(req).then(function (ref) {
    state.lastKey = ref.key;
    els.prompt.value = '';
    els.charCount.textContent = '0';
    if (state.mode === 'edit') {
      state.imageData = null;
      els.fileInput.value = '';
      els.uploadPreview.classList.add('hidden');
    }
    showOk();
    els.btnGenerate.textContent = state.mode === 'edit' ? '🖼️ Chỉnh ảnh' : '✨ Tạo ảnh';
    validateForm();
  }).catch(function (e) {
    console.error('Gửi yêu cầu lỗi:', e);
    showError('Gửi không được (' + (e && e.message ? e.message : 'lỗi không rõ') + '). Kiểm tra mạng rồi bấm lại.');
    els.btnGenerate.textContent = state.mode === 'edit' ? '🖼️ Chỉnh ảnh' : '✨ Tạo ảnh';
    validateForm();
  });
});

/* --- 12. Khởi động --- */
fbInit();
validateForm();

/* Hook kiểm tra nhanh trong console trình duyệt */
window.__imgTool = {
  fbReady: function () { return fbReady; },
  fbConnected: function () { return fbConnected; },
  lastKey: function () { return state.lastKey; },
};
