import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// §V Sprint 7: wire webhook + in-app push notifications
import { triggerWebhook } from '@/lib/webhook';
// §V.4 Sprint 9: configurable thresholds per DN
import { getLifecycleConfig, getExpWarnDaysForProduct, DEFAULT_LIFECYCLE_CONFIG } from '@/lib/lifecycleConfig';

// Helper: tạo ThongBao push notification cho doanh nghiệp
async function pushNotify(
  doanhNghiepId: string | null | undefined,
  tieuDe: string,
  noiDung: string,
  loai: 'alert' | 'system' = 'alert'
) {
  if (!doanhNghiepId) return;
  try {
    await prisma.thongBao.create({
      data: { tieuDe, noiDung, loai, doanhNghiepId, daDoc: false },
    });
  } catch { /* ignore */ }
}

export async function GET(req: NextRequest) {
  try {
    // Bảo mật API cron bằng secret key (thực tế sẽ được gọi từ Vercel Cron hoặc Linux Crontab)
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');
    if (secret !== 'vntrust-cron-key') {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    let generatedAlerts = 0;
    let triggeredWebhooks = 0;
    let pushedNotifications = 0;

    // 1. LỚP 1: QUÉT CHỨNG NHẬN — DN-configurable thresholds (§V.4 Sprint 9)
    const chungNhans = await prisma.chungNhan.findMany({
      include: { sanPham: { select: { doanhNghiepId: true } } },
    });
    // Cache config per DN to avoid N+1 queries
    const dnConfigCache = new Map<string, Awaited<ReturnType<typeof getLifecycleConfig>>>();
    async function configFor(dnId: string | null | undefined) {
      if (!dnId) return DEFAULT_LIFECYCLE_CONFIG;
      if (!dnConfigCache.has(dnId)) dnConfigCache.set(dnId, await getLifecycleConfig(dnId));
      return dnConfigCache.get(dnId)!;
    }
    for (const cn of chungNhans) {
      const daysLeft = Math.ceil((cn.ngayHetHan.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const dnId = cn.sanPham?.doanhNghiepId;
      const cfg = await configFor(dnId);

      let mucDo = null;
      let moTa = '';
      let webhookEvent: 'cert.expire' | 'cert.expiring_soon' | null = null;

      if (daysLeft < 0) {
        mucDo = 'high';
        moTa = `Chứng nhận ${cn.loai} (${cn.soChungNhan}) đã HẾT HẠN từ ${Math.abs(daysLeft)} ngày trước. Đề nghị xử lý khẩn cấp!`;
        webhookEvent = 'cert.expire';
      } else if (daysLeft <= cfg.certCriticalDays) {
        mucDo = 'medium';
        moTa = `Chứng nhận ${cn.loai} (${cn.soChungNhan}) SẮP HẾT HẠN trong ${daysLeft} ngày tới. Cần gia hạn ngay.`;
        webhookEvent = 'cert.expiring_soon';
      } else if (daysLeft <= cfg.certWarnDays) {
        mucDo = 'low';
        moTa = `Chứng nhận ${cn.loai} (${cn.soChungNhan}) sắp hết hạn trong vòng ${cfg.certWarnDays} ngày (${daysLeft} ngày).`;
        webhookEvent = 'cert.expiring_soon';
      }

      if (mucDo) {
        const alertUid = `CN-${cn.id}`;
        // Kiểm tra tránh duplicate alert (nếu alert cùng mức độ đang open)
        const existing = await prisma.canhBao.findFirst({
          where: { uid: alertUid, trangThai: 'open', mucDo: mucDo }
        });

        if (!existing) {
          await prisma.canhBao.create({
            data: { loai: 'HET_HAN_CHUNG_NHAN', mucDo, moTa, uid: alertUid, trangThai: 'open' }
          });
          generatedAlerts++;

          // §V kênh thông báo: Webhook → ERP của doanh nghiệp
          if (dnId && webhookEvent) {
            triggerWebhook(webhookEvent, dnId, {
              certId: cn.id, loai: cn.loai, soChungNhan: cn.soChungNhan,
              ngayHetHan: cn.ngayHetHan.toISOString(), daysLeft, mucDo,
            }).then(() => { triggeredWebhooks++; }).catch(() => {});
          }

          // §V kênh thông báo: In-app push (ThongBao) cho high/medium alerts
          if (dnId && (mucDo === 'high' || mucDo === 'medium')) {
            await pushNotify(dnId,
              mucDo === 'high' ? '⚠️ Chứng nhận đã HẾT HẠN' : '⏰ Chứng nhận sắp hết hạn',
              moTa,
              'alert',
            );
            pushedNotifications++;
          }
        }
      }
    }

    // 2. LỚP 2: QUÉT HẠN SỬ DỤNG LÔ HÀNG (EXP) — DN-configurable + per-nganhHang override
    const loHangs = await prisma.loHang.findMany({
      where: { trangThai: { not: 'recalled' } },
      include: { sanPham: { select: { doanhNghiepId: true, ten: true, nhomSanPham: true } } },
    });
    for (const lo of loHangs) {
      const daysLeft = Math.ceil((lo.hanDung.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const dnId = lo.sanPham?.doanhNghiepId;
      const cfg = await configFor(dnId);
      // §V mở rộng: ngành hàng có thể có ngưỡng riêng (Sữa bột 60d, Mỹ phẩm 90d)
      const warnDays = getExpWarnDaysForProduct(cfg, lo.sanPham?.nhomSanPham || '');

      let mucDo = null;
      let moTa = '';
      let newTrangThai = lo.trangThai;
      let webhookEvent: 'batch.suspend' | 'batch.ready' | null = null;

      if (daysLeft < 0) {
        mucDo = 'high';
        moTa = `Lô hàng ${lo.maLo} đã QUÁ HẠN SỬ DỤNG.${cfg.autoSuspendExpired ? ' Hệ thống tự động chặn xuất kho.' : ''}`;
        // §V.4: chỉ auto-suspend nếu DN cấu hình autoSuspendExpired = true
        if (cfg.autoSuspendExpired) newTrangThai = 'suspended';
        webhookEvent = 'batch.suspend';
      } else if (daysLeft <= cfg.expCriticalDays) {
        mucDo = 'high';
        moTa = `Lô hàng ${lo.maLo} SẮP HẾT HẠN trong ${daysLeft} ngày. Yêu cầu lên phương án thu hồi.`;
      } else if (daysLeft <= warnDays) {
        mucDo = 'medium';
        moTa = `Lô hàng ${lo.maLo} cận date (còn ${daysLeft} ngày). Đề xuất đẩy mạnh xả hàng.`;
      }

      if (mucDo) {
        const alertUid = `LO-${lo.id}`;
        const existing = await prisma.canhBao.findFirst({
          where: { uid: alertUid, trangThai: 'open', mucDo: mucDo }
        });

        if (!existing) {
          await prisma.canhBao.create({
            data: { loai: 'HET_HAN_LO_HANG', mucDo, moTa, uid: alertUid, trangThai: 'open' }
          });
          generatedAlerts++;

          // Khóa lô hàng nếu đã hết hạn + trigger webhook batch.suspend
          if (newTrangThai !== lo.trangThai) {
             await prisma.loHang.update({ where: { id: lo.id }, data: { trangThai: newTrangThai } });
             await prisma.nhatKy.create({
               data: {
                 action: `Tự động chặn xuất kho Lô hàng ${lo.maLo} (Quá hạn sử dụng)`,
                 user: 'Hệ thống Cron', role: 'system', ip: '127.0.0.1', status: 'error'
               }
             });
             if (dnId && webhookEvent === 'batch.suspend') {
               triggerWebhook('batch.suspend', dnId, {
                 batchId: lo.id, maLo: lo.maLo, lyDo: 'expired',
                 hanDung: lo.hanDung.toISOString(),
                 sanPhamTen: lo.sanPham?.ten,
               }).then(() => { triggeredWebhooks++; }).catch(() => {});
             }
          }

          // §V kênh thông báo: In-app push cho mọi mucDo của batch
          if (dnId) {
            const icon = mucDo === 'high' ? (daysLeft < 0 ? '🚫' : '⏰') : '📦';
            await pushNotify(dnId,
              `${icon} ${daysLeft < 0 ? 'Lô hàng QUÁ HẠN' : `Lô hàng còn ${daysLeft} ngày`}`,
              moTa,
              'alert',
            );
            pushedNotifications++;
          }
        }
      }
    }

    // ─── LỚP 3: KIỂM TRA PHIÊN BẢN TIÊU CHUẨN LỖI THỜI ─────────────────
    // Theo tài liệu nghiệp vụ §V — một số tiêu chuẩn có nhiều phiên bản,
    // chỉ phiên bản mới nhất được công nhận. DN dùng bản cũ → cảnh báo.
    const STANDARD_VERSIONS: Record<string, { current: string; obsolete: string[]; canCu: string }> = {
      'RoHS':         { current: '3.0 (2019)',           obsolete: ['1.0', '2.0', 'RoHS 1', 'RoHS 2'],            canCu: 'EU Directive 2015/863' },
      'HACCP':        { current: 'Codex Rev.5-2020',     obsolete: ['1997', '2003', 'Rev.3', 'Rev.4'],            canCu: 'Codex Alimentarius CAC/RCP 1-1969 Rev.5-2020' },
      'ISO 9001':     { current: '2015',                  obsolete: ['2008', '2000', '1994'],                       canCu: 'ISO 9001:2015' },
      'ISO 14001':    { current: '2015',                  obsolete: ['2004', '1996'],                               canCu: 'ISO 14001:2015' },
      'ISO 22000':    { current: '2018',                  obsolete: ['2005'],                                       canCu: 'ISO 22000:2018' },
      'GMP':          { current: 'WHO 2018',              obsolete: ['WHO 2007', 'GMP-PIC/S'],                      canCu: 'WHO TRS 986 Annex 2' },
    };

    const allCerts = await prisma.chungNhan.findMany();
    for (const cn of allCerts) {
      const loaiKey = Object.keys(STANDARD_VERSIONS).find(k => cn.loai.toUpperCase().startsWith(k.toUpperCase()));
      if (!loaiKey) continue;
      const versionInfo = STANDARD_VERSIONS[loaiKey];
      const certText = `${cn.loai} ${cn.soChungNhan}`;
      const isObsolete = versionInfo.obsolete.some(v => certText.includes(v));
      if (!isObsolete) continue;

      const alertUid = `CN-OBSOLETE-${cn.id}`;
      const existing = await prisma.canhBao.findFirst({ where: { uid: alertUid, trangThai: 'open' } });
      if (existing) continue;

      await prisma.canhBao.create({
        data: {
          loai: 'CHUNG_NHAN_LOI_THOI',
          mucDo: 'medium',
          moTa: `Chứng nhận ${loaiKey} (${cn.soChungNhan}) đang dùng phiên bản LỖI THỜI. Phiên bản hiện hành: ${versionInfo.current}. Căn cứ: ${versionInfo.canCu}. Đề xuất nâng cấp.`,
          uid: alertUid,
          trangThai: 'open',
        }
      });
      generatedAlerts++;
    }

    return NextResponse.json({
      success: true,
      message: `Lifecycle check complete. Generated ${generatedAlerts} new alerts.`,
      layers: ['L1-cert-expiry', 'L2-batch-exp', 'L3-standard-version'],
      // §V Sprint 7: notification channels metrics
      channels: {
        canhBaoCreated: generatedAlerts,
        webhooksTriggered: triggeredWebhooks,
        pushNotificationsCreated: pushedNotifications,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
