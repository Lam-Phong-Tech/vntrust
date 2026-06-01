// Public API alias: /api/product/lookup?code=<uid|gtin|serial>
// Tài liệu nghiệp vụ §II.5 (TrustCheck) ghi endpoint public:
//   GET /api/product/lookup?code={uid}  → tra cứu sản phẩm + trạng thái
// Đây là wrapper read-only KHÔNG ghi NhatKy/LuotQuet (khác /api/verify/[uid] ghi log scan).
// Dùng cho cơ quan/đối tác cần xem dữ liệu mà không gây side effect.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = (searchParams.get('code') || '').trim();
    if (!code) {
      return NextResponse.json({ error: 'missing_code', hint: 'GET /api/product/lookup?code=<uid|gtin|serial>' }, { status: 400 });
    }

    // 1) Thử lookup theo UID
    let ma = await prisma.maDinhDanh.findUnique({
      where: { uid: code },
      include: {
        loHang: {
          include: {
            sanPham: {
              include: {
                doanhNghiep: { select: { ten: true, maSoThue: true, trangThai: true } },
                chungNhans: { where: { trangThaiDuyet: 'approved' } },
              }
            }
          }
        }
      }
    });

    // 2) Nếu không, thử serialNumber
    if (!ma) {
      ma = await prisma.maDinhDanh.findUnique({
        where: { serialNumber: code },
        include: {
          loHang: {
            include: {
              sanPham: {
                include: {
                  doanhNghiep: { select: { ten: true, maSoThue: true, trangThai: true } },
                  chungNhans: { where: { trangThaiDuyet: 'approved' } },
                }
              }
            }
          }
        }
      });
    }

    if (ma) {
      const isExpired = new Date(ma.loHang.hanDung) < new Date();
      const status = ma.trangThai === 'fake' ? 'fake'
        : isExpired ? 'expired'
        : ma.soLanQuet >= 5 ? 'suspect'
        : 'genuine';

      return NextResponse.json({
        type: 'uid',
        status,
        product: {
          maSKU: ma.loHang.sanPham.maSKU,
          ten: ma.loHang.sanPham.ten,
          nhomSanPham: ma.loHang.sanPham.nhomSanPham,
          GTIN: ma.loHang.sanPham.GTIN,
          nuocSanXuat: ma.loHang.sanPham.nuocSanXuat,
        },
        batch: {
          maLo: ma.loHang.maLo,
          ngaySanXuat: ma.loHang.ngaySanXuat,
          hanDung: ma.loHang.hanDung,
          trangThai: ma.loHang.trangThai,
        },
        manufacturer: ma.loHang.sanPham.doanhNghiep
          ? { ten: ma.loHang.sanPham.doanhNghiep.ten, trangThai: ma.loHang.sanPham.doanhNghiep.trangThai }
          : null,
        certifications: ma.loHang.sanPham.chungNhans.map(c => ({
          loai: c.loai,
          soChungNhan: c.soChungNhan,
          ngayHetHan: c.ngayHetHan,
        })),
        scanCount: ma.soLanQuet,
      });
    }

    // 3) Thử lookup theo GTIN sản phẩm
    if (/^\d{8,14}$/.test(code)) {
      const sp = await prisma.sanPham.findFirst({
        where: { GTIN: code },
        include: {
          doanhNghiep: { select: { ten: true, maSoThue: true, trangThai: true } },
          chungNhans: { where: { trangThaiDuyet: 'approved' } },
        },
      });
      if (sp) {
        return NextResponse.json({
          type: 'gtin',
          status: 'product_only',
          message: 'GTIN khớp với 1 sản phẩm, chưa có UID cụ thể. Quét QR trên bao bì để xác thực mã từng SP.',
          product: { maSKU: sp.maSKU, ten: sp.ten, GTIN: sp.GTIN, nhomSanPham: sp.nhomSanPham },
          manufacturer: sp.doanhNghiep ? { ten: sp.doanhNghiep.ten, trangThai: sp.doanhNghiep.trangThai } : null,
          certifications: sp.chungNhans.map(c => ({ loai: c.loai, soChungNhan: c.soChungNhan, ngayHetHan: c.ngayHetHan })),
        });
      }
    }

    return NextResponse.json({ type: 'unknown', status: 'not_found', message: 'Không tìm thấy sản phẩm/lô hàng/UID khớp với mã này trên hệ thống VNTrust.' });
  } catch (e: any) {
    console.error('GET /api/product/lookup:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
