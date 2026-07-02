"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

type ManageData = {
  me: { userRole: string; vaiTroCty: string };
  company: {
    ten: string;
    maSoThue: string;
    diaChi?: string | null;
    nganh_VSIC?: string | null;
    email?: string | null;
    hotline?: string | null;
    nguoiDaiDien?: string | null;
    giayphep_url?: string | null;
    cmnd_url?: string | null;
    loai: string;
    trangThai: string;
    website?: string | null;
    thuongHieu?: string | null;
  };
  profileCompletion: { completed: number; total: number; percent: number };
  stats: {
    products: number;
    batches: number;
    certificates: number;
    licenses: number;
    totalUid: number;
    members: number;
    pendingInvites: number;
    openAlerts: number;
    expiringBatches: number;
    expiringCertificates: number;
  };
  statusBreakdown: {
    batches: Record<string, number>;
    certificates: Record<string, number>;
    distribution: Record<string, number>;
    members: Record<string, number>;
  };
  products: Array<{ id: string; maSKU: string; ten: string; GTIN?: string | null; nhomSanPham?: string | null; _count: { loHangs: number; chungNhans: number } }>;
  batches: Array<{ id: string; maLo: string; soLuong: number; trangThai: string; hanDung: string; sanPham: { ten: string; maSKU: string }; _count: { uids: number; donChuyenHangs: number } }>;
  certificates: Array<{ id: string; loai: string; soChungNhan: string; ngayHetHan: string; trangThaiDuyet: string; sanPham?: { ten: string; maSKU: string } | null; loHang?: { maLo: string } | null }>;
  licenses: Array<{ id: string; tenGiayPhep: string; soGiayPhep: string; ngayHetHan?: string | null; trangThai: string }>;
  distributionOrders: Array<{ id: string; trangThai: string; capNhat: string; loHang: { maLo: string; sanPham: { ten: string; maSKU: string } } }>;
  members: Array<{ id: string; ten?: string | null; email: string; vaiTroCty?: string | null; quyenMoiNV: boolean; trangThai: string }>;
  invites: Array<{ id: string; email: string; vaiTroCty: string; ngayHetHan: string }>;
  recentScans: Array<{ id: string; ketQua: string; thoiGian: string; uid: string; maDinhDanh?: { serialNumber?: string | null; loHang?: { maLo: string; sanPham: { ten: string; maSKU: string } } | null } | null }>;
  recentAlerts: Array<{ id: string; mucDo: string; trangThai: string; thoiGian: string; moTa: string }>;
  recommendations: string[];
};

const fmt = new Intl.NumberFormat("vi-VN");

const statusText: Record<string, string> = {
  verified: "Đã xác thực",
  pending: "Chờ duyệt",
  suspended: "Bị khóa",
  revoked: "Thu hồi",
  active: "Đang hoạt động",
  pending_review: "Chờ Admin duyệt",
  pending_distributor: "Chờ NPP xác nhận",
  ready: "Sẵn sàng",
  distributed: "Đã phân phối",
  recalled: "Thu hồi",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  company_admin: "Quản trị DN",
  staff_input: "Nhập liệu",
  warehouse: "Kho",
  viewer: "Chỉ xem",
};

const roleMeta: Record<string, { label: string; desc: string; icon: string; color: string }> = {
  company_admin: {
    label: "Quản trị DN",
    desc: "Toàn quyền dữ liệu, nhân sự, phân quyền và cấu hình doanh nghiệp.",
    icon: "shield_person",
    color: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-200 dark:bg-amber-500/15 dark:border-amber-500/30",
  },
  staff_input: {
    label: "Nhập liệu",
    desc: "Nhập/sửa sản phẩm, lô hàng, chứng nhận và dữ liệu vận hành.",
    icon: "edit_note",
    color: "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-200 dark:bg-blue-500/15 dark:border-blue-500/30",
  },
  warehouse: {
    label: "Kho",
    desc: "Xử lý nhập/xuất kho, phân phối, khóa hoặc cập nhật trạng thái lô.",
    icon: "warehouse",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-200 dark:bg-emerald-500/15 dark:border-emerald-500/30",
  },
  viewer: {
    label: "Chỉ xem",
    desc: "Xem dashboard, lịch sử và báo cáo, không thay đổi dữ liệu nghiệp vụ.",
    icon: "visibility",
    color: "text-slate-700 bg-slate-50 border-slate-200 dark:text-slate-200 dark:bg-slate-500/15 dark:border-slate-500/30",
  },
};

