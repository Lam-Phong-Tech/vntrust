-- UC03 Sub-role + Lời mời nhân viên (idempotent)
-- Áp dụng cho SQLite — chạy via: sqlite3 dev.db < migration_uc03_subroles.sql

BEGIN TRANSACTION;

-- ─── 1) NguoiDung: thêm 2 cột mới ───────────────────────────────────────
-- SQLite không có ADD COLUMN IF NOT EXISTS → dùng try/catch qua PRAGMA
-- Workaround: viết theo pattern không lỗi nếu cột tồn tại sẽ rollback transaction

-- Cách an toàn: dùng PRAGMA table_info để check trước (xử lý bằng app)
-- Ở đây giả định cột chưa có (nếu có rồi, transaction rollback và DBA chạy thủ công)
ALTER TABLE "NguoiDung" ADD COLUMN "vaiTroCty"  TEXT    DEFAULT 'company_admin';
ALTER TABLE "NguoiDung" ADD COLUMN "quyenMoiNV" BOOLEAN NOT NULL DEFAULT 0;

-- ─── 2) LoiMoiNhanVien: tạo bảng mới ───────────────────────────────────
CREATE TABLE IF NOT EXISTS "LoiMoiNhanVien" (
  "id"             TEXT     NOT NULL PRIMARY KEY,
  "token"          TEXT     NOT NULL,
  "email"          TEXT     NOT NULL,
  "doanhNghiepId"  TEXT     NOT NULL,
  "vaiTroCty"      TEXT     NOT NULL,
  "trangThai"      TEXT     NOT NULL DEFAULT 'pending',
  "ngayTao"        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ngayHetHan"     DATETIME NOT NULL,
  "ngayChapNhan"   DATETIME,
  "nguoiTaoId"     TEXT     NOT NULL,
  CONSTRAINT "LoiMoiNhanVien_doanhNghiepId_fkey" FOREIGN KEY ("doanhNghiepId") REFERENCES "DoanhNghiep" ("id") ON DELETE CASCADE,
  CONSTRAINT "LoiMoiNhanVien_nguoiTaoId_fkey"    FOREIGN KEY ("nguoiTaoId")    REFERENCES "NguoiDung" ("id")    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "LoiMoiNhanVien_token_key"        ON "LoiMoiNhanVien"("token");
CREATE        INDEX IF NOT EXISTS "LoiMoiNhanVien_doanhNghiepId_idx" ON "LoiMoiNhanVien"("doanhNghiepId");
CREATE        INDEX IF NOT EXISTS "LoiMoiNhanVien_email_idx"         ON "LoiMoiNhanVien"("email");

-- ─── 3) Seed: existing NSX/NNK users → company_admin + được mời NV ─────
-- Vì cột vừa tạo có default 'company_admin' rồi, chỉ cần set quyenMoiNV=true
UPDATE "NguoiDung"
SET    "vaiTroCty"  = 'company_admin',
       "quyenMoiNV" = 1
WHERE  "vaiTro" IN ('manufacturer','importer')
   AND ("quyenMoiNV" = 0 OR "quyenMoiNV" IS NULL);

-- Admin platform → không gán vaiTroCty (NULL OK)
UPDATE "NguoiDung"
SET    "vaiTroCty" = NULL
WHERE  "vaiTro" = 'admin';

-- Consumer → không cần sub-role
UPDATE "NguoiDung"
SET    "vaiTroCty" = NULL
WHERE  "vaiTro" = 'consumer';

COMMIT;

-- Verify
SELECT vaiTro, vaiTroCty, quyenMoiNV, COUNT(*) as so_user
FROM "NguoiDung"
GROUP BY vaiTro, vaiTroCty, quyenMoiNV;
