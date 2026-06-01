# CƠ SỞ DỮ LIỆU VNTRUST (DATABASE DESIGN)

## 1. Sơ Đồ Quan Hệ (Entity Relationship Diagram)
- **DoanhNghiep** (1 - N) **SanPham**
- **DoanhNghiep** (1 - N) **NguoiDung**
- **SanPham** (1 - N) **LoHang**
- **SanPham** (1 - N) **ChungNhan**
- **LoHang** (1 - N) **MaDinhDanh** (UID)
- **LoHang** (1 - N) **KhoHang** (Nhập/Xuất kho)
- **MaDinhDanh** (1 - N) **LuotQuet**

## 2. Chi Tiết Các Bảng Dữ Liệu (Tables)

### 2.1. DoanhNghiep (Quản lý hồ sơ doanh nghiệp)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | String | PK, UUID | Khóa chính |
| `maSoThue` | String | Unique | Mã số thuế (MST) |
| `ten` | String | Not Null | Tên doanh nghiệp đầy đủ |
| `nganh_VSIC` | String | Nullable | Ngành nghề kinh doanh |
| `loai` | String | Not Null | `NSX` (Nhà sản xuất) hoặc `NNK` (Nhà nhập khẩu) |
| `trangThai` | String | Default: `pending` | Trạng thái KYC: `pending`, `verified`, `suspended` |
| `giayphep_url` | String | Nullable | Link ảnh giấy phép kinh doanh |

### 2.2. SanPham (Danh mục sản phẩm)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | String | PK, UUID | Khóa chính |
| `maSKU` | String | Unique | Mã SKU nội bộ của sản phẩm |
| `ten` | String | Not Null | Tên sản phẩm |
| `thanhPhan` | String | Nullable | FR-PRD-01: Thành phần sản phẩm |
| `nhomSanPham` | String | Nullable | Thực phẩm / Dược phẩm / Mỹ phẩm |
| `doanhNghiepId` | String | FK | Liên kết tới bảng `DoanhNghiep` |

### 2.3. LoHang (Quản lý lô sản xuất & hạn dùng)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | String | PK, UUID | Khóa chính |
| `maLo` | String | Unique | Batch number |
| `ngaySanXuat` | DateTime | Not Null | MFG Date |
| `hanDung` | DateTime | Not Null | EXP Date |
| `sanPhamId` | String | FK | Thuộc sản phẩm nào |

### 2.4. KhoHang (Lịch sử nhập / xuất kho)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | String | PK, UUID | Khóa chính |
| `loaiGD` | String | Not Null | `NHAP_KHO`, `XUAT_KHO`, `CHUYEN_KHO` |
| `soLuong` | Int | Not Null | Số lượng hàng hóa giao dịch |
| `viTri` | String | Nullable | Địa chỉ kho hàng / GPS |
| `loHangId` | String | FK | Liên kết với bảng `LoHang` |

### 2.5. MaDinhDanh (UID / Mã QR)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `uid` | String | PK, UUIDv4 | Khóa chính, mã định danh duy nhất |
| `qrCodeUrl` | String | Nullable | Link hình ảnh mã QR |
| `trangThai` | String | Default: `active`| Trạng thái mã: `active`, `flagged`, `fake` |
| `loHangId` | String | FK | Lô hàng chứa mã này |

### 2.6. LuotQuet (Lịch sử quét mã từ người tiêu dùng)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | String | PK, UUID | Khóa chính |
| `uid` | String | FK | Thuộc mã UID nào |
| `diaChi_IP` | String | Nullable | IP của người dùng để phân tích địa lý |
| `ketQua` | String | Not Null | Kết quả quét: `genuine`, `suspect`, `fake` |

### 2.7. ChungNhan (Quản lý chứng chỉ chất lượng)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | String | PK, UUID | Khóa chính |
| `loai` | String | Not Null | Loại chứng nhận: ISO, HACCP, GMP, CFS... |
| `ngayHetHan` | DateTime | Not Null | Ngày hết hạn để hệ thống cảnh báo |
| `trangThaiDuyet` | String | Default: `pending` | Admin kiểm duyệt chứng nhận |

### 2.8. KetQuaHauKiem (Hậu kiểm sản phẩm)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | String | PK, UUID | Khóa chính |
| `doiTuongLayMau`| String | Not Null | Nguồn hậu kiểm: `doanhnghiep`, `nguoitieudung` |
| `ketQua` | String | Not Null | `dambao` hoặc `khongdambao` |
| `chiTieuVuotNguong`| String | Nullable | Các chất cấm hoặc chỉ tiêu vượt quá mức |

## 3. Quy Tắc Migration (Migration Rules)
- Luôn tạo migration file thông qua Prisma: `npx prisma migrate dev --name <migration_name>`
- Không can thiệp trực tiếp vào file `.db` trên server production để đảm bảo tính nhất quán (Consistency).
- Khi thêm cột mới, nếu là bảng đã có dữ liệu thì cột đó phải là `Nullable (?)` hoặc có giá trị `@default`.