const d = (value?: string | null) => value ? new Date(value).toLocaleDateString("vi-VN") : "—";
const daysLeft = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / 86400000);
};

function StatCard({ icon, label, value, tone = "blue", href }: { icon: string; label: string; value: number | string; tone?: "blue" | "green" | "amber" | "red"; href?: string }) {
  const toneCls = {
    blue: "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-500/15 dark:border-blue-500/25",
    green: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-500/15 dark:border-emerald-500/25",
    amber: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-500/15 dark:border-amber-500/25",
    red: "text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-500/15 dark:border-red-500/25",
  }[tone];
  const content = (
    <div className={`rounded-2xl border p-4 min-w-0 transition ${toneCls} ${href ? "hover:-translate-y-0.5 hover:shadow-lg" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="material-symbols-outlined text-[26px]">{icon}</span>
        <p className="text-2xl font-black tabular-nums">{typeof value === "number" ? fmt.format(value) : value}</p>
      </div>
      <p className="mt-2 text-xs font-bold uppercase tracking-wide opacity-80">{label}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function SectionCard({ title, icon, action, children }: { title: string; icon: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-[#bfdbfe] bg-white/88 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-black text-slate-950 dark:text-white">
          <span className="material-symbols-outlined text-[21px] text-[#2563eb] dark:text-[#C8A557]">{icon}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function MiniRow({ title, meta, right, href }: { title: string; meta?: string; right?: React.ReactNode; href?: string }) {
  const content = (
    <div className="flex items-center gap-3 rounded-2xl border border-[#dbeafe] bg-white/80 p-3 text-sm transition hover:bg-blue-50/70 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]">
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-slate-950 dark:text-white">{title}</p>
        {meta && <p className="mt-0.5 truncate text-xs text-[#477399] dark:text-slate-400">{meta}</p>}
      </div>
      <div className="shrink-0">{right}</div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default function EnterpriseManagePage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const tr = (vi: string, en: string) => (lang === "en" ? en : vi);
  const [data, setData] = useState<ManageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (!role) {
      router.replace("/login");
      return;
    }
    if (!["manufacturer", "importer", "admin"].includes(role)) {
      router.replace("/dashboard?error=forbidden");
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/dashboard/manage", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Không tải được dữ liệu quản lý");
        if (alive) setData(json);
      } catch (e: any) {
        if (alive) setError(e.message || "Có lỗi xảy ra");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [router]);

  const canManagePeople = data?.me.vaiTroCty === "company_admin" || data?.me.userRole === "admin";
  const canInput = data?.me.userRole === "admin" || ["company_admin", "staff_input"].includes(data?.me.vaiTroCty || "");
  const canWarehouse = data?.me.userRole === "admin" || ["company_admin", "warehouse", "staff_input"].includes(data?.me.vaiTroCty || "");

  const modules = useMemo(() => {
    if (!data) return [];
    return [
      {
        title: "Hồ sơ cơ sở & KYC",
        desc: data.company.trangThai === "verified" ? "Hồ sơ đã xác thực, dùng làm căn cứ cho sản phẩm, tem và phân phối." : "Bổ sung thông tin pháp lý để Admin xác minh.",
        icon: "business_center",
        href: "/dashboard/kyc",
        action: data.company.trangThai === "verified" ? "Xem hồ sơ" : "Cập nhật KYC",
        status: statusText[data.company.trangThai] || data.company.trangThai,
        locked: false,
      },
      {
        title: "Sản phẩm & lô hàng",
        desc: "Tạo sản phẩm, khai báo lô, sinh hoặc import mã QR/barcode.",
        icon: "inventory_2",
        href: "/dashboard/inventory",
        action: canInput ? "Quản lý kho dữ liệu" : "Chỉ xem",
        status: `${fmt.format(data.stats.products)} SP · ${fmt.format(data.stats.batches)} lô`,
        locked: !canInput && !canWarehouse,
      },
      {
        title: "Chứng nhận & giấy phép",
        desc: "Tải chứng nhận ISO/HACCP/GMP/VietGAP và giấy phép lưu hành.",
        icon: "workspace_premium",
        href: "/dashboard/certificates",
        action: canInput ? "Bổ sung chứng nhận" : "Xem chứng nhận",
        status: `${fmt.format(data.stats.certificates)} CN · ${fmt.format(data.stats.licenses)} GPLH`,
        locked: false,
      },
      {
        title: "Phân phối",
        desc: "Theo dõi lô chờ duyệt, sẵn sàng, đã phân phối, khóa hoặc thu hồi.",
        icon: "local_shipping",
        href: "/dashboard/distribution",
        action: canWarehouse ? "Xử lý phân phối" : "Chỉ xem",
        status: `${fmt.format(data.distributionOrders.length)} đơn`,
        locked: !canWarehouse,
      },
      {
        title: "Nhân sự nội bộ",
        desc: "Mời nhân viên, đổi vai trò, khóa/mở tài khoản, giữ lịch sử thao tác.",
        icon: "groups",
        href: "/dashboard/team",
        action: canManagePeople ? "Quản lý nhân sự" : "Xem vai trò",
        status: `${fmt.format(data.stats.members)} người · ${fmt.format(data.stats.pendingInvites)} lời mời`,
        locked: !canManagePeople,
      },
      {
        title: "Báo cáo & giám sát",
        desc: "Xem lượt quét, cảnh báo, báo cáo vận hành và dữ liệu nghi vấn.",
        icon: "analytics",
        href: "/dashboard/analytics",
        action: "Xem báo cáo",
        status: `${fmt.format(data.stats.openAlerts)} cảnh báo mở`,
        locked: false,
      },
    ];
  }, [canInput, canManagePeople, canWarehouse, data]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-[#2563eb] border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 text-center">
        <span className="material-symbols-outlined mb-3 text-5xl text-red-400">error</span>
        <h1 className="text-xl font-black text-slate-950 dark:text-white">{tr("Không mở được trang quản lý", "Cannot open management page")}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{error || "Không có dữ liệu"}</p>
        <Link href="/dashboard" className="mt-4 rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-bold text-white">Về bảng điều khiển</Link>
      </div>
    );
  }

  const companyStatus = statusText[data.company.trangThai] || data.company.trangThai;
  const role = roleMeta[data.me.vaiTroCty] || roleMeta.viewer;
  const pendingBatches = data.statusBreakdown.batches.pending_review || 0;
  const readyBatches = data.statusBreakdown.batches.ready || data.statusBreakdown.batches.active || 0;
  const distributedBatches = data.statusBreakdown.batches.distributed || 0;

  return (
    <main className="min-h-screen bg-[#f3f8ff] px-3 py-5 pb-[110px] text-slate-950 dark:bg-[#07111f] dark:text-white sm:px-5 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-[28px] border border-[#bfdbfe] bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2563eb] dark:text-[#C8A557]">Trung tâm quản lý doanh nghiệp</p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">{data.company.ten}</h1>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full border border-[#bfdbfe] bg-blue-50 px-3 py-1 text-[#2563eb] dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-200">MST: {data.company.maSoThue}</span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200">{companyStatus}</span>
                <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 ${role.color}`}>
                  <span className="material-symbols-outlined text-[14px]">{role.icon}</span>{role.label}
                </span>
              </div>
            </div>
            <div className="w-full shrink-0 rounded-2xl border border-[#dbeafe] bg-[#f8fbff] p-4 dark:border-white/10 dark:bg-white/[0.04] lg:w-80">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-slate-700 dark:text-slate-300">Mức hoàn thiện hồ sơ</span>
                <span className="font-black text-[#2563eb] dark:text-[#C8A557]">{data.profileCompletion.percent}%</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-[#2563eb] to-[#22c55e]" style={{ width: `${data.profileCompletion.percent}%` }} />
              </div>
              <p className="mt-2 text-xs text-[#477399] dark:text-slate-400">{data.profileCompletion.completed}/{data.profileCompletion.total} trường quan trọng đã có dữ liệu.</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <StatCard icon="inventory_2" label="Sản phẩm" value={data.stats.products} href="/dashboard/inventory" />
          <StatCard icon="qr_code_2" label="Lô hàng" value={data.stats.batches} href="/dashboard/inventory" />
          <StatCard icon="qr_code_scanner" label="Mã định danh" value={data.stats.totalUid} href="/dashboard/inventory" tone="green" />
          <StatCard icon="workspace_premium" label="Chứng nhận" value={data.stats.certificates} href="/dashboard/certificates" tone="amber" />
          <StatCard icon="groups" label="Nhân sự" value={data.stats.members} href="/dashboard/team" />
          <StatCard icon="warning" label="Cảnh báo mở" value={data.stats.openAlerts} href="/dashboard/alerts" tone={data.stats.openAlerts ? "red" : "green"} />
        </div>

        {data.recommendations.length > 0 && (
          <section className="rounded-3xl border border-amber-200 bg-amber-50/90 p-4 dark:border-amber-500/25 dark:bg-amber-500/10">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-amber-800 dark:text-amber-200">
              <span className="material-symbols-outlined text-[20px]">tips_and_updates</span>
              Việc nên làm tiếp theo
            </h2>
            <div className="grid gap-2 md:grid-cols-2">
              {data.recommendations.map((item, index) => (
                <div key={index} className="flex gap-2 rounded-2xl bg-white/70 p-3 text-sm font-semibold text-amber-900 dark:bg-white/[0.04] dark:text-amber-100">
                  <span className="material-symbols-outlined text-[18px]">arrow_right_alt</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((item) => (
            <Link key={item.title} href={item.href} className="group rounded-3xl border border-[#bfdbfe] bg-white/88 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#2563eb] hover:shadow-lg dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex items-start justify-between gap-3">
                <span className="material-symbols-outlined rounded-2xl bg-blue-50 p-3 text-[26px] text-[#2563eb] dark:bg-blue-500/15 dark:text-blue-200">{item.icon}</span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${item.locked ? "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"}`}>
                  {item.locked ? "Giới hạn quyền" : item.status}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-black text-slate-950 dark:text-white">{item.title}</h3>
              <p className="mt-1 min-h-[42px] text-sm leading-6 text-[#477399] dark:text-slate-400">{item.desc}</p>
              <div className="mt-4 flex items-center justify-between border-t border-[#dbeafe] pt-3 text-sm font-black text-[#2563eb] dark:border-white/10 dark:text-[#C8A557]">
                <span>{item.action}</span>
                <span className="material-symbols-outlined transition group-hover:translate-x-1">arrow_forward</span>
              </div>
            </Link>
          ))}
        </section>

        <div className="grid gap-5 xl:grid-cols-2">
          <SectionCard
            title="Sản phẩm gần đây"
            icon="inventory_2"
            action={<Link href="/dashboard/inventory" className="text-xs font-black text-[#2563eb] dark:text-[#C8A557]">Quản lý tất cả</Link>}
          >
            <div className="space-y-2">
              {data.products.length ? data.products.map(item => (
                <MiniRow
                  key={item.id}
                  href="/dashboard/inventory"
                  title={item.ten}
                  meta={`${item.maSKU}${item.GTIN ? ` · GTIN ${item.GTIN}` : ""}${item.nhomSanPham ? ` · ${item.nhomSanPham}` : ""}`}
                  right={<span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-[#2563eb] dark:bg-blue-500/15 dark:text-blue-200">{item._count.loHangs} lô</span>}
                />
              )) : <p className="rounded-2xl border border-dashed border-[#bfdbfe] p-5 text-center text-sm text-[#477399] dark:border-white/10 dark:text-slate-400">Chưa có sản phẩm. Hãy tạo sản phẩm đầu tiên.</p>}
            </div>
          </SectionCard>

          <SectionCard
            title="Lô hàng & phân phối"
            icon="qr_code_2"
            action={<Link href="/dashboard/distribution" className="text-xs font-black text-[#2563eb] dark:text-[#C8A557]">Theo dõi phân phối</Link>}
          >
            <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs font-bold">
              <div className="rounded-2xl bg-amber-50 p-2 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">{pendingBatches} chờ duyệt</div>
              <div className="rounded-2xl bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">{readyBatches} sẵn sàng</div>
              <div className="rounded-2xl bg-blue-50 p-2 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">{distributedBatches} đã phân phối</div>
            </div>
            <div className="space-y-2">
              {data.batches.slice(0, 6).map(item => {
                const left = daysLeft(item.hanDung);
                return (
                  <MiniRow
                    key={item.id}
                    href="/dashboard/distribution"
                    title={`${item.maLo} · ${item.sanPham.ten}`}
                    meta={`HSD ${d(item.hanDung)} · ${fmt.format(item.soLuong)} tem · ${statusText[item.trangThai] || item.trangThai}`}
                    right={left !== null && left <= 30 ? <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-black text-red-600 dark:bg-red-500/15 dark:text-red-200">{left < 0 ? "Hết hạn" : `${left} ngày`}</span> : null}
                  />
                );
              })}
              {!data.batches.length && <p className="rounded-2xl border border-dashed border-[#bfdbfe] p-5 text-center text-sm text-[#477399] dark:border-white/10 dark:text-slate-400">Chưa có lô hàng.</p>}
            </div>
          </SectionCard>

          <SectionCard
            title="Chứng nhận & giấy phép"
            icon="workspace_premium"
            action={<Link href="/dashboard/certificates" className="text-xs font-black text-[#2563eb] dark:text-[#C8A557]">Mở chứng nhận</Link>}
          >
            <div className="space-y-2">
              {[...data.certificates.slice(0, 4).map(item => ({
                id: `cert-${item.id}`,
                title: `${item.loai} · ${item.soChungNhan}`,
                meta: `${item.sanPham?.ten || item.loHang?.maLo || "Hồ sơ DN"} · HSD ${d(item.ngayHetHan)}`,
                status: statusText[item.trangThaiDuyet] || item.trangThaiDuyet,
              })), ...data.licenses.slice(0, 3).map(item => ({
                id: `lic-${item.id}`,
                title: item.tenGiayPhep,
                meta: `${item.soGiayPhep} · HSD ${d(item.ngayHetHan)}`,
                status: statusText[item.trangThai] || item.trangThai,
              }))].map(item => (
                <MiniRow key={item.id} href="/dashboard/certificates" title={item.title} meta={item.meta} right={<span className="text-[10px] font-black text-[#2563eb] dark:text-[#C8A557]">{item.status}</span>} />
              ))}
              {!data.certificates.length && !data.licenses.length && <p className="rounded-2xl border border-dashed border-[#bfdbfe] p-5 text-center text-sm text-[#477399] dark:border-white/10 dark:text-slate-400">Chưa có chứng nhận hoặc giấy phép.</p>}
            </div>
          </SectionCard>

          <SectionCard
            title="Nhân sự nội bộ"
            icon="groups"
            action={<Link href="/dashboard/team" className="text-xs font-black text-[#2563eb] dark:text-[#C8A557]">Mời nhân viên</Link>}
          >
            <div className="space-y-2">
              {data.members.slice(0, 6).map(item => (
                <MiniRow
                  key={item.id}
                  href="/dashboard/team"
                  title={item.ten || item.email}
                  meta={`${item.email} · ${roleMeta[item.vaiTroCty || "viewer"]?.label || item.vaiTroCty || "Chưa gán"}`}
                  right={<span className={`rounded-full px-2 py-1 text-[10px] font-black ${item.trangThai === "active" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200" : "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-200"}`}>{statusText[item.trangThai] || item.trangThai}</span>}
                />
              ))}
              {data.invites.length > 0 && <p className="pt-1 text-xs font-bold text-amber-700 dark:text-amber-200">{data.invites.length} lời mời đang chờ chấp nhận.</p>}
            </div>
          </SectionCard>

          <SectionCard title="Luồng vận hành" icon="route">
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                ["1", "DN gửi hồ sơ", data.company.trangThai === "verified" ? "done" : "current"],
                ["2", "Admin duyệt", data.company.trangThai === "verified" ? "done" : "pending"],
                ["3", "Tạo sản phẩm/lô", data.stats.batches > 0 ? "done" : data.stats.products > 0 ? "current" : "pending"],
                ["4", "Sinh/import mã", data.stats.totalUid > 0 ? "done" : "pending"],
                ["5", "Gửi đơn phân phối", data.distributionOrders.length > 0 ? "done" : "pending"],
                ["6", "NPP xác nhận", (data.statusBreakdown.distribution.ready || data.statusBreakdown.distribution.distributed) ? "done" : "pending"],
              ].map(([num, label, state]) => (
                <div key={num} className={`rounded-2xl border p-3 ${state === "done" ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-100" : state === "current" ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100" : "border-[#dbeafe] bg-white/70 text-[#477399] dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400"}`}>
                  <p className="text-[11px] font-black uppercase">Bước {num}</p>
                  <p className="mt-1 text-sm font-bold">{label}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Theo dõi gần đây" icon="monitoring">
            <div className="space-y-2">
              {data.recentScans.slice(0, 5).map(item => (
                <MiniRow
                  key={item.id}
                  href="/dashboard/analytics"
                  title={item.maDinhDanh?.loHang?.sanPham.ten || item.uid}
                  meta={`${item.ketQua} · ${d(item.thoiGian)} · ${item.maDinhDanh?.loHang?.maLo || "N/A"}`}
                  right={<span className="material-symbols-outlined text-[18px] text-[#2563eb] dark:text-[#C8A557]">qr_code_scanner</span>}
                />
              ))}
              {data.recentAlerts.slice(0, 3).map(item => (
                <MiniRow key={item.id} href="/dashboard/alerts" title={item.moTa} meta={`${item.mucDo} · ${d(item.thoiGian)}`} right={<span className="material-symbols-outlined text-[18px] text-red-500">warning</span>} />
              ))}
              {!data.recentScans.length && !data.recentAlerts.length && <p className="rounded-2xl border border-dashed border-[#bfdbfe] p-5 text-center text-sm text-[#477399] dark:border-white/10 dark:text-slate-400">Chưa có hoạt động gần đây.</p>}
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Ma trận quyền nội bộ" icon="admin_panel_settings">
          <div className="grid gap-3 md:grid-cols-4">
            {Object.entries(roleMeta).map(([key, meta]) => (
              <div key={key} className={`rounded-2xl border p-4 ${meta.color}`}>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[22px]">{meta.icon}</span>
                  <h3 className="font-black">{meta.label}</h3>
                </div>
                <p className="mt-2 text-xs font-semibold leading-5 opacity-85">{meta.desc}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
