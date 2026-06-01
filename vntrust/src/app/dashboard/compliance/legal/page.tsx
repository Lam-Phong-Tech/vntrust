"use client";
// Sprint 4 — Trang Tuân thủ Pháp lý
// Surface 10 mục Luật VN theo Tài liệu nghiệp vụ §III.10:
//   §III.10.1 — Luật Bảo vệ Dữ liệu Cá nhân 2025 (hiệu lực 1/1/2026)
//   §III.10.2 — Luật An ninh mạng
//   §III.10.3 — Luật Dữ liệu 2025 (hiệu lực 1/7/2025)
// + Data classification system (3 mức: Cơ bản / Nhạy cảm / Quan trọng)

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

type LegalStatus = "compliant" | "partial" | "missing";
interface LegalItem {
  id: string;
  reqVi: string;
  reqEn: string;
  designVi: string;
  designEn: string;
  status: LegalStatus;
  evidenceVi: string;
  evidenceEn: string;
}

interface LegalLaw {
  id: string;
  titleVi: string;
  titleEn: string;
  effectiveDate: string;
  items: LegalItem[];
}

// ── 3 Luật chính + 10+ requirements per doc §III.10 ────────────
const LEGAL_LAWS: LegalLaw[] = [
  {
    id: "bvdlcn-2025",
    titleVi: "Luật Bảo vệ Dữ liệu Cá nhân 2025",
    titleEn: "Personal Data Protection Law 2025",
    effectiveDate: "2026-01-01",
    items: [
      {
        id: "BVDLCN-1",
        reqVi: "Sự đồng ý của chủ thể dữ liệu",
        reqEn: "Data subject consent",
        designVi: "Form báo cáo có 3 chế độ riêng (Ẩn danh / Có liên hệ / Công khai) cho từng mục đích sử dụng",
        designEn: "Report form has 3 distinct modes (Anonymous / With contact / Public) per purpose",
        status: "compliant",
        evidenceVi: "/dashboard/report — Bước 4 'Chế độ báo cáo'",
        evidenceEn: "/dashboard/report — Step 4 'Report mode'",
      },
      {
        id: "BVDLCN-2",
        reqVi: "Thông báo mục đích xử lý",
        reqEn: "Purpose notification",
        designVi: "Hiển thị banner 'Bảo mật danh tính hoàn toàn' giải thích rõ lý do thu thập email/SĐT",
        designEn: "Privacy banner explains exactly why email/phone are collected",
        status: "compliant",
        evidenceVi: "Banner gold ở đầu form /dashboard/report",
        evidenceEn: "Gold banner at top of /dashboard/report",
      },
      {
        id: "BVDLCN-3",
        reqVi: "Mã hóa dữ liệu nhạy cảm",
        reqEn: "Sensitive data encryption",
        designVi: "AES-256-GCM cho Email/SĐT, SHA-256+Salt cho CCCD. Key lưu env riêng biệt với DB",
        designEn: "AES-256-GCM for Email/Phone, SHA-256+Salt for CCCD. Key stored in env separate from DB",
        status: "compliant",
        evidenceVi: "src/lib/vaultCrypto.ts + /api/vault/identity",
        evidenceEn: "src/lib/vaultCrypto.ts + /api/vault/identity",
      },
      {
        id: "BVDLCN-4",
        reqVi: "Đánh giá tác động bảo vệ dữ liệu (DPIA)",
        reqEn: "Data Protection Impact Assessment (DPIA)",
        designVi: "Trang này (compliance/legal) đóng vai trò DPIA — liệt kê đầy đủ mục đích, rủi ro, biện pháp",
        designEn: "This page (compliance/legal) serves as DPIA — full enumeration of purpose, risks, mitigation",
        status: "partial",
        evidenceVi: "/dashboard/compliance/legal — đầy đủ checklist nhưng chưa có signed PDF",
        evidenceEn: "/dashboard/compliance/legal — full checklist but no signed PDF yet",
      },
      {
        id: "BVDLCN-5",
        reqVi: "Bổ nhiệm DPO (Data Protection Officer)",
        reqEn: "Appoint DPO",
        designVi: "Admin role có quyền truy cập Vault + xem báo cáo điều tra. DPO contact: legal@vntrust.vn",
        designEn: "Admin role has Vault access + report investigation rights. DPO contact: legal@vntrust.vn",
        status: "partial",
        evidenceVi: "Chưa có user role 'DPO' riêng — hiện gộp vào 'admin'",
        evidenceEn: "No dedicated 'DPO' role yet — folded into 'admin'",
      },
      {
        id: "BVDLCN-6",
        reqVi: "Xoay vòng key mã hóa 90 ngày",
        reqEn: "90-day key rotation",
        designVi: "Cron `/api/cron/key-rotation-check` chạy thứ 2 hằng tuần; tạo CanhBao khi tới hạn",
        designEn: "Cron `/api/cron/key-rotation-check` runs every Mon; creates alert when due",
        status: "compliant",
        evidenceVi: "Crontab `0 4 * * 1` + src/lib/vaultCrypto.ts VAULT_KEY_VERSION",
        evidenceEn: "Crontab `0 4 * * 1` + src/lib/vaultCrypto.ts VAULT_KEY_VERSION",
      },
      {
        id: "BVDLCN-7",
        reqVi: "Auto-xóa anonymous session sau 30 ngày",
        reqEn: "Auto-purge anonymous sessions after 30 days",
        designVi: "Cron `/api/cron/purge-sessions` chạy hằng ngày 03:00, xoá OTP_STORE + system logs > 30d",
        designEn: "Cron `/api/cron/purge-sessions` runs daily 03:00, purges OTP_STORE + system logs > 30d",
        status: "compliant",
        evidenceVi: "Crontab `0 3 * * *`",
        evidenceEn: "Crontab `0 3 * * *`",
      },
    ],
  },
  {
    id: "anninhmang",
    titleVi: "Luật An ninh mạng",
    titleEn: "Cybersecurity Law",
    effectiveDate: "2019-01-01",
    items: [
      {
        id: "ANM-1",
        reqVi: "Lưu trữ dữ liệu trong nước",
        reqEn: "Domestic data storage",
        designVi: "Dữ liệu người dùng VN lưu trên VPS đặt tại VN (45.119.83.233 / Tailoc Hosting)",
        designEn: "VN user data stored on VPS in Vietnam (45.119.83.233 / Tailoc Hosting)",
        status: "compliant",
        evidenceVi: "VPS Vietnam · IP 45.119.83.233",
        evidenceEn: "VPS Vietnam · IP 45.119.83.233",
      },
      {
        id: "ANM-2",
        reqVi: "Bảo vệ bí mật thông tin",
        reqEn: "Information confidentiality",
        designVi: "TLS 1.3 in-transit (Nginx) + AES-256-GCM at-rest (Vault) + RBAC + audit log mọi truy cập",
        designEn: "TLS 1.3 in-transit (Nginx) + AES-256-GCM at-rest (Vault) + RBAC + audit log all access",
        status: "compliant",
        evidenceVi: "Nginx HSTS, vaultCrypto.ts, src/middleware.ts security headers",
        evidenceEn: "Nginx HSTS, vaultCrypto.ts, src/middleware.ts security headers",
      },
      {
        id: "ANM-3",
        reqVi: "Ngăn chặn nội dung vi phạm",
        reqEn: "Block violating content",
        designVi: "Rate limiting (10 req/60s auth, 5 reports/10min/IP) + AI anomaly detection",
        designEn: "Rate limiting (10 req/60s auth, 5 reports/10min/IP) + AI anomaly detection",
        status: "compliant",
        evidenceVi: "src/middleware.ts rateLimit() + /api/cron/escalate AI",
        evidenceEn: "src/middleware.ts rateLimit() + /api/cron/escalate AI",
      },
    ],
  },
  {
    id: "lds-2025",
    titleVi: "Luật Dữ liệu 2025",
    titleEn: "Data Law 2025",
    effectiveDate: "2025-07-01",
    items: [
      {
        id: "LDS-1",
        reqVi: "Phân loại dữ liệu (Cơ bản / Nhạy cảm / Quan trọng)",
        reqEn: "Data classification (Basic / Sensitive / Critical)",
        designVi: "Hệ thống tag 3 mức: Cơ bản (tên SP, công khai) · Nhạy cảm (email, SĐT - encrypted) · Quan trọng (CCCD - hashed)",
        designEn: "3-tier tag system: Basic (product name, public) · Sensitive (email, phone - encrypted) · Critical (CCCD - hashed)",
        status: "partial",
        evidenceVi: "Phân loại implicit qua vault structure, chưa có UI tag rõ ràng cho từng field",
        evidenceEn: "Classification implicit via vault structure, no explicit per-field UI tag yet",
      },
      {
        id: "LDS-2",
        reqVi: "Báo cáo đánh giá tác động chuyển giao xuyên biên giới (DTIA)",
        reqEn: "Cross-border Transfer Impact Assessment (DTIA)",
        designVi: "Hệ thống KHÔNG chuyển giao dữ liệu xuyên biên giới — server VN (45.119.83.233), DB SQLite local, không có CDN nước ngoài, integrations chỉ với gov VN",
        designEn: "System does NOT transfer data cross-border — VN server (45.119.83.233), local SQLite DB, no foreign CDN, integrations only with VN gov agencies",
        status: "compliant",
        evidenceVi: "DTIA: N/A vì không có cross-border transfer. Khi có nhu cầu international, sẽ kích hoạt DTIA template tại /dashboard/compliance/legal#dtia",
        evidenceEn: "DTIA: N/A as no cross-border transfer. International expansion will trigger DTIA template at /dashboard/compliance/legal#dtia",
      },
      {
        id: "LDS-3",
        reqVi: "Tokenization Vault cho dữ liệu địa chỉ (§III.4)",
        reqEn: "Tokenization Vault for address data (§III.4)",
        designVi: "Endpoint /api/vault/tokenization: address plaintext → token TKN-xxx, lưu encrypted trong vault. Detokenize yêu cầu admin + court order ref.",
        designEn: "Endpoint /api/vault/tokenization: address plaintext → token TKN-xxx, stored encrypted in vault. Detokenize requires admin + court order ref.",
        status: "compliant",
        evidenceVi: "src/app/api/vault/tokenization/route.ts (Sprint 6/D3)",
        evidenceEn: "src/app/api/vault/tokenization/route.ts (Sprint 6/D3)",
      },
      {
        id: "LDS-4",
        reqVi: "Microservices logical split + mTLS nội bộ (§III.7-8)",
        reqEn: "Microservices logical split + internal mTLS (§III.7-8)",
        designVi: "4 service modules tại src/services/: reportIngestion, identityService, anonymizationService, apiGateway. HMAC-SHA256 signed inter-service requests (simulate mTLS).",
        designEn: "4 service modules in src/services/: reportIngestion, identityService, anonymizationService, apiGateway. HMAC-SHA256 signed inter-service requests (mTLS simulation).",
        status: "compliant",
        evidenceVi: "GET /api/microservices/pipeline → trả về architecture metadata + 4 service boundaries (Sprint 6/D1+D2)",
        evidenceEn: "GET /api/microservices/pipeline → returns architecture metadata + 4 service boundaries (Sprint 6/D1+D2)",
      },
    ],
  },
];

