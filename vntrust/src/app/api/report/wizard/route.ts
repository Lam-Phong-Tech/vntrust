import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// POST /api/report/wizard
// Tiếp nhận báo cáo đa bước từ Wizard: kênh mua + tình trạng + 5 ảnh + metadata GPS
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const body = await req.json();

    const {
      uid,          // UID / serial sản phẩm
      kenhMua,      // cho | sieu_thi | tap_hoa | tmdt | livestream | khong_ro
      tinhTrangSP,  // string or pipe-separated list
      tinhTrangKhac,
      giaMua,       // Giá mua thực tế
      moTa,         // Mô tả chi tiết
      cheDoAnDanh,  // an_danh | co_lien_he | cong_khai
      // 5 ảnh bắt buộc theo Mục 10
      anhMatTruocUrl,
      anhMatSauUrl,
      anhTemUrl,
      anhNSXHSDUrl,
      anhBarcodeUrl,
      // Metadata GPS + device
      lat, lng,
      deviceId,
      networkFingerprint,
      exifData,
      barcodeRaw,
    } = body;

    const ALLOWED_KENH = ['cho', 'sieu_thi', 'tap_hoa', 'tmdt', 'livestream', 'khong_ro'];
    const ALLOWED_TINH_TRANG = ['nguyen_seal', 'mo_hop', 'hu_hong', 'bat_thuong', 'khong_co_tem', 'gia_bat_thuong'];
    const rawStatuses = Array.isArray(tinhTrangSP)
      ? tinhTrangSP
      : typeof tinhTrangSP === 'string'
        ? tinhTrangSP.split('|')
        : [];
    const normalizedStatuses = rawStatuses
      .map((item: unknown) => String(item || '').trim())
      .filter(Boolean);
    const allowedStatuses = normalizedStatuses.filter(item => ALLOWED_TINH_TRANG.includes(item));
    const otherStatuses = [
      ...normalizedStatuses.filter(item => item.startsWith('khac:')).map(item => item.slice(5).trim()).filter(Boolean),
      ...(typeof tinhTrangKhac === 'string' && tinhTrangKhac.trim() ? [tinhTrangKhac.trim()] : []),
    ];
    const hasStatus = (status: string) => allowedStatuses.includes(status);
    const tinhTrangStored = [
      ...allowedStatuses,
      ...otherStatuses.map(item => `khac:${item.slice(0, 300)}`),
    ].join('|') || null;

    if (!moTa && !anhMatTruocUrl) {
      return NextResponse.json({ error: 'Vui lòng mô tả vấn đề hoặc cung cấp ảnh sản phẩm' }, { status: 400 });
    }

    // ── Tính Risk Score tự động dựa trên RiskScoringRule ──────────────────
    const rules = await prisma.riskScoringRule.findMany({ where: { trangThai: 'active' } });
    let riskScore = 0;
    const riskDetail: { luat: string; diem: number; lydo: string }[] = [];

    for (const rule of rules) {
      let triggered = false;
      let lydo = '';
      switch (rule.dieuKien) {
        case 'qr_not_found':
          if (!uid) { triggered = true; lydo = 'Không có UID/QR sản phẩm'; }
          break;
        case 'hsd_invalid':
          if (anhNSXHSDUrl && hasStatus('bat_thuong')) { triggered = true; lydo = 'NSX/HSD bất thường'; }
          break;
        case 'bao_bi_khac':
          if (hasStatus('hu_hong') || hasStatus('bat_thuong')) { triggered = true; lydo = 'Bao bì có dấu hiệu bất thường'; }
          break;
        case 'gps_bat_thuong':
          if (!lat || !lng) { triggered = true; lydo = 'Không có GPS xác thực vị trí'; }
          break;
        case 'upload_hang_loat':
          if (deviceId) {
            const recentCount = await prisma.canhBao.count({
              where: { thoiGian: { gte: new Date(Date.now() - 3600000) } }
            });
            if (recentCount > 10) { triggered = true; lydo = 'Upload hàng loạt từ thiết bị này'; }
          }
          break;
        case 'khong_co_tem':
          if (hasStatus('khong_co_tem')) { triggered = true; lydo = 'Sản phẩm không có tem chống giả'; }
          break;
      }
      if (triggered) {
        riskScore += rule.diemCong;
        riskDetail.push({ luat: rule.tenLuat, diem: rule.diemCong, lydo });
      }
    }
    riskScore = Math.min(riskScore, 100);

    // ── Tạo mã hồ sơ CASE ────────────────────────────────────────────────
    const year = new Date().getFullYear();
    const caseNum = randomUUID().substring(0, 6).toUpperCase();
    const maCaseHoSo = `CASE-${year}-${caseNum}`;

    // ── Lưu CanhBao ──────────────────────────────────────────────────────
    const cookieStore = await cookies();
    const userName = cookieStore.get('userName')?.value || null;

    const mucDo = riskScore >= 81 ? 'confirmed_fake' : riskScore >= 61 ? 'high' : riskScore >= 41 ? 'medium' : riskScore >= 21 ? 'monitor' : 'low';

    // ── Workflow Routing (Mục 13) ────────────────────────────────────────
    let trangThaiDieuTra = 'cho_phan_tich';
    let trangThai = 'open';
    let ketLuanMoTa = moTa || `Bao cao tu wizard: ${tinhTrangStored || 'Khong ro'}`;

    if (riskScore < 40) {
      trangThaiDieuTra = 'dong';
      trangThai = 'closed';
      ketLuanMoTa += '\n\n[AUTO PASS] Hệ thống tự động thông qua do rủi ro thấp.';
    } else if (riskScore > 70) {
      trangThaiDieuTra = 'dang_dieu_tra';
    }

    const canhBao = await prisma.canhBao.create({
      data: {
        loai: 'WIZARD_REPORT',
        mucDo,
        moTa: ketLuanMoTa,
        uid: uid || null,
        trangThai,
        nguoiBaoCao: userName,
        loaiPhanAnh: 'san_pham',
        noiMua: ALLOWED_KENH.includes(kenhMua) ? kenhMua : null,
        giaMua: typeof giaMua === 'number' && giaMua > 0 ? giaMua : null,
        cheDoAnDanh: cheDoAnDanh || 'an_danh',
        tinhTrangSP: tinhTrangStored,
        anhMatTruocUrl: anhMatTruocUrl || null,
        anhMatSauUrl:   anhMatSauUrl || null,
        anhTemUrl:      anhTemUrl || null,
        anhNSXHSDUrl:   anhNSXHSDUrl || null,
        anhBarcodeUrl:  anhBarcodeUrl || null,
        riskScore,
        riskDetail: JSON.stringify(riskDetail),
        maCaseHoSo,
        trangThaiDieuTra,
      }
    });

    // ── Gửi Thông báo cho cán bộ điều tra nếu cần review ──────────────────
    if (riskScore >= 40) {
      const isField = riskScore > 70;
      await prisma.thongBao.create({
        data: {
          tieuDe: isField ? `🔴 [CẦN ĐIỀU TRA THỰC ĐỊA] Hồ sơ ${maCaseHoSo}` : `🟡 [CẦN REVIEW] Hồ sơ ${maCaseHoSo}`,
          noiDung: `Phát hiện rủi ro điểm ${riskScore}/100. Yêu cầu cán bộ ${isField ? 'xuống hiện trường xác minh' : 'kiểm tra nhân công'}.`,
          loai: 'alert',
          roleTarget: 'investigator',
        }
      });
    }

    // ── Ghi LichSuKiemTra ────────────────────────────────────────────────
    const nguoiDungId = cookieStore.get('userId')?.value || null;
    const sessionRef  = cookieStore.get('sessionToken')?.value || null;

    await prisma.lichSuKiemTra.create({
      data: {
        nguoiDungId,
        sessionRef,
        loaiHanhDong: 'bao_cao',
        uid: uid || null,
        ketQua: riskScore >= 70 ? 'warning' : 'unknown',
        riskScore,
        canhBaoId: canhBao.id,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
      }
    });

    // ── Ghi LuotQuet nếu có UID ──────────────────────────────────────────
    if (uid) {
      const maDinhDanh = await prisma.maDinhDanh.findFirst({ where: { uid } });
      if (maDinhDanh) {
        await prisma.luotQuet.create({
          data: {
            uid,
            ketQua: 'suspect',
            diaChi_IP: ip,
            lat: lat ? parseFloat(lat) : null,
            lng: lng ? parseFloat(lng) : null,
            kenhMua: ALLOWED_KENH.includes(kenhMua) ? kenhMua : null,
            deviceId: deviceId || null,
            networkFingerprint: networkFingerprint || null,
            exifData: exifData ? JSON.stringify(exifData) : null,
            barcodeRaw: barcodeRaw || null,
          }
        });
      }
    }

    // ── Log NhatKy ───────────────────────────────────────────────────────
    await prisma.nhatKy.create({
      data: {
        action: `Wizard báo cáo: ${maCaseHoSo} | UID: ${uid || 'N/A'} | Risk: ${riskScore}/100`,
        user: userName || `Anonymous [${ip.substring(0, 8)}***]`,
        role: 'consumer',
        ip,
        status: riskScore >= 70 ? 'error' : 'warning',
      }
    });

    return NextResponse.json({
      success: true,
      maCaseHoSo,
      riskScore,
      riskDetail,
      mucDo,
      canhBaoId: canhBao.id,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
