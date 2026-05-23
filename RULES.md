# Project Rules — VNTrust

# Văn bản này là QUY TẮC BẮT BUỘC. AI Agent PHẢI đọc trước khi code.

## NGUYÊN TẮC TUYỆT ĐỐI

1. KHÔNG BAO GIỜ xoá hoặc viết lại code đang hoạt động mà không hỏi trước
2. KHÔNG BAO GIỜ dùng raw SQL — chỉ dùng ORM (Prisma/Sequelize/TypeORM)
3. KHÔNG BAO GIỜ skip validation đầu vào ở bất kỳ API nào
4. KHÔNG BAO GIỜ hardcode credentials, tokens, secrets
5. PHẢI đọc CRITICAL_PATHS.md trước khi sửa bất kỳ file backend nào
6. PHẢI đọc DATABASE.md trước khi thêm/sửa bảng hoặc quan hệ
7. PHẢI chạy build test trước khi báo "hoàn thành"

## PROTECTED FILES — KHÔNG ĐƯỢC SỬA

- src/lib/auth.ts          ← Luồng xác thực
- src/middleware.ts         ← Middleware bảo mật
- prisma/schema.prisma     ← Chỉ sửa khi được yêu cầu rõ ràng
- nginx.conf               ← Cấu hình reverse proxy

# Cập nhật danh sách này khi có thêm file critical

## QUY TẮC KHI CODE

1. Chỉ sửa đúng file và đúng function được yêu cầu
2. KHÔNG refactor, rename, hoặc "cải thiện" code khác
3. KHÔNG xoá comment hoặc code "không dùng"
4. Nếu thấy code "có vấn đề" → BÁO cho user, KHÔNG tự sửa
5. Trước khi code: liệt kê file sẽ sửa → chờ xác nhận
6. Khi hoàn thiện code, update vào docs/CHANGELOG.md

## TRƯỚC KHI BẮT ĐẦU SESSION

1. Đọc RULES.md (file này)
2. Đọc docs/ARCHITECTURE.md
3. Đọc docs/CRITICAL_PATHS.md nếu sửa backend
4. Đọc docs/DATABASE.md nếu liên quan database
