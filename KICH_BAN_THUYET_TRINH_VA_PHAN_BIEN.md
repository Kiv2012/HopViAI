# 🎤 KỊCH BẢN THUYẾT TRÌNH 3 PHÚT & BỘ 10 CÂU HỎI PHẢN BIỆN TRƯỚC BAN GIÁM KHẢO
**Dự án**: **HỢP VỊ AI – Hiểu đúng vị – Gợi đúng món**  
**Link Web Trực tuyến (Production)**: https://hop-vi-ai.vercel.app  
**Link Slide Thuyết trình**: https://hop-vi-ai.vercel.app/slides.html  
**Kho mã nguồn GitHub của nhóm**: https://github.com/Kiv2012/HopViAI  

---

## PHẦN 1: KỊCH BẢN THUYẾT TRÌNH & DEMO TRỰC TIẾP (3 PHÚT VÀNG)

### ⏱️ Phút 1 (0:00 – 1:00): Đặt vấn đề & Điểm mới Khoa học
- **Mở đầu (15 giây)**:
  > *"Kính chào Ban giám khảo! Mỗi khi một nhóm sinh viên hoặc gia đình tại Biên Hòa – Đồng Nai đi ăn chung, câu hỏi 'Hôm nay ăn gì?' thường bế tắc vì 3 rào cản: người thích món nước – người thích món khô, tổng ngân sách có hạn, và thông tin thực đơn của các quán địa phương nằm rời rạc trên ảnh chụp giấy."*
- **Giải pháp HỢP VỊ AI (25 giây)**:
  > *"Nhóm chúng em xây dựng **HỢP VỊ AI** với kiến trúc kết hợp **AI Kép (Gemini 2.5 Flash)** và **Thuật toán tối ưu tổ hợp Maximin Fairness**:
  > 1. **AI chỉ làm nhiệm vụ dịch ngôn ngữ tự nhiên và đọc ảnh thực đơn**, tuyệt đối không tự bịa tên quán hay tự cộng tiền để tránh ảo giác số học (hallucination).
  > 2. **Bộ giải tổ hợp Maximin Fairness** kiểm tra chính xác từng đồng ngân sách và ưu tiên phương án mà người thiệt thòi nhất trong nhóm vẫn đạt độ hài lòng cao nhất."*
- **Mời Giám khảo quét QR (20 giây)**:
  > Bấm nút **📱 QR Demo** trên góc phải màn hình để Giám khảo quét vào thẳng `https://hop-vi-ai.vercel.app` trên điện thoại (giao diện Mobile App có sẵn thanh điều hướng đáy 5 tab).

---

### ⏱️ Phút 2 (1:00 – 2:10): Demo Trực tiếp Bài toán Nhóm & Bản đồ Dẫn đường
- **Thao tác 1 – Gợi ý nhóm hợp lệ (30 giây)**:
  - Tại Trang chủ, bấm chip: **`👥 Nhóm 3 người • 150k • 2 nước 1 khô (Trấn Biên)`**.
  - Hệ thống mở **Bước 2: Xác nhận nhu cầu (Human-in-the-loop)** $\rightarrow$ Bấm **Chạy Bộ giải tổ hợp món**.
  - Chỉ vào **Phương án #1 (*Bún Thái & Mì Trộn Thành Minh*)**: Điểm thành viên thấp nhất (`Min Score = 100/100`), tổng chi phí **120.000đ** (tiết kiệm **30.000đ** so với trần 150.000đ).
- **Thao tác 2 – Xử lý thông minh khi thiếu ngân sách (20 giây)**:
  - Bấm nút **`Mẫu 2: Vượt ngân sách (90k)`** $\rightarrow$ Hệ thống không trả kết quả rỗng mà chỉ rõ: *"Tổ hợp thấp nhất cần 120.000đ (thiếu 30.000đ)"* kèm nút **Đồng ý nâng ngân sách lên 120.000đ (+30.000đ)** chỉ với 1 cú nhấp chuột.
- **Thao tác 3 – Xem ảnh quán & Vẽ đường đi trực tiếp trên Bản đồ Biên Hòa (20 giây)**:
  - Bấm nút **🧭 Dẫn đường trên Map** ngay trên thẻ quán $\rightarrow$ Bản đồ đường phố thực tế tự động vẽ lộ trình, hiển thị số km và số phút di chuyển từ trung tâm Biên Hòa đến tận quán.

---

