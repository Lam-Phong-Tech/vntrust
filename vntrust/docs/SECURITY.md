# BẢO MẬT HỆ THỐNG VNTRUST (SECURITY POLICIES)

## 1. Tuân Thủ Luật Pháp (Nghị định 37/2026 & BVDLCN 2025)
- **Tối thiểu dữ liệu:** Chỉ thu thập thông tin người tiêu dùng khi họ đồng ý (vd: bật location để xác thực khu vực phân phối).
- **Mã hóa dữ liệu nhạy cảm:** Mọi thông tin cá nhân của người dùng cuối (nếu có cung cấp) phải được mã hóa một chiều (Hashing) để tuân thủ quyền ẩn danh.
- **Lịch sử Kiểm toán (Audit Trails):** Tất cả các thao tác thay đổi trạng thái (Duyệt KYC, Cảnh báo, Thu hồi lô hàng) đều phải được ghi log vào bảng `NhatKy` không thể sửa xóa (Append-only).

## 2. Authentication & Authorization (Xác Thực & Phân Quyền)
- Phân quyền (RBAC) nghiêm ngặt với các roles: `admin`, `manufacturer`, `importer`, `consumer`.
- Middleware Next.js bảo vệ tất cả các đường dẫn `/dashboard/*`. Nếu không có hoặc sai JWT/Cookie -> redirect `/login`.
- Session tự động hết hạn, không lưu password plaintext trong database (phải dùng bcrypt hoặc Argon2 cho mật khẩu).

## 3. Bảo Vệ Dữ Liệu Chống Làm Giả UID (Anti-Counterfeiting)
- **Chuẩn tạo UID:** Không sử dụng chuỗi số tăng dần tuần tự (sequential ids) cho sản phẩm/lô hàng. Phải dùng chuỗi ngẫu nhiên (UUIDv4) để kẻ gian không thể "đoán" được mã QR hợp lệ tiếp theo.
- **Rate Limiting:** Giới hạn số lượt quét API `/api/verify` từ một IP để tránh kẻ tấn công vét cạn (Brute-force) dò tìm mã UID hợp lệ.

## 4. An Toàn API (API Security)
- Validate toàn bộ input đầu vào (chống SQL Injection / XSS). Sử dụng tham số hóa tự động của Prisma ORM.
- Tắt hiển thị chi tiết lỗi Server cho Client trên môi trường Production (`NODE_ENV=production`).
- Bắt buộc giao tiếp qua HTTPS ở mọi endpoint để bảo vệ dữ liệu truyền tải.