// ── Data classification 3 tiers ────────────────────────────────
const CLASSIFICATION_TIERS = [
  {
    level: "basic",
    labelVi: "Cơ bản",
    labelEn: "Basic",
    color: "bg-[#4A7C5C]/15 text-[#6FB585] border-[#4A7C5C]/30",
    examplesVi: ["Tên sản phẩm", "SKU", "Hình ảnh sản phẩm", "Mã lô (maLo)", "Thông tin doanh nghiệp công khai"],
    examplesEn: ["Product name", "SKU", "Product image", "Batch code", "Public business info"],
    storageVi: "Lưu plaintext trong DB chính",
    storageEn: "Plain in main DB",
    accessVi: "Public read",
    accessEn: "Public read",
  },
  {
    level: "sensitive",
    labelVi: "Nhạy cảm",
    labelEn: "Sensitive",
    color: "bg-[#C8A557]/15 text-[#C8A557] border-[#C8A557]/30",
    examplesVi: ["Email người dùng", "Số điện thoại", "Địa chỉ", "Hotline DN", "Nội dung báo cáo nghi vấn"],
    examplesEn: ["User email", "Phone", "Address", "Business hotline", "Report content"],
    storageVi: "AES-256-GCM tại Identity Vault + Report Vault",
    storageEn: "AES-256-GCM in Identity Vault + Report Vault",
    accessVi: "Authenticated only, audit logged",
    accessEn: "Authenticated only, audit logged",
  },
  {
    level: "critical",
    labelVi: "Quan trọng",
    labelEn: "Critical",
    color: "bg-red-500/15 text-red-300 border-red-500/30",
    examplesVi: ["CCCD/CMND", "Mã định danh người dùng", "Khóa AES master", "Token reset password"],
    examplesEn: ["CCCD/ID Card", "User identity hash", "AES master key", "Password reset token"],
    storageVi: "SHA-256+Salt (one-way) hoặc env-only, không lưu DB",
    storageEn: "SHA-256+Salt (one-way) or env-only, never in DB",
    accessVi: "Admin + court order; auto-purge after 30 days",
    accessEn: "Admin + court order; auto-purge after 30 days",
  },
];

