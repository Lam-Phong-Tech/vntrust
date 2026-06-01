# VNTrust – Hệ thống Xác thực & Bảo vệ Thương hiệu Việt Nam

## Tổng quan

**VNTrust** là hệ thống xác thực và truy xuất nguồn gốc sản phẩm Việt Nam, lấy cảm hứng từ các giải pháp quốc tế như *Verified by GS1*, *Codikett 2.0* (Securikett), và *Red Points*. Hệ thống tạo "vân tay số" duy nhất cho mỗi sản phẩm, giúp người tiêu dùng xác minh hàng thật/giả qua quét mã QR, đồng thời trang bị cho doanh nghiệp bộ công cụ giám sát thị trường xám bằng AI.

> [!IMPORTANT]
> Hệ thống phải tuân thủ **Nghị định 37/2026/NĐ-CP** về truy xuất nguồn gốc và **TCVN 13275:2020** về mã QR.

---

## Các Actor (Người dùng)

| Vai trò | Mô tả |
|---|---|
| **Nhà sản xuất** | Đăng ký sản phẩm, quản lý mã số, tạo QR |
| **Nhà nhập khẩu** | Nhập khẩu & phân phối hàng hóa, quản lý lô |
| **Người tiêu dùng** | Quét mã, xác thực sản phẩm, báo cáo nghi ngờ |
| **Quản trị hệ thống** | Quản lý người dùng, giám sát, báo cáo tổng hợp |
| **Cán bộ tư vấn** | Nhận cảnh báo, kiểm tra thủ công, đề xuất hành động |

---

## 6 Phân hệ chính

### Phân hệ 1 – Quản lý Hồ sơ Doanh nghiệp & Sản phẩm
- Đăng ký doanh nghiệp (MST, tên, địa chỉ, ngành VSIC 2025)
- Upload & OCR chứng từ (ĐKKD, chứng nhận an toàn)
- Phân quyền nội bộ (admin, nhân viên nhập liệu, kho)
- Quản lý danh mục sản phẩm: SKU, GTIN, hình ảnh, lô hàng
- Đính kèm chứng nhận ISO, HACCP, Halal, Organic

### Phân hệ 2 – Tạo & Quản lý Mã Định danh Duy nhất
- UID: UUID v4 ngẫu nhiên + mã hóa AES-256
- Mã QR theo TCVN 13275:2020 (export PDF/EPS/SVG)
- Batch code: Alphanumeric theo quy tắc doanh nghiệp
- Serial Number cho sản phẩm giá trị cao
- QR chỉ là "khóa" tra cứu, không chứa thông tin nhạy cảm trực tiếp

### Phân hệ 3 – Xác thực Sản phẩm cho Người tiêu dùng
- Web-based scanner (camera trình duyệt)
- Mobile app (tùy chọn nâng cao, hỗ trợ phân tích vân tay)
- Kết quả 4 trạng thái:
  - 🟢 **Xanh** – Chính hãng
  - 🟡 **Vàng** – Nghi ngờ (quét nhiều lần, vị trí lạ)
  - 🔴 **Đỏ** – Hàng giả / Vi phạm
  - ⚫ **Xám** – Hết hạn
- Hiển thị: tên, thương hiệu, hình ảnh, ngày SX, HSD, chứng nhận, khuyến mãi

### Phân hệ 4 – Giám sát & Phát hiện Bất thường (AI-powered)
| Loại bất thường | Phương pháp | Hành động |
|---|---|---|
| Quét nhiều lần cùng UID | Hit count tracking | Cảnh báo sau ngưỡng (>3 lần/ngày) |
| Quét tại vị trí địa lý bất thường | Phân tích IP/GPS | So sánh với khu vực phân phối chính thức |
| Tần suất quét bất thường theo batch | Phân tích thống kê | Phát hiện lô hàng bị làm giả hàng loạt |
| Điểm tương đồng thấp (AI vision) | So sánh vector đặc trưng | Cảnh báo hàng giả cấp độ cao |

