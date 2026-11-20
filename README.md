# Tạo Ảnh với Muse 🎨

Tool tạo ảnh chạy trên web, không cần API key, không có server riêng.
Người dùng gõ mô tả trên web → yêu cầu được ghi lên Firebase Realtime
Database → Muse kiểm tra định kỳ, tạo ảnh rồi ghi ảnh trả lại lên
Firebase → web tự hiện ảnh.

> Web này đã **thay thế hoàn toàn quán cà phê 3D cũ** (người dùng chốt xóa
> quán ngày 2026-11-20). Không còn Three.js, nhân vật GLB, tivi YouTube,
> service worker/PWA của quán cũ. Code mới chỉ dùng Firebase SDK tự chứa
> trong `vendor/`. Khi tải trang, app.js mới tự hủy đăng ký service worker
> cũ nếu trình duyệt còn giữ, để không phục vụ bản quán cũ từ cache.

## Cách chạy

- Deploy: push repo lên GitHub, Vercel tự deploy (đã nối sẵn, domain
  `cafenha.vercel.app`). `vercel.json` giữ nguyên.
- Chạy local: `python3 -m http.server 8003` trong thư mục này, mở
  `http://localhost:8003`.

## Vòng lặp hoạt động

```
Web (người dùng)                Firebase RTDB                 Muse (người)
  gõ mô tả, chọn              image-tool/requests/{id}       kiểm tra định kỳ
  phong cách, tỉ lệ   ---->    { type, prompt, style,          (cron riêng)
  bấm "Tạo ảnh"                size, imageData?,               |
                               status: "pending",              v
                               createdAt }               tạo ảnh, ghi thêm
  danh sách tự cập nhật  <---- { status: "done"|"error",       vào cùng node:
  khi có ảnh mới               imageResult?, error?,       status, imageResult,
                               doneAt }                     doneAt / error
```

- Mỗi ảnh chờ vài phút (không tức thì như gọi API trực tiếp).
- Chỉ cần để trang mở, ảnh xong sẽ tự hiện trong danh sách.

## Dữ liệu Firebase

Project giữ nguyên project cũ của quán: **`cafe-ket-ban`**
(Singapore, Spark miễn phí), database
`https://cafe-ket-ban-default-rtdb.asia-southeast1.firebasedatabase.app`.
Config đầy đủ nằm trong `app.js` (FIREBASE_CONFIG).

### Request — `image-tool/requests/{pushId}` (web ghi lúc tạo)

| Field | Kiểu | Ghi chú |
|---|---|---|
| `type` | string | `"generate"` (tạo mới) \| `"edit"` (chỉnh ảnh có sẵn) |
| `prompt` | string | Mô tả, tối đa 500 ký tự |
| `style` | string | `"real"` (Ảnh thật) \| `"anime"` \| `"3d"` (Hoạt hình 3D) \| `"painting"` (Tranh vẽ) |
| `size` | string | `"square"` (1:1) \| `"portrait"` (9:16) \| `"landscape"` (16:9) |
| `imageData` | string | Chỉ khi `type="edit"`: data URL JPEG của ảnh upload, đã thu nhỏ bằng canvas về tối đa 1024px, chất lượng 0.85 |
| `status` | string | `"pending"` khi mới tạo |
| `createdAt` | number | `Date.now()` (ms) |

### Kết quả — Muse ghi thêm vào cùng node

| Field | Kiểu | Ghi chú |
|---|---|---|
| `status` | string | `"done"` \| `"error"` (trong lúc làm có thể đặt `"processing"` để web hiện "Đang tạo") |
| `imageResult` | string | Data URL JPEG của ảnh đã tạo/chỉnh xong |
| `error` | string | Nội dung lỗi (chỉ khi `status="error"`) |
| `doneAt` | number | `Date.now()` lúc xong |

### Web lắng nghe

`image-tool/requests`, `orderByChild("createdAt")`, `limitToLast(30)`,
hiển thị mới nhất trước. Mỗi thẻ hiện prompt, thời gian, badge trạng
thái (Đang chờ / Đang tạo / Xong / Lỗi + nội dung lỗi), ảnh kết quả kèm
nút "Tải ảnh xuống" khi xong.

## File trong repo (sau khi đổi)

| File | Vai trò |
|---|---|
| `index.html` | Giao diện tool: tiêu đề, chọn chế độ, ô mô tả, chip phong cách/tỉ lệ, danh sách yêu cầu |
| `style.css` | CSS tự viết, giao diện tối, font hệ thống, không CDN ngoài |
| `app.js` | Logic: Firebase init, gửi request, lắng nghe danh sách, upload + thu nhỏ ảnh, hủy service worker cũ |
| `vendor/firebase-app-compat.js` | SDK Firebase App compat 11.1.0 (tự chứa) |
| `vendor/firebase-database-compat.js` | SDK Firebase RTDB compat 11.1.0 (tự chứa) |
| `vercel.json` | Giữ nguyên |
| `README.md` | File này |

## Lưu ý

- **Không dùng CDN ngoài**: không Tailwind, không Google Fonts, không
  Three.js. Mọi thứ chạy bằng file local + Firebase SDK tự chứa.
- Upload ảnh chỉnh: giới hạn file 5MB, chỉ nhận file ảnh; ảnh được thu
  nhỏ bằng canvas về tối đa 1024px (JPEG 0.85) trước khi ghi lên Firebase.
- Nút "Tạo ảnh" disable khi prompt trống, khi chưa chọn ảnh (chế độ
  chỉnh ảnh), hoặc khi chưa nối được Firebase.
- Firebase đang ở test mode (Rules mở, hết hạn ~2026-12-17): cần đặt
  Rules chỉ cho `image-tool` trước hạn, ví dụ:
  `{ "rules": { "image-tool": { ".read": true, ".write": true } } }`.
- File cũ của quán (vendor/*.glb, three.module.js, textures.js,
  manifest.json, sw.js, tex/, char-styles/, characters/, icons/) vẫn còn
  trên đĩa nhưng **không còn được tham chiếu** — dọn trước khi push để
  repo nhẹ.
- Phần theo dõi yêu cầu (Muse kiểm tra định kỳ, tạo ảnh, ghi kết quả)
  làm riêng bằng cron sau, không nằm trong web này.
