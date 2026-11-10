# HƯỚNG DẪN CHẠY LOCAL & DEPLOY LÊN CLOUD (RENDER / RAILWAY) ĐỂ TẠO QR CODE CHO BAN GIÁM KHẢO

## 1. Chạy trực tiếp trên máy tính thuyết trình (Local)

```powershell
# Khởi động máy chủ Web tại cổng 3000
npm start

# Hoặc chạy bộ kiểm thử 30 tình huống để trình diễn trên Terminal cho Ban giám khảo xem trực tiếp
npm test
```

- Sau khi chạy `npm start`, mở trình duyệt tại: **`http://localhost:3000`**
- Bấm nút **`⚡ Gemini AI`** trên thanh công cụ trên cùng để dán **Google Gemini API Key** (lấy miễn phí trong 30 giây tại https://aistudio.google.com/apikey).

---

## 2. Phương án 1 (Khuyên dùng nhất khi thi đấu): Mở Đường Hầm Trực Tiếp (Cloudflare Tunnel / Localtunnel)

Không cần tạo tài khoản Cloud, không lo máy chủ miễn phí bị ngủ đông (Cold Start 50 giây), dữ liệu Admin bấm duyệt trên laptop cập nhật tức thì trên điện thoại Ban giám khảo qua mạng 4G/5G:

```powershell
# Cách 1A: Dùng Localtunnel (chỉ cần Node.js có sẵn trên máy)
npx localtunnel --port 3000

# Cách 1B: Hoặc dùng Cloudflare Quick Tunnel (nếu máy có cài cloudflared)
cloudflared tunnel --url http://localhost:3000
```

- Lệnh trên sẽ cấp ngay một đường link công khai dạng `https://....loca.lt` hoặc `https://....trycloudflare.com`.
- Bạn dán đường link đó vào nút **`📱 QR Demo`** trên góc phải trang Web để tạo mã QR cho Ban giám khảo quét ngay!

---

## 3. Phương án 2: Quét QR qua Mạng Nội Bộ (Wi-Fi / Hotspot Điện Thoại) – Độ trễ 0ms

1. Mở Terminal, gõ `ipconfig` để xem địa chỉ IPv4 của laptop bạn (ví dụ: `192.168.1.15`).
2. Trên giao diện Web `http://localhost:3000`, bấm nút **`📱 QR Demo`** ở góc phải trên cùng.
3. Nhập `http://192.168.1.15:3000` vào ô đường dẫn $\rightarrow$ Hệ thống lập tức tạo mã QR để Ban giám khảo dùng điện thoại (bắt chung Wi-Fi hoặc Hotspot điện thoại của bạn) quét và trải nghiệm trực tiếp!

---

## 4. Phương án 3: Deploy lên Cloud PaaS (Railway.app / Koyeb / Render.com)

Dự án đã được cấu hình sẵn file [`render.yaml`](file:///c:/Users/LECOO/Downloads/H%E1%BB%A3p%20v%E1%BB%8B%20AI/render.yaml) và không phụ thuộc bất kỳ thư viện ngoài nặng nề nào nên tốc độ build trên Cloud chỉ mất khoảng 30 giây:

1. Đẩy thư mục dự án này lên một kho chứa (Repository) trên **GitHub** của bạn.
2. Đăng nhập vào https://render.com $\rightarrow$ Chọn **New +** $\rightarrow$ **Web Service** $\rightarrow$ Kết nối với Repository GitHub vừa tạo.
3. Render sẽ tự nhận diện:
   - **Build Command**: `npm install`
   - **Start Command**: `node server/index.js`
4. Trong mục **Environment Variables**, thêm biến:
   - `GEMINI_API_KEY` = *(Mã API Key từ Google AI Studio của bạn)*
5. Bấm **Deploy Web Service**. Khi hoàn tất, bạn sẽ có đường link dạng `https://hop-vi-ai-dong-nai.onrender.com` để mở tính năng **`📱 QR Demo`** cho toàn bộ hội đồng giám khảo quét từ bất kỳ mạng 4G/5G nào!
