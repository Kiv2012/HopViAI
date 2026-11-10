# BÁO CÁO KẾT QUẢ KIỂM THỬ THỰC NGHIỆM 30 TÌNH HUỐNG – HỢP VỊ AI
*(Tài liệu minh chứng thực nghiệm phục vụ Mục 7.3 & 7.4 trong Bản mô tả dự án)*

## 1. Tổng quan chỉ số thực nghiệm (Quantitative Metrics)

| Chỉ số đánh giá | Kết quả đo thực tế | Ghi chú kiểm chứng |
| :--- | :--- | :--- |
| **Tổng số tình huống kiểm thử** | **30 tình huống** | Bao phủ cá nhân, nhóm 2–4 người, thiếu ngân sách, thiếu dữ liệu, AI Scan Menu, phân quyền Admin |
| **Số tình huống ĐẠT (PASS @ 1)** | **30 / 30 (100.0%)** | Chấm điểm tự động bằng Code-Based Grader (`tests/run_30_scenarios.js`) |
| **Độ chính xác kiểm tra ngân sách** | **100% (Tuyệt đối không vượt trần)** | Tính toán bằng thuật toán trong `server/solver.js`, không phụ thuộc phép cộng của LLM |
| **Độ chính xác cô lập dữ liệu chờ duyệt** | **100%** | Dữ liệu `status: "pending"` từ đối tác không bao giờ lọt vào kết quả gợi ý công khai |
| **Thời gian xử lý tổ hợp trung bình** | **1.4 ms / tình huống** | Duyệt tổ hợp có kiểm soát trên bộ dữ liệu 18 quán & 130 món ăn tại Đồng Nai |

---

## 2. Bảng kết quả chi tiết 30 tình huống kiểm thử