Dashboard: Tổng lượt quét, số cảnh báo, bản đồ quét địa lý, tỷ lệ thật/giả.

### Phân hệ 5 – Quản lý Cảnh báo & Báo cáo
Quy trình: Phát hiện → Tạo cảnh báo → Phân loại mức độ (Thấp/Trung/Cao) → Gửi thông báo → Kiểm tra thủ công → Cập nhật trạng thái

Các loại báo cáo:
- Báo cáo tóm tắt (Ban lãnh đạo)
- Báo cáo chi tiết lô hàng (Quản lý chất lượng)
- Báo cáo checklist tuân thủ (CFS, GMP, C/O, GTIN)

### Phân hệ 6 – Tuân thủ & Pháp lý (TrustCheck)
- Kiểm tra ngày hết hạn chứng nhận (ISO, HACCP)
- Kiểm tra sự hiện diện giấy tờ bắt buộc (CFS, GMP, C/O)
- Kiểm tra tính hợp lệ mã số GTIN
- Báo cáo tổng hợp tuân thủ Nghị định 37/2026/NĐ-CP

---

## Lộ trình phát triển

| Phase | Thời gian | Tính năng |
|---|---|---|
| **Phase 1** | 2–3 tuần | Checklist tĩnh, rule engine cơ bản (ngày hết hạn EXP/ISO/HACCP) |
| **Phase 2** | 3–4 tuần | Mở rộng kiểm tra CFS/GMP/C/O, GTIN, báo cáo tổng hợp |
| **Phase 3** | 2–3 tuần | Cảnh báo tự động, gợi ý hành động thông minh, AI anomaly detection |

---

## UML Diagrams

### 1. Use Case Diagram

```mermaid
graph TD
    subgraph Actors
        NSX[👤 Nhà sản xuất]
        NNK[👤 Nhà nhập khẩu]
        NTD[👤 Người tiêu dùng]
        QTHT[👤 Quản trị hệ thống]
        CBTV[👤 Cán bộ tư vấn]
    end

    subgraph VNTrust System
        UC1[Đăng ký doanh nghiệp]
        UC2[Quản lý sản phẩm & lô hàng]
        UC3[Tạo mã QR / UID]
        UC4[Quét mã xác thực]
        UC5[Xem thông tin sản phẩm]
        UC6[Báo cáo nghi ngờ hàng giả]
        UC7[Giám sát dashboard]
        UC8[Phát hiện bất thường AI]
        UC9[Quản lý cảnh báo]
        UC10[Xuất báo cáo]
        UC11[Quản lý người dùng]
        UC12[Kiểm tra tuân thủ pháp lý]
    end

    NSX --> UC1
    NSX --> UC2
    NSX --> UC3
    NSX --> UC7
    NSX --> UC10

    NNK --> UC1
    NNK --> UC2
    NNK --> UC3
    NNK --> UC12

    NTD --> UC4
    NTD --> UC5
    NTD --> UC6

    QTHT --> UC11
    QTHT --> UC7
    QTHT --> UC9
    QTHT --> UC10

    CBTV --> UC9
    CBTV --> UC12
    CBTV --> UC10

    UC4 --> UC5
    UC8 --> UC9
    UC7 --> UC8
```

---

### 2. Class Diagram (Data Model)

