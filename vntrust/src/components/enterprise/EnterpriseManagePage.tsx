"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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

type ModuleItem = {
  title: string;
  desc: string;
  icon: string;
  href: string;
  action: string;
  status: string;
  locked: boolean;
};

type KycDocumentField = "giayphep_url" | "cmnd_url";

const fmt = new Intl.NumberFormat("vi-VN");

const wrapText = {
  overflowWrap: "anywhere" as const,
  wordBreak: "break-word" as const,
};

const softClamp = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical" as const,
  overflow: "hidden",
  ...wrapText,
};

const profileFieldLabels: Array<{ key: keyof ManageData["company"]; label: string }> = [
  { key: "ten", label: "Tên công ty / doanh nghiệp" },
  { key: "maSoThue", label: "Mã số thuế" },
  { key: "diaChi", label: "Địa chỉ cơ sở / kho hàng" },
  { key: "nguoiDaiDien", label: "Người đại diện" },
  { key: "hotline", label: "Hotline xác thực" },
  { key: "email", label: "Email liên hệ" },
  { key: "nganh_VSIC", label: "Ngành nghề / mã VSIC" },
  { key: "giayphep_url", label: "Giấy phép kinh doanh" },
  { key: "cmnd_url", label: "CCCD/CMND người đại diện" },
];

const profileFieldTargets: Partial<Record<keyof ManageData["company"], string>> = {
  diaChi: "/dashboard/kyc#enterprise-info",
  nguoiDaiDien: "/dashboard/kyc#enterprise-info",
  hotline: "/dashboard/kyc#enterprise-info",
  email: "/dashboard/kyc#enterprise-info",
  nganh_VSIC: "/dashboard/kyc#enterprise-info",
  giayphep_url: "/dashboard/kyc#giayphep_url",
  cmnd_url: "/dashboard/kyc#cmnd_url",
};

const statusText: Record<string, string> = {
  verified: "Đã xác thực",
  pending: "Chờ duyệt",
  suspended: "Bị khóa",
  revoked: "Thu hồi",
  active: "Đang hoạt động",
  pending_review: "Chờ Admin duyệt",
  pending_distributor: "Chờ nhà phân phối",
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

const roleMeta: Record<string, { label: string; desc: string; icon: string }> = {
  company_admin: {
    label: "Quản trị DN",
    desc: "Toàn quyền hồ sơ, sản phẩm, mục hàng, nhân sự và phân quyền nội bộ.",
    icon: "shield_person",
  },
  staff_input: {
    label: "Nhập liệu",
    desc: "Nhập và cập nhật sản phẩm, mục hàng, chứng nhận, giấy phép.",
    icon: "edit_note",
  },
  warehouse: {
    label: "Kho",
    desc: "Theo dõi mục hàng, phân phối, khóa/mở trạng thái vận hành kho.",
    icon: "warehouse",
  },
  viewer: {
    label: "Chỉ xem",
    desc: "Chỉ xem dashboard, báo cáo và lịch sử thao tác.",
    icon: "visibility",
  },
};

const d = (value?: string | null) => {
  if (!value) return "Không có";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Không có" : date.toLocaleDateString("vi-VN");
};

const daysLeft = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / 86400000);
};

const isCompanyNamePlaceholder = (value?: string | null) => {
  const normalized = value?.trim().toLowerCase();
  return !normalized || normalized === "ten cong ty / doanh nghiep" || normalized === "tên công ty / doanh nghiệp";
};

const isProfileFieldComplete = (key: keyof ManageData["company"], value: unknown) => {
  if (key === "ten") return typeof value === "string" && !isCompanyNamePlaceholder(value);
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
};

