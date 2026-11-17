# Café Kết Bạn 3D ☕

Quán cà phê kết bạn **3D thật** (Three.js) — không dùng ảnh nền. Cả quán, bàn ghế,
tivi và nhân vật đều là mô hình 3D, nhân vật đi lại, ngồi, nâng ly uống cà phê.

## Có gì trong quán

- **Quán 3D kiểu gaming**: sàn gỗ, tường neon, bảng hiệu phát sáng, quầy bar,
  sân vườn có dây đèn, góc lounge có sofa và thảm.
- **Tên trên đầu mỗi nhân vật** (như game): tên hiện ngay trên đầu, bong bóng chat ở trên tên.
- **Tab ra ngoài nhân vật vẫn đi tiếp**: trình duyệt dừng vòng lặp khi tab ẩn nên nhân vật
  đứng yên — khi quay lại tab, quán mô phỏng bù thời gian đã trôi qua (tối đa 15s) để
  nhân vật đi tiếp tới nơi / uống xong, rồi gửi vị trí mới lên Firebase ngay. Nhịp tim
  15s vẫn chạy khi tab ẩn nên người khác không tưởng mình đã thoát; chỉ khi đóng hẳn
  tab (onDisconnect) mới tính là rời quán.
- **Tivi nằm dưới nhân vật**: lớp video CSS3D giờ nằm dưới canvas WebGL, màn hình tivi
  trong cảnh 3D là một "lỗ" chỉ ghi depth (không vẽ màu) nên video hiện qua lỗ đó; nhân
  vật 3D đứng trước tivi sẽ vẽ đè lên video (nhân vật che màn hình, không còn bị video
  đè mất đầu). Hai chỗ dễ sai đã sửa: (1) canvas WebGL phải có `position: absolute`
  + `z-index: 1` (chỉ đổi thứ tự DOM chưa đủ vì div CSS3D absolute luôn vẽ trên
  canvas static); (2) lỗ màn hình phải có `renderOrder = -1` để được vẽ trước tường
  (opaque sort theo material trước rồi mới theo độ sâu, nên tường vẽ trước sẽ làm
  lỗ không xóa được màu tường).
- **Nhân vật 3D phong cách anime Genshin, cao ~1,85** (đã thay bằng Jake/Miku bên dưới — code dựng procedural vẫn còn trong file nhưng không còn lựa chọn nào dùng): **Milo (nam)**: bộ Street
  (snapback đen vành đỏ có logo, hoodie kem túi kangaroo đỏ, quần cargo rêu có túi hộp,
  giày sneaker trắng đế đỏ); **Luna (nữ)**: bộ Chic (mũ beret hồng, nơ hồng, tóc dài mái ngang,
  áo trắng cổ bèo, váy xòe hồng 2 lớp có thắt lưng, túi xách chéo vàng, tất trắng dài, giày búp bê).
  **Cel-shading kiểu Genshin**: da/áo/tóc dùng MeshToonMaterial + gradient map 3 bậc (sáng / nửa tối /
  tối rõ rệt thay vì chuyển mượt), viền đậm quanh đầu (inverted hull). Tỉ lệ anime: đầu nhỏ
  (r 0,19), người cao thon ~1,85, chân tay dài. Mặt anime: mắt to lấp lánh (mống mắt vẽ gradient
  có tia hướng tâm + 2 điểm sáng + mi trên dày + mi dưới mảnh), lông mày mảnh, mũi nhỏ, môi hồng,
  má hồng, miệng cười; thân thon có eo (lathe), bàn tay thon có ngón cái, giày bo tròn, váy xòe/
  váy liền tiện bằng lathe — không còn là khối hộp vuông. Tóc Genshin nhiều lớp: lọn tóc hình
  giọt nước xếp lớp + lọn highlight sáng hơn, tóc dài có 2 lọn 2 bên, tóc xoăn/búi/đuôi ngựa
  đều có lọn highlight. Váy 2 lớp (lớp ngoài xòe hơn, mép dưới lộ ra tạo lớp kép ở gấu váy).
  Đi bộ, ngồi xuống ghế, nâng ly uống cà phê, thở, chớp mắt, quay đầu. Bóng dưới chân
  là bóng mềm (gradient mờ dần, hơi bầu dục, lệch ngược hướng mặt trời) chứ không
  phải đĩa đen cứng.
  Uống trà/cà phê kiểu thật: tay với xuống bàn cầm ly lên, đưa lên miệng uống từng ngụm
  rồi đặt ly xuống bàn (bình thường tay không cầm ly). Ly đặt trên bàn ngay trước mặt
  người ngồi nên tay với tới bàn là khớp.
  Màn chọn nhân vật có xem trước 3D xoay vòng. Trang phục được tách thành bảng dữ
  liệu `OUTFITS` trong app.js: thêm bộ đồ mới cho người chơi mua chỉ cần thêm 1 entry,
  không phải sửa code dựng nhân vật.