### ⏱️ Phút 3 (2:10 – 3:00): Demo Vòng lặp Khép kín `AI Scan Menu` $\rightarrow$ `Admin Duyệt`
- **Thao tác 4 – Số hóa thực đơn giấy (25 giây)**:
  - Chuyển sang tab **📸 Đối tác (AI Scan Menu)** $\rightarrow$ Bấm **`🧪 Test Ảnh Mẫu #3: Menu Đặc Sản Tân Triều`** (hoặc chụp/tải ảnh menu thật).
  - Chỉ vào dòng được **tô màu vàng cảnh báo (`Ô màu vàng = Cần kiểm tra lại`)** đối với các món tính theo `kg` hoặc nhiều mức giá $\rightarrow$ Bấm **Gửi Admin phê duyệt**.
- **Thao tác 5 – Kiểm duyệt & Giám sát chi phí LLM (25 giây)**:
  - Mở tab **🛡️ Admin** $\rightarrow$ Chỉ vào bảng **Giám sát Token & Chi phí API (`cost-aware-llm-pipeline`)** và bấm **✓ Phê duyệt & Đưa vào CSDL Gợi ý**.
  - Kết luận: *"Toàn bộ hệ thống đã vượt qua **30/30 kịch bản kiểm thử tự động (100% PASS)** trên dữ liệu khảo sát thực tế **18 quán – 130 món ăn** tại Đồng Nai. Nhóm xin cảm ơn và sẵn sàng lắng nghe câu hỏi từ Ban giám khảo!"*

---

## PHẦN 2: BỘ 10 CÂU HỎI PHẢN BIỆN & ĐÁP ÁN CHUẨN TRƯỚC BAN GIÁM KHẢO

### Câu 1: Tại sao nhóm không dùng trực tiếp ChatGPT hoặc Gemini thông thường để hỏi ăn gì mà phải xây dựng HỢP VỊ AI?
- **Đáp án**:
  1. Các LLM thông thường như ChatGPT/Gemini dễ mắc hiện tượng **ảo giác (Hallucination)**: tự bịa ra tên quán không còn hoạt động tại Biên Hòa, tự ước lượng giá bán sai lệch và thường xuyên cộng nhầm tổng tiền khi số người tăng lên.
  2. **HỢP VỊ AI** tách biệt rõ: LLM chỉ trích xuất ý định người dùng thành JSON, còn việc kiểm tra giá, lọc quán đã xác minh (`status === 'approved'`) và cộng tổng ngân sách được thực hiện bằng **thuật toán xác định (Deterministic Solver)** trên cơ sở dữ liệu thực tế tại Đồng Nai $\rightarrow$ **Độ chính xác ngân sách đạt tuyệt đối 100%**.

### Câu 2: Nguyên tắc "Maximin Fairness" trong thuật toán gợi ý nhóm của các em hoạt động như thế nào và có ưu điểm gì?
- **Đáp án**:
  - Nếu chỉ tối ưu theo **Tổng điểm trung bình (Utilitarian)**, một phương án có thể làm 2 người rất thích (100 điểm) nhưng người thứ 3 hoàn toàn không ăn được món đó (20 điểm).
  - Nguyên tắc **Maximin Fairness** xếp hạng các tổ hợp món theo thứ tự từ điển:
    $$\text{Ưu tiên 1: } \max \left( \min_{i \in \{1..N\}} S_i \right) \longrightarrow \text{Ưu tiên 2: } \max \sum_{i=1}^N S_i \longrightarrow \text{Ưu tiên 3: } \min \text{Tổng chi phí}$$
  - Nhờ đó, không có thành viên nào trong nhóm bị "bỏ rơi" khẩu vị của mình.

### Câu 3: Nếu người dùng nhập ngân sách mơ hồ như "khoảng 50k" hoặc nhập thiếu thông tin thì hệ thống xử lý ra sao?
- **Đáp án**:
  - Ở **Bước 1**, bộ phân tích NLP phát hiện các từ chỉ xấp xỉ (*"tầm", "khoảng", "chừng", "xấp xỉ"*) hoặc phát hiện ngân sách bình quân đầu người (*"50k/người"* $\rightarrow$ tự nhân với số người).
  - Ở **Bước 2 (Human-in-the-loop Confirmation)**, hệ thống hiển thị hộp cảnh báo màu vàng rõ ràng để người dùng xác nhận hoặc điều chỉnh con số trần ngân sách trước khi chạy bộ giải.

### Câu 4: Khi ảnh chụp thực đơn của quán bị mờ, chữ viết tay, hoặc có các món ghi giá "theo thời giá / theo kg" thì AI Scan Menu xử lý thế nào?
- **Đáp án**:
  - Chúng em không cho phép AI đẩy thẳng dữ liệu từ ảnh vào cơ sở dữ liệu người dùng.
  - Khi gặp dòng giá phức tạp (nhiều size S/M/L, giá tính theo `kg` như *Gà hấp bưởi 320.000đ/con*), `geminiService.js` tự động gắn cờ `needsReview: true` và tô vàng dòng đó trên giao diện **Đối tác** để chủ quán chỉnh lại giá chuẩn, sau đó còn phải qua **Admin phê duyệt** mới được công bố.

