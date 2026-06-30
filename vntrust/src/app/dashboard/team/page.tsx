"use client";
// UC03 — Team Management (Quản lý nhân viên DN)
// Chỉ user có vaiTroCty='company_admin' AND quyenMoiNV=true mới thấy
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

interface Member {
  id: string;
  ten: string | null;
  email: string;
  soDienThoai: string | null;
  vaiTro: string;
  vaiTroCty: string | null;
  quyenMoiNV: boolean;
  trangThai: string;
}
interface Invite {
  id: string;
  email: string;
  vaiTroCty: string;
  ngayTao: string;
  ngayHetHan: string;
  nguoiTao: { ten: string | null; email: string } | null;
}
interface ListResp {
  members: Member[];
  invites: Invite[];
  me: { userId: string; vaiTroCty: string; quyenMoiNV: boolean };
}

const SUBROLE_META: Record<string, { label: string; en: string; color: string; icon: string }> = {
  company_admin: { label: "Quản trị DN",  en: "Company Admin", color: "text-amber-300 bg-amber-500/15 border-amber-500/30",   icon: "shield_person" },
  staff_input:   { label: "Nhập liệu",    en: "Data Input",    color: "text-blue-300 bg-blue-500/15 border-blue-500/30",      icon: "edit_note" },
  warehouse:     { label: "Kho",          en: "Warehouse",     color: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30", icon: "warehouse" },
  viewer:        { label: "Chỉ xem",      en: "Viewer",        color: "text-slate-300 bg-slate-500/15 border-slate-500/30",   icon: "visibility" },
};

export default function TeamPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const tr = (vi: string, en: string) => (lang === "en" ? en : vi);

  const [userRole, setUserRole] = useState<string | null>(null);
  const [data, setData] = useState<ListResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  // Invite modal state
  const [invEmail, setInvEmail] = useState("");
  const [invRole, setInvRole] = useState("staff_input");
  const [invSubmitting, setInvSubmitting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<{ sent: boolean; error: string | null; note: string } | null>(null);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (!role) { router.replace("/login"); return; }
    if (!["manufacturer", "importer"].includes(role)) {
      router.replace("/dashboard?error=forbidden");
      return;
    }
    setUserRole(role);
  }, [router]);

  const fetchTeam = useCallback(async () => {
    if (!userRole) return;
    setLoading(true);
    try {
      const r = await fetch("/api/team", { cache: "no-store" });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Fetch failed");
      setData(json);
    } catch (e: any) {
      setToast({ msg: e.message, type: "err" });
    } finally { setLoading(false); }
  }, [userRole]);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const sendInvite = async () => {
    setInvSubmitting(true);
    try {
      const r = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: invEmail, vaiTroCty: invRole }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Invite failed");
      setGeneratedLink(json.inviteUrl);
      setEmailStatus({
        sent: !!json.emailSent,
        error: json.emailError || null,
        note: json.note || '',
      });
      await fetchTeam();
    } catch (e: any) {
      showToast(e.message, "err");
    } finally { setInvSubmitting(false); }
  };

  const changeSubRole = async (m: Member, newRole: string) => {
    if (newRole === m.vaiTroCty) return;
    setActing(m.id);
    try {
      const r = await fetch(`/api/team/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaiTroCty: newRole,
          quyenMoiNV: newRole === "company_admin",
        }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Update failed");
      showToast(tr("Đã đổi vai trò", "Role updated"));
      await fetchTeam();
    } catch (e: any) { showToast(e.message, "err"); }
    finally { setActing(null); }
  };

  const suspendMember = async (m: Member) => {
    if (!confirm(tr(`Khóa tài khoản ${m.email}?`, `Suspend ${m.email}?`))) return;
    setActing(m.id);
    try {
      const r = await fetch(`/api/team/${m.id}`, { method: "DELETE" });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Delete failed");
      showToast(tr("Đã khóa", "Suspended"));
      await fetchTeam();
    } catch (e: any) { showToast(e.message, "err"); }
    finally { setActing(null); }
  };

  const reactivate = async (m: Member) => {
    setActing(m.id);
    try {
      const r = await fetch(`/api/team/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trangThai: "active" }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Failed");
      showToast(tr("Đã mở khóa", "Reactivated"));
      await fetchTeam();
    } catch (e: any) { showToast(e.message, "err"); }
    finally { setActing(null); }
  };

  const revokeInvite = async (invId: string) => {
    if (!confirm(tr("Thu hồi lời mời?", "Revoke this invite?"))) return;
    setActing(invId);
    try {
      const r = await fetch(`/api/team/invites/${invId}`, { method: "DELETE" });
      if (!r.ok) throw new Error((await r.json()).error || "Failed");
      showToast(tr("Đã thu hồi", "Revoked"));
      await fetchTeam();
    } catch (e: any) { showToast(e.message, "err"); }
    finally { setActing(null); }
  };

  const closeInviteModal = () => {
    setShowInvite(false);
    setInvEmail("");
    setInvRole("staff_input");
    setGeneratedLink(null);
    setEmailStatus(null);
  };

  const copyLink = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      showToast(tr("Đã copy link", "Link copied"));
    } catch {}
  };

  if (!userRole) return null;
  const canInvite = data?.me.quyenMoiNV && data?.me.vaiTroCty === "company_admin";

  return (
    <div className="min-h-screen w-full max-w-[1500px] mx-auto px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8 pb-[100px] md:pb-8 overflow-x-hidden">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold text-[#C8A557] uppercase tracking-widest">{tr("Quản lý DN", "Enterprise")}</p>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display mt-1 leading-tight break-words">
            {tr("Nhân viên doanh nghiệp", "Team management")}
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            {tr("Mời nhân viên + phân quyền nội bộ DN theo UC03", "Invite staff + assign internal roles (UC03)")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <Link href="/dashboard" className="min-w-0 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center justify-center gap-1.5 text-xs">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            {tr("Quay lại", "Back")}
          </Link>
          {canInvite && (
            <button
              onClick={() => setShowInvite(true)}
              className="min-w-0 px-4 py-2 rounded-xl bg-gradient-to-r from-[#E4D2A1] to-[#C8A557] text-[#0B1623] font-bold text-sm flex items-center justify-center gap-1.5 hover:brightness-105 transition"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              {tr("Mời nhân viên", "Invite member")}
            </button>
          )}
        </div>
      </div>

      {/* Permission notice */}
      {!canInvite && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex items-start gap-2">
          <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">info</span>
          <p>{tr(
            "Bạn không có quyền mời nhân viên. Liên hệ Quản trị DN để được cấp quyền.",
            "You don't have permission to invite members. Contact your Company Admin."
          )}</p>
        </div>
      )}

      {/* Pending invites */}
      {data && data.invites.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            {tr("Lời mời đang chờ", "Pending invites")} ({data.invites.length})
          </h2>
          <div className="space-y-2">
            {data.invites.map(inv => {
              const meta = SUBROLE_META[inv.vaiTroCty] || SUBROLE_META.viewer;
              const exp = new Date(inv.ngayHetHan);
              const daysLeft = Math.max(0, Math.ceil((exp.getTime() - Date.now()) / 86400000));
              return (
                <div key={inv.id} className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">mail</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white break-all">{inv.email}</div>
                    <div className="text-[11px] text-slate-400 leading-relaxed">
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-bold border ${meta.color} text-[9px] mr-2`}>
                        {lang === "en" ? meta.en : meta.label}
                      </span>
                      {tr(`Hết hạn sau ${daysLeft} ngày`, `Expires in ${daysLeft}d`)}
                    </div>
                  </div>
                  {canInvite && (
                    <button
                      onClick={() => revokeInvite(inv.id)}
                      disabled={acting === inv.id}
                      className="w-full sm:w-auto px-2.5 py-1 rounded-lg text-[11px] font-bold border border-red-500/30 text-red-300 hover:bg-red-500/15 disabled:opacity-50"
                    >
                      {tr("Thu hồi", "Revoke")}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Members list */}
      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
        {tr("Thành viên", "Members")} ({data?.members.length || 0})
      </h2>

      {/* Desktop table */}
      <div className="hidden xl:block rounded-2xl bg-white/5 border border-white/10 overflow-hidden max-w-full">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm table-fixed">
          <thead className="bg-white/5 border-b border-white/10">
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
              <th className="w-[38%] px-4 py-3 font-bold">{tr("Thành viên", "Member")}</th>
              <th className="w-[28%] px-4 py-3 font-bold">{tr("Vai trò nội bộ", "Sub-role")}</th>
              <th className="w-[16%] px-4 py-3 font-bold">{tr("Trạng thái", "Status")}</th>
              <th className="w-[18%] px-4 py-3 font-bold text-right">{tr("Thao tác", "Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{tr("Đang tải…", "Loading…")}</td></tr>}
            {!loading && (data?.members.length || 0) === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{tr("Chưa có thành viên", "No members")}</td></tr>
            )}
            {!loading && data?.members.map(m => {
              const meta = SUBROLE_META[m.vaiTroCty || "viewer"] || SUBROLE_META.viewer;
              const isMe = m.id === data.me.userId;
              const isAct = acting === m.id;
              return (
                <tr key={m.id} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#C8A557]/15 border border-[#C8A557]/30 text-[#C8A557] flex items-center justify-center font-bold text-sm shrink-0">
                        {(m.ten || m.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-white font-bold leading-snug break-words">
                          {m.ten || m.email.split("@")[0]}
                          {isMe && <span className="ml-2 text-[10px] text-[#C8A557] font-medium">({tr("Bạn", "You")})</span>}
                        </div>
                        <div className="text-xs text-slate-400 break-all">{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {canInvite && !isMe ? (
                      <select
                        value={m.vaiTroCty || "viewer"}
                        onChange={(e) => changeSubRole(m, e.target.value)}
                        disabled={isAct}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${meta.color} cursor-pointer focus:outline-none disabled:opacity-50`}
                      >
                        {Object.entries(SUBROLE_META).map(([k, v]) => (
                          <option key={k} value={k} className="bg-[#0B1623] text-white">{lang === "en" ? v.en : v.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${meta.color}`}>
                        <span className="material-symbols-outlined text-[13px]">{meta.icon}</span>
                        {lang === "en" ? meta.en : meta.label}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold ${
                      m.trangThai === "active" ? "text-emerald-300" :
                      m.trangThai === "suspended" ? "text-red-300" : "text-amber-300"
                    }`}>
                      {m.trangThai === "active" ? tr("Hoạt động", "Active") :
                       m.trangThai === "suspended" ? tr("Đã khóa", "Suspended") :
                       tr("Chờ", "Pending")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canInvite && !isMe && (
                      <div className="flex items-center justify-end gap-2">
                        {m.trangThai === "active" ? (
                          <button
                            onClick={() => suspendMember(m)}
                            disabled={isAct}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-red-500/30 text-red-300 hover:bg-red-500/15 disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-[14px] align-middle mr-1">lock</span>
                            {tr("Khóa", "Suspend")}
                          </button>
                        ) : (
                          <button
                            onClick={() => reactivate(m)}
                            disabled={isAct}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-[14px] align-middle mr-1">lock_open</span>
                            {tr("Mở khóa", "Unlock")}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="xl:hidden space-y-3">
        {loading && <div className="text-center text-slate-400 py-6">{tr("Đang tải…", "Loading…")}</div>}
        {!loading && data?.members.map(m => {
          const meta = SUBROLE_META[m.vaiTroCty || "viewer"] || SUBROLE_META.viewer;
          const isMe = m.id === data.me.userId;
          return (
            <div key={m.id} className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-[#C8A557]/15 border border-[#C8A557]/30 text-[#C8A557] flex items-center justify-center font-bold shrink-0">
                  {(m.ten || m.email).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-bold leading-snug break-words">
                    {m.ten || m.email.split("@")[0]}
                    {isMe && <span className="ml-2 text-[10px] text-[#C8A557]">({tr("Bạn", "You")})</span>}
                  </div>
                  <div className="text-[11px] text-slate-400 break-all">{m.email}</div>
                </div>
              </div>
              {/* Vai trò nội bộ — dropdown (mobile) — admin có thể đổi role */}
              {canInvite && !isMe ? (
                <select
                  value={m.vaiTroCty || "viewer"}
                  onChange={(e) => changeSubRole(m, e.target.value)}
                  disabled={acting === m.id}
                  className={`w-full px-3 py-2 mb-3 rounded-xl text-xs font-bold border ${meta.color} bg-[#0B1623] focus:outline-none disabled:opacity-50`}
                >
                  {Object.entries(SUBROLE_META).map(([k, v]) => (
                    <option key={k} value={k} className="bg-[#0B1623] text-white">{lang === "en" ? v.en : v.label}</option>
                  ))}
                </select>
              ) : (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${meta.color} mb-3`}>
                  <span className="material-symbols-outlined text-[12px]">{meta.icon}</span>
                  {lang === "en" ? meta.en : meta.label}
                </span>
              )}
              <div className="flex items-center justify-end gap-2">
                {canInvite && !isMe && (
                  m.trangThai === "active" ? (
                    <button onClick={() => suspendMember(m)} disabled={acting === m.id}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-red-500/30 text-red-300 disabled:opacity-50">
                      {tr("Khóa", "Suspend")}
                    </button>
                  ) : (
                    <button onClick={() => reactivate(m)} disabled={acting === m.id}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-emerald-500/30 text-emerald-300 disabled:opacity-50">
                      {tr("Mở khóa", "Unlock")}
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm" onClick={closeInviteModal}>
          <div className="bg-[#0B1623] border border-[#C8A557]/30 rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            {!generatedLink ? (
              <>
                <h3 className="text-lg font-bold text-white mb-1">{tr("Mời nhân viên", "Invite member")}</h3>
                <p className="text-xs text-slate-400 mb-4">{tr("Hệ thống sinh link mời 7 ngày — bạn copy gửi qua email/SMS", "System generates a 7-day invite link — copy + send via email/SMS")}</p>

                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  value={invEmail}
                  onChange={(e) => setInvEmail(e.target.value)}
                  placeholder="vd@congty.vn"
                  className="w-full mt-1 mb-3 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#C8A557]/50"
                />

                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{tr("Vai trò nội bộ", "Sub-role")}</label>
                <select
                  value={invRole}
                  onChange={(e) => setInvRole(e.target.value)}
                  className="w-full mt-1 mb-4 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#C8A557]/50"
                >
                  {Object.entries(SUBROLE_META).map(([k, v]) => (
                    <option key={k} value={k} className="bg-[#0B1623]">{lang === "en" ? v.en : v.label}</option>
                  ))}
                </select>

                <div className="flex gap-2">
                  <button onClick={closeInviteModal} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold">
                    {tr("Hủy", "Cancel")}
                  </button>
                  <button
                    onClick={sendInvite}
                    disabled={invSubmitting || !invEmail}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#E4D2A1] to-[#C8A557] text-[#0B1623] text-sm font-bold disabled:opacity-50"
                  >
                    {invSubmitting ? tr("Đang tạo…", "Creating…") : tr("Tạo lời mời", "Create invite")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-emerald-300 text-2xl">check_circle</span>
                  <h3 className="text-lg font-bold text-white">{tr("Lời mời đã tạo", "Invite created")}</h3>
                </div>
                {/* Email status banner */}
                {emailStatus && (
                  <div className={`mb-3 p-3 rounded-xl border flex items-start gap-2 text-xs ${
                    emailStatus.sent
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-200"
                  }`}>
                    <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">
                      {emailStatus.sent ? "mark_email_read" : "info"}
                    </span>
                    <p className="leading-snug">{emailStatus.note}</p>
                  </div>
                )}
                <p className="text-xs text-slate-400 mb-3">
                  {tr("Link backup (copy + gửi qua kênh khác nếu cần). Link có hiệu lực 7 ngày.",
                      "Backup link (copy + send via other channels if needed). Valid for 7 days.")}
                </p>
                <div className="p-3 bg-black/40 border border-white/10 rounded-xl mb-3">
                  <code className="text-[11px] text-[#C8A557] break-all">{generatedLink}</code>
                </div>
                <div className="flex gap-2">
                  <button onClick={copyLink} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#E4D2A1] to-[#C8A557] text-[#0B1623] text-sm font-bold flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">content_copy</span>
                    {tr("Copy link", "Copy link")}
                  </button>
                  <button onClick={closeInviteModal} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold">
                    {tr("Đóng", "Done")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-[90px] md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl text-sm font-bold border shadow-lg backdrop-blur ${
          toast.type === "ok" ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200" : "bg-red-500/15 border-red-500/40 text-red-200"
        }`}>{toast.msg}</div>
      )}
    </div>
  );
}
