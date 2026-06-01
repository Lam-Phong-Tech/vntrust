# CÁC LUỒNG NGHIỆP VỤ QUAN TRỌNG (CRITICAL PATHS)

## 1. Luồng Xác Thực Sản Phẩm (Consumer Verification Path)
> **Mục tiêu:** Đảm bảo người tiêu dùng quét mã QR nhận được kết quả chính xác, nhanh chóng, đồng thời ghi nhận log để hệ thống AI phát hiện bất thường.

- **Files liên quan:** 
  - `src/app/verify/[uid]/page.tsx`
  - `src/app/api/verify/[uid]/route.ts`
  - `src/app/api/analytics/route.ts`
- **Các bước thực hiện:**
  1. Người dùng quét mã QR bằng điện thoại -> Điều hướng tới `/verify/[uid]`.
  2. Bắt đầu tính tọa độ GPS (nếu được phép) và thông tin thiết bị.
  3. Giao diện gọi API `GET /api/verify/[uid]`.
  4. Hệ thống kiểm tra: 
     - UID có tồn tại không?
     - UID đã bị quét quá nhiều lần không (Rule engine)?
     - Lô hàng có bị đánh dấu là "Recalled" hay "Fake" không?
  5. Hệ thống trả về trạng thái (`genuine`, `suspect`, `fake`).
  6. Ghi log vào bảng `LuotQuet` (Background task).
  7. Frontend hiển thị màu sắc tương ứng (Xanh, Vàng, Đỏ).

## 2. Luồng Phát Hành Lô Hàng & Tạo UID (Supply Chain Path)
> **Mục tiêu:** Doanh nghiệp tạo lô hàng và sinh mã QR duy nhất để dán lên bao bì. Luồng này được bảo vệ (PROTECTED).

- **Files liên quan:** 
  - `src/app/dashboard/inventory/page.tsx`
  - `src/app/api/inventory/route.ts`
  - `prisma/schema.prisma`
- **Các bước thực hiện:**
  1. DN vào màn hình Quản lý Kho hàng -> Bấm "Tạo lô hàng".
  2. Frontend gửi request `POST /api/inventory` (action: `create_batch`).
  3. Server kiểm tra Session (bắt buộc role `manufacturer`).
  4. Server kiểm tra tài khoản DN đã được KYC (`trangThai === 'verified'`). Nếu chưa -> Chặn.
  5. Server tạo bản ghi trong bảng `LoHang`.
  6. Khởi tạo mảng UID (UUID v4 ngẫu nhiên) theo `soLuong`. Insert bulk vào bảng `MaDinhDanh`.
  7. Trả về thông báo thành công và file tải xuống (Danh sách UID/QR Code).

## 3. Luồng Phê Duyệt KYC Doanh Nghiệp (Admin Compliance Path)
> **Mục tiêu:** Thẩm định hồ sơ pháp lý của doanh nghiệp trước khi cho phép họ đưa sản phẩm vào hệ thống.

- **Files liên quan:** 
  - `src/app/dashboard/kyc/page.tsx`
  - `src/app/api/kyc/route.ts`
- **Các bước thực hiện:**
  1. DN upload file giấy phép kinh doanh, điền thông tin -> Call `PATCH /api/kyc` (update_info).
  2. Admin truy cập màn hình KYC Doanh nghiệp.
  3. Admin rà soát giấy tờ, so sánh với dữ liệu quốc gia (Integration Hub).
  4. Admin bấm "Phê duyệt" hoặc "Từ chối" kèm lý do.
  5. Backend cập nhật `trangThai` trong `DoanhNghiep` và ghi log kiểm toán vào `NhatKy`.

## 4. Luồng Cảnh Báo Sớm Bất Thường (Alert Monitoring Path)
> **Mục tiêu:** Hệ thống tự động phân tích dữ liệu lượt quét và bắn cảnh báo khi có biến động bất thường (nghi ngờ làm giả số lượng lớn).

- **Files liên quan:** 
  - `src/app/api/alerts/route.ts`
  - `src/app/dashboard/alerts/page.tsx`
- **Các bước thực hiện:**
  1. Background process tổng hợp `LuotQuet` hàng giờ.
  2. Đối chiếu số lượt quét của một UID > Ngưỡng quy định.
  3. Nếu vượt ngưỡng -> Insert vào bảng `CanhBao`.
  4. Dashboard Alerts của Admin và DN nhận được cảnh báo Real-time (Badge số lượng).