### Câu 5: Làm sao đảm bảo dữ liệu chưa được kiểm duyệt của Đối tác không làm sai lệch kết quả gợi ý?
- **Đáp án**:
  - Trong `solver.js`, hàm lọc dữ liệu đầu vào luôn kiểm tra điều kiện kép: `restaurant.status === 'approved' && item.status === 'approved'`.
  - Mọi hồ sơ mới gửi từ `AI Scan Menu` đều nằm ở bảng `pendingSubmissions` (`status: 'pending'`). Trong bộ 30 kịch bản kiểm thử tự động (`TC_28`, `TC_29`, `TC_30`), tỷ lệ cô lập dữ liệu chưa duyệt đạt **100%**.

### Câu 6: Nếu đang thuyết trình hoặc người dùng sử dụng mà mất kết nối tới Google Gemini API (hoặc hết hạn mức miễn phí) thì hệ thống có bị sập không?
- **Đáp án**:
  - Hoàn toàn không! Nhóm đã thiết kế kiến trúc **Zero-Downtime Semantic Fallback** trong `server/geminiService.js`.
  - Nếu API trả lỗi mạng hoặc vượt quota, hệ thống tự động chuyển sang bộ phân tích ngữ nghĩa tiếng Việt nội bộ trong vòng `< 5ms` và theo dõi chi phí/token bằng `CostTracker` theo chuẩn `cost-aware-llm-pipeline`.

### Câu 7: Dữ liệu 18 quán ăn và 130 món ăn hiện tại được thu thập và chuẩn hóa từ đâu?
- **Đáp án**:
  - Dữ liệu được nhóm khảo sát thực tế từ các quán ăn và làng nghề ẩm thực tại 6 khu vực ở Biên Hòa – Đồng Nai (*Trấn Biên, Tam Hiệp, Tân Triều, Bửu Long, Thanh Bình, Thống Nhất*), tổng hợp trong bảng dữ liệu gốc `Hợp vị AI.xlsx` và chuẩn hóa tự động qua script `scripts/seed_from_excel.js` kèm tọa độ GPS thực tế.

### Câu 8: Hệ thống phân biệt "Đặc sản gắn với địa danh Đồng Nai" và "Món ăn phổ biến tại địa phương" như thế nào?
- **Đáp án**:
  - Trong cơ sở dữ liệu và giao diện **Khám phá**, hệ thống tách bạch rõ:
    - **Đặc sản gắn với chỉ dẫn địa lý / văn hóa Đồng Nai**: *Gỏi bưởi Tân Triều, Gà hấp trái bưởi Tân Triều, Lẩu tôm 5 Ri Biên Hòa, Chả lụi Bửu Long* (có hồ sơ nguồn gốc văn hóa và tài liệu tham khảo).
    - **Món ăn phục vụ thường ngày**: Bún Thái, mì trộn, cơm gà, bún bò, đồ chay... giúp đáp ứng nhu cầu ăn uống hàng ngày của học sinh, sinh viên và người lao động.

### Câu 9: Độ phức tạp tính toán của bộ giải tổ hợp là bao nhiêu? Khi số quán tăng lên hàng ngàn quán thì có bị chậm không?
- **Đáp án**:
  - Bộ giải lọc trước theo khu vực (`area`) và chỉ chọn Top $K$ món có điểm khớp khẩu vị cao nhất cho từng thành viên tại mỗi quán trước khi ghép tổ hợp.
  - Nhờ kỹ thuật cắt tỉa nhánh sớm (**Branch Pruning theo trần ngân sách**), thời gian phản hồi thực tế qua 30 kịch bản kiểm thử chỉ mất trung bình **`2 - 8 ms`**, hoàn toàn mở rộng tốt lên hàng ngàn quán ăn.

### Câu 10: Định hướng phát triển tiếp theo của dự án sau cuộc thi là gì?
- **Đáp án**:
  1. Mở rộng dữ liệu khảo sát sang các huyện/thành phố khác của tỉnh Đồng Nai (*Long Khánh, Nhơn Trạch, Long Thành, Vĩnh Cửu*).
  2. Tích hợp đặt bàn trước / đặt món nhóm qua mã QR tại bàn cho các hộ kinh doanh ẩm thực nhỏ lẻ.
  3. Phối hợp với các trang thông tin du lịch địa phương để quảng bá bản đồ số **Đặc sản Bưởi Tân Triều & Ẩm thực Biên Hòa** đến du khách.

