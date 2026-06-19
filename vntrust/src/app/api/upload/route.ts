import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// Ảnh (product/avatar): tối đa 5MB. Tài liệu KYC/chứng nhận (cho phép PDF): tối đa 10MB.
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;   // 5MB
const MAX_DOC_SIZE = 10 * 1024 * 1024;    // 10MB
const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOC = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export async function POST(req: NextRequest) {
  try {
    // Xác thực quyền - chỉ manufacturer và admin mới được upload
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    const doanhNghiepId = cookieStore.get('doanhNghiepId')?.value;

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const uploadType = formData.get('type') as string; // 'product' | 'certificate' | 'avatar'

    // Phân quyền theo loại upload:
    // - 'kyc'   : hồ sơ đăng ký DN diễn ra TRƯỚC khi đăng nhập → KHÔNG yêu cầu session.
    //             (An toàn: chỉ nhận ảnh/PDF, giới hạn dung lượng, tên file ngẫu nhiên.)
    // - 'avatar': mọi role đã đăng nhập.
    // - khác    : chỉ admin/manufacturer.
    if (uploadType === 'kyc' || uploadType === 'report') {
      // 'kyc'    : hồ sơ đăng ký DN (diễn ra trước khi đăng nhập)
      // 'report' : ảnh bằng chứng khi người tiêu dùng/ẩn danh báo cáo hàng giả
      // → KHÔNG yêu cầu session (an toàn: chỉ ảnh/PDF, giới hạn dung lượng, tên ngẫu nhiên)
    } else if (uploadType === 'avatar') {
      if (!userRole) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    } else if (!userRole || (userRole !== 'admin' && userRole !== 'manufacturer')) {
      return NextResponse.json({ error: 'Forbidden: Chỉ Nhà sản xuất hoặc Admin mới có thể upload ảnh' }, { status: 403 });
    }

    if (!file) {
      return NextResponse.json({ error: 'Không tìm thấy file trong request' }, { status: 400 });
    }

    // KYC + chứng nhận: cho phép PDF, tối đa 10MB. Ảnh (product/avatar): chỉ ảnh, tối đa 5MB.
    const isDoc = uploadType === 'kyc' || uploadType === 'certificate';
    const allowed = isDoc ? ALLOWED_DOC : ALLOWED_IMAGE;
    const maxSize = isDoc ? MAX_DOC_SIZE : MAX_IMAGE_SIZE;
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: isDoc ? 'Chỉ chấp nhận PDF, JPG, PNG, WebP' : 'Chỉ chấp nhận file JPG, PNG, WebP' }, { status: 400 });
    }
    if (file.size > maxSize) {
      return NextResponse.json({ error: `File quá lớn. Tối đa ${Math.round(maxSize / 1024 / 1024)}MB` }, { status: 400 });
    }

    // Tạo tên file an toàn (không dùng tên gốc để tránh path traversal)
    const ext = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1].replace('jpeg', 'jpg');
    const safeName = `${randomUUID()}.${ext}`;
    const folder = uploadType === 'certificate' ? 'certificates'
                 : uploadType === 'avatar'      ? 'avatars'
                 : uploadType === 'kyc'         ? 'kyc'
                 : uploadType === 'report'      ? 'reports'
                 : 'products';

    // Lưu vào thư mục public/uploads
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, safeName);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    // URL công khai để trả về cho client
    const publicUrl = `/uploads/${folder}/${safeName}`;

    return NextResponse.json({ url: publicUrl, fileName: safeName }, { status: 201 });
  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi upload file' }, { status: 500 });
  }
}
