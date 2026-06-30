"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/Toast";
import { useLanguage } from "@/contexts/LanguageContext";

type Target = "product" | "batch";
type Status = "pending" | "approved" | "rejected" | "all";

interface ApprovalItem {
  id: string;
  code: string;
  name: string;
  secondary?: string;
  owner?: string;
  ownerTaxCode?: string;
  createdAt?: string;
  expiresAt?: string;
  status: "pending" | "approved" | "rejected";
  note?: string | null;
  countLabel?: string;
}

const PAGE_SIZE = 10;

const getErrorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error ? error.message : fallback;
};

const statusMeta: Record<string, { vi: string; en: string; cls: string; icon: string }> = {
  pending: {
    vi: "Chờ duyệt",
    en: "Pending",
    cls: "bg-[#1F6FEB]/10 text-[#1F6FEB] border-[#1F6FEB]/30",
    icon: "hourglass_top",
  },
  approved: {
    vi: "Đã duyệt",
    en: "Approved",
    cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    icon: "verified",
  },
  rejected: {
    vi: "Từ chối",
    en: "Rejected",
    cls: "bg-red-500/15 text-red-400 border-red-500/30",
    icon: "block",
  },
};

const filters: Array<{ key: Status; vi: string; en: string }> = [
  { key: "pending", vi: "Chờ duyệt", en: "Pending" },
  { key: "approved", vi: "Đã duyệt", en: "Approved" },
  { key: "rejected", vi: "Từ chối", en: "Rejected" },
  { key: "all", vi: "Tất cả", en: "All" },
];

