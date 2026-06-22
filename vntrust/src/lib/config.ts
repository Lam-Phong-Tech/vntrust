// Đọc cấu hình hệ thống (CauHinhHeThong) ở server. Trả default nếu chưa set / không hợp lệ.
// Dùng để ngưỡng admin chỉnh ở trang Cấu hình hệ thống thực sự CÓ TÁC DỤNG (#27).
import { prisma } from '@/lib/prisma';

export async function getConfigInt(key: string, def: number): Promise<number> {
  try {
    const c = await prisma.cauHinhHeThong.findUnique({ where: { key } });
    if (!c) return def;
    const n = parseInt(c.value, 10);
    return Number.isFinite(n) && n > 0 ? n : def;
  } catch {
    return def;
  }
}
