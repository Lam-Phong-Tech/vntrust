import { prisma } from "@/lib/prisma";

export const SYSTEM_APPROVAL_CERT_TYPES = {
  product: "SYSTEM_PRODUCT_APPROVAL",
  batch: "SYSTEM_BATCH_APPROVAL",
} as const;

type ApprovalTarget = keyof typeof SYSTEM_APPROVAL_CERT_TYPES;
type ApprovalStatus = "pending" | "approved" | "rejected";

interface UpsertSystemApprovalOptions {
  target: ApprovalTarget;
  id: string;
  status?: ApprovalStatus;
  note?: string | null;
  reviewer?: string | null;
}

export async function upsertSystemApproval({
  target,
  id,
  status = "pending",
  note = null,
  reviewer = null,
}: UpsertSystemApprovalOptions) {
  const now = new Date();
  const farFuture = new Date(now);
  farFuture.setFullYear(farFuture.getFullYear() + 100);

  const certType = SYSTEM_APPROVAL_CERT_TYPES[target];
  const existing = await prisma.chungNhan.findFirst({
    where: target === "product"
      ? { loai: certType, sanPhamId: id }
      : { loai: certType, loHangId: id },
    orderBy: { ngayDuyet: "desc" },
  });

  const data = {
    trangThaiDuyet: status,
    ghiChuAdmin: note?.trim() || null,
    ngayDuyet: status === "pending" ? null : now,
    ngayCap: now,
    ngayHetHan: farFuture,
    toChucCap: reviewer || "VNTrust Admin",
  };

  if (existing) {
    return prisma.chungNhan.update({ where: { id: existing.id }, data });
  }

  return prisma.chungNhan.create({
    data: {
      loai: certType,
      soChungNhan: `${target.toUpperCase()}-${id.slice(0, 8).toUpperCase()}`,
      ...data,
      sanPhamId: target === "product" ? id : null,
      loHangId: target === "batch" ? id : null,
    },
  });
}
