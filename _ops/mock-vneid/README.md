# Mock VNeID OAuth2 Server

Mô phỏng luồng đăng nhập VNeID cho VNTrust dev/test.
Triển khai trên VPS tại `/var/www/mock-vneid`, port 3011, PM2 name `mock-vneid`,
public qua nginx prefix `/_vneid/*` trên domain `anticounterfeit.test9.io.vn`.

## Luồng OAuth2

1. App gọi: `GET /_vneid/authorize?client_id=vntrust&redirect_uri=...&state=...&response_type=code`
2. User chọn 1 trong 5 danh tính mẫu → POST `/_vneid/authorize/select`
3. Server redirect về `redirect_uri?code=...&state=...`
4. App đổi code: `POST /_vneid/token` (form-urlencoded) → `{ access_token, token_type, expires_in }`
5. App lấy info: `GET /_vneid/userinfo` (Bearer) → `{ soDinhDanh, hoTen, ngaySinh, gioiTinh, queQuan, ... }`

## Cấu hình

| ENV | Default | Mô tả |
|---|---|---|
| `PORT` | 3011 | Cổng nghe local |
| `MOCK_VNEID_SECRET` | `mock-vneid-shared-secret-CHANGE-ME` | HS256 secret, share với VNTrust nếu muốn verify token ngoài |
| `MOCK_VNEID_ISSUER` | `https://anticounterfeit.test9.io.vn/_vneid` | iss claim trong JWT |
| `MOCK_VNEID_PREFIX` | `/_vneid` | Path prefix khi qua nginx |

## Client whitelist

Định nghĩa trong `server.js` (object `CLIENTS`). Hiện có:
- `vntrust` — secret `vntrust-client-secret-mock`, redirect_uri whitelist 3 URL (prod + 2 dev).

## 5 user mẫu

| Tên | CCCD | Ngày sinh | Quê quán |
|---|---|---|---|
| Nguyễn Văn An | 079092001234 | 15/03/1992 | Q.1, TP.HCM |
| Trần Thị Hương | 001098023456 | 22/07/1998 | Ba Đình, Hà Nội |
| Lê Minh Hoàng | 048085034567 | 03/11/1985 | Hải Châu, Đà Nẵng |
| Phạm Thu Trang | 092095045678 | 19/05/1995 | Ninh Kiều, Cần Thơ |
| Hoàng Đức Mạnh | 031090056789 | 08/12/1990 | Hồng Bàng, Hải Phòng |