function StatusPill({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "green" | "amber" | "red" | "slate" }) {
  const cls = {
    blue: "bg-[#1F6FEB]/10 text-[#1F6FEB] border-[#1F6FEB]/30",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
  }[tone];
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold ${cls}`}>{children}</span>;
}

function StatCard({ icon, label, value, tag, tone = "blue", href }: { icon: string; label: string; value: number | string; tag?: string; tone?: "blue" | "green" | "amber" | "red"; href?: string }) {
  const toneCls = {
    blue: "text-[#1F6FEB] bg-[#1F6FEB]/10 border-[#1F6FEB]/25",
    green: "text-emerald-700 bg-emerald-50 border-emerald-200",
    amber: "text-amber-700 bg-amber-50 border-amber-200",
    red: "text-red-700 bg-red-50 border-red-200",
  }[tone];
  const visualToneCls = {
    blue: "feature-visual-card--blue",
    green: "feature-visual-card--green",
    amber: "feature-visual-card--amber",
    red: "feature-visual-card--red",
  }[tone];
  const card = (
    <div className={`feature-visual-card ${visualToneCls} rounded-2xl border border-[#dbeafe] bg-white p-4 shadow-sm transition hover:border-[#1F6FEB]/50 hover:shadow-md`}>
      <span className="feature-card-visual"><span className="feature-card-visual__icon material-symbols-outlined">{icon}</span></span>
      <div className="mb-4 flex items-start justify-between">
        <span className="material-symbols-outlined text-[24px] text-slate-900">{icon}</span>
        {tag && <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${toneCls}`}>{tag}</span>}
      </div>
      <p data-no-auto-translate className={`text-3xl font-extrabold tabular-nums ${tone === "red" ? "text-red-500" : "text-slate-950"}`}>
        {typeof value === "number" ? fmt.format(value) : value}
      </p>
      <p className="mt-1 text-xs font-semibold text-[#477399]">{label}</p>
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

function AdminPanel({ title, icon, action, children }: { title: string; icon: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="h-fit rounded-2xl border border-[#dbeafe] bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-2 text-base font-bold text-slate-950">
          <span className="material-symbols-outlined text-[21px] text-[#1F6FEB]">{icon}</span>
          <span className="truncate">{title}</span>
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function DataRow({ title, meta, right, href, icon = "radio_button_checked" }: { title: string; meta?: string; right?: ReactNode; href?: string; icon?: string }) {
  const row = (
    <div className="flex items-start gap-3 border-b border-[#e6f0fb] px-1 py-3 last:border-b-0">
      <span className="material-symbols-outlined shrink-0 text-[19px] text-[#1F6FEB]">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold leading-5 text-slate-950" style={wrapText} title={title}>{title}</p>
        {meta && <p className="mt-0.5 text-xs font-medium leading-5 text-[#477399]" style={softClamp} title={meta}>{meta}</p>}
      </div>
      {right && <div className="ml-2 shrink-0 pt-1">{right}</div>}
    </div>
  );
  return href ? <Link href={href} className="block hover:bg-[#f3f8ff]">{row}</Link> : row;
}

function OperationNav({ items }: { items: ModuleItem[] }) {
  const pathname = usePathname();

  return (
    <aside className="lg:h-full lg:min-h-0 lg:self-stretch">
      <div className="flex h-full overflow-hidden border border-[#b9d7ff] bg-[#1F6FEB] shadow-md lg:w-[344px] lg:flex-col lg:rounded-none lg:border-y-0 lg:border-l-0">
        <div className="min-w-[300px] border-r border-white/15 px-4 py-4 text-white lg:min-w-0 lg:border-b lg:border-r-0">
          <Link href="/enterprise/manage" className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
              <img src="/logo-icon.png" alt="AI VeriGoods" className="h-7 w-7 object-contain" />
            </span>
            <span className="min-w-0">
              <img src="/verigoods-wordmark.png" alt="VeriGoods" className="h-5 w-auto max-w-[150px] object-contain brightness-110 contrast-125" />
              <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.14em] text-white/75">Enterprise Console</span>
            </span>
          </Link>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/75">Menu nghiệp vụ</p>
            <h2 className="mt-1 text-xl font-bold leading-snug">Quản lý nhanh</h2>
            <p className="mt-2 text-[11px] font-semibold leading-5 text-white/75">Điều hướng nghiệp vụ doanh nghiệp, tách riêng khỏi dashboard.</p>
          </div>
        </div>
        <nav className="flex min-w-0 flex-1 gap-2 overflow-x-auto p-3 lg:min-h-0 lg:flex-col lg:overflow-y-auto lg:pb-10">
          {items.map(item => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`feature-visual-card feature-visual-card--cyan group flex min-h-[94px] min-w-[270px] items-center gap-3 rounded-2xl border px-3.5 py-3 text-left text-white transition lg:min-w-0 ${
                  active
                    ? "border-white/55 bg-white/18 shadow-[inset_3px_0_0_rgba(255,255,255,0.85)]"
                    : "border-white/10 hover:border-white/40 hover:bg-white/10"
                } ${item.locked ? "opacity-75" : ""}`}
                title={`${item.title} - ${item.action} - ${item.status}`}
              >
                <span className="feature-card-visual"><span className="feature-card-visual__icon material-symbols-outlined">{item.icon}</span></span>
                <span className="material-symbols-outlined flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white text-[22px] text-[#1F6FEB] shadow-sm">
                  {item.locked ? "lock" : item.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold leading-5" style={wrapText}>{item.title}</span>
                  <span className="mt-1 block text-[11px] font-semibold leading-snug text-white/75" style={wrapText}>{item.action}</span>
                  <span className="mt-2 inline-flex max-w-full rounded-full border border-white/18 bg-white/12 px-2 py-0.5 text-[10px] font-semibold leading-4 text-white/85" style={wrapText}>
                    {item.status}
                  </span>
                </span>
                <span className="material-symbols-outlined shrink-0 text-[18px] text-white/85 transition group-hover:translate-x-0.5">chevron_right</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

export default function EnterpriseManagePage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const tr = (vi: string, en: string) => (lang === "en" ? en : vi);
  const [data, setData] = useState<ManageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadingMissing, setUploadingMissing] = useState<KycDocumentField | null>(null);
  const [missingNotice, setMissingNotice] = useState("");

  useEffect(() => {
    document.body.classList.add("enterprise-manage-route");
    return () => document.body.classList.remove("enterprise-manage-route");
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/enterprise/manage", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        if (res.status === 403) {
          if (alive) setError(json.error || "Tài khoản hiện tại không có quyền mở trang quản lý doanh nghiệp");
          return;
        }
        if (!res.ok) throw new Error(json.error || "Không tải được dữ liệu quản lý");
        if (alive) {
          setData(json);
          if (json.me?.userRole) localStorage.setItem("userRole", json.me.userRole);
          if (json.me?.vaiTroCty) localStorage.setItem("vaiTroCty", json.me.vaiTroCty);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [router]);

  const canManagePeople = data?.me.vaiTroCty === "company_admin" || data?.me.userRole === "admin";
  const canInput = data?.me.userRole === "admin" || ["company_admin", "staff_input"].includes(data?.me.vaiTroCty || "");
  const canWarehouse = data?.me.userRole === "admin" || ["company_admin", "warehouse", "staff_input"].includes(data?.me.vaiTroCty || "");

  const uploadMissingDocument = async (field: KycDocumentField, file: File) => {
    const label = field === "giayphep_url" ? "Giấy phép kinh doanh" : "CCCD/CMND người đại diện";
    setUploadingMissing(field);
    setMissingNotice("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "kyc");
      fd.append("kycField", field);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
      const uploadJson = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) throw new Error(uploadJson.error || "Không upload được file");

      const updateRes = await fetch("/api/kyc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_info", [field]: uploadJson.url }),
      });
      const updateJson = await updateRes.json().catch(() => ({}));
      if (!updateRes.ok) throw new Error(updateJson.error || "Không lưu được giấy tờ");

      setData(prev => {
        if (!prev) return prev;
        const company = { ...prev.company, ...(updateJson.company || {}), [field]: uploadJson.url };
        const completed = profileFieldLabels.filter(item => isProfileFieldComplete(item.key, company[item.key])).length;
        const total = profileFieldLabels.length;
        return {
          ...prev,
          company,
          profileCompletion: {
            completed,
            total,
            percent: Math.round((completed / total) * 100),
          },
        };
      });
      setMissingNotice(`Đã bổ sung ${label}.`);
    } catch (e) {
      setMissingNotice(e instanceof Error ? e.message : "Không bổ sung được giấy tờ");
    } finally {
      setUploadingMissing(null);
    }
  };

  const modules = useMemo<ModuleItem[]>(() => {
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
        title: "Sản phẩm & mục hàng",
        desc: "Tạo sản phẩm, khai báo mục hàng, sinh hoặc import mã QR/barcode.",
        icon: "inventory_2",
        href: "/dashboard/inventory",
        action: canInput ? "Quản lý kho dữ liệu" : "Chỉ xem",
        status: `${fmt.format(data.stats.products)} SP - ${fmt.format(data.stats.batches)} mục`,
        locked: !canInput && !canWarehouse,
      },
      {
        title: "Chứng nhận & giấy phép",
        desc: "Tải chứng nhận ISO/HACCP/GMP/VietGAP và giấy phép lưu hành.",
        icon: "workspace_premium",
        href: "/dashboard/certificates",
        action: canInput ? "Bổ sung chứng nhận" : "Xem chứng nhận",
        status: `${fmt.format(data.stats.certificates)} CN - ${fmt.format(data.stats.licenses)} GPLH`,
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
        status: `${fmt.format(data.stats.members)} người`,
        locked: !canManagePeople,
      },
      {
        title: "Báo cáo & giám sát",
        desc: "Xem lượt quét, cảnh báo, báo cáo vận hành và dữ liệu nghi vấn.",
        icon: "analytics",
        href: "/dashboard/analytics",
        action: "Xem báo cáo",
        status: `${fmt.format(data.stats.openAlerts)} cảnh báo`,
        locked: false,
      },
    ];
  }, [canInput, canManagePeople, canWarehouse, data]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef5fb]">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-[#1F6FEB] border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center bg-[#eef5fb] px-4 text-center">
        <span className="material-symbols-outlined mb-3 text-5xl text-red-500">error</span>
        <h1 className="text-xl font-bold text-slate-950">{tr("Không mở được trang quản lý", "Cannot open management page")}</h1>
        <p className="mt-2 text-sm text-slate-600">{error || "Không có dữ liệu"}</p>
        <Link href="/dashboard" className="mt-4 rounded-xl bg-[#1F6FEB] px-4 py-2 text-sm font-bold text-white">Về bảng điều khiển</Link>
      </div>
    );
  }

  const companyStatus = statusText[data.company.trangThai] || data.company.trangThai;
  const role = roleMeta[data.me.vaiTroCty] || roleMeta.viewer;
  const companyName =
    (!isCompanyNamePlaceholder(data.company.ten) ? data.company.ten?.trim() : "") ||
    data.company.thuongHieu?.trim() ||
    (data.company.maSoThue ? `Doanh nghiệp MST ${data.company.maSoThue}` : "Doanh nghiệp chưa đặt tên");
  const displayedCompleted = profileFieldLabels.filter(item => isProfileFieldComplete(item.key, data.company[item.key])).length;
  const displayedTotal = profileFieldLabels.length;
  const displayedPercent = Math.round((displayedCompleted / displayedTotal) * 100);
  const missingProfileFields = profileFieldLabels.filter(field => !isProfileFieldComplete(field.key, data.company[field.key]));
  const pendingBatches = data.statusBreakdown.batches.pending_review || 0;
  const readyBatches = data.statusBreakdown.batches.ready || data.statusBreakdown.batches.active || 0;
  const distributedBatches = data.statusBreakdown.batches.distributed || 0;

  return (
    <main className="min-h-screen bg-[#eef5fb] pb-24 text-slate-950 lg:h-screen lg:min-h-0 lg:overflow-hidden lg:pb-0">
      <div className="lg:grid lg:h-full lg:min-h-0 lg:grid-cols-[344px_minmax(0,1fr)]">
        <OperationNav items={modules} />

        <div className="min-w-0 p-4 sm:p-6 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:p-6 lg:pb-36 xl:p-7 xl:pb-36">
        <header className="mb-6 grid gap-5 rounded-3xl border border-[#cfe1f4] bg-white/80 p-5 shadow-sm lg:grid-cols-[minmax(0,1fr)_minmax(360px,430px)] lg:items-stretch">
          <div className="flex min-w-0 flex-col justify-center">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#1F6FEB]">Enterprise Console</p>
            <h1 className="enterprise-manage-title mt-1 max-w-3xl text-[28px] font-bold leading-[1.22] tracking-normal text-slate-950 sm:text-[36px]">
              {companyName}
            </h1>
            <p className="mt-1 text-sm font-medium text-[#477399]">
              {data.company.thuongHieu || tr("Hồ sơ doanh nghiệp", "Enterprise profile")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusPill>MST: {data.company.maSoThue}</StatusPill>
              <StatusPill tone={data.company.trangThai === "verified" ? "green" : "amber"}>{companyStatus}</StatusPill>
              <StatusPill tone="slate">
                <span className="material-symbols-outlined mr-1 text-[14px]">{role.icon}</span>
                {role.label}
              </StatusPill>
            </div>
            <div className="mt-4 grid gap-2 text-xs font-semibold text-[#477399] sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-[#dbeafe] bg-[#f8fbff] px-3 py-2">
                <span className="block text-[10px] font-bold uppercase text-[#1F6FEB]">Email</span>
                <span className="block break-words">{data.company.email || "Chưa có"}</span>
              </div>
              <div className="rounded-xl border border-[#dbeafe] bg-[#f8fbff] px-3 py-2">
                <span className="block text-[10px] font-bold uppercase text-[#1F6FEB]">Hotline</span>
                <span className="block break-words">{data.company.hotline || "Chưa có"}</span>
              </div>
              <div className="rounded-xl border border-[#dbeafe] bg-[#f8fbff] px-3 py-2">
                <span className="block text-[10px] font-bold uppercase text-[#1F6FEB]">Website</span>
                <span className="block break-words">{data.company.website || "Chưa có"}</span>
              </div>
              <div className="rounded-xl border border-[#dbeafe] bg-[#f8fbff] px-3 py-2">
                <span className="block text-[10px] font-bold uppercase text-[#1F6FEB]">VSIC</span>
                <span className="block break-words">{data.company.nganh_VSIC || "Chưa có"}</span>
              </div>
            </div>
            <div className="mt-2 rounded-xl border border-[#dbeafe] bg-[#f8fbff] px-3 py-2 text-xs font-semibold text-[#477399]">
              <span className="block text-[10px] font-bold uppercase text-[#1F6FEB]">Địa chỉ</span>
              <span className="block" style={softClamp}>{data.company.diaChi || "Chưa có"}</span>
            </div>
          </div>

          <div className="w-full self-start rounded-2xl border border-[#dbeafe] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-[#477399]">Hoàn thiện hồ sơ</span>
              <span className="text-xl font-extrabold text-[#1F6FEB]">{displayedPercent}%</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#e6f0fb]">
              <div className="h-full rounded-full bg-[#1F6FEB]" style={{ width: `${displayedPercent}%` }} />
            </div>
            <p className="mt-2 text-xs font-semibold text-[#477399]">{displayedCompleted}/{displayedTotal} trường quan trọng đã có dữ liệu.</p>
            {missingProfileFields.length > 0 && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-[11px] font-bold uppercase text-amber-700">Còn thiếu</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {missingProfileFields.map(field => {
                    const href = profileFieldTargets[field.key] || "/dashboard/kyc";
                    const docField: KycDocumentField | null =
                      field.key === "giayphep_url" || field.key === "cmnd_url" ? field.key : null;
                    if (docField) {
                      const isUploading = uploadingMissing === docField;
                      return (
                        <label
                          key={field.key}
                          className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold transition ${
                            isUploading
                              ? "border-amber-300 bg-amber-100 text-amber-700"
                              : "border-amber-200 bg-white text-amber-800 hover:border-amber-400 hover:bg-amber-100"
                          }`}
                          title={`Bổ sung trực tiếp ${field.label}`}
                        >
                          {isUploading ? "Đang tải..." : field.label}
                          <span className="material-symbols-outlined text-[12px]">{isUploading ? "progress_activity" : "upload_file"}</span>
                          <input
                            type="file"
                            accept=".pdf,image/jpeg,image/png,image/webp"
                            className="hidden"
                            disabled={!!uploadingMissing}
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) uploadMissingDocument(docField, file);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      );
                    }
                    return (
                      <Link
                        key={field.key}
                        href={href}
                        className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white px-2 py-1 text-[10px] font-bold text-amber-800 transition hover:border-amber-400 hover:bg-amber-100"
                        title={`Bổ sung ${field.label}`}
                      >
                        {field.label}
                        <span className="material-symbols-outlined text-[12px]">edit</span>
                      </Link>
                    );
                  })}
                </div>
                {missingNotice && <p className="mt-2 text-[11px] font-semibold text-amber-800">{missingNotice}</p>}
              </div>
            )}
          </div>
        </header>

          <div className="min-w-0">
            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              <StatCard icon="inventory_2" label="Sản phẩm" value={data.stats.products} tag="SKU" href="/dashboard/inventory" />
              <StatCard icon="qr_code_2" label="Mục hàng" value={data.stats.batches} tag="MỤC" href="/dashboard/inventory" />
              <StatCard icon="qr_code_scanner" label="Mã định danh" value={data.stats.totalUid} tag="UID" href="/dashboard/inventory" tone="green" />
              <StatCard icon="workspace_premium" label="Chứng nhận" value={data.stats.certificates} tag="CERT" href="/dashboard/certificates" tone="amber" />
              <StatCard icon="groups" label="Nhân sự" value={data.stats.members} tag="TEAM" href="/dashboard/team" />
              <StatCard icon="warning" label="Cảnh báo mở" value={data.stats.openAlerts} tag="ALERT" href="/dashboard/alerts" tone={data.stats.openAlerts ? "red" : "green"} />
            </div>

        {data.recommendations.length > 0 && (
          <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-800">
              <span className="material-symbols-outlined text-[20px]">tips_and_updates</span>
              Việc nên xử lý tiếp theo
            </h2>
            <div className="grid gap-2 md:grid-cols-2">
              {data.recommendations.map((item, index) => (
                <div key={index} className="flex gap-2 rounded-xl bg-white/80 p-3 text-sm font-semibold text-amber-900">
                  <span className="material-symbols-outlined text-[18px]">arrow_right_alt</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>
        )}

            <div className="grid items-start gap-5 xl:grid-cols-2">
          <AdminPanel
            title="Sản phẩm gần đây"
            icon="inventory_2"
            action={<Link href="/dashboard/inventory" className="text-xs font-bold text-[#1F6FEB]">Quản lý tất cả</Link>}
          >
            {data.products.length ? data.products.map(item => (
              <DataRow
                key={item.id}
                href="/dashboard/inventory"
                icon="inventory"
                title={item.ten}
                meta={`${item.maSKU}${item.GTIN ? ` - GTIN ${item.GTIN}` : ""}${item.nhomSanPham ? ` - ${item.nhomSanPham}` : ""}`}
                right={<StatusPill>{item._count.loHangs} mục</StatusPill>}
              />
            )) : <p className="rounded-xl border border-dashed border-[#bfdbfe] p-5 text-center text-sm text-[#477399]">Chưa có sản phẩm. Hãy tạo sản phẩm đầu tiên.</p>}
          </AdminPanel>

          <AdminPanel
            title="Mục hàng & phân phối"
            icon="qr_code_2"
            action={<Link href="/dashboard/distribution" className="text-xs font-bold text-[#1F6FEB]">Theo dõi phân phối</Link>}
          >
            <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs font-bold">
              <div className="rounded-xl bg-amber-50 p-2 text-amber-700">{pendingBatches} chờ duyệt</div>
              <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">{readyBatches} sẵn sàng</div>
              <div className="rounded-xl bg-blue-50 p-2 text-blue-700">{distributedBatches} đã phân phối</div>
            </div>
            {data.batches.slice(0, 7).map(item => {
              const left = daysLeft(item.hanDung);
              return (
                <DataRow
                  key={item.id}
                  href="/dashboard/distribution"
                  icon="deployed_code"
                  title={`${item.maLo} - ${item.sanPham.ten}`}
                  meta={`HSD ${d(item.hanDung)} - ${fmt.format(item.soLuong)} tem - ${statusText[item.trangThai] || item.trangThai}`}
                  right={left !== null && left <= 30 ? <StatusPill tone="red">{left < 0 ? "Hết hạn" : `${left} ngày`}</StatusPill> : undefined}
                />
              );
            })}
            {!data.batches.length && <p className="rounded-xl border border-dashed border-[#bfdbfe] p-5 text-center text-sm text-[#477399]">Chưa có mục hàng.</p>}
          </AdminPanel>

          <AdminPanel
            title="Chứng nhận & giấy phép"
            icon="workspace_premium"
            action={<Link href="/dashboard/certificates" className="text-xs font-bold text-[#1F6FEB]">Mở chứng nhận</Link>}
          >
            {[...data.certificates.slice(0, 5).map(item => ({
              id: `cert-${item.id}`,
              title: `${item.loai} - ${item.soChungNhan}`,
              meta: `${item.sanPham?.ten || item.loHang?.maLo || "Hồ sơ DN"} - HSD ${d(item.ngayHetHan)}`,
              status: statusText[item.trangThaiDuyet] || item.trangThaiDuyet,
            })), ...data.licenses.slice(0, 3).map(item => ({
              id: `lic-${item.id}`,
              title: item.tenGiayPhep,
              meta: `${item.soGiayPhep} - HSD ${d(item.ngayHetHan)}`,
              status: statusText[item.trangThai] || item.trangThai,
            }))].map(item => (
              <DataRow key={item.id} href="/dashboard/certificates" icon="verified" title={item.title} meta={item.meta} right={<StatusPill tone="blue">{item.status}</StatusPill>} />
            ))}
            {!data.certificates.length && !data.licenses.length && <p className="rounded-xl border border-dashed border-[#bfdbfe] p-5 text-center text-sm text-[#477399]">Chưa có chứng nhận hoặc giấy phép.</p>}
          </AdminPanel>

          <AdminPanel
            title="Nhân sự nội bộ"
            icon="groups"
            action={<Link href="/dashboard/team" className="text-xs font-bold text-[#1F6FEB]">Mời nhân viên</Link>}
          >
            {data.members.slice(0, 7).map(item => (
              <DataRow
                key={item.id}
                href="/dashboard/team"
                icon="person"
                title={item.ten || item.email}
                meta={`${item.email} - ${roleMeta[item.vaiTroCty || "viewer"]?.label || item.vaiTroCty || "Chưa gán"}`}
                right={<StatusPill tone={item.trangThai === "active" ? "green" : "red"}>{statusText[item.trangThai] || item.trangThai}</StatusPill>}
              />
            ))}
            {data.invites.length > 0 && <p className="pt-3 text-xs font-bold text-amber-700">{data.invites.length} lời mời đang chờ chấp nhận.</p>}
          </AdminPanel>

          <AdminPanel title="Luồng vận hành" icon="route">
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                ["1", "DN gửi hồ sơ", data.company.trangThai === "verified" ? "done" : "current"],
                ["2", "Admin duyệt", data.company.trangThai === "verified" ? "done" : "pending"],
                ["3", "Tạo sản phẩm/mục", data.stats.batches > 0 ? "done" : data.stats.products > 0 ? "current" : "pending"],
                ["4", "Sinh/import mã", data.stats.totalUid > 0 ? "done" : "pending"],
                ["5", "Gửi đơn phân phối", data.distributionOrders.length > 0 ? "done" : "pending"],
                ["6", "Đối tác xác nhận", (data.statusBreakdown.distribution.ready || data.statusBreakdown.distribution.distributed) ? "done" : "pending"],
              ].map(([num, label, state]) => (
                <div key={num} className={`rounded-xl border p-3 ${state === "done" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : state === "current" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-[#dbeafe] bg-[#f8fbff] text-[#477399]"}`}>
                  <p className="text-[10px] font-bold uppercase">Bước {num}</p>
                  <p className="mt-1 text-sm font-bold">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-[#dbeafe] bg-[#f8fbff] p-3 text-xs font-semibold leading-5 text-[#477399]">
              Luồng này tóm tắt đường đi nghiệp vụ từ hồ sơ KYC đến tạo mục hàng, sinh mã, gửi phân phối và đối tác xác nhận.
            </div>
          </AdminPanel>

          <AdminPanel title="Theo dõi gần đây" icon="monitoring">
            {data.recentScans.slice(0, 5).map(item => (
              <DataRow
                key={item.id}
                href="/dashboard/analytics"
                icon="qr_code_scanner"
                title={item.maDinhDanh?.loHang?.sanPham.ten || item.uid}
                meta={`${item.ketQua} - ${d(item.thoiGian)} - ${item.maDinhDanh?.loHang?.maLo || "N/A"}`}
              />
            ))}
            {data.recentAlerts.slice(0, 3).map(item => (
              <DataRow
                key={item.id}
                href="/dashboard/alerts"
                icon="warning"
                title={item.moTa}
                meta={`${item.mucDo} - ${d(item.thoiGian)}`}
                right={<span className="rounded-full border border-red-300 bg-red-100 px-2.5 py-1 text-[10px] font-bold text-red-700 shadow-sm">Cảnh báo</span>}
              />
            ))}
            {!data.recentScans.length && !data.recentAlerts.length && <p className="rounded-xl border border-dashed border-[#bfdbfe] p-5 text-center text-sm text-[#477399]">Chưa có hoạt động gần đây.</p>}
          </AdminPanel>
        </div>
        </div>
        </div>
      </div>
    </main>
  );
}