- **Nhân vật Jake + Miku — model GLB thật tải trên mạng (thay hẳn Milo/Luna/Chibi)**:
  chỉ 2 nhân vật trong quán. **Jake (nam)**: file Meshy AI "Desolate City Survivor"
  (áo da nâu, mặt nạ phòng độc đeo cổ, gậy bóng chày sau lưng — dính liền mesh, không
  gỡ được). **Miku (nữ)**: file Meshy AI "Cat Girl Miku" (tóc trắng, tai mèo, áo hồng
  dấu chân mèo, quần short hồng, đuôi dài — dính liền mesh). Cả 2 đều cao 1,70m,
  1 mesh liền duy nhất (~20,5k tris), 24 xương (tên xương 2 người giống hệt nhau),
  1 texture atlas (đã hạ 4K -> 2K trong Blender), mặt hướng +Z. Mỗi file GLB đã gộp
  sẵn 2 clip animation thật: Idle (14s) + Walk (~1s), tải bằng GLTFLoader +
  SkeletonUtils.clone (mỗi người chơi 1 bản clone + 1 AnimationMixer riêng, chuyển
  clip bằng fade 0,25s). File cuối: `vendor/jake.glb` (7,7 MB), `vendor/miku.glb`
  (6,4 MB) — **file nhị phân, push-files không đẩy được, phải tải lên GitHub bằng
  trình duyệt** (như file Chibi trước đây). Ngồi/Uống không có clip sẵn nên làm bằng
  code: sau `mixer.update()` sẽ slerp xương về tư thế mục tiêu (đùi rotateX -1,5,
  cẳng +1,45, hông hạ ~0,47m vừa tầm ghế; tay uống theo đúng keyframe của quán:
  vai -1,30 / khuỷu -1,55 đưa ly lên miệng, đầu ngửa nhẹ) — góc đo bằng ảnh test thật.
  Không làm clip Sit/Drink trong Blender vì tail xương Meshy bị rác (hướng tail vô
  nghĩa) nên trục xoay đoán không ra. Ly cà phê gắn vào xương tay phải, tên/bong bóng
  chat bám theo xương Head, góc nhìn thứ nhất ẩn cả người (mesh liền không tách đầu).
  Quần áo dính liền trong file GLB (1 mesh + 1 atlas) nên không tách riêng được như hệ
  OUTFITS cũ — muốn đổi đồ chỉ có cách vẽ lại texture hoặc model đồ mới đè lên trong
  Blender; màn chào chỉ còn 1 bộ "Mặc định" và đã ẩn hẳn phần chọn trang phục.
- **Đồ họa (thiết kế lại 2026-11-17, nâng cấp lần 2 cùng ngày)**: không còn màu phẳng +
  khối vuông. Ánh sáng điện ảnh (tone mapping ACES + environment RoomEnvironment qua
  PMREM) cho vật liệu có phản xạ thật; **texture ảnh thật** (vendor/textures.js, base64
  512px: sàn gỗ sồi, tường gạch, đá cẩm thạch, cỏ sân vườn) thay cho texture vẽ tay ở
  các bề mặt lớn; texture vẽ bằng canvas cho tường thạch cao, sofa vải dệt, thảm hoa
  văn, mặt bàn vân gỗ tỏa tròn. Nội thất tiện bằng lathe (chân bàn đế loe thân thon,
  chao đèn chuông, chậu cây, chai lọ) và ghế lưng cong ôm lưng + đệm vải bo tròn + chân
  thon xòe, sofa đệm bo tròn, quầy bar có kệ chai + máy pha espresso. Bóng mặt trời
  thật (PCFSoft, bias/normalBias/radius đã chỉnh) + bóng mềm dưới chân nhân vật +
  bóng tiếp xúc dưới mỗi bàn. **Quán hoàn thiện**: trần gỗ + dầm, cửa sổ 2 bên có bầu
  trời thành phố + rèm vải, tranh treo tường + đồng hồ, chân tường, sân vườn có luống
  hoa + hàng rào cây, bàn nào cũng có đĩa + bình hoa mini. **Nhân vật (làm lại kiểu
  Genshin 2026-11-17)**: cel-shading 3 bậc + viền đậm, tỉ lệ anime cao thon, mắt
  gradient có tia hướng tâm, tóc nhiều lớp có highlight, váy 2 lớp. **Không khí**: chùm sáng ấm dưới đèn treo,
  bụi bay lơ lửng, viền tối điện ảnh (vignette). Trần tự ẩn khi camera ở trên cao
  (góc toàn cảnh) để khỏi che tầm nhìn.
