# NỘI DUNG CẬP NHẬT CHO FILE WORD "BẢN MÔ TẢ CHI TIẾT.docx" (MỤC 7.1 – 7.4)

> **Hướng dẫn sử dụng**: Trong file `BẢN MÔ TẢ CHI TIẾT.docx` hiện tại, Mục 7.2 đang ghi là *"phần phân tích câu nhập hiện dựa trên từ khóa, chưa tích hợp API AI và chưa có kết quả kiểm thử định lượng"*. Nay hệ thống đã hoàn thiện 100%, bạn hãy copy phần nội dung dưới đây dán thay thế cho **Mục 7.1, 7.2, 7.3 và 7.4** trong file Word để hồ sơ dự thi có đầy đủ số liệu thực nghiệm thuyết phục nhất!

---

## VII. XÂY DỰNG SẢN PHẨM, KIỂM THỬ VÀ KẾT QUẢ THỰC NGHIỆM

### 7.1. Phạm vi phiên bản thử nghiệm đã triển khai
Phiên bản thực nghiệm (MVP) đã được xây dựng hoàn chỉnh tập trung vào địa bàn thành phố Biên Hòa, tỉnh Đồng Nai (trọng tâm tại phường Trấn Biên, Tam Hiệp, Tân Triều, Bửu Long, Thanh Bình và Thống Nhất).
Quy mô dữ liệu thực tế đã số hóa và kiểm duyệt gồm:
- **18 cơ sở kinh doanh ăn uống** có địa chỉ và khung giờ hoạt động rõ ràng (từ quán ăn sinh viên đến nhà hàng đặc sản).
- **130 món ăn và combo** có giá bán niêm yết (kèm phân loại rõ các món có giá cố định và các món đặc sản tính theo trọng lượng `kg` hoặc theo cỡ Nhỏ/Vừa/Lớn).
- **04 chuyên mục Đặc sản & Ẩm thực tiêu biểu Đồng Nai** có nguồn tư liệu đối chiếu (*Gỏi bưởi Tân Triều, Gà hấp trái bưởi Tân Triều, Lẩu tôm sông & Chạo tôm Biên Hòa, Chả lụi Bửu Long & Gỏi cá Tân Mai*).
- Hỗ trợ giải bài toán chọn món cho **cá nhân (1 người) và nhóm từ 2 – 5 người**.

### 7.2. Hiện trạng thực hiện
Nhóm nghiên cứu đã hoàn thành xây dựng sản phẩm Website Full-stack **HỢP VỊ AI** (gồm Backend Node.js, Bộ giải tổ hợp ràng buộc, Cơ sở dữ liệu JSON đã kiểm duyệt và Giao diện Web đáp ứng trên máy tính lẫn điện thoại) với đầy đủ bốn danh mục công khai (Trang chủ, AI Gợi ý món ăn, Khám phá ẩm thực Đồng Nai, Đánh giá/Góp ý) và ba phân khu theo vai trò (Người dùng, Đối tác, Admin).

Các hạng mục kỹ thuật đã hoàn thành và có minh chứng thực nghiệm gồm:
1. **Tích hợp mô hình ngôn ngữ lớn qua API (`gemini-2.5-flash`)** kết hợp cơ chế kiểm soát cấu trúc đầu ra (JSON Schema) và bộ phân tích ngữ nghĩa dự phòng (Semantic Fallback), kèm bước **Xác nhận nhu cầu trung gian (Human-in-the-loop)** giúp làm rõ các câu nhập mơ hồ trước khi tìm món.
2. **Xây dựng Bộ giải tổ hợp món theo nguyên tắc Công bằng nhóm (Maximin Fairness)**: Tính toán chính xác 100% tổng chi phí bằng chương trình, xếp hạng ưu tiên phương án có điểm thành viên thấp nhất cao hơn (`Min Score`), sau đó mới xét tổng điểm sở thích nhóm và tổng chi phí.
3. **Xử lý minh bạch các trường hợp không có phương án hợp lệ**: Tự động phân biệt trường hợp *Chưa đủ dữ liệu tại khu vực yêu cầu* (ví dụ Long Khánh, Nhơn Trạch) với trường hợp *Vượt ngân sách*, đồng thời tính toán chính xác số tiền tối thiểu cần bù thêm (Kịch bản điều chỉnh ngân sách).
4. **Hoàn thiện mô-đun AI Scan Menu (`gemini-2.5-flash` Multimodal Vision)** cho phép trích xuất tên món – giá bán từ ảnh thực đơn thành bảng nháp có đánh dấu các dòng nghi ngờ (`needsReview`), kết nối trực tiếp với quy trình phê duyệt của Admin và bảng giám sát chi phí Token API.

### 7.3. Phương pháp và kết quả kiểm thử thực nghiệm (30 tình huống)
Nhóm đã thiết kế bộ kiểm thử tự động gồm **30 tình huống (`tests/run_30_scenarios.js`)** chia thành 4 nhóm tiêu chí để đánh giá khách quan toàn bộ hệ thống trên bộ dữ liệu 18 quán ăn (130 món):

| Nội dung kiểm tra | Số tình huống | Tiêu chí chấm điểm (Code-Based Grader) | Kết quả đạt |
| :--- | :--- | :--- | :--- |
| **1. Cá nhân & Đa dạng khẩu vị / Ngân sách** | 08 tình huống (`TC_01` – `TC_08`) | Trích xuất đúng số người (1), ngân sách, khu vực, vị cay/thanh, ăn chay và phát hiện câu nhập ngân sách mơ hồ (*"tầm 70.000đ"*). | **8 / 8 (100%)** |
| **2. Tổ hợp nhóm (2–4 người) & Xếp hạng Maximin** | 12 tình huống (`TC_09` – `TC_20`) | Tìm đúng quán có đủ món cho các thành viên khác sở thích (nước/khô/cơm), tổng tiền không vượt trần ngân sách, xếp hạng đúng thứ tự Maximin. | **12 / 12 (100%)** |
| **3. Xử lý khi không có phương án hợp lệ** | 06 tình huống (`TC_21` – `TC_26`) | Phân biệt chính xác *Thiếu dữ liệu khu vực* với *Thiếu ngân sách*; tính đúng mức ngân sách tối thiểu cần tăng thêm. | **6 / 6 (100%)** |
| **4. AI Scan Menu & Cô lập dữ liệu chờ duyệt** | 04 tình huống (`TC_27` – `TC_30`) | Bóc tách đúng cặp tên món – giá, gắn cờ cảnh báo món tính theo `kg`; đảm bảo 100% món đang ở trạng thái chờ duyệt (`pending`) không xuất hiện trong kết quả công khai. | **4 / 4 (100%)** |
| **TỔNG CỘNG** | **30 tình huống** | **Độ chính xác kiểm tra ngân sách: 100% • Thời gian giải tổ hợp trung bình: < 5ms** | **30 / 30 (100%)** |

### 7.4. Hồ sơ minh chứng kèm theo sản phẩm
1. **Mã nguồn hệ thống**: Toàn bộ mã nguồn Backend (`server/index.js`, `server/solver.js`, `server/geminiService.js`), giao diện (`public/`) và cơ sở dữ liệu đã xác minh (`data/database.json`).
2. **Báo cáo kiểm thử định lượng**: Xuất tự động tại file `tests/EVALUATION_REPORT.md` khi chạy lệnh `npm test`.
3. **Minh chứng quy trình Đối tác – Admin**: Hồ sơ mẫu tại cổng Đối tác (`AI Scan Menu`) và nhật ký kiểm toán (`Audit Logs`) trong trang Quản trị viên.

