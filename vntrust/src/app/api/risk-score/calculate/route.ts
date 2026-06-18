import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// POST /api/risk-score/calculate
// Nhận uid + metadata → trả về điểm rủi ro AI và chi tiết từng luật đã kích hoạt
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      uid,
      tinhTrangSP,
      lat,
      lng,
      deviceId,
      kenhMua,
      anhNSXHSDUrl,
      giaMua,
    } = body;

    // Lấy tất cả luật đang active từ DB (admin có thể cấu hình)
    const rules = await prisma.riskScoringRule.findMany({
      where: { trangThai: 'active' },
      orderBy: { diemCong: 'desc' },
    });

    let riskScore = 0;
    const riskDetail: {
      luat: string;
      dieuKien: string;
      diem: number;
      lydo: string;
    }[] = [];

    for (const rule of rules) {
      let triggered = false;
      let lydo = '';

      switch (rule.dieuKien) {
        case 'qr_not_found': {
          // Kiểm tra UID có tồn tại trong DB không
          const exists = uid
            ? await prisma.maDinhDanh.findFirst({ where: { uid } })
            : null;
          if (!uid || !exists) {
            triggered = true;
            lydo = uid ? `UID ${uid} không tồn tại trong CSDL` : 'Không cung cấp UID/QR';
          }
          break;
        }
        case 'hsd_invalid':
          if (tinhTrangSP === 'bat_thuong' || (anhNSXHSDUrl && tinhTrangSP === 'hu_hong')) {
            triggered = true;
            lydo = 'Tình trạng NSX/HSD bất thường';
          }
          break;
        case 'bao_bi_khac':
          if (['hu_hong', 'bat_thuong'].includes(tinhTrangSP)) {
            triggered = true;
            lydo = `Bao bì: ${tinhTrangSP}`;
          }
          break;
        case 'gps_bat_thuong':
          if (!lat || !lng) {
            triggered = true;
            lydo = 'Thiếu tọa độ GPS — không xác thực được vị trí mua hàng';
          }
          break;
        case 'upload_hang_loat':
          if (deviceId) {
            // Đếm báo cáo trong 1 giờ qua (tất cả nguồn)
            const recentCount = await prisma.canhBao.count({
              where: { thoiGian: { gte: new Date(Date.now() - 3_600_000) } },
            });
            if (recentCount > 10) {
              triggered = true;
              lydo = `Phát hiện ${recentCount} báo cáo trong 1 giờ — dấu hiệu flood`;
            }
          }
          break;
        case 'khong_co_tem':
          if (tinhTrangSP === 'khong_co_tem') {
            triggered = true;
            lydo = 'Sản phẩm không có tem chống giả';
          }
          break;
        case 'gia_bat_thuong':
          if (tinhTrangSP === 'gia_bat_thuong' || (typeof giaMua === 'number' && giaMua < 1000)) {
            triggered = true;
            lydo = `Giá mua bất thường: ${giaMua ? giaMua + ' VNĐ' : 'không rõ'}`;
          }
          break;
      }

      if (triggered) {
        riskScore += rule.diemCong;
        riskDetail.push({
          luat:      rule.tenLuat,
          dieuKien:  rule.dieuKien,
          diem:      rule.diemCong,
          lydo,
        });
      }
    }

    riskScore = Math.min(riskScore, 100);
    const mucDo = riskScore >= 81 ? 'confirmed_fake' : riskScore >= 61 ? 'high' : riskScore >= 41 ? 'medium' : riskScore >= 21 ? 'monitor' : 'low';

    // Kết luận dựa trên điểm
    const ketLuan =
      riskScore >= 70
        ? 'Rủi ro CAO — Đề nghị không sử dụng và báo cáo ngay'
        : riskScore >= 40
        ? 'Rủi ro TRUNG BÌNH — Cần xác minh thêm'
        : 'Rủi ro THẤP — Sản phẩm có vẻ an toàn';

    return NextResponse.json({
      riskScore,
      mucDo,
      ketLuan,
      riskDetail,
      totalRules: rules.length,
      triggeredRules: riskDetail.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET /api/risk-score/calculate — Trả về danh sách luật đang active (để hiển thị cho admin)
export async function GET(req: NextRequest) {
  try {
    const rules = await prisma.riskScoringRule.findMany({
      orderBy: [{ trangThai: 'asc' }, { diemCong: 'desc' }],
    });
    return NextResponse.json({ rules });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
