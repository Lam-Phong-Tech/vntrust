// POST /api/ai/checklist/run
// Chạy toàn bộ 3 tầng kiểm tra cho 1 UID, lưu kết quả vào VerificationChecklist
// Tầng 1: dữ liệu cơ bản | Tầng 2: logic nghiệp vụ | Tầng 3: AI Vision

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const COLOR: Record<string, string> = {
  dat: 'green', nghi_van: 'yellow', rui_ro_cao: 'orange',
  vi_pham: 'red', gia_mao: 'black', chua_du_lieu: 'blue',
};
const DIEM: Record<string, number> = {
  dat: 0, nghi_van: 15, rui_ro_cao: 30, vi_pham: 50, gia_mao: 80, chua_du_lieu: 5,
};

function item(hangMuc: string, tang: string, ketQua: keyof typeof COLOR, chiTiet?: object, aiModel?: string) {
  return { hangMuc, tangKiemTra: tang, ketQua, mauHienThi: COLOR[ketQua], diemRuiRo: DIEM[ketQua], chiTiet: chiTiet ? JSON.stringify(chiTiet) : null, aiModel: aiModel ?? 'rule', tuDong: true };
}

export async function POST(req: NextRequest) {
  try {
    const { uid, canhBaoId, loHangId, giaBan, lat, lng } = await req.json();
    if (!uid) return NextResponse.json({ error: 'Thiếu uid' }, { status: 400 });

    const results: ReturnType<typeof item>[] = [];

    // ── TẦNG 1: Dữ liệu cơ bản ───────────────────────────────────────────
    const ma = await prisma.maDinhDanh.findFirst({
      where: { OR: [{ uid }, { serialNumber: uid }] },
      include: {
        loHang: {
          include: {
            sanPham: { include: { doanhNghiep: true, chungNhans: true } },
          },
        },
      },
    });

    // 1a. QR/UID tồn tại
    results.push(item('QR / Mã định danh', 'tang1_data',
      ma ? 'dat' : 'gia_mao',
      { uid, found: !!ma }, 'rule'));

    if (ma) {
      const sp  = ma.loHang?.sanPham;
      const dn  = sp?.doanhNghiep;
      const loH = ma.loHang;

      // 1b. Mã doanh nghiệp
      results.push(item('Mã doanh nghiệp', 'tang1_data',
        dn ? 'dat' : 'chua_du_lieu',
        { maDN: dn?.maSoThue }, 'rule'));

      // 1c. Chứng nhận còn hiệu lực
      const cnConHieuLuc = sp?.chungNhans?.some(c => !c.ngayHetHan || new Date(c.ngayHetHan) > new Date());
      results.push(item('Chứng nhận còn hiệu lực', 'tang1_data',
        sp?.chungNhans?.length ? (cnConHieuLuc ? 'dat' : 'vi_pham') : 'chua_du_lieu',
        { total: sp?.chungNhans?.length ?? 0, conHieuLuc: cnConHieuLuc }, 'rule'));

      // 1d. NSX / HSD cơ bản (từ loHang)
      const hsd = (loH as any)?.hanSuDung;
      const expired = hsd ? new Date(hsd) < new Date() : false;
      results.push(item('Hạn sử dụng', 'tang1_data',
        !hsd ? 'chua_du_lieu' : expired ? 'vi_pham' : 'dat',
        { hanSuDung: hsd, expired }, 'rule'));

      // ── TẦNG 2: Logic nghiệp vụ ──────────────────────────────────────
      // 2a. Kiểm tra giá bán
      const giaNiemYet = (sp as any)?.giaNiemYet;
      const giaSan     = (sp as any)?.giaSan;
      if (giaBan && giaNiemYet) {
        const ratio = giaBan / giaNiemYet;
        results.push(item('Giá bán so với niêm yết', 'tang2_logic',
          ratio < 0.60 ? 'vi_pham' : ratio < 0.75 ? 'rui_ro_cao' : ratio < 0.90 ? 'nghi_van' : 'dat',
          { giaBan, giaNiemYet, giaSan, ratio: ratio.toFixed(2) }, 'price_rule'));
      } else {
        results.push(item('Giá bán so với niêm yết', 'tang2_logic', 'chua_du_lieu', { giaBan, giaNiemYet }));
      }

      // 2b. GPS vs vùng phân phối
      const khuVuc = (loH as any)?.khuVucPhanPhoi;
      if (lat && lng && khuVuc) {
        results.push(item('GPS vs vùng phân phối', 'tang2_logic', 'nghi_van',
          { lat, lng, khuVucPhanPhoi: khuVuc, note: 'Cần gọi /api/ai/geo-validate để xác nhận' }, 'haversine'));
      } else {
        results.push(item('GPS vs vùng phân phối', 'tang2_logic', 'chua_du_lieu', { lat, lng, khuVuc }));
      }

      // 2c. Số lần quét
      const scanCount = await prisma.luotQuet.count({ where: { uid } });
      const provinces = await prisma.luotQuet.findMany({
        where: { uid, thoiGian: { gte: new Date(Date.now() - 3600000) } },
        select: { diaChi_IP: true },
      });
      const uniqueIPs = new Set(provinces.map(p => p.diaChi_IP?.split('.').slice(0, 2).join('.'))).size;
      results.push(item('QR Clone / Quét nhiều nơi', 'tang2_logic',
        uniqueIPs > 3 ? 'vi_pham' : uniqueIPs > 1 ? 'nghi_van' : 'dat',
        { totalScans: scanCount, uniqueIPPrefixes: uniqueIPs, trong1Gio: provinces.length }, 'clone_detect'));

      // ── TẦNG 3: AI Vision ─────────────────────────────────────────────
      // 3a. Packaging compare (gọi nội bộ — placeholder nếu không có ảnh)
      const hasRefImg = !!(sp as any)?.anhMatTruocUrl || !!(sp as any)?.hinhAnhUrl;
      results.push(item('So sánh bao bì (Packaging AI)', 'tang3_ai_vision',
        hasRefImg ? 'nghi_van' : 'chua_du_lieu',
        { hasReferenceImage: hasRefImg, note: 'Cần upload ảnh qua /api/ai/packaging-compare' }, 'mobilenet+histogram'));

      // 3b. Logo detection
      results.push(item('Logo thương hiệu', 'tang3_ai_vision', 'chua_du_lieu',
        { note: 'Cần ảnh từ NTD — gọi /api/ai/logo-detect' }, 'levenshtein'));

      // 3c. Expiry AI
      results.push(item('Đọc NSX/HSD từ ảnh (OCR AI)', 'tang3_ai_vision', 'chua_du_lieu',
        { note: 'Cần ảnh NSX/HSD từ NTD — gọi /api/ai/expiry' }, 'tesseract'));
    }

    // Tính tổng điểm rủi ro
    const tongDiem = Math.min(results.reduce((s, r) => s + r.diemRuiRo, 0), 100);
    const mucDo = tongDiem >= 81 ? 'confirmed_fake' : tongDiem >= 61 ? 'high' : tongDiem >= 41 ? 'medium' : tongDiem >= 21 ? 'monitor' : 'low';

    // Lưu checklist vào DB
    await prisma.verificationChecklist.deleteMany({ where: { uid, tuDong: true } });
    await prisma.verificationChecklist.createMany({
      data: results.map(r => ({ ...r, uid, canhBaoId: canhBaoId ?? null, loHangId: loHangId ?? null })),
    });

    return NextResponse.json({ uid, tongDiem, mucDo, totalItems: results.length, checklist: results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
