// §V.4 Sprint 9 — Cấu hình linh hoạt vòng đời theo doanh nghiệp
// Tài liệu nghiệp vụ §V.4 "Cấu hình linh hoạt cho doanh nghiệp"
//
// Tham số                                       | Default      | Range
// ────────────────────────────────────────────────────────────────────
// Số ngày cảnh báo trước khi hết hạn (EXP)      | 30 ngày      | 1-365
// Số ngày cảnh báo chứng nhận                    | 90 ngày      | 30-365
// Tự động chặn xuất kho khi quá hạn              | Bật          | true/false
// Tần suất gửi email cảnh báo                    | Hàng ngày 8h | daily | weekly
// Danh sách người nhận cảnh báo                  | Admin        | [] emails

import { prisma } from '@/lib/prisma';

export interface LifecycleConfig {
  expWarnDays: number;           // ngày báo trước EXP (default 30)
  expCriticalDays: number;       // ngày critical (default 7)
  certWarnDays: number;          // ngày báo trước cert (default 90)
  certCriticalDays: number;      // ngày critical cert (default 30)
  autoSuspendExpired: boolean;   // auto-chặn xuất kho khi quá hạn (default true)
  emailFrequency: 'daily' | 'weekly'; // default 'daily'
  emailRecipients: string[];     // danh sách email (default empty → admin only)
  // §V mở rộng: tùy chỉnh theo ngành hàng
  customByNganhHang?: Record<string, { expWarnDays: number; description: string }>;
}

export const DEFAULT_LIFECYCLE_CONFIG: LifecycleConfig = {
  expWarnDays: 30,
  expCriticalDays: 7,
  certWarnDays: 90,
  certCriticalDays: 30,
  autoSuspendExpired: true,
  emailFrequency: 'daily',
  emailRecipients: [],
  customByNganhHang: {
    'Sữa bột':   { expWarnDays: 60, description: 'Sữa bột — cảnh báo trước 60 ngày' },
    'Mỹ phẩm':   { expWarnDays: 90, description: 'Mỹ phẩm — cảnh báo trước 90 ngày' },
  },
};

const CONFIG_KEY_PREFIX = 'lifecycle:';

// Get config for a specific DN; falls back to DEFAULT if not configured
export async function getLifecycleConfig(doanhNghiepId?: string | null): Promise<LifecycleConfig> {
  if (!doanhNghiepId) return DEFAULT_LIFECYCLE_CONFIG;
  try {
    const record = await prisma.cauHinhHeThong.findUnique({
      where: { key: `${CONFIG_KEY_PREFIX}${doanhNghiepId}` },
    });
    if (!record?.value) return DEFAULT_LIFECYCLE_CONFIG;
    const parsed = JSON.parse(record.value);
    return { ...DEFAULT_LIFECYCLE_CONFIG, ...parsed };
  } catch {
    return DEFAULT_LIFECYCLE_CONFIG;
  }
}

// Set config for a DN
export async function setLifecycleConfig(doanhNghiepId: string, config: Partial<LifecycleConfig>): Promise<LifecycleConfig> {
  const current = await getLifecycleConfig(doanhNghiepId);
  const merged: LifecycleConfig = { ...current, ...config };

  // Validate ranges per §V.4
  if (merged.expWarnDays < 1 || merged.expWarnDays > 365) {
    throw new Error('expWarnDays phải trong khoảng 1-365 ngày');
  }
  if (merged.certWarnDays < 30 || merged.certWarnDays > 365) {
    throw new Error('certWarnDays phải trong khoảng 30-365 ngày');
  }
  if (merged.expCriticalDays < 1 || merged.expCriticalDays > merged.expWarnDays) {
    throw new Error(`expCriticalDays phải < expWarnDays (${merged.expWarnDays})`);
  }
  if (merged.certCriticalDays < 1 || merged.certCriticalDays > merged.certWarnDays) {
    throw new Error(`certCriticalDays phải < certWarnDays (${merged.certWarnDays})`);
  }
  if (!['daily', 'weekly'].includes(merged.emailFrequency)) {
    throw new Error('emailFrequency phải là "daily" hoặc "weekly"');
  }
  // Validate emails
  const emailRe = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  for (const e of merged.emailRecipients) {
    if (!emailRe.test(e)) throw new Error(`Email không hợp lệ: ${e}`);
  }

  await prisma.cauHinhHeThong.upsert({
    where: { key: `${CONFIG_KEY_PREFIX}${doanhNghiepId}` },
    create: {
      key: `${CONFIG_KEY_PREFIX}${doanhNghiepId}`,
      value: JSON.stringify(merged),
      namespace: 'lifecycle',
      moTa: `Cấu hình vòng đời của DN ${doanhNghiepId}`,
    },
    update: { value: JSON.stringify(merged) },
  });

  return merged;
}

// Get override for ngành hàng cụ thể nếu có
export function getExpWarnDaysForProduct(config: LifecycleConfig, nhomSanPham: string): number {
  if (config.customByNganhHang && nhomSanPham) {
    for (const [key, override] of Object.entries(config.customByNganhHang)) {
      if (nhomSanPham.toLowerCase().includes(key.toLowerCase())) {
        return override.expWarnDays;
      }
    }
  }
  return config.expWarnDays;
}