```mermaid
classDiagram
    class DoanhNghiep {
        +String maSoThue
        +String ten
        +String diaChi
        +String nganh_VSIC
        +String loai %% NSX | NNK
        +DateTime ngayDangKy
        +String trangThai %% pending | verified | suspended
        +dangKy()
        +uploadChungTu()
        +xacThuc()
    }

    class SanPham {
        +String maSKU
        +String GTIN
        +String ten
        +String moTa
        +String hinhAnh
        +String nuocSanXuat
        +DateTime ngayTao
        +them()
        +capNhat()
        +xoa()
    }

    class LoHang {
        +String maLo
        +DateTime ngaySanXuat
        +DateTime hanDung
        +Int soLuong
        +String trangThai
        +taoMa()
        +capNhat()
    }

    class MaDinhDanh {
        +String uid %% UUID v4
        +String qrCode
        +String serialNumber
        +String loai %% QR | Serial
        +DateTime ngayTao
        +Int soLanQuet
        +String trangThai %% active | expired | flagged
        +sinh()
        +exportPDF()
        +exportSVG()
    }

    class LuotQuet {
        +String uid
        +DateTime thoiGian
        +String diaChi_IP
        +Float lat
        +Float lng
        +String ketQua %% genuine | suspect | fake | expired
        +String thietBi
        +ghi()
        +phanTich()
    }

    class CanhBao {
        +String loai
        +String mucDo %% low | medium | high
        +String moTa
        +DateTime thoiGian
        +String trangThai %% open | reviewing | closed
        +tao()
        +capNhat()
        +guiThongBao()
    }

    class ChungNhan {
        +String loai %% ISO | HACCP | Halal | GMP | CFS
        +String soChungNhan
        +DateTime ngayCap
        +DateTime ngayHetHan
        +String toChucCap
        +kiemTraHieuLuc()
    }

    class NguoiDung {
        +String email
        +String matKhau
        +String vaiTro %% admin | staff | viewer
        +String doanhNghiepId
        +String trangThai
        +dangNhap()
        +phanQuyen()
    }

    class BaoCao {
        +String loai %% summary | detail | compliance
        +DateTime tuNgay
        +DateTime denNgay
        +String doiTuong
        +taoMoi()
        +xuatFile()
    }

    DoanhNghiep "1" --o "many" SanPham : sở hữu
    DoanhNghiep "1" --o "many" NguoiDung : quản lý
    SanPham "1" --o "many" LoHang : có
    LoHang "1" --o "many" MaDinhDanh : chứa
    MaDinhDanh "1" --o "many" LuotQuet : được quét
    LuotQuet "1" ..> "0..1" CanhBao : sinh ra
    SanPham "many" --o "many" ChungNhan : đính kèm
    LoHang "many" --o "many" ChungNhan : đính kèm
    CanhBao "many" --> "1" BaoCao : tổng hợp vào
```

---

### 3. Sequence Diagram – Xác thực sản phẩm (Người tiêu dùng)

```mermaid
sequenceDiagram
    actor NTD as 👤 Người tiêu dùng
    participant WS as Web Scanner
    participant API as API Gateway
    participant UID_SVC as UID Service
    participant AI_SVC as AI Detection
    participant DB as Database
    participant NOTIF as Notification

    NTD->>WS: Mở camera, quét mã QR
    WS->>API: POST /verify {uid, location, device}
    API->>UID_SVC: lookup(uid)
    UID_SVC->>DB: SELECT * FROM ma_dinh_danh WHERE uid=?
    DB-->>UID_SVC: product_data | null

    alt UID không tồn tại
        UID_SVC-->>API: {status: "fake", color: "red"}
        API-->>WS: Trả kết quả đỏ
        WS-->>NTD: ⚠️ Hàng giả / Mã không tồn tại
    else UID hợp lệ
        UID_SVC->>DB: INSERT INTO luot_quet (uid, time, ip, lat, lng)
        UID_SVC->>AI_SVC: analyze(uid, scan_count, location)
        AI_SVC->>DB: Kiểm tra lịch sử quét & vùng phân phối
        
        alt Phát hiện bất thường
            AI_SVC->>DB: CREATE cảnh báo
            AI_SVC->>NOTIF: Gửi alert tới doanh nghiệp
            AI_SVC-->>UID_SVC: {anomaly: true, reason: "..."}
            UID_SVC-->>API: {status: "suspect", color: "yellow"}
            API-->>WS: Trả kết quả vàng
            WS-->>NTD: ⚠️ Nghi ngờ - Kiểm tra thêm
        else Bình thường
            UID_SVC-->>API: {status: "genuine", color: "green", product: {...}}
            API-->>WS: Trả kết quả xanh + thông tin sản phẩm
            WS-->>NTD: ✅ Chính hãng + Chi tiết SP
        end
    end
```

