# Café Kết Bạn 3D ☕

Quán cà phê kết bạn **3D thật** (Three.js) — không dùng ảnh nền. Cả quán, bàn ghế,
tivi và nhân vật đều là mô hình 3D, nhân vật đi lại, ngồi, nâng ly uống cà phê.

## Có gì trong quán

- **Quán 3D kiểu gaming**: sàn gỗ, tường neon, bảng hiệu phát sáng, quầy bar,
  sân vườn có dây đèn, góc lounge có sofa và thảm.
- **100 ghế** chia 3 khu: Sảnh chính (48 ghế), Sân vườn (32 ghế), Lounge (20 ghế).
- **Nhân vật 3D low-poly**: 8 mẫu (Milo, Luna, Felix, Nala, Oscar, Ruby, Leo, Mia),
  có khớp tay chân — đi bộ, ngồi xuống ghế, nâng ly uống cà phê, thở và quay đầu.
  Màn chọn nhân vật có xem trước 3D xoay vòng.
- **Chat bong bóng 3D**: bong bóng bám theo đầu nhân vật, kèm log chat.
- **Tivi YouTube**: màn hình lớn trên tường, bấm vào để mở trình phát, dán link đổi video.
- **Kết bạn**: bấm vào người khác để xem hồ sơ, chào và kết bạn (lưu localStorage).
- **Camera**: kéo xoay, lăn chuột zoom, nút đổi góc nhìn (toàn cảnh / theo bạn / tivi).
- **Bot khách quen**: ~50 bot tự đi lại, đổi bàn, trò chuyện và trả lời bạn.

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

## Chơi chung thật (100 người)

Bản này chạy demo với bot. Để người thật vào chung một phòng, cần backend
đồng bộ vị trí/chat (ví dụ Firebase Realtime Database) — cắm vào danh sách
`state.players` và `state.seats` trong `app.js`.
