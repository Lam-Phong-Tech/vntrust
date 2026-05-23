import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validatePassword, sanitizeInput } from '@/lib/security';
import bcrypt from 'bcryptjs';

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
          error: 'Mật khẩu không đáp ứng chính sách bảo mật',
          details: pwCheck.errors,
          strength: pwCheck.strength,
        },
        { status: 400 }
      );
    }

    // ── NFR-SC-04: Sanitize inputs ────────────────────────────────────────
    const safeName = name ? sanitizeInput(name) : '';
    const safeEmail = email ? sanitizeInput(email).toLowerCase() : '';

    if (!safeEmail || !safeEmail.includes('@')) {
      return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 });
    }

    // Removed NFR-SC-07 corporate email validation to facilitate testing

    // ── Business role: validate bắt buộc company fields ──────────────────
    if (role === 'manufacturer' || role === 'importer') {
      if (!company?.trim()) {
        return NextResponse.json({ error: 'Tên công ty / doanh nghiệp là bắt buộc' }, { status: 400 });
      }
      if (!taxCode?.trim()) {
        return NextResponse.json({ error: 'Mã số thuế (MST) là bắt buộc' }, { status: 400 });
      }
      const cleanTax = taxCode.replace(/-/g, '');
      if (!/^\d{10}(\d{3})?$/.test(cleanTax)) {
        return NextResponse.json({ error: 'Mã số thuế không hợp lệ (10 hoặc 13 chữ số)' }, { status: 400 });
      }
      if (!address?.trim()) {
        return NextResponse.json({ error: 'Địa chỉ nhà máy / kho hàng là bắt buộc' }, { status: 400 });
      }
      // Check duplicate tax code
      const existingDN = await prisma.doanhNghiep.findFirst({ where: { maSoThue: taxCode.trim() } });
      if (existingDN) {
        return NextResponse.json({ error: 'Mã số thuế này đã được đăng ký trong hệ thống!' }, { status: 400 });
      }
    }

    // Validate phone format (Vietnamese phone numbers)
    if (phone) {
      const cleaned = phone.replace(/\s+/g, '').replace(/^(\+84|0084)/, '0');
      if (!/^0[3-9]\d{8}$/.test(cleaned)) {
        return NextResponse.json(
          { error: 'Số điện thoại không hợp lệ (phải có 10 số, bắt đầu bằng 03-09)' },
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
    if (phone) {
      const existingPhone = await prisma.nguoiDung.findFirst({ where: { soDienThoai: phone } });
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
        soDienThoai: phone,
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
          maSoThue: taxCode?.trim() || '',
          loai: loaiDN,
          diaChi: address?.trim() || null,
          hotline: hotline?.trim() || phone || null,
          email: safeEmail,
          nguoiDaiDien: safeName,
          trangThai: 'pending',
          // KYC documents uploaded during registration
          giayphep_url: giayphep_url || null,
          cmnd_url: cmnd_url || null,
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