---

### 4. Sequence Diagram – Tạo mã QR (Nhà sản xuất)

```mermaid
sequenceDiagram
    actor NSX as 👤 Nhà sản xuất
    participant Portal as Cổng quản lý
    participant API as API Gateway
    participant AUTH as Auth Service
    participant PROD_SVC as Product Service
    participant UID_GEN as UID Generator
    participant DB as Database
    participant QR_SVC as QR Service

    NSX->>Portal: Đăng nhập + chọn sản phẩm/lô hàng
    Portal->>API: POST /auth/login
    API->>AUTH: Xác thực token
    AUTH-->>API: OK

    NSX->>Portal: Nhập thông tin lô hàng, chọn số lượng mã
    Portal->>API: POST /products/batches {batch_info, qty}
    API->>PROD_SVC: createBatch(batch_info)
    PROD_SVC->>DB: INSERT INTO lo_hang

    PROD_SVC->>UID_GEN: generateUIDs(qty)
    loop Với mỗi sản phẩm
        UID_GEN->>UID_GEN: UUID v4 + AES-256 encrypt
        UID_GEN->>DB: INSERT INTO ma_dinh_danh
    end

    UID_GEN->>QR_SVC: renderQR(uid_list, format=PDF)
    QR_SVC-->>Portal: File QR (PDF/EPS/SVG)
    Portal-->>NSX: ⬇️ Download file mã QR để in ấn
```

---

### 5. Activity Diagram – Quy trình xử lý cảnh báo

```mermaid
flowchart TD
    A([🔴 Phát hiện bất thường]) --> B[Tạo cảnh báo F02/F03/F04]
    B --> C{Phân loại mức độ}
    C -->|Thấp| D[Ghi log hệ thống]
    C -->|Trung bình| E[Gửi email thông báo doanh nghiệp]
    C -->|Cao| F[Gửi SMS + Email khẩn cấp]
    
    D --> G{Doanh nghiệp xem xét?}
    E --> G
    F --> H[Chuyển cán bộ tư vấn kiểm tra thủ công]
    
    H --> I{Kết quả kiểm tra}
    I -->|Hàng giả xác nhận| J[Đánh dấu UID = FAKE]
    I -->|Lỗi hệ thống / Sai| K[Bỏ qua cảnh báo]
    I -->|Cần điều tra thêm| L[Gửi yêu cầu báo cáo cơ quan chức năng]
    
    G -->|Có - Xử lý| M[Cập nhật trạng thái sản phẩm/lô hàng]
    G -->|Không - 48h| H
    
    J --> M
    K --> M
    L --> M
    M --> N([✅ Đóng cảnh báo])
```

---

### 6. Component Diagram (Kiến trúc hệ thống)

```mermaid
graph TB
    subgraph Client Layer
        WEB[🌐 Web App\nReact/Next.js]
        MOBILE[📱 Mobile App\nReact Native - Tuỳ chọn]
        SCANNER[📸 QR Scanner\nWeb Camera API]
    end

    subgraph API Gateway
        GW[⚙️ API Gateway\nNginx + Rate Limiting]
    end

    subgraph Backend Services
        AUTH[🔐 Auth Service\nJWT + OAuth2]
        PROD[📦 Product Service\nCRUD SP + Lô hàng]
        UID[🔑 UID Service\nUUID v4 + AES-256]
        VERIFY[✅ Verify Service\nXác thực QR]
        AI[🤖 AI Detection\nAnomaly Detection]
        NOTIF[🔔 Notification\nEmail + SMS]
        REPORT[📊 Report Service\nBáo cáo + Xuất file]
        COMPLY[⚖️ Compliance\nTrustCheck Engine]
    end

    subgraph Data Layer
        DB[(🗄️ PostgreSQL\nChính + Replica)]
        CACHE[(⚡ Redis\nCache + Session)]
        FILESTORE[(📁 Object Storage\nChứng từ + QR files)]
        QUEUE[(📨 Message Queue\nRabbitMQ / Kafka)]
    end

    subgraph External
        GS1[GS1 Registries API]
        GOVDB[Cơ sở dữ liệu Quốc gia]
        MAP[Maps API\nGPS Phân tích]
    end

    WEB --> GW
    MOBILE --> GW
    SCANNER --> GW

    GW --> AUTH
    GW --> PROD
    GW --> UID
    GW --> VERIFY
    GW --> REPORT
    GW --> COMPLY

    VERIFY --> AI
    AI --> QUEUE
    QUEUE --> NOTIF

    PROD --> DB
    UID --> DB
    VERIFY --> DB
    UID --> CACHE
    VERIFY --> CACHE
    PROD --> FILESTORE
    AUTH --> DB

    COMPLY --> GS1
    PROD --> GOVDB
    AI --> MAP
```

