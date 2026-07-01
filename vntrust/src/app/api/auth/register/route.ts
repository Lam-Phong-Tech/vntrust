import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validatePassword, sanitizeInput } from '@/lib/security';
import bcrypt from 'bcryptjs';

function normalizeVNPhone(phone: string): string {
  return phone.replace(/\s+/g, '').replace(/^(\+84|0084)/, '0').replace(/[^\d]/g, '');
}

function validatePersonName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Họ và tên là bắt buộc';
  if (trimmed.length < 2) return 'Họ và tên tối thiểu 2 ký tự';
  if (trimmed.length > 20) return 'Họ và tên tối đa 20 ký tự';
  if (!/^[\p{L}\s]+$/u.test(trimmed)) return 'Họ và tên không được chứa số hoặc ký tự đặc biệt';
  return null;
}

function validateEmailFormat(email: string): string | null {
  if (!email) return 'Email là bắt buộc';
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) return 'Email không đúng cấu trúc';
  return null;
}

function validateCompanyName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Tên công ty / doanh nghiệp là bắt buộc';
  if (trimmed.length < 3) return 'Tên doanh nghiệp tối thiểu 3 ký tự';
  if (trimmed.length > 120) return 'Tên doanh nghiệp tối đa 120 ký tự';
  if (!/^[\p{L}\p{N}\s.,&()\-\/]+$/u.test(trimmed)) return 'Tên doanh nghiệp không được chứa ký tự đặc biệt lạ';
  return null;
}

function validateTaxCode(value: string): string | null {
  const clean = value.replace(/-/g, '');
  if (!clean) return 'Mã số thuế (MST) là bắt buộc';
  if (!/^\d{10}(\d{3})?$/.test(clean)) return 'Mã số thuế không hợp lệ (10 hoặc 13 chữ số)';
  return null;
}

