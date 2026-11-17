# Café Kết Bạn 3D ☕

Quán cà phê kết bạn **3D thật** (Three.js) — không dùng ảnh nền. Cả quán, bàn ghế,
tivi và nhân vật đều là mô hình 3D, nhân vật đi lại, ngồi, nâng ly uống cà phê.

## Có gì trong quán

- **Quán 3D kiểu gaming**: sàn gỗ, tường neon, bảng hiệu phát sáng, quầy bar,
  sân vườn có dây đèn, góc lounge có sofa và thảm.
- **100 ghế** chia 3 khu: Sảnh chính (48 ghế), Sân vườn (32 ghế), Lounge (20 ghế).
  Mỗi bàn tròn to (r 0,78) có 4 ghế xếp ở nửa dưới (phía nam) của bàn, tất cả hướng mặt
  lên trên về phía tivi — ngồi xuống là quay mặt ra bàn và nhìn lên tivi.
- **Nhân vật 3D chibi thời trang, cao ~1,7**: chỉ 2 nhân vật — **Milo (nam)**: bộ Street
  (snapback đen vành đỏ có logo, hoodie kem túi kangaroo đỏ, quần cargo rêu có túi hộp,
  giày sneaker trắng đế đỏ); **Luna (nữ)**: bộ Chic (mũ beret hồng, nơ hồng, tóc dài mái ngang,
  áo trắng cổ bèo, váy xòe hồng có thắt lưng, túi xách chéo vàng, tất trắng dài, giày búp bê).
  Đầu to, mắt to, má hồng, miệng cười — đi bộ, ngồi xuống ghế, nâng ly uống cà phê, thở,
  chớp mắt, quay đầu. Bóng dưới chân là bóng mềm (gradient mờ dần) chứ không phải đĩa đen cứng.
  Uống trà/cà phê kiểu thật: tay với xuống bàn cầm ly lên, đưa lên miệng uống từng ngụm
  rồi đặt ly xuống bàn (bình thường tay không cầm ly). Ly đặt trên bàn ngay trước mặt
  người ngồi nên tay với tới bàn là khớp.
  Màn chọn nhân vật có xem trước 3D xoay vòng. Trang phục được tách thành bảng dữ
  liệu `OUTFITS` trong app.js: thêm bộ đồ mới cho người chơi mua chỉ cần thêm 1 entry,
  không phải sửa code dựng nhân vật.
- **Tủ đồ (8 bộ)**: mỗi nhân vật có 4 bộ, chọn ở màn chào, đồng bộ cho mọi người thấy
  qua Firebase. Milo: Street, Denim (áo khoác jean + quần jean + tóc ngắn), Thể thao
  (băng đô + tóc xoăn + áo cam + quần đùi), Mùa đông (mũ len + áo len cổ lọ + bốt).
  Luna: Chic, Denim (tóc bob + áo khoác jean + quần jean), Mùa hè (mũ rộng vành + tóc đuôi
  ngựa + váy liền vàng + dép), Mùa đông (mũ len hồng + tóc búi + áo len + legging + bốt).
  Đổi bộ đồ giữa chừng thì người khác cũng thấy nhân vật dựng lại theo bộ mới.
- **Chat bong bóng 3D**: bong bóng bám theo đầu nhân vật, kèm log chat.
- **Tivi YouTube**: màn hình lớn trên tường (luôn bật, không bấm tương tác được). Video chiếu thật lên màn hình tivi 3D trong game (CSS3DRenderer), tự tắt phụ đề và thanh điều khiển. Dán link YouTube để thêm vào hàng chờ chung cả quán — hết video này tự phát video người sau. Âm thanh chỉnh riêng từng người (nút loa trên thanh trên cùng + thanh trượt trong bảng tivi).
- **Kết bạn**: bấm vào người khác để xem hồ sơ, chào và kết bạn (lưu localStorage).
- **Camera**: kéo xoay, lăn chuột zoom, nút đổi góc nhìn (toàn cảnh / theo bạn / tivi / **góc nhìn thứ nhất** — camera ở đầu nhân vật, kéo để nhìn quanh).
  Nhân vật nào đứng chắn giữa camera và điểm đang nhìn thì tự mờ đi (chỉ còn ~12%
  độ đậm) để không che màn hình; xoay camera ra chỗ khác thì nhân vật hiện lại
  bình thường.

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

- **Game bắt xoay ngang**: cầm dọc thì hiện màn hình "Xoay ngang điện thoại để
  chơi", vào quán là xin toàn màn hình + khóa xoay ngang (Android) như game thật.
- Màn chào ở chế độ ngang chia 2 cột (nhân vật bên trái, tên + nút vào quán bên
  phải) để vừa màn hình ngắn; topbar 1 hàng chỉ còn icon; chat thu gọn thành
  nút 💬 ở góc phải dưới, bấm mới mở để khỏi che màn hình.
- Điện thoại tự bật chế độ nhẹ (tắt bóng đổ, giảm độ phân giải render) cho mượt.
- Chạm 1 ngón để xoay quán, chụm 2 ngón để zoom, chạm vào bàn/ghế để ngồi.
  Khi xoay quán thì chạm được lệch nhiều hơn để khỏi bấm nhầm ghế.

## Cài đặt như game thật (PWA)

- Quán là PWA: có `manifest.json` + service worker, mở bằng Chrome/Android thì
  nút "📲 Cài đặt game" ở màn chào sẽ hiện ra; iPhone thì bấm Chia sẻ ⤴️ rồi
  chọn "Thêm vào Màn hình chính". Sau khi cài, game mở toàn màn hình, có icon
  riêng trên màn hình chính, khóa xoay ngang và chạy được cả khi mất mạng
  (bản đã lưu trong bộ nhớ đệm).

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