---

### 7. State Diagram – Trạng thái Mã Định danh (UID)

```mermaid
stateDiagram-v2
    [*] --> Generated : UID_GEN tạo mã

    Generated --> Active : In ấn & gắn lên sản phẩm
    Active --> Scanned : Người dùng quét lần đầu
    Scanned --> Active : Quét bình thường
    Scanned --> Flagged : AI phát hiện bất thường
    Flagged --> Fake : Xác nhận là hàng giả
    Flagged --> Active : Xác nhận không phải giả
    Active --> Expired : Quá hạn sử dụng sản phẩm
    Fake --> [*] : Vô hiệu hoá & lưu hồ sơ
    Expired --> [*] : Lưu trữ
```

---

## Kế hoạch kỹ thuật triển khai

### Tech Stack đề xuất

| Layer | Công nghệ |
|---|---|
| **Frontend** | Next.js 14 (App Router), TailwindCSS, ShadCN UI |
| **Backend** | Node.js (NestJS) hoặc Go (Gin) |
| **Database** | PostgreSQL (chính) + Redis (cache) |
| **QR Engine** | qrcode.js + pdfkit (xuất file) |
| **AI/ML** | Python FastAPI microservice (scikit-learn, isolation forest) |
| **Auth** | JWT + OAuth2 (Google, Zalo) |
| **Storage** | MinIO (self-hosted) hoặc AWS S3 |
| **Queue** | RabbitMQ hoặc BullMQ |
| **DevOps** | Docker + Nginx + GitHub Actions CI/CD |

### API Endpoints chính

```
POST   /api/auth/register          - Đăng ký doanh nghiệp
POST   /api/auth/login             - Đăng nhập
POST   /api/products               - Thêm sản phẩm
POST   /api/products/:id/batches   - Tạo lô hàng
POST   /api/batches/:id/generate   - Tạo UID hàng loạt
GET    /api/verify/:uid            - Xác thực QR (public)
GET    /api/dashboard              - Dashboard giám sát
GET    /api/alerts                 - Danh sách cảnh báo
PATCH  /api/alerts/:id             - Cập nhật trạng thái cảnh báo
GET    /api/reports/:type          - Xuất báo cáo
POST   /api/compliance/check       - Kiểm tra tuân thủ
```

---

## Câu hỏi mở (Cần xác nhận)

> [!IMPORTANT]
> **Ưu tiên phát triển**: Bắt đầu từ web portal hay mobile app trước?

> [!IMPORTANT]
> **Mô hình kinh doanh**: SaaS theo gói (số lượng sản phẩm/tháng) hay theo lượt quét? Điều này ảnh hưởng đến thiết kế billing module.

> [!WARNING]
> **Tích hợp GS1**: Cần tài khoản GS1 Việt Nam và phí thành viên. Có tích hợp không hay dùng UID nội bộ?

> [!NOTE]
> **AI Detection**: Giai đoạn đầu có thể dùng rule-based (threshold quét), AI vision cho giai đoạn sau. Có đồng ý không?
