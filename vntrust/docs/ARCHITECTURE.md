# KIẾN TRÚC HỆ THỐNG VNTRUST (ARCHITECTURE)

## 1. Tech Stack Đề Xuất & Lý Do Chọn

| Thành phần | Công nghệ | Lý do lựa chọn |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 14+ (App Router)** | Framework React mạnh mẽ, hỗ trợ SSR/SSG giúp tối ưu SEO, tốc độ tải trang nhanh. Hỗ trợ PWA. |
| **Styling** | **Tailwind CSS** | Phát triển UI nhanh chóng, linh hoạt, dễ dàng custom design system và dark mode. |
| **Backend** | **Next.js API Routes** | Tích hợp sẵn trong Next.js, giảm chi phí triển khai hạ tầng rời rạc. Kiến trúc Serverless. |
| **Database** | **SQLite (via Prisma)** | Dễ dàng thiết lập, phù hợp cho giai đoạn MVP. Dễ dàng migrate sang PostgreSQL sau này. |
| **ORM** | **Prisma** | Type-safe database client, quản lý schema và migration trực quan, tích hợp tốt với TypeScript. |
| **AI / OCR** | **External API / Python** | Tích hợp PaddleOCR (nhận diện tiếng Việt tốt) và AI Vision (Siamese Network) qua microservices. |
| **Bảo mật** | **JWT / AES-256** | Tuân thủ Luật Bảo vệ dữ liệu cá nhân, mã hóa AES-256 cho Identity Vault. |

## 2. Sơ Đồ Cấu Trúc Thư Mục (Folder Structure)

```text
vntrust/
├── prisma/
│   ├── schema.prisma       # Định nghĩa CSDL và các model
│   └── dev.db              # Database SQLite
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── api/            # Backend API Endpoints (RESTful)
│   │   ├── dashboard/      # Giao diện Admin/Doanh nghiệp (Protected)
│   │   ├── verify/         # Giao diện xác thực cho người dùng cuối
│   │   ├── login/          # Xác thực và phân quyền
│   │   └── globals.css     # Tailwind CSS styles
│   ├── components/         # Reusable UI components
│   └── lib/                # Utilities, Prisma Client
├── docs/                   # Tài liệu kỹ thuật dự án
├── public/                 # Static assets (images, icons)
├── .env                    # Biến môi trường
├── tailwind.config.ts      # Cấu hình Tailwind CSS
└── package.json            # Dependencies
```

## 3. Sơ Đồ Luồng Dữ Liệu Tổng Thể (Data Flow)

1. **Quét Mã / Tra Cứu (Consumer Flow):**
   `Client (Mobile/Web) -> GET /api/verify/[uid] -> Next.js API -> Prisma -> SQLite -> Trả về kết quả (Xanh/Vàng/Đỏ)`

2. **Đăng Ký & KYC Doanh Nghiệp (B2B Flow):**
   `DN -> Upload Giấy tờ -> POST /api/kyc -> API -> Lưu file + Lưu DB (Trạng thái Pending) -> Admin duyệt -> Trạng thái Verified`

3. **Phát Hiện Bất Thường (AI/Monitoring Flow):**
   `Quét nhiều lần / Sai vị trí -> Lưu Log -> Background Job kiểm tra Rule Engine -> Bắn cảnh báo (Dashboard / Email)`

4. **Báo Cáo Hàng Giả (Report Flow):**
   `Client -> POST /api/report -> API ẩn danh hóa (Hash User) -> Lưu Report Vault -> Báo cáo Admin`

## 4. Các Service Bên Ngoài (External Services)

- **Cổng thông tin quốc gia (Bộ KH&CN / Bộ Công Thương):** API đồng bộ dữ liệu truy xuất nguồn gốc.
- **GS1 Vietnam API:** Xác thực mã GTIN.
- **Dịch vụ Gửi Email (Amazon SES / SendGrid):** Gửi email cảnh báo vòng đời và mã OTP.
- **AI Microservice (Tùy chọn):** OCR trích xuất thông tin giấy phép, ResNet nhận diện tem giả qua ảnh chụp.
