# THỨ TỰ TRIỂN KHAI MODULE (DEPENDENCY ORDER)

Dựa trên nguyên lý phát triển linh hoạt (Agile) và đảm bảo các logic phụ thuộc được xử lý từ gốc tới ngọn, lộ trình triển khai và fix lỗi hệ thống VNTrust được khuyến nghị như sau:

## Giai đoạn 1: Foundation (Nền tảng Database & Auth)
**Dependencies:** Không phụ thuộc module nào khác.
**Các công việc ưu tiên:**
1. **Thiết kế & Migrate Database (Prisma):** Khởi tạo toàn bộ Database Schema, thiết lập các mối quan hệ `1-N` giữa `DoanhNghiep`, `SanPham`, `LoHang`. 
   - *Kiểm thử:* Seed dữ liệu giả để chắc chắn DB kết nối ổn định (không lỗi SQLITE_CORRUPT).
2. **Module Xác thực (Auth) & Đăng ký (Register):** Viết API `/api/auth/register` và `/api/auth/login`. Quản lý Cookie Session, thiết lập Role-based Access Control (Middleware).

## Giai đoạn 2: Supply Chain (Khởi tạo Nguồn gốc)
**Dependencies:** Cần có Database và Auth từ Giai đoạn 1. Phải có tài khoản DN để làm.
**Các công việc ưu tiên:**
1. **Module KYC Doanh nghiệp:** API nộp hồ sơ KYC, Admin duyệt hồ sơ.
2. **Module Quản lý Danh mục Sản phẩm & Lô hàng:** Cho phép DN thêm Sản phẩm mới, và tạo Lô hàng mới.
3. **Module Tạo UID (Mã QR):** Khi phát hành Lô hàng, phải tự động sinh ra hàng loạt các mã UID định danh ngẫu nhiên (Lưu vào bảng `MaDinhDanh`).

## Giai đoạn 3: Consumer (Luồng Xác Thực - Lõi Hệ Thống)
**Dependencies:** Cần có Dữ liệu Sản phẩm, Lô hàng, và Mã UID từ Giai đoạn 2.
**Các công việc ưu tiên:**
1. **Trang Xác Thực (`/verify/[uid]`):** Xây dựng Frontend cho phép người dùng quét mã. Giao tiếp với API để lấy trạng thái thật/giả.
2. **Tích hợp tính năng Báo cáo:** Xây dựng form "Báo cáo nghi ngờ hàng giả" khi người dùng quét mã xong. API `/api/report`.

## Giai đoạn 4: System Admin & Analytics
**Dependencies:** Cần có Dữ liệu Quét mã và Báo cáo từ Giai đoạn 3 để phân tích.
**Các công việc ưu tiên:**
1. **Module Giám sát Hậu kiểm & Cảnh báo vòng đời:** Tính năng đếm ngược ngày hết hạn chứng nhận/lô hàng.
2. **Dashboard Thống Kê Tổng Quan:** Vẽ biểu đồ Heatmap, thống kê lượt quét, cảnh báo hàng giả theo khu vực.
3. **Audit Log (Nhật ký Hệ thống):** Trang xem lại toàn bộ lịch sử phê duyệt, thay đổi cấu trúc của Admin.

## Nguyên tắc Kiểm thử & Fix lỗi (Song song)
Mỗi module đều phải áp dụng quy tắc: **Làm xong Backend -> Ráp Frontend -> Fix UI/UX -> Test Security (SQL/Role) -> Qua module tiếp theo.**
Đặc biệt đối với các luồng liên quan tới **Mã QR**, hãy in thử mã ra giấy để test UI trên nhiều loại điện thoại khác nhau nhằm đảm bảo quét mượt mà.