function validateBusinessAddress(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Địa chỉ nhà máy / kho hàng là bắt buộc';
  if (trimmed.length < 10) return 'Địa chỉ tối thiểu 10 ký tự';
  if (trimmed.length > 180) return 'Địa chỉ tối đa 180 ký tự';
  if (!/^[\p{L}\p{N}\s.,#()\-\/]+$/u.test(trimmed)) return 'Địa chỉ không được chứa ký tự đặc biệt lạ';
  return null;
}

function validateOptionalHotline(value?: string): string | null {
  if (!value?.trim()) return null;
  if (!/^0[1-9]\d{8}$/.test(normalizeVNPhone(value))) return 'Hotline không hợp lệ (10 số, bắt đầu bằng 01-09)';
  return null;
}

function parseRepresentativeIdUrls(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string' && !!v.trim());
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === 'string' && !!v.trim());
  } catch {
    // Backward compatible: old clients may send one plain URL.
  }
  return value.trim() ? [value.trim()] : [];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, role, password, company, taxCode, address, hotline, giayphep_url, cmnd_url } = body;

    // ── NFR-SC-07: Password Policy Enforcement ────────────────────────────
    if (!password) {
      return NextResponse.json({ error: 'Mật khẩu là bắt buộc' }, { status: 400 });
    }

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      return NextResponse.json(
        {
          error: 'Mật khẩu không đáp ứng chính sách bảo mật (NFR-SC-07)',
          details: pwCheck.errors,
          strength: pwCheck.strength,
        },
        { status: 400 }
      );
    }

    // ── NFR-SC-04: Sanitize inputs ────────────────────────────────────────
    const safeName = name ? sanitizeInput(name) : '';
    const safeEmail = email ? sanitizeInput(email).toLowerCase() : '';
    const safePhone = phone ? normalizeVNPhone(phone) : '';

    const nameErr = validatePersonName(safeName);
    if (nameErr) return NextResponse.json({ error: nameErr }, { status: 400 });

    const emailErr = validateEmailFormat(safeEmail);
    if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 });

    // Removed NFR-SC-07 corporate email validation to facilitate testing

    // ── Business role: validate bắt buộc company fields ──────────────────
    if (role === 'manufacturer' || role === 'importer') {
      const companyErr = validateCompanyName(company || '');
      if (companyErr) return NextResponse.json({ error: companyErr }, { status: 400 });

      const taxErr = validateTaxCode(taxCode || '');
      if (taxErr) return NextResponse.json({ error: taxErr }, { status: 400 });

      const cleanTax = taxCode.replace(/-/g, '');

      const addressErr = validateBusinessAddress(address || '');
      if (addressErr) return NextResponse.json({ error: addressErr }, { status: 400 });

      const hotlineErr = validateOptionalHotline(hotline);
      if (hotlineErr) return NextResponse.json({ error: hotlineErr }, { status: 400 });

      // ── BẮT BUỘC giấy tờ pháp lý khi đăng ký doanh nghiệp ──
      if (!giayphep_url) {
        return NextResponse.json({ error: 'Giấy phép Kinh doanh là bắt buộc' }, { status: 400 });
      }
      const idUrls = parseRepresentativeIdUrls(cmnd_url);
      if (idUrls.length < 2) {
        return NextResponse.json({ error: 'CMND/CCCD người đại diện phải có đủ mặt trước và mặt sau' }, { status: 400 });
      }
      // Check duplicate tax code
      const existingDN = await prisma.doanhNghiep.findFirst({ where: { maSoThue: cleanTax } });
      if (existingDN) {
        return NextResponse.json({ error: 'Mã số thuế này đã được đăng ký trong hệ thống!' }, { status: 400 });
      }
    }

    // Validate phone format (Vietnamese phone numbers)
    if (safePhone) {
      if (!/^0[1-9]\d{8}$/.test(safePhone)) {
        return NextResponse.json(
          { error: 'Số điện thoại không hợp lệ (phải có 10 số, bắt đầu bằng 01-09)' },
          { status: 400 }
        );
      }
    }

    // Check if email already exists
    const existingEmail = await prisma.nguoiDung.findUnique({ where: { email: safeEmail } });
    if (existingEmail) {
      return NextResponse.json({ error: 'Email này đã được đăng ký!' }, { status: 400 });
    }

    // Check if phone already exists
    if (safePhone) {
      const existingPhone = await prisma.nguoiDung.findFirst({ where: { soDienThoai: safePhone } });
      if (existingPhone) {
        return NextResponse.json({ error: 'Số điện thoại này đã được đăng ký!' }, { status: 400 });
      }
    }

    if (role === 'admin') {
      return NextResponse.json(
        { error: 'Không thể đăng ký tài khoản Quản trị hệ thống!' },
        { status: 403 }
      );
    }

    // Create user — B-03: Hash mật khẩu bằng bcrypt (12 rounds)
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = await prisma.nguoiDung.create({
      data: {
        ten: safeName,
        email: safeEmail,
        soDienThoai: safePhone || null,
        vaiTro: role,
        matKhau: hashedPassword,
      },
    });

    // Tạo DoanhNghiep record nếu là NSX/NNK
    if ((role === 'manufacturer' || role === 'importer') && company) {
      const loaiDN = role === 'manufacturer' ? 'NSX' : 'NNK';
      const dn = await prisma.doanhNghiep.create({
        data: {
          ten: company.trim(),
          maSoThue: taxCode?.replace(/-/g, '').trim() || '',
          loai: loaiDN,
          diaChi: address?.trim() || null,
          hotline: hotline ? normalizeVNPhone(hotline) : null,
          giayphep_url: giayphep_url || null,
          cmnd_url: cmnd_url || null,
          trangThai: 'pending',
        },
      });
      // Gắn doanhNghiepId vào user
      await prisma.nguoiDung.update({
        where: { id: newUser.id },
        data: { doanhNghiepId: dn.id },
      });
    }

    // Audit log (NFR-SC-05)
    await prisma.nhatKy.create({
      data: {
        action: `Đăng ký tài khoản mới: ${safeEmail} (${role})`,
        user: safeName || safeEmail,
        role: role,
        ip: 'register',
        status: 'success',
      }
    });

    return NextResponse.json({
      message: 'Đăng ký thành công',
      user: { id: newUser.id, email: newUser.email, role: newUser.vaiTro },
    });
  } catch (error: any) {
    console.error("Register Error:", error);
    return NextResponse.json({ error: 'Đã xảy ra lỗi hệ thống' }, { status: 500 });
  }
}
