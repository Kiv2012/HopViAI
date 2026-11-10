# 🍲 HỢP VỊ AI – Hiểu đúng vị • Gợi đúng món

> **Trợ lý AI gợi ý món ăn cá nhân hóa & giải bài toán đồng thuận thực đơn nhóm theo ngân sách, khẩu vị và đặc sản địa phương tại Biên Hòa – Đồng Nai.**

- 🌐 **Bản chạy trực tuyến (Vercel Production)**: [https://hop-vi-ai.vercel.app](https://hop-vi-ai.vercel.app)
- 🎤 **Slide Thuyết trình Cuộc thi (7 Slide tương tác)**: [https://hop-vi-ai.vercel.app/slides.html](https://hop-vi-ai.vercel.app/slides.html)

---

## 🚀 1. Hướng dẫn dành cho thành viên nhóm (Clone & Chạy ngay)

### Yêu cầu môi trường
- **Node.js** `>= 18.x` (Không cần cài đặt thư viện ngoài nặng nề – dự án được tối ưu Zero-External-Runtime-Deps để bất kỳ máy nào trong nhóm cũng chạy được ngay lập tức).

### Các bước chạy trên máy cá nhân
```bash
# 1. Clone dự án về máy
git clone https://github.com/Kiv2012/HopViAI.git
cd HopViAI

# 2. (Tùy chọn) Tạo file .env chứa khóa Gemini API
cp .env.example .env
# Mở file .env và điền GEMINI_API_KEY=... (hoặc nhập trực tiếp qua nút "⚡ Gemini AI" trên giao diện web)

# 3. Khởi động máy chủ tại http://localhost:3000
npm start
```

### Chạy bộ kiểm thử tự động 30 kịch bản (Minh chứng Mục 7)
```bash
npm test
```
Kết quả chi tiết được xuất tự động ra file [`tests/EVALUATION_REPORT.md`](./tests/EVALUATION_REPORT.md).

---

## 🗂️ 2. Cấu trúc thư mục dự án

```text
Hợp vị AI/
├── api/
│   └── index.js                 # Serverless Entrypoint cho Vercel
├── data/
│   ├── raw_excel.json           # Dữ liệu gốc trích xuất từ Hợp vị AI.xlsx
│   └── database.json            # CSDL chuẩn hóa: 18 quán ăn, 130 món ăn, 4 đặc sản Đồng Nai
├── public/
│   ├── index.html               # Giao diện chính (Người dùng, Đối tác AI Scan Menu, Admin)
│   ├── styles.css               # Hệ thống giao diện & hiệu ứng
│   ├── app.js                   # Logic Frontend, Bản đồ Leaflet + OSRM dẫn đường, Gallery ảnh
│   ├── slides.html              # Bộ Slide thuyết trình 7 trang tích hợp trực tiếp
│   └── sample-menus/            # Ảnh thực đơn mẫu dùng để test AI Scan Menu
├── scripts/
│   ├── extract_excel.ps1        # Script đọc dữ liệu từ Hợp vị AI.xlsx
│   ├── seed_from_excel.js       # Script chuẩn hóa dữ liệu & gắn tọa độ GPS Biên Hòa
│   └── update_docx.ps1          # Script cập nhật số liệu thực nghiệm vào BẢN MÔ TẢ CHI TIẾT.docx
├── server/
│   ├── index.js                 # Máy chủ HTTP & REST API (/api/v1/*)
│   ├── solver.js                # Bộ giải tổ hợp thực đơn nhóm theo nguyên tắc Maximin Fairness
│   └── geminiService.js         # Tích hợp Google Gemini (gemini-2.5-flash) NLP + Vision & CostTracker
├── tests/
│   ├── run_30_scenarios.js      # Bộ 30 kịch bản kiểm thử tự động
│   └── EVALUATION_REPORT.md     # Báo cáo kết quả thực nghiệm (30/30 PASS - 100%)
├── .agent/skills/               # 13 bộ quy chuẩn kỹ thuật (ECC Skills)
└── vercel.json                  # Cấu hình triển khai Vercel
```

---

## ✨ 3. Các tính năng cốt lõi

1. **4 Phân mục Người dùng (User Portal)**:
   - **Đề xuất Nhóm & Cá nhân**: Luồng 2 bước (*Phân tích NLP $\rightarrow$ Xác nhận nhu cầu $\rightarrow$ Giải tổ hợp món ăn Maximin Fairness*), cảnh báo khi ngân sách mơ hồ (*"tầm 70k"*) và gợi ý mức nâng ngân sách tối thiểu khi vượt trần.
   - **Khám phá Quán & Món**: Bộ lọc thông minh theo khu vực, loại món, mức giá; khung ảnh cuộn ngang 4 tấm lớn (`220px`).
   - **Đặc sản Đồng Nai**: Hồ sơ văn hóa ẩm thực (Gỏi bưởi Tân Triều, Gà hấp bưởi, Lẩu tôm 5 Ri, Chả lụi Bửu Long) gắn kết trực tiếp với quán ăn thật.
   - **Bản đồ & Dẫn đường thông minh**: Bản đồ đường phố Biên Hòa (`Leaflet + OpenStreetMap + OSRM`) hỗ trợ chọn điểm xuất phát / định vị GPS, vẽ đường đi thực tế và tính khoảng cách – thời gian di chuyển.
2. **Cổng Đối tác (`AI Scan Menu`)**:
   - Số hóa ảnh chụp thực đơn giấy bằng `gemini-2.5-flash` Multimodal Vision, tự động đánh dấu các dòng giá phức tạp (nhiều size / tính theo `kg`) để chủ quán chỉnh sửa trước khi gửi duyệt.
3. **Cổng Quản trị (`Admin Dashboard`)**:
   - Kiểm duyệt hồ sơ thực đơn đối tác (`pending` $\rightarrow$ `approved` / `rejected`), cô lập dữ liệu chưa duyệt 100%, và bảng giám sát chi phí Token LLM theo thời gian thực.

