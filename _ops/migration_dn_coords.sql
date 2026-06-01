-- Phase 3: DoanhNghiep cache lat/lng từ diaChi (geocode via VietMap)
ALTER TABLE "DoanhNghiep" ADD COLUMN "lat" REAL;
ALTER TABLE "DoanhNghiep" ADD COLUMN "lng" REAL;

SELECT 'Migration complete' AS status;