| Mã TC | Nhóm tiêu chí (Mục 7.3) | Đầu vào / Tình huống kiểm thử | Trạng thái | Thời gian | Kết quả đầu ra & Minh chứng |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC_01** | Cá nhân & Ngân sách | Đi một mình ở Trấn Biên có 50.000 đồng muốn ăn cơm gà. | ✅ PASS | 15ms | Quán: Cơm Gà Phú Yên S88 (40.000đ / 50.000đ, MinScore=100) |
| **TC_02** | Cá nhân & Món nước | 1 người muốn ăn bún bò ở Trấn Biên với ngân sách 45.000 đồng. | ✅ PASS | 1ms | Quán: Bún Bò ViNaTex (30.000đ / 45.000đ, MinScore=100) |
| **TC_03** | Cá nhân & Ăn vặt sinh viên | 1 sinh viên có 30.000 đồng muốn ăn vặt chả lụi ở Bửu Long. | ✅ PASS | 0ms | Quán: Chả Lụi Cô Yến (20.000đ / 30.000đ, MinScore=100) |
| **TC_04** | Cá nhân & Vị cay | Đi 1 mình ở Thống Nhất có 55.000 đồng thích ăn mì cay. | ✅ PASS | 0ms | Quán: Tiệm Gà Sugar (50.000đ / 55.000đ, MinScore=100) |
| **TC_05** | Cá nhân & Vị thanh nhẹ | 1 người ở Tân Triều có 35.000 đồng muốn ăn cháo hến thanh nhẹ. | ✅ PASS | 1ms | Quán: Cháo Hến Cô Tươi (30.000đ / 35.000đ, MinScore=100) |
| **TC_06** | Cá nhân & Ăn chay | 1 người ăn chay ở Tam Hiệp có ngân sách 50.000 đồng. | ✅ PASS | 1ms | Quán: Lẩu Chay Thiện Duyên 2 (20.000đ / 50.000đ, MinScore=73) |
| **TC_07** | Cá nhân & Câu nhập mơ hồ | Mình đi một mình ở Tam Hiệp có tầm 70.000 đồng muốn ăn cơm Nhật hoặc udon. | ✅ PASS | 0ms | Quán: Tiệm Ăn Nhà Túc (65.000đ / 70.000đ, MinScore=100) |
| **TC_08** | Cá nhân & Món khô | 1 người ở Thanh Bình có 60.000 đồng thích ăn hủ tiếu khô hoặc mì hoành thánh. | ✅ PASS | 1ms | Quán: Tiệm Mì Vĩnh Vĩnh (55.000đ / 60.000đ, MinScore=98) |
| **TC_09** | Nhóm khác khẩu vị (Maximin) | Nhóm mình có 3 người ở Trấn Biên, tổng ngân sách 150.000 đồng. Hai người thích món nước, một người thích mì trộn khô. Cả nhóm muốn ăn cùng quán. | ✅ PASS | 2ms | Quán: Bún Thái & Mì Trộn Thành Minh (120.000đ / 150.000đ, MinScore=80) |
| **TC_10** | Nhóm khác khẩu vị (Maximin) | Nhóm 2 người ở Tam Hiệp có 150.000 đồng, 1 người thích cơm heo chiên xù, 1 người thích món nước udon hoặc soup. | ✅ PASS | 1ms | Quán: Tiệm Ăn Nhà Túc (130.000đ / 150.000đ, MinScore=100) |
| **TC_11** | Nhóm 3 người cùng quán | Nhóm 3 người ở Trấn Biên có 200.000 đồng, 1 người thích cơm chiên, 2 người thích mì xào hoặc hủ tiếu. | ✅ PASS | 1ms | Quán: A Sóc Cơm Chiên - Mì Xào Giòn (190.000đ / 200.000đ, MinScore=83) |
| **TC_12** | Nhóm 2 người ăn bún đậu | Nhóm 2 bạn ở Tam Hiệp có 120.000 đồng muốn ăn bún đậu mắm tôm. | ✅ PASS | 1ms | Quán: Bún Đậu Ngọc Thanh Tâm (60.000đ / 120.000đ, MinScore=100) |
| **TC_13** | Nhóm 3 người ăn bún bò | Nhóm 3 người ở Trấn Biên có 140.000 đồng muốn ăn bún bò. | ✅ PASS | 0ms | Quán: Bún Bò ViNaTex (90.000đ / 140.000đ, MinScore=100) |
| **TC_14** | Nhóm 4 người ăn vặt | Nhóm 4 sinh viên có 100.000 đồng muốn ăn chả lụi ở Bửu Long. | ✅ PASS | 0ms | Quán: Chả Lụi Cô Yến (80.000đ / 100.000đ, MinScore=100) |
| **TC_15** | Nhóm 3 người ăn chay | Nhóm 3 người muốn ăn lẩu chay ở Tam Hiệp với tổng ngân sách 150.000 đồng. | ✅ PASS | 1ms | Quán: Lẩu Chay Thiện Duyên 2 (120.000đ / 150.000đ, MinScore=100) |
| **TC_16** | Nhóm 2 người ăn bánh hỏi thịt nướng | Nhóm 2 người ở Trấn Biên có 100.000 đồng thích ăn bún thịt nướng và bánh hỏi nem nướng. | ✅ PASS | 1ms | Quán: Lẩu Tôm 5 Ri (54.000đ / 100.000đ, MinScore=88) |
| **TC_17** | Nhóm 3 người thưởng thức đặc sản Tân Triều | Nhóm 3 người ở Tân Triều có 450.000 đồng, muốn ăn gỏi bưởi và gà hấp hoặc xôi bồ câu. | ✅ PASS | 1ms | Quán: Làng bưởi Năm Huệ Tân Triều (310.000đ / 450.000đ, MinScore=100) |
| **TC_18** | Nhóm 4 người ăn lẩu tôm | Nhóm 4 người ở Trấn Biên có 450.000 đồng muốn ăn lẩu tôm hoặc hải sản. | ✅ PASS | 6ms | Quán: Lẩu Tôm 5 Ri (300.000đ / 450.000đ, MinScore=100) |
| **TC_19** | Nhóm 2 người ăn bún chả | Nhóm 2 người ở Tam Hiệp có 90.000 đồng muốn ăn bún chả Hà Nội. | ✅ PASS | 0ms | Quán: Bún Chả Hà Nội Phú Hoàng (70.000đ / 90.000đ, MinScore=100) |
| **TC_20** | Nhóm 3 người ở Thống Nhất | Nhóm 3 bạn ở Thống Nhất có 160.000 đồng, 2 bạn thích mì cay, 1 bạn thích mì spaghetti. | ✅ PASS | 1ms | Quán: Tiệm Gà Sugar (135.000đ / 160.000đ, MinScore=70) |
| **TC_21** | Vượt ngân sách → Kịch bản điều chỉnh | Nhóm 3 người ở Trấn Biên có ngân sách 90.000 đồng, 2 người thích bún thái, 1 người thích mì trộn. | ✅ PASS | 2ms | Báo vượt ngân sách chính xác -> Gợi ý bù thêm +10.000đ (tổng 100.000đ) |
| **TC_22** | Vượt ngân sách → Kịch bản điều chỉnh | Nhóm 3 người ở Tân Triều có 200.000 đồng muốn ăn 3 phần gỏi làng bưởi. | ✅ PASS | 2ms | Báo vượt ngân sách chính xác -> Gợi ý bù thêm +50.000đ (tổng 250.000đ) |
| **TC_23** | Vượt ngân sách → Kịch bản điều chỉnh | Nhóm 2 người ở Tam Hiệp có 80.000 đồng, 1 người thích cơm heo chiên xù, 1 người thích udon bò trứng. | ✅ PASS | 0ms | Báo vượt ngân sách chính xác -> Gợi ý bù thêm +50.000đ (tổng 130.000đ) |
| **TC_24** | Phân biệt Chưa đủ dữ liệu khu vực | Nhóm 2 người muốn ăn bún bò ở khu vực Long Khánh với ngân sách 100.000 đồng. | ✅ PASS | 1ms | Chưa có dữ liệu thực đơn đã xác minh tại khu vực "Long Khánh". Hiện hệ thống mới có dữ liệu đã  |
| **TC_25** | Phân biệt Chưa đủ dữ liệu khu vực | Đi 1 mình ở khu vực Nhơn Trạch có 60.000 đồng muốn ăn cơm gà. | ✅ PASS | 0ms | Chưa có dữ liệu thực đơn đã xác minh tại khu vực "Nhơn Trạch". Hiện hệ thống mới có dữ liệu đã  |
| **TC_26** | Xung đột ràng buộc cứng tại cùng 1 quán | Nhóm 2 người ở Bửu Long có 100.000 đồng, 1 người bắt buộc ăn chay, 1 người ăn mặn. | ✅ PASS | 0ms | Trong phạm vi 1 quán đã xác minh tại Bửu Long, chưa có quán nào có thực đơn đáp ứng đồng thời t |
| **TC_27** | AI Scan Menu (Bóc tách cặp Món - Giá) | sample_bun_thai | ✅ PASS | 0ms | Trích xuất 5 món, đánh dấu cần kiểm tra: Có |
| **TC_28** | AI Scan Menu (Phát hiện giá biến thiên theo kg) | sample_tan_trieu | ✅ PASS | 0ms | Trích xuất 3 món, đánh dấu cần kiểm tra: Có |
| **TC_29** | Quản trị dữ liệu (Cô lập dữ liệu chờ duyệt) | Kiểm tra quán đang ở trạng thái pending (SUB_DEMO_01 - Bún Riêu Cua Đồng) tuyệt đối không xuất hiện trong kết quả gợi ý công khai trước khi Admin duyệt. | ✅ PASS | 1ms | An toàn 100%: Món chờ duyệt không xuất hiện trong kết quả |
| **TC_30** | Kiểm chứng Thứ tự Xếp hạng Maximin Fairness | Kiểm tra các phương án trả về cho nhóm 3 người luôn được sắp xếp giảm dần theo minMemberScore rồi mới đến totalGroupScore và totalCost. | ✅ PASS | 1ms | #1 Bún Thái & Mì Trộn Thành Minh (Min=80, Total=250, Cost=120000đ) -> #2 Bún Thái & Mì Trộn Thành Minh (Min=80, Total=250, Cost=136000đ) -> #3 Quán Bún Riêu & Cơm Tấm Sinh Viên Trấn Biên (Min=72, Total=224, Cost=100000đ) |

---

## 3. So sánh thực nghiệm với phương pháp tự tra cứu thủ công (Mục 8.1)

Trên cùng bộ dữ liệu **18 quán ăn (130 món)** tại Biên Hòa – Đồng Nai với bài toán mẫu: *"Nhóm 3 người có 150.000đ tại Trấn Biên, 2 người thích món nước, 1 người thích mì trộn khô, ăn cùng một quán"*:
1. **Cách tra cứu và tính nhẩm thủ công**: Người dùng phải lọc danh sách 7 quán thuộc phường Trấn Biên, mở thực đơn từng quán kiểm tra xem quán nào bán đồng thời cả món nước và món trộn khô, sau đó cộng thử giá 3 phần ăn sao cho $\le 150.000\text{đ}$ (mất trung bình **3 – 5 phút**).
2. **Sử dụng HỢP VỊ AI**: Trích xuất yêu cầu + duyệt toàn bộ tổ hợp hợp lệ + xếp hạng theo điểm thành viên thấp nhất (Maximin) và trả về Top 3 phương án kèm số tiền dư chính xác trong **< 1 giây**.
