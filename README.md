# 🧺 TÚI MÙ CHẠY CHỢ

Game buôn bán / chạy hàng multiplayer thời gian thực, phong cách **Cozy Cute / Pastel Pop**.
Next.js (App Router) + TypeScript + Tailwind CSS + lucide-react. Không cần đăng ký — chơi ngay bằng biệt danh Guest.

## Chạy local

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build production
npm start        # chạy production
```

## Biến môi trường (không bắt buộc)

| Biến | Mô tả |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` | URL REST của Upstash Redis (nếu có) |
| `UPSTASH_REDIS_REST_TOKEN` | Token REST của Upstash Redis (nếu có) |

Không cấu hình Redis thì game tự dùng **In-Memory Store** — chạy ngay, dữ liệu chỉ mất khi restart server.

## Deploy (Vercel)

Push code lên GitHub rồi Import vào Vercel. Nhớ set 2 biến Upstash ở trên nếu muốn dữ liệu bền vững qua các lần deploy (không set thì leaderboard/state reset mỗi lần serverless cold-start/deploy lại).

## Cách chơi nhanh

1. Vào trang, đặt biệt danh dễ thương → bắt đầu với 1.000 Xu ở Vườn Dâu.
2. Mua hàng rẻ ở chợ này, chạy sang chợ khác bán đắt. Giá đồng bộ cho cả xóm mỗi 10 giây.
3. Canh thời tiết (đổi 4 phút/lần) và sự kiện (đổi 3 phút/lần) để mua thấp bán cao.
4. Bán có lời được EXP, lên cấp mở khóa hàng/xe/nhân viên mới.
5. Làm nhiệm vụ "Đơn Hàng Xóm Nhỏ" để nhận Xu + EXP + rương quà.
6. Thuê/mua xe to hơn để chở nhiều, thuê nhân viên để chống trộm, giảm phí, tự chốt lời.
7. Leo top Bảng Xếp Hạng theo mùa (mỗi tuần làm mới một mùa).

## Cấu trúc

```
app/
  page.tsx                 Trang game chính (client)
  layout.tsx               Font Nunito + metadata
  globals.css              Tailwind v4 + keyframes marquee
  api/
    state/route.ts         GET ?id= — state đầy đủ (player + market + leaderboard)
    player/route.ts        POST tạo guest • PATCH đổi tên • GET
    market/route.ts        GET snapshot thị trường
    trade/route.ts         POST mua/bán
    travel/route.ts        POST di chuyển
    quests/route.ts        POST nhận thưởng / đổi đơn
    garage/route.ts        POST thuê/mua/kích hoạt xe
    staff/route.ts         POST thuê/tuyển/nâng cấp nhân viên
    shop/route.ts          POST mua/trang bị danh hiệu & sạp
    leaderboard/route.ts   GET top 20 theo mùa
lib/
  config.ts                Dữ liệu tập trung: 14 món, 4 khu, 6 thời tiết, sự kiện, 8 cấp, 6 xe, 3 nhân viên, nhiệm vụ, shop
  market.ts                Động cơ giá: seeded noise theo nhịp 10s + cung/cầu + thời tiết/sự kiện
  store.ts                 Store: Upstash Redis REST (nếu có) + fallback In-Memory
  game.ts                  Logic server: mua/bán, di chuyển, trộm vặt, kiểm tra hàng, nhiệm vụ, xe, nhân viên, shop, leaderboard
  shared.ts                Helper thuần dùng chung server + client
  types.ts                 Kiểu dữ liệu
  api.ts                   Client gọi API
  sound.ts                 Âm thanh Web Audio (bíp/ting)
components/
  TownCrier.tsx            Loa phường: thời tiết, sự kiện, dòng chạy
  MarketBoard.tsx          Bảng chợ + sparkline + mua/bán
  BagPanel.tsx             Túi mù: vốn TB, % lời/lỗ, cảnh báo kem tan
  MapPanel.tsx             Bản đồ 4 khu + thanh tiến trình di chuyển
  QuestsPanel.tsx          Đơn hàng xóm nhỏ
  GaragePanel.tsx          Thuê/mua xe
  StaffPanel.tsx           Thuê/tuyển/nâng cấp nhân viên
  LeaderboardPanel.tsx     Bảng xếp hạng theo mùa
  ShopPanel.tsx            Danh hiệu & trang trí sạp (chống lạm phát)
```

## Lưu ý vận hành

- Mọi phép tính tiền/EXP/nhiệm vụ đều kiểm tra phía server (API Routes), không tin dữ liệu client gửi lên. Có chống spam request (tối thiểu 300ms/giao dịch).
- Giá thị trường dùng seeded noise theo timestamp 10s nên mọi client thấy chung một nhịp giá; lệch cung/cầu lưu trên server và hồi 10%/nhịp.
- Hàng Kem Tươi Tan Chảy giảm 6% giá trị mỗi 30s giữ hàng (nhanh gấp đôi khi nắng gắt); Kho Báu & Lõi Năng Lượng có 15% bị trừ 20% số lượng khi cập bến.