- **Tủ đồ (10 bộ)** — đã bỏ cùng Milo/Luna/Chibi (Jake/Miku mặc đồ gốc trong GLB, xem
  trên; bảng OUTFITS vẫn còn trong app.js nhưng không còn lựa chọn nào dùng): mỗi nhân vật có 5 bộ, chọn ở màn chào, đồng bộ cho mọi người thấy
  qua Firebase. Milo: Street, Denim (áo khoác jean + quần jean + tóc ngắn), Thể thao
  (băng đô + tóc xoăn + áo cam + quần đùi), Mùa đông (mũ len + áo len cổ lọ + bốt),
  **Hắc Ám** (áo khoác denim đen mở để lộ sơ mi trắng + ve áo + dây chuyền bạc có mặt dây
  + thắt lưng khóa bạc + dây xích treo hông + bốt đen buộc dây + hình xăm tribal quấn cẳng tay
  + vòng tay bạc).
  Luna: Chic, Denim (tóc bob + áo khoác jean + quần jean), Mùa hè (mũ rộng vành + tóc đuôi
  ngựa + váy liền vàng + dép), Mùa đông (mũ len hồng + tóc búi + áo len + legging + bốt),
  **Trắng** (váy trắng + blazer trắng có ve áo/khuy/túi ngực + thắt lưng đen + tất trắng +
  giày đen + kính râm to + môi đỏ + khuyên tai sao vàng + vòng tay vàng).
  2 bộ Hắc Ám/Trắng làm lại chi tiết theo đúng pack `14_power_couples.zip` người dùng gửi
  (người dùng muốn nhân vật đẹp giống như pack — đã ghép thử các lớp PNG của pack để xem
  đủ bộ: nam denim đen + sơ mi trắng + cargo đen + xích + bốt buộc dây + tattoo; nữ váy trắng
  + blazer trắng + kính râm + môi đỏ + khuyên sao) — pack gốc là sprite 2D 444×700 (mỗi món
  1 lớp PNG trong suốt, có cả bản đen trắng để tô màu lại), đã chuyển thành đồ 3D chi tiết
  theo hệ OUTFITS (thêm các trường mới: shirt/blazer/belt/chain/necklace/bracelet/glasses/
  lips/earrings/laces). Đổi bộ đồ giữa chừng thì người khác cũng thấy nhân vật dựng lại theo bộ mới.
- **Chat bong bóng 3D**: bong bóng bám theo đầu nhân vật, kèm log chat.
- **Tivi YouTube**: màn hình lớn trên tường (luôn bật, không bấm tương tác được). Video chiếu thật lên màn hình tivi 3D trong game (CSS3DRenderer), tự tắt phụ đề và thanh điều khiển. Dán link YouTube để thêm vào hàng chờ chung cả quán — hết video này tự phát video người sau. Âm thanh chỉnh riêng từng người (nút loa trên thanh trên cùng + thanh trượt trong bảng tivi).
- **Kết bạn**: bấm vào người khác để xem hồ sơ, chào và kết bạn (lưu localStorage).
- **Camera**: kéo xoay, lăn chuột zoom, nút đổi góc nhìn (toàn cảnh / theo bạn / tivi / **góc nhìn thứ nhất** — camera ở đầu nhân vật, kéo để nhìn quanh).
  Nhân vật nào đứng chắn giữa camera và điểm đang nhìn thì tự mờ đi (chỉ còn ~12%
  độ đậm) để không che màn hình; xoay camera ra chỗ khác thì nhân vật hiện lại
  bình thường.
- **Di chuyển tự do (2026-11-17)**: trên máy tính bấm **WASD** (hoặc phím mũi tên) để đi,
  hướng đi theo camera (W = xa camera, A/D = trái/phải); trên điện thoại kéo **joystick**
  tròn ở góc trái dưới. Nhân vật đi bộ có hoạt ảnh chân tay. **Đi tự do, không va chạm**:
  xuyên bàn ghế/quầy/sofa thoải mái, không bao giờ bị kẹt; chỉ còn tường quán là ranh
  giới để khỏi rơi ra ngoài sàn. Đang ngồi mà bấm di chuyển thì tự đứng dậy rồi đi.
  Bấm vào sàn vẫn đi tới điểm đó như trước.
- **Ngồi bằng nút (2026-11-17)**: không cần bấm vào ghế nữa — lại gần ghế trống (trong
  1,8m) thì nút **🪑 Ngồi xuống** hiện ở giữa dưới màn hình, bấm là nhân vật đi tới ngồi
  vào ghế gần nhất; đang ngồi thì nút đổi thành **🚶 Đứng dậy**. Bấm vào ghế vẫn ngồi
  được như trước.

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
- **iOS không cho cài trực tiếp** (Apple không có `beforeinstallprompt` như
  Android) nên nút "Cài đặt game" trên iPhone mở bảng hướng dẫn 3 bước
  (Chia sẻ ⤴️ → "Thêm vào Màn hình chính" → "Thêm") thay vì chỉ hiện toast
  3 giây dễ trôi mất. Nếu mở bằng Chrome/Firefox trên iOS thì bảng sẽ nhắc
  phải mở bằng Safari mới cài được. Nút cũng hiện trên iPad (iPadOS báo
  userAgent là Macintosh nên nhận diện thêm bằng cảm ứng).

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
