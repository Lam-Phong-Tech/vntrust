import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// Giới hạn: tối đa 5MB, chỉ chấp nhận ảnh
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(req: NextRequest) {
  try {
    // Xác thực quyền - chỉ manufacturer và admin mới được upload
    const cookieStore = await cookies();
    const userRole = cookieStore.get('userRole')?.value;
    const doanhNghiepId = cookieStore.get('doanhNghiepId')?.value;

    if (!userRole || (userRole !== 'admin' && userRole !== 'manufacturer')) {
      return NextResponse.json({ error: 'Forbidden: Chỉ Nhà sản xuất hoặc Admin mới có thể upload ảnh' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const uploadType = formData.get('type') as string; // 'product' | 'certificate'

    if (!file) {
      return NextResponse.json({ error: 'Không tìm thấy file trong request' }, { status: 400 });
    }

    // Kiểm tra định dạng file
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Chỉ chấp nhận file JPG, PNG, WebP' }, { status: 400 });
    }

    // Kiểm tra kích thước file
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File quá lớn. Tối đa 5MB' }, { status: 400 });
    }

    // Tạo tên file an toàn (không dùng tên gốc để tránh path traversal)
    const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
    const safeName = `${randomUUID()}.${ext}`;
    const folder = uploadType === 'certificate' ? 'certificates' : 'products';

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
