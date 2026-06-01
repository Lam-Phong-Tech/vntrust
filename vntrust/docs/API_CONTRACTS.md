# TÀI LIỆU GIAO TIẾP API (API CONTRACTS)

## 1. Authentication (Xác thực)

### 1.1 POST `/api/auth/login`
- **Mô tả:** Đăng nhập hệ thống, trả về Token qua Cookie.
- **Request Body:**
```json
{
  "email": "nsx@vntrust.vn",
  "matKhau": "password123"
}
```
- **Response (200 OK):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "nsx@vntrust.vn",
    "vaiTro": "manufacturer",
    "doanhNghiepId": "dn_uuid"
  }
}
```

## 2. Supply Chain & Inventory

### 2.1 GET `/api/inventory`
- **Mô tả:** Lấy danh sách sản phẩm và lô hàng của doanh nghiệp.
- **Auth Requirement:** Role `manufacturer` hoặc `importer`.
- **Response (200 OK):**
```json
{
  "products": [
    {
      "id": "uuid",
      "maSKU": "SKU001",
      "ten": "Sữa bột trẻ em",
      "loHangs": [
        {
          "maLo": "LOT2401",
          "soLuong": 1000,
          "trangThai": "active"
        }
      ]
    }
  ]
}
```

### 2.2 POST `/api/inventory`
- **Mô tả:** Tạo mới sản phẩm hoặc lô hàng.
- **Request Body (Tạo sản phẩm):**
```json
{
  "action": "create_product",
  "maSKU": "SKU002",
  "ten": "Kem dưỡng da",
  "nhomSanPham": "Mỹ phẩm"
}
```

## 3. Verify & TrustCheck (Người tiêu dùng)

### 3.1 GET `/api/verify/[uid]`
- **Mô tả:** Người dùng quét mã QR, hệ thống trả về thông tin xác thực.
- **Auth Requirement:** Không yêu cầu (Public).
- **Response (200 OK):**
```json
{
  "status": "genuine",
  "product": {
    "ten": "Sữa Vinamilk",
    "nhomSanPham": "Thực phẩm"
  },
  "batch": {
    "maLo": "LOT24",
    "ngaySanXuat": "2024-01-01",
    "hanDung": "2025-01-01"
  },
  "manufacturer": {
    "ten": "Vinamilk",
    "trangThai": "verified"
  }
}
```

### 3.2 POST `/api/report`
- **Mô tả:** Gửi báo cáo hàng giả/bất thường từ người tiêu dùng.
- **Auth Requirement:** Không yêu cầu (Public).
- **Request Body:**
```json
{
  "uid": "uuid-nghi-ngo",
  "loaiBaoCao": "Hàng giả",
  "moTa": "Tem bị rách và màu nhạt",
  "hinhAnhUrl": "https://img..."
}
```

## 4. Compliance & KYC (Quản trị & Doanh nghiệp)

### 4.1 GET `/api/kyc`
- **Mô tả:** Lấy thông tin KYC. Admin xem toàn bộ, DN xem của chính mình.
- **Auth Requirement:** Bắt buộc.

### 4.2 PATCH `/api/kyc`
- **Mô tả:** Admin duyệt KYC hoặc DN cập nhật hồ sơ.
- **Request Body (Admin duyệt):**
```json
{
  "action": "admin_approval",
  "id": "dn_uuid",
  "trangThai": "verified",
  "lyDo": "Đủ hồ sơ"
}
```
