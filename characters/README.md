# Thư mục nhân vật mới

Bỏ file nhân vật vào đây, mỗi nhân vật 1 file `.glb`.

## File cần có
- Định dạng: **GLB** (file `.glb` duy nhất cho 1 nhân vật, gồm cả model + texture + xương).
- Đặt tên file theo tên nhân vật, ví dụ: `naruto.glb`, `anya.glb`.

## Yêu cầu để nhân vật chạy tốt trong quán
- Cao khoảng **1,7m**, chân chạm đất (y = 0), mặt hướng về phía **+Z**.
- Có xương (rigged) thì tốt nhất. Có sẵn animation **Idle** (đứng) và **Walk** (đi)
  thì nhân vật đi đứng sẽ mượt; không có thì mình vẫn làm được (ngồi/uống
  làm bằng code như Jake/Miku hiện tại).
- File nên dưới **~10 MB** (Jake/Miku gốc 24–28 MB, đã nén còn 6–8 MB).
  File to quá thì cứ gửi, mình nén lại cho.
- Quần áo dính liền trong model (không tách riêng được) — muốn đổi đồ thì
  phải sửa trong Blender hoặc làm model đồ mới đè lên.

## Cách thêm
1. Gửi file `.glb` cho Muse trong chat (như mọi lần).
2. Nói tên nhân vật + nam/nữ.
3. Muse bỏ file vào thư mục này, thêm vào màn chọn nhân vật, kiểm tra rồi push.

Nhân vật hiện có: Jake (`../vendor/jake.glb`), Miku (`../vendor/miku.glb`).
