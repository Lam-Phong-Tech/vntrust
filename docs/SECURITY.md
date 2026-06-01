# Quy Tắc Bảo Mật - [Tên Dự Án]

## 1. Input Validation
- MỌI API endpoint phải có Zod/Joi schema validation
- Validate TRƯỚC KHI xử lý bất kỳ logic nào
- Sanitize HTML input: loại bỏ <script>, SQL keywords
- Giới hạn độ dài input (max 255 cho text, max 10000 cho textarea)

## 2. Authentication & Authorization
- Sử dụng JWT với expiry time hợp lý (access: 15m, refresh: 7d)
- Mọi API private PHẢI có middleware auth check
- Phân quyền theo role: Admin / Manager / User
- Password: bcrypt hash, minimum 8 ký tự

## 3. Database
- CHỈ dùng ORM (Prisma) - TUYỆT ĐỐI không raw SQL
- Parameterized queries cho mọi trường hợp
- Backup database tự động hàng ngày
- Không lưu sensitive data dạng plaintext

## 4. API Security
- Rate limiting: 100 req/phút/IP (chung), 10 req/phút (login)
- CORS: chỉ cho phép domain production
- Security headers: Helmet config (HSTS, XSS, nosniff)
- Không expose stack trace trong error response

## 5. Infrastructure
- SSL/HTTPS bắt buộc
- Firewall: chỉ mở port 80, 443, 22
- SSH key-only (disable password auth)
- Environment variables cho secrets (.env - KHÔNG commit git)
