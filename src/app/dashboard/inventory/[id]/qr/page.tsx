"use client";

import { Toast } from "@/components/Toast";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

interface BatchData {
  id: string;
  maLo: string;
  ngaySanXuat: string;
  hanDung: string;
  soLuong: number;
  trangThai: string;
  sanPham: {
    ten: string;
    maSKU: string;
    doanhNghiep: { ten: string };
  };
  uids: { uid: string; trangThai: string; soLanQuet: number }[];
}

export default function QRPrintPage() {
  const { id } = useParams();
  const [batch, setBatch] = useState<BatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [printMode, setPrintMode] = useState(false);
  const [printSingleId, setPrintSingleId] = useState<string | null>(null);
  const [printCount, setPrintCount] = useState<number>(0);
  const [printCountStr, setPrintCountStr] = useState<string>("0"); // for free typing
  const [adding, setAdding] = useState(false);
  const [addAmount, setAddAmount] = useState(1);
  const [addAmountStr, setAddAmountStr] = useState<string>("1"); // for free typing
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ type: 'regenerate' | 'delete', uid: string | string[] } | null>(null);
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'default' | 'scans-desc' | 'scans-asc'>('default');

  const formatScanCount = (count: number): string => {
    if (count <= 0) return "Mới";
    if (count < 1000) return `${count} quét`;
    if (count < 1000000) {
      return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K quét`;
    }
    if (count < 1000000000) {
      return `${(count / 1000000).toFixed(1).replace(/\.0$/, '')}M quét`;
    }
    if (count < 1000000000000) {
      return `${(count / 1000000000).toFixed(1).replace(/\.0$/, '')}B quét`;
    }
    return `${count.toExponential(1).replace(/\.0(?=e)/, '').replace('+', '')} quét`;
  };

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchBatch = () => {
    fetch(`/api/inventory/${id}`)
      .then(r => r.json())
      .then(data => { 
        setBatch(data); 
        const count = data?.uids?.length || 0;
        setPrintCount(count);
        setPrintCountStr(String(count));
        setLoading(false); 
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    // Reset all local state on id change
    setAddAmount(1);
    setAddAmountStr("1");
    setPrintMode(false);
    setConfirmModal(null);
    fetchBatch();

    // Handle bfcache restore (browser back/forward)
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        setAddAmount(1);
        setAddAmountStr("1");
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [id]);

  const handleAddQR = async () => {
    if (addAmount < 1) return showToast("Số lượng phải lớn hơn 0", false);
    setAdding(true);
    try {
      const res = await fetch(`/api/inventory/${id}/qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: addAmount })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast(`✓ Đã thêm ${addAmount} tem thành công`, true);
      fetchBatch();
    } catch (e: any) {
      showToast("✗ Lỗi: " + e.message, false);
    } finally {
      setAdding(false);
    }
  };

  const executeAction = async () => {
    if (!confirmModal) return;
    const { type, uid } = confirmModal;
    setConfirmModal(null);
    setActionLoading(Array.isArray(uid) ? 'bulk' : uid);
    try {
      if (type === 'delete') {
        const uidsToDelete = Array.isArray(uid) ? uid : [uid];
        const res = await fetch(`/api/inventory/${id}/qr`, { 
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uids: uidsToDelete })
        });
        if (!res.ok) throw new Error((await res.json()).error);
        showToast(`✓ Đã xóa ${uidsToDelete.length} tem QR`, true);
        setSelectedUids(new Set());
      } else if (type === 'regenerate') {
        const res = await fetch(`/api/inventory/${id}/qr`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: Array.isArray(uid) ? uid[0] : uid })
        });
        if (!res.ok) throw new Error((await res.json()).error);
        showToast("✓ Đã tạo lại mã QR thành công", true);
      }
      fetchBatch();
    } catch (e: any) {
      showToast("✗ Lỗi: " + e.message, false);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteQR = (uid: string) => {
    setConfirmModal({ type: 'delete', uid });
  };

  const handleRegenerateQR = (uid: string) => {
    setConfirmModal({ type: 'regenerate', uid });
  };

  const handlePrintSingle = (uid: string) => {
    setPrintSingleId(uid);
    setPrintMode(true);
    setTimeout(() => window.print(), 300);
    window.onafterprint = () => {
      setPrintMode(false);
      setPrintSingleId(null);
    };
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );

  if (!batch) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-red-500 font-bold">Không tìm thấy lô hàng</p>
    </div>
  );

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const hanDung = new Date(batch.hanDung).toLocaleDateString("vi-VN");
  const ngaySX = new Date(batch.ngaySanXuat).toLocaleDateString("vi-VN");

  const uidsWithIndex = batch ? batch.uids.map((item, index) => ({ ...item, originalIdx: index })) : [];
  const sortedUids = [...uidsWithIndex].sort((a, b) => {
    if (sortBy === 'scans-desc') {
      return b.soLanQuet - a.soLanQuet;
    }
    if (sortBy === 'scans-asc') {
      return a.soLanQuet - b.soLanQuet;
    }
    return 0;
  });

  return (
    <div className="bg-slate-100 min-h-screen">
      {/* Toolbar — ẩn khi print */}
      {!printMode && (
        <div className="bg-white border-b border-slate-200 px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">In tem QR — Lô hàng</p>
            <h1 className="text-xl font-bold text-slate-900">{batch.maLo} — {batch.sanPham?.ten || "Sản phẩm không có tên"}</h1>
            <p className="text-xs text-slate-500 mt-1">{batch.uids.length} tem tổng cộng · NSX: {ngaySX} · HSD: {hanDung}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <label className="text-sm font-bold text-slate-600">Số lượng in:</label>
              <input 
                type="number" 
                min="1" 
                max={batch.uids.length} 
                value={printCountStr}
                onChange={(e) => {
                  const raw = e.target.value;
                  setPrintCountStr(raw);
                  const num = parseInt(raw, 10);
                  if (!isNaN(num)) {
                    setPrintCount(Math.min(batch.uids.length, Math.max(1, num)));
                  }
                }}
                onBlur={() => {
                  const num = parseInt(printCountStr, 10);
                  const clamped = isNaN(num) ? 1 : Math.min(batch.uids.length, Math.max(1, num));
                  setPrintCount(clamped);
                  setPrintCountStr(String(clamped));
                }}
                className="w-20 px-2 py-1 border border-slate-300 rounded text-sm text-center text-slate-800 font-bold focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <label className="text-sm font-bold text-slate-600">Sắp xếp:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-sm text-slate-800 font-bold focus:outline-none cursor-pointer"
              >
                <option value="default">Mặc định</option>
                <option value="scans-desc">Quét nhiều nhất</option>
                <option value="scans-asc">Quét ít nhất</option>
              </select>
            </div>
            <Link href="/dashboard/inventory"
              className="px-4 py-2 text-sm font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition">
              ← Quay lại
            </Link>
            
            <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 p-1 rounded-lg">
               <input 
                 type="number" min="1" max="1000"
                 value={addAmountStr}
                 onChange={e => {
                   const raw = e.target.value;
                   setAddAmountStr(raw);
                   const num = parseInt(raw, 10);
                   if (!isNaN(num) && num >= 1) setAddAmount(num);
                 }}
                 onBlur={() => {
                   const num = parseInt(addAmountStr, 10);
                   const clamped = isNaN(num) ? 1 : Math.min(1000, Math.max(1, num));
                   setAddAmount(clamped);
                   setAddAmountStr(String(clamped));
                 }}
                 className="w-16 px-2 py-1 text-sm text-slate-800 font-bold bg-white border border-emerald-200 rounded focus:outline-none"
               />
               <button 
                 onClick={handleAddQR} disabled={adding}
                 className="px-3 py-1 bg-emerald-500 text-white text-sm font-bold rounded hover:bg-emerald-600 disabled:opacity-50"
               >
                 {adding ? '...' : '+ Thêm tem'}
               </button>
            </div>
            <button
              onClick={() => { 
                setPrintMode(true); 
                setPrintSingleId(null);
                setTimeout(() => window.print(), 300); 
                window.onafterprint = () => {
                  setPrintMode(false);
                  setPrintSingleId(null);
                }; 
              }}
              className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:opacity-90 transition flex items-center gap-2"
              title="Mẹo: Chọn 'Save as PDF' (Lưu dưới dạng PDF) trong hộp thoại in để xuất file PDF."
            >
              <span className="material-symbols-outlined text-sm">print</span>
              In / Xuất PDF ({printCount} tem)
            </button>
          </div>
        </div>
      )}

      {/* Thông báo hướng dẫn in PDF */}
      {!printMode && (
        <div className="bg-amber-50 border-b border-amber-100 px-8 py-2 text-xs font-medium text-amber-700 flex items-center gap-2 print:hidden">
           <span className="material-symbols-outlined text-[14px]">info</span>
           Để xuất file PDF: Bấm nút In, sau đó ở mục "Máy in" (Destination), chọn "Lưu dưới dạng PDF" (Save as PDF).
        </div>
      )}

      {/* Grid QR codes */}
      <div className="p-8 max-w-7xl mx-auto print:p-0 print:max-w-none pb-24">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 print:grid-cols-5 print:gap-3">
          {sortedUids.slice(0, printCount).map((item, idx) => (
            <div key={item.uid}
              className={`bg-white rounded-xl border border-slate-200 p-3 flex flex-col items-center gap-2 relative print:rounded-md print:border print:break-inside-avoid ${printSingleId && printSingleId !== item.uid ? 'print:hidden' : ''} ${selectedUids.has(item.uid) ? 'ring-2 ring-primary border-primary' : ''}`}>
              
              {/* Checkbox for bulk select */}
              {!printMode && (
                <div className="absolute top-2 left-2 z-10 print:hidden">
                  <input
                    type="checkbox"
                    checked={selectedUids.has(item.uid)}
                    onChange={(e) => {
                      const newSet = new Set(selectedUids);
                      if (e.target.checked) newSet.add(item.uid);
                      else newSet.delete(item.uid);
                      setSelectedUids(newSet);
                    }}
                    className="w-4 h-4 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary cursor-pointer"
                  />
                </div>
              )}

              {/* QR Code */}
              <div className="bg-white p-1.5 rounded-lg border border-slate-100 mt-2">
                <a href={`/verify/${item.uid}`} target="_blank" rel="noopener noreferrer" className="block hover:opacity-80 transition cursor-pointer" title="Click để mở trang xác thực (test)">
                  <QRCodeSVG
                    value={`${baseUrl}/verify/${item.uid}`}
                    size={100}
                    bgColor="#ffffff"
                    fgColor="#004c4c"
                    level="M"
                  />
                </a>
              </div>
              {/* Thông tin */}
              <div className="text-center w-full">
                <p className="text-[9px] font-bold text-primary uppercase tracking-wider">VNTRUST</p>
                <a href={`/verify/${item.uid}`} target="_blank" rel="noopener noreferrer" className="hover:underline text-[8px] text-slate-500 w-full text-center font-mono overflow-hidden block" title={item.uid}>
                  {item.uid.substring(0, 8)}…
                </a>
                <p className="text-[9px] text-slate-400">{(batch.sanPham?.ten || "Sản phẩm không rõ").substring(0, 18)}</p>
                <p className="text-[9px] font-bold text-slate-600">HSD: {hanDung}</p>
                <div 
                  className={`mt-1 inline-block px-2 py-0.5 rounded-full text-[8px] font-bold max-w-[120px] truncate ${
                    item.trangThai === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                  }`}
                  title={item.soLanQuet > 0 ? `Số lần quét chính xác: ${item.soLanQuet.toLocaleString("vi-VN")} lần` : undefined}
                >
                  #{item.originalIdx + 1} · {formatScanCount(item.soLanQuet)}
                </div>
                
                {/* Actions (Hidden on Print) */}
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-center gap-2 print:hidden w-full">
                  <button 
                    onClick={() => handlePrintSingle(item.uid)}
                    disabled={actionLoading === item.uid}
                    className="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition disabled:opacity-50"
                    title="In tem này"
                  >
                    <span className="material-symbols-outlined text-[14px]">print</span>
                  </button>
                  <button 
                    onClick={() => handleRegenerateQR(item.uid)}
                    disabled={actionLoading === item.uid}
                    className="p-1 rounded bg-amber-50 text-amber-600 hover:bg-amber-100 transition disabled:opacity-50"
                    title="Tạo lại mã (Sửa)"
                  >
                    <span className="material-symbols-outlined text-[14px]">autorenew</span>
                  </button>
                  <button 
                    onClick={() => handleDeleteQR(item.uid)}
                    disabled={actionLoading === item.uid}
                    className="p-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50"
                    title="Xóa vĩnh viễn"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedUids.size > 0 && !printMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white px-6 py-4 rounded-full shadow-2xl border border-slate-200 z-40 flex items-center gap-6 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-xs">
              {selectedUids.size}
            </span>
            <span className="text-sm font-bold text-slate-700">tem được chọn</span>
          </div>
          <div className="w-px h-6 bg-slate-200"></div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                const currentViewUids = sortedUids.slice(0, printCount).map(u => u.uid);
                if (selectedUids.size === currentViewUids.length) {
                  setSelectedUids(new Set()); // deselect all
                } else {
                  setSelectedUids(new Set(currentViewUids)); // select all in view
                }
              }}
              className="text-sm font-bold text-primary hover:text-primary/80 transition whitespace-nowrap"
            >
              {selectedUids.size === sortedUids.slice(0, printCount).length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
            </button>
            <button 
              onClick={() => setConfirmModal({ type: 'delete', uid: Array.from(selectedUids) })}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-bold transition flex items-center gap-1.5 shadow-md shadow-red-500/20 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              Xóa {selectedUids.size} tem
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; }
          nav, header, footer, .print\\:hidden { display: none !important; }
        }
      `}</style>

      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl border border-slate-200">
            <div className="p-6 text-center">
              <span className={`material-symbols-outlined text-5xl mb-4 ${confirmModal.type === 'delete' ? 'text-red-500' : 'text-amber-500'}`}>
                {confirmModal.type === 'delete' ? 'warning' : 'autorenew'}
              </span>
              <h2 className="text-lg font-bold text-slate-800">Bạn có chắc chắn?</h2>
              <p className="text-sm text-slate-500 mt-2">
                {confirmModal.type === 'delete' 
                  ? (Array.isArray(confirmModal.uid) ? `Bạn chuẩn bị xóa vĩnh viễn ${confirmModal.uid.length} tem đã chọn khỏi hệ thống.` : 'Mã QR này sẽ bị xóa vĩnh viễn khỏi hệ thống.')
                  : 'Bạn muốn tạo lại mã QR này? (mã cũ sẽ bị vô hiệu hóa và không thể quét được nữa)'}
              </p>
            </div>
            <div className="p-4 bg-slate-50 flex justify-center gap-3 border-t border-slate-100">
              <button 
                onClick={() => setConfirmModal(null)} 
                className="px-5 py-2 rounded-lg font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50"
              >
                Không
              </button>
              <button 
                onClick={executeAction} 
                className={`px-5 py-2 rounded-lg font-bold text-white ${confirmModal.type === 'delete' ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'}`}
              >
                Có, tạo lại mã
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
