# Café Kết Bạn 3D ☕

Quán cà phê kết bạn **3D thật** (Three.js) — không dùng ảnh nền. Cả quán, bàn ghế,
tivi và nhân vật đều là mô hình 3D, nhân vật đi lại, ngồi, nâng ly uống cà phê.

## Có gì trong quán

- **Quán 3D kiểu gaming**: sàn gỗ, tường neon, bảng hiệu phát sáng, quầy bar,
  sân vườn có dây đèn, góc lounge có sofa và thảm.
- **100 ghế** chia 3 khu: Sảnh chính (48 ghế), Sân vườn (32 ghế), Lounge (20 ghế).
- **Nhân vật 3D chibi đáng yêu**: chỉ 2 nhân vật — **Milo (nam)**: nón lưỡi trai đỏ,
  áo hoodie kem có túi kangaroo, quần jean, giày thể thao trắng đế đỏ;
  **Luna (nữ)**: nơ hồng, tóc dài mái ngang, áo trắng cổ bèo, váy xòe hồng,
  tất trắng, giày búp bê. Đầu to, mắt to, má hồng, miệng cười — đi bộ, ngồi
  xuống ghế, nâng ly uống cà phê, thở và quay đầu. Màn chọn nhân vật có xem
  trước 3D xoay vòng.
- **Chat bong bóng 3D**: bong bóng bám theo đầu nhân vật, kèm log chat.
- **Tivi YouTube**: màn hình lớn trên tường (luôn bật, không bấm tương tác được). Video chiếu thật lên màn hình tivi 3D trong game (CSS3DRenderer), tự tắt phụ đề và thanh điều khiển. Dán link YouTube để thêm vào hàng chờ chung cả quán — hết video này tự phát video người sau. Âm thanh chỉnh riêng từng người (nút loa trên thanh trên cùng + thanh trượt trong bảng tivi).
- **Kết bạn**: bấm vào người khác để xem hồ sơ, chào và kết bạn (lưu localStorage).
- **Camera**: kéo xoay, lăn chuột zoom, nút đổi góc nhìn (toàn cảnh / theo bạn / tivi).

## Chơi chung thật (người thật, không bot)

Quán đã nối **Firebase Realtime Database** (project `cafe-ket-ban`, Singapore) —
không còn bot, mọi người trong quán đều là người thật:

- Vào quán sẽ thấy nhau đi lại, ngồi ghế (ghế có người thì không ngồi được nữa),
  uống cà phê, chat bong bóng + log chat chung.
- Tivi và hàng chờ video là chung cả quán: ai thêm video thì mọi người cùng xem.
- Chấm xanh ở góc trên là trạng thái kết nối (xanh = đang chơi chung, xám = mất mạng, chơi một mình).

Thử nhanh: mở quán bằng 2 trình duyệt (hoặc 1 thường + 1 ẩn danh) với 2 tên khác nhau,
người này đi lại/chat thì người kia thấy ngay.

## Chơi trên điện thoại

- Điện thoại tự bật chế độ nhẹ (tắt bóng đổ, giảm độ phân giải render) cho mượt,
  camera tự lùi lại và mở rộng góc nhìn khi cầm dọc.
- Thanh trên cùng gọn thành 2 hàng, các nút chỉ còn icon cho dễ bấm.
- Chat thu gọn thành nút 💬 ở góc phải dưới, bấm mới mở để khỏi che màn hình.
- Chạm 1 ngón để xoay quán, chụm 2 ngón để zoom, chạm vào bàn/ghế để ngồi.
  Khi xoay quán thì chạm được lệch nhiều hơn để khỏi bấm nhầm ghế.

Lưu ý: database đang ở **test mode** (mở toàn quyền đọc/ghi, hết hạn sau 30 ngày kể
từ lúc tạo). Trước khi hết hạn, vào Firebase Console → Realtime Database → Rules
và đặt rule chỉ cho phép đọc/ghi trong `rooms/cafe1`, ví dụ:

```json
{
  "rules": {
    "rooms": {
      "cafe1": { ".read": true, ".write": true }
    }
  }
}
```

## Chạy thử

Mở `index.html` qua server tĩnh (không mở file trực tiếp vì dùng ES module):

```bash
python3 -m http.server 8002
# mở http://localhost:8002
```

Vào nhanh để test: `http://localhost:8002/?autojoin=MinhAnh&char=0&sit=1`

## Deploy lên Vercel

Kéo thả thư mục này vào https://vercel.com/new, hoặc:

```bash
npx vercel
```
