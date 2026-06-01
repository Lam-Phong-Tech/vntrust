-- Profile expansion: thêm avatar + thông tin cá nhân chi tiết
-- Idempotent — chạy 2 lần OK (mỗi ALTER trong try/catch level transaction)

ALTER TABLE "NguoiDung" ADD COLUMN "avatar"   TEXT;
ALTER TABLE "NguoiDung" ADD COLUMN "diaChi"   TEXT;
ALTER TABLE "NguoiDung" ADD COLUMN "ngaySinh" DATETIME;
ALTER TABLE "NguoiDung" ADD COLUMN "gioiTinh" TEXT;
ALTER TABLE "NguoiDung" ADD COLUMN "cccd"     TEXT;

SELECT 'Migration complete' AS status;