const STATUS_STYLE: Record<LegalStatus, { cls: string; icon: string; labelVi: string; labelEn: string }> = {
  compliant: { cls: "text-[#6FB585] bg-[#4A7C5C]/15 border-[#4A7C5C]/30", icon: "check_circle", labelVi: "Tuân thủ",        labelEn: "Compliant" },
  partial:   { cls: "text-[#C8A557] bg-[#C8A557]/15 border-[#C8A557]/30", icon: "pending",      labelVi: "Đang triển khai", labelEn: "In progress" },
  missing:   { cls: "text-red-300 bg-red-500/15 border-red-500/30",         icon: "error",        labelVi: "Còn thiếu",       labelEn: "Missing" },
};

export default function LegalCompliancePage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const tr = (vi: string, en: string) => (lang === 'en' ? en : vi);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [activeLaw, setActiveLaw] = useState<string>(LEGAL_LAWS[0].id);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (!role) { router.replace("/login"); return; }
    if (role !== "admin") { router.replace("/dashboard"); return; }
    setUserRole(role);
  }, [router]);

  if (!userRole) return null;

  // Compute summary stats
  const allItems = LEGAL_LAWS.flatMap(l => l.items);
  const stats = {
    total:     allItems.length,
    compliant: allItems.filter(i => i.status === "compliant").length,
    partial:   allItems.filter(i => i.status === "partial").length,
    missing:   allItems.filter(i => i.status === "missing").length,
  };
  const compliancePct = Math.round((stats.compliant / stats.total) * 100);

  const currentLaw = LEGAL_LAWS.find(l => l.id === activeLaw)!;

  return (
    <div className="min-h-[calc(100vh-80px)] p-4 sm:p-6 md:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard" className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-2">
          <span className="material-symbols-outlined text-[14px]">arrow_back</span> {tr("Bảng điều khiển", "Dashboard")}
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#C8A557]/20 border border-[#C8A557]/30 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[#C8A557] text-xl sm:text-2xl">gavel</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white font-display leading-tight">
              {tr("Tuân thủ Pháp lý", "Legal Compliance")}
            </h1>
            <p className="text-[11px] sm:text-sm text-slate-400 mt-0.5 leading-tight">
              {tr("Luật BVDLCN 2025 · Luật An ninh mạng · Luật Dữ liệu 2025", "PDPL 2025 · Cybersecurity Law · Data Law 2025")}
            </p>
          </div>
        </div>
      </div>

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="glass-panel border border-white/10 rounded-2xl p-4">
          <span className="material-symbols-outlined text-2xl text-white">verified_user</span>
          <p className="text-2xl font-black mt-1 text-white">{stats.total}</p>
          <p className="text-xs text-slate-400">{tr("Tổng yêu cầu", "Total requirements")}</p>
        </div>
        <div className="glass-panel border border-[#4A7C5C]/30 rounded-2xl p-4 bg-[#4A7C5C]/5">
          <span className="material-symbols-outlined text-2xl text-[#6FB585]">check_circle</span>
          <p className="text-2xl font-black mt-1 text-[#6FB585]">{stats.compliant}</p>
          <p className="text-xs text-slate-400">{tr("Tuân thủ", "Compliant")}</p>
        </div>
        <div className="glass-panel border border-[#C8A557]/30 rounded-2xl p-4 bg-[#C8A557]/5">
          <span className="material-symbols-outlined text-2xl text-[#C8A557]">pending</span>
          <p className="text-2xl font-black mt-1 text-[#C8A557]">{stats.partial}</p>
          <p className="text-xs text-slate-400">{tr("Đang triển khai", "In progress")}</p>
        </div>
        <div className="glass-panel border border-red-500/30 rounded-2xl p-4 bg-red-500/5">
          <span className="material-symbols-outlined text-2xl text-red-400">error</span>
          <p className="text-2xl font-black mt-1 text-red-400">{stats.missing}</p>
          <p className="text-xs text-slate-400">{tr("Còn thiếu", "Missing")}</p>
        </div>
      </div>

      {/* ── Compliance % gauge ── */}
      <div className="glass-panel border border-[#C8A557]/20 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{tr("Mức độ tuân thủ tổng thể", "Overall compliance score")}</span>
          <span className="text-xl sm:text-2xl font-black text-[#C8A557]">{compliancePct}%</span>
        </div>
        <div className="h-3 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#E4D2A1] to-[#C8A557] rounded-full transition-all" style={{ width: `${compliancePct}%` }} />
        </div>
      </div>

      {/* ── Law tabs ── */}
      <div className="flex flex-wrap gap-2 mb-5 overflow-x-auto hide-scrollbar">
        {LEGAL_LAWS.map(law => (
          <button
            key={law.id}
            onClick={() => setActiveLaw(law.id)}
            className={`shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition flex items-center gap-2 whitespace-nowrap ${
              activeLaw === law.id
                ? "bg-[#C8A557] text-[#0B1623] border-[#C8A557]"
                : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
            }`}
          >
            <span className="material-symbols-outlined text-[14px] sm:text-[16px]">menu_book</span>
            {tr(law.titleVi, law.titleEn)}
          </button>
        ))}
      </div>

      {/* ── Active law content ── */}
      <div className="space-y-3 mb-8">
        <div className="text-xs text-slate-400 flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-[14px] text-[#C8A557]">event</span>
          {tr("Hiệu lực từ", "Effective date")}: <span className="text-white font-bold">{currentLaw.effectiveDate}</span>
        </div>
        {currentLaw.items.map(item => {
          const st = STATUS_STYLE[item.status];
          return (
            <div key={item.id} className="glass-panel border border-white/10 rounded-2xl p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <span className="font-mono text-[10px] text-[#C8A557] bg-[#C8A557]/10 border border-[#C8A557]/20 px-2 py-1 rounded-lg shrink-0">{item.id}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-bold text-white leading-snug">{tr(item.reqVi, item.reqEn)}</h3>
                  </div>
                </div>
                <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${st.cls}`}>
                  <span className="material-symbols-outlined text-[14px]">{st.icon}</span>
                  {tr(st.labelVi, st.labelEn)}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{tr("Cách thiết kế đáp ứng", "Design fulfillment")}</p>
                  <p className="text-slate-200 leading-relaxed">{tr(item.designVi, item.designEn)}</p>
                </div>
                <div className="bg-[#C8A557]/5 border border-[#C8A557]/15 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-[#C8A557] uppercase tracking-wider mb-1.5">{tr("Bằng chứng / Tham chiếu", "Evidence / Reference")}</p>
                  <p className="text-slate-200 leading-relaxed font-mono text-[11px]">{tr(item.evidenceVi, item.evidenceEn)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Data classification 3 tiers ── */}
      <div className="mb-8">
        <h2 className="text-lg sm:text-xl font-bold text-white mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#C8A557]">label</span>
          {tr("Phân loại Dữ liệu (Luật Dữ liệu §III.10.3)", "Data Classification (Data Law §III.10.3)")}
        </h2>
        <p className="text-sm text-slate-400 mb-4">{tr("3 mức phân loại + ví dụ field + cơ chế lưu trữ + quyền truy cập.", "3 classification tiers + example fields + storage mechanism + access control.")}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CLASSIFICATION_TIERS.map(tier => (
            <div key={tier.level} className={`glass-panel border rounded-2xl p-4 sm:p-5 ${tier.color.split(' ').filter(c => c.startsWith('border-')).join(' ')}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${tier.color}`}>
                  {tr(tier.labelVi, tier.labelEn)}
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{tr("Ví dụ", "Examples")}</p>
              <ul className="text-xs text-slate-200 space-y-0.5 mb-3 list-disc list-inside">
                {tr(tier.examplesVi.join('|'), tier.examplesEn.join('|')).split('|').map((ex, i) => (
                  <li key={i} className="leading-tight">{ex}</li>
                ))}
              </ul>
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{tr("Lưu trữ", "Storage")}</p>
                  <p className="text-xs text-slate-200">{tr(tier.storageVi, tier.storageEn)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{tr("Quyền truy cập", "Access")}</p>
                  <p className="text-xs text-slate-200">{tr(tier.accessVi, tier.accessEn)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── D4 Sprint 6: DTIA template — cross-border data transfer ── */}
      <div id="dtia" className="glass-panel border border-[#C8A557]/20 rounded-2xl p-4 sm:p-5 mb-6">
        <h2 className="text-base sm:text-lg font-bold text-white mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#C8A557]">public</span>
          {tr("DTIA — Chuyển giao Dữ liệu Xuyên biên giới (Luật Dữ liệu §III.10.3)", "DTIA — Cross-border Data Transfer (Data Law §III.10.3)")}
        </h2>
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border bg-[#4A7C5C]/15 text-[#6FB585] border-[#4A7C5C]/30">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            {tr("Trạng thái: KHÔNG có cross-border transfer", "Status: NO cross-border transfer")}
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-3 leading-relaxed">
          {tr(
            "Hệ thống VNTrust hiện hoàn toàn nội địa hóa: server VN (Tailoc Hosting · 45.119.83.233), DB SQLite local, không CDN nước ngoài. Tất cả integrations (Hải quan, Bộ Y tế, Bộ KH&CN, Bộ Công an, QLTT, sàn TMĐT VN) đều thuộc cơ quan/đơn vị Việt Nam. Do đó hiện chưa phát sinh DTIA.",
            "VNTrust is fully domestic: VN server (Tailoc Hosting · 45.119.83.233), local SQLite DB, no foreign CDN. All integrations (Customs, MoH, MoST, Public Security, Market Mgmt, VN e-commerce) belong to VN agencies. Therefore no DTIA needed currently."
          )}
        </p>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
          <p className="text-[10px] font-bold text-[#C8A557] uppercase tracking-wider mb-2">{tr("DTIA template — kích hoạt khi expand quốc tế", "DTIA template — activate on international expansion")}</p>
          <ol className="text-xs text-slate-300 space-y-1 list-decimal list-inside">
            <li>{tr("Liệt kê dữ liệu chuyển giao (loại + khối lượng + tần suất)", "Enumerate transferred data (type + volume + frequency)")}</li>
            <li>{tr("Quốc gia tiếp nhận + đánh giá pháp lý nước đó", "Recipient country + legal framework assessment")}</li>
            <li>{tr("Mục đích chuyển giao + thời hạn lưu trữ", "Transfer purpose + retention period")}</li>
            <li>{tr("Biện pháp bảo vệ: encryption in-transit/at-rest, contractual safeguards", "Protection measures: in-transit/at-rest encryption, contractual safeguards")}</li>
            <li>{tr("Cơ chế thực thi quyền của chủ thể dữ liệu ở nước tiếp nhận", "Data subject rights enforcement mechanism in recipient country")}</li>
            <li>{tr("Đánh giá rủi ro + biện pháp giảm thiểu", "Risk assessment + mitigation measures")}</li>
            <li>{tr("Nộp Bộ Công an trước 30 ngày khi bắt đầu chuyển giao", "Submit to MPS 30 days before transfer commencement")}</li>
          </ol>
        </div>
      </div>

      {/* ── D1+D2 Sprint 6: Microservices architecture status ── */}
      <div id="microservices" className="glass-panel border border-[#C8A557]/20 rounded-2xl p-4 sm:p-5 mb-6">
        <h2 className="text-base sm:text-lg font-bold text-white mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#C8A557]">hub</span>
          {tr("Microservices Architecture (Luật BVDLCN §III.7-8)", "Microservices Architecture (PDPL §III.7-8)")}
        </h2>
        <p className="text-xs text-slate-400 mb-3 leading-relaxed">
          {tr(
            "Logical split thành 4 service modules với HMAC-signed inter-service auth (mTLS simulation). API: GET /api/microservices/pipeline",
            "Logical split into 4 service modules with HMAC-signed inter-service auth (mTLS simulation). API: GET /api/microservices/pipeline"
          )}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {[
            { name: "API Gateway",            role: tr("Orchestrator + RBAC + JWT verify", "Orchestrator + RBAC + JWT verify"),     file: "src/services/apiGateway.ts" },
            { name: "Report Ingestion",       role: tr("Tiếp nhận + validate + tạo ReportID", "Receive + validate + ReportID"),    file: "src/services/reportIngestion.ts" },
            { name: "Identity Service",       role: tr("Mã hóa/giải mã PII user", "Encrypt/decrypt user PII"),                       file: "src/services/identityService.ts" },
            { name: "Anonymization Service",  role: tr("Strip PII + blur GPS trước khi lưu", "Strip PII + blur GPS before storage"), file: "src/services/anonymizationService.ts" },
          ].map((s, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3">
              <p className="font-bold text-white">{s.name}</p>
              <p className="text-slate-300 mt-0.5">{s.role}</p>
              <p className="text-[10px] font-mono text-[#C8A557] mt-1.5 truncate">{s.file}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-3 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[14px] text-[#6FB585]">verified</span>
          {tr("Inter-service auth: HMAC-SHA256 signed headers (X-Service-Name/Timestamp/Sig) — chống replay 60s, timing-safe compare", "Inter-service auth: HMAC-SHA256 signed headers — anti-replay 60s, timing-safe compare")}
        </p>
      </div>

      {/* ── Procedure: Court order data release ── */}
      <div className="glass-panel border border-red-500/20 rounded-2xl p-4 sm:p-5">
        <h2 className="text-base sm:text-lg font-bold text-white mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-red-400">gavel</span>
          {tr("Quy trình xử lý yêu cầu từ Cơ quan chức năng (§III.9)", "Authority Data Request Procedure (§III.9)")}
        </h2>
        <p className="text-xs text-slate-400 mb-3">{tr("Điều kiện bắt buộc để giải mã dữ liệu người dùng:", "Mandatory conditions to decrypt user data:")}</p>
        <ol className="text-sm text-slate-200 space-y-1.5 list-decimal list-inside">
          <li>{tr("Có quyết định bằng văn bản của cơ quan có thẩm quyền", "Written decision from authority with jurisdiction")}</li>
          <li>{tr("Quyết định xác định rõ phạm vi thông tin cần cung cấp", "Decision specifies exact scope of data needed")}</li>
          <li>{tr("Có sự giám sát của pháp chế doanh nghiệp (DPO)", "Supervised by company legal counsel (DPO)")}</li>
          <li>{tr("Mọi hoạt động giải mã đều được ghi log đầy đủ vào NhatKy + IdentityVaultLog", "All decryption activity fully logged to NhatKy + IdentityVaultLog")}</li>
        </ol>
        <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[14px] text-red-400">contact_mail</span>
          {tr("DPO liên hệ:", "DPO contact:")} <span className="text-white font-mono">legal@vntrust.vn</span>
        </p>
      </div>
    </div>
  );
}