export default function DuyetSpPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const tr = useCallback((vi: string, en: string) => (lang === "en" ? en : vi), [lang]);

  const [target, setTarget] = useState<Target>("product");
  const [filter, setFilter] = useState<Status>("pending");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ApprovalItem | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ target, status: filter });
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`/api/admin/approvals?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || tr("Không tải được dữ liệu", "Could not load data"));
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (error: unknown) {
      setItems([]);
      showToast(getErrorMessage(error, tr("Lỗi tải dữ liệu", "Load failed")), false);
    } finally {
      setLoading(false);
    }
  }, [filter, query, target, tr]);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "admin") {
      router.replace("/dashboard");
      return;
    }
    fetchItems();
  }, [fetchItems, router]);

  useEffect(() => {
    setPage(1);
  }, [target, filter, query]);

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pagedItems = useMemo(
    () => items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [items, safePage]
  );

  const act = async (item: ApprovalItem, action: "approve" | "reject", note = "") => {
    setBusy(item.id);
    try {
      const res = await fetch("/api/admin/approvals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target,
          id: item.id,
          action,
          note: note?.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || tr("Thao tác thất bại", "Action failed"));
      showToast(
        action === "approve" ? tr("Đã phê duyệt", "Approved") : tr("Đã từ chối", "Rejected"),
        true
      );
      if (action === "reject") {
        setRejectTarget(null);
        setRejectNote("");
      }
      fetchItems();
    } catch (error: unknown) {
      showToast(getErrorMessage(error, tr("Thao tác thất bại", "Action failed")), false);
    } finally {
      setBusy(null);
    }
  };

  const fmtDate = (value?: string) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString(lang === "en" ? "en-US" : "vi-VN");
  };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8 pb-24">
      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />}
      {rejectTarget && (
        <div
          className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4"
          onClick={() => {
            setRejectTarget(null);
            setRejectNote("");
          }}
        >
          <form
            className="w-full rounded-2xl border border-red-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.26)] sm:p-5"
            style={{ maxWidth: 460 }}
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              act(rejectTarget, "reject", rejectNote.trim());
            }}
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <span className="material-symbols-outlined text-[22px]">block</span>
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-black text-slate-950">
                  {tr("Từ chối hồ sơ", "Reject item")}
                </h2>
                <p className="mt-1 text-sm leading-snug text-slate-600 break-words">
                  {tr("Nhập lý do từ chối", "Enter rejection reason")} {rejectTarget.code}
                </p>
              </div>
            </div>

            <textarea
              value={rejectNote}
              onChange={(event) => setRejectNote(event.target.value)}
              autoFocus
              rows={4}
              placeholder={tr("Ví dụ: Hồ sơ chưa đủ giấy tờ hoặc thông tin chưa khớp...", "Example: Missing documents or mismatched information...")}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-300 focus:ring-4 focus:ring-red-100"
            />

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectNote("");
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                {tr("Hủy", "Cancel")}
              </button>
              <button
                type="submit"
                disabled={busy === rejectTarget.id}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy === rejectTarget.id ? tr("Đang xử lý...", "Processing...") : tr("Từ chối", "Reject")}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-[#1F6FEB] uppercase tracking-[0.22em] mb-2">
            {tr("Kiểm duyệt", "Approvals")}
          </p>
          <h1 className="text-2xl lg:text-3xl font-black text-white font-headline">
            {tr("Duyệt Sản phẩm & Lô hàng", "Approve Products & Batches")}
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            {tr(
              "Admin duyệt trực tiếp từng sản phẩm và từng lô hàng. Trạng thái chính hãng khi quét mã sẽ ưu tiên trạng thái duyệt theo lô.",
              "Admins approve each product and batch directly. Verification uses batch approval as the primary authenticity gate."
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-5">
        <div className="flex rounded-2xl bg-white/5 border border-white/10 p-1 w-full lg:w-auto">
          {(["product", "batch"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setTarget(key)}
              className={`flex-1 lg:flex-none px-4 py-2 rounded-xl text-xs font-black transition ${
                target === key
                  ? "bg-[#1F6FEB] text-white"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {key === "product" ? tr("Sản phẩm", "Products") : tr("Lô hàng", "Batches")}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                filter === f.key
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                  : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
              }`}
            >
              {tr(f.vi, f.en)}
            </button>
          ))}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            fetchItems();
          }}
          className="relative lg:ml-auto w-full lg:w-80"
        >
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tr("Tìm mã, tên, doanh nghiệp...", "Search code, name, enterprise...")}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setTimeout(fetchItems, 0);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              aria-label={tr("Xóa tìm kiếm", "Clear search")}
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </form>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <span className="w-10 h-10 border-2 border-[#1F6FEB] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-slate-500 border border-white/10 bg-white/5 rounded-2xl">
          <span className="material-symbols-outlined text-5xl mb-3 block">fact_check</span>
          {tr("Không có dữ liệu phù hợp", "No matching records")}
        </div>
      ) : (
        <div className="space-y-3">
          {pagedItems.map((item) => {
            const meta = statusMeta[item.status] || statusMeta.pending;
            return (
              <div
                key={item.id}
                className="glass-panel border border-white/10 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center gap-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#1F6FEB]">
                    {target === "product" ? "inventory_2" : "qr_code_2"}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                      {item.code}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${meta.cls}`}>
                      <span className="material-symbols-outlined text-[13px]">{meta.icon}</span>
                      {tr(meta.vi, meta.en)}
                    </span>
                    {item.countLabel && <span className="text-[10px] text-slate-500">{item.countLabel}</span>}
                  </div>
                  <h2 className="font-bold text-white text-base truncate">{item.name}</h2>
                  <p className="text-xs text-slate-400 mt-1 truncate">
                    {item.secondary || tr("Không có mô tả phụ", "No secondary detail")}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {tr("Doanh nghiệp", "Enterprise")}: <span className="text-slate-300">{item.owner || "-"}</span>
                    <span className="mx-2">-</span>
                    {target === "batch"
                      ? `${tr("NSX", "Mfg")}: ${fmtDate(item.createdAt)} - ${tr("HSD", "Exp")}: ${fmtDate(item.expiresAt)}`
                      : `${tr("Tạo", "Created")}: ${fmtDate(item.createdAt)}`}
                  </p>
                  {item.note && <p className="text-xs text-red-400 mt-1">{tr("Ghi chú", "Note")}: {item.note}</p>}
                </div>

                <div className="flex lg:flex-col gap-2 shrink-0">
                  {item.status !== "approved" && (
                    <button
                      onClick={() => act(item, "approve")}
                      disabled={busy === item.id}
                      className="flex-1 lg:flex-none px-4 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold hover:bg-emerald-500/30 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[15px]">check_circle</span>
                      {tr("Duyệt", "Approve")}
                    </button>
                  )}
                  {item.status !== "rejected" && (
                    <button
                      onClick={() => {
                        setRejectTarget(item);
                        setRejectNote(item.note || "");
                      }}
                      disabled={busy === item.id}
                      className="flex-1 lg:flex-none px-4 py-2 bg-red-500/15 text-red-400 border border-red-500/25 rounded-xl text-xs font-bold hover:bg-red-500/25 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[15px]">block</span>
                      {tr("Từ chối", "Reject")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {items.length > PAGE_SIZE && (
        <div className="flex flex-wrap items-center justify-between gap-3 mt-5">
          <p className="text-xs text-slate-500">
            {tr("Hiển thị", "Showing")} {(safePage - 1) * PAGE_SIZE + 1}-
            {Math.min(safePage * PAGE_SIZE, items.length)} {tr("trên", "of")} {items.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="px-4 py-2 bg-white/5 rounded-xl text-white disabled:opacity-30 border border-white/10 text-sm"
            >
              {tr("Trước", "Prev")}
            </button>
            <span className="text-slate-400 text-sm">
              {tr("Trang", "Page")} {safePage}/{pageCount}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={safePage >= pageCount}
              className="px-4 py-2 bg-white/5 rounded-xl text-white disabled:opacity-30 border border-white/10 text-sm"
            >
              {tr("Sau", "Next")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
