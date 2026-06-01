"use client";
// Sprint 13 — AI Photo Verify
// Đường dẫn: /verify/[uid]/photo
//
// Flow:
// 1. User chụp/upload ảnh sản phẩm thật
// 2. Client load MobileNet (TF.js CDN) → extract 1024-dim feature vector
// 3. POST ảnh + features → /api/verify-image
// 4. Server: SHA-256 + dimensions + histogram + (optional) ML features
// 5. Hiển thị kết quả với reasoning chi tiết

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { useLanguage } from "@/contexts/LanguageContext";
import RiskChecklist, { type ChecklistItem, type Severity, severityFromScore } from "@/components/RiskChecklist";

type Status = "idle" | "selecting" | "processing" | "result" | "error";
type Verdict = "genuine" | "suspect" | "fake" | "unknown";

interface VerifyResult {
  status: Verdict;
  confidence: string;
  score: number;
  message: string;
  reasoning: string[];
  details: any;
  algorithm: string;
}

declare global {
  interface Window {
    tf?: any;
    mobilenet?: any;
  }
}

export default function PhotoVerifyPage() {
  const { uid } = useParams();
  const router = useRouter();
  const { lang } = useLanguage();
  const tr = (vi: string, en: string) => (lang === "en" ? en : vi);

  const [status, setStatus] = useState<Status>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string>("");
  // ML model loading
  const [mlReady, setMlReady] = useState(false);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlError, setMlError] = useState<string>("");
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const previewImgRef = useRef<HTMLImageElement>(null);
  const modelRef = useRef<any>(null);
  // Reference image (ảnh chính chủ trong DB) — load 1 lần để client extract features
  const [referenceUrl, setReferenceUrl] = useState<string | null>(null);
  const [referenceFeatures, setReferenceFeatures] = useState<number[] | null>(null);
  const refImgRef = useRef<HTMLImageElement>(null);

  // ── Load MobileNet model (lazy) ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const loadModel = async () => {
      if (typeof window === "undefined" || !window.mobilenet || !window.tf || modelRef.current) return;
      setMlLoading(true);
      try {
        modelRef.current = await window.mobilenet.load({ version: 2, alpha: 0.5 });
        if (!cancelled) {
          setMlReady(true);
          setMlError("");
        }
      } catch (e: any) {
        if (!cancelled) setMlError(e.message || "Load model failed");
      } finally {
        if (!cancelled) setMlLoading(false);
      }
    };
    // Poll until tf + mobilenet loaded from CDN
    const interval = setInterval(() => {
      if (window.tf && window.mobilenet && !modelRef.current) {
        loadModel();
      }
      if (modelRef.current) clearInterval(interval);
    }, 500);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // ── Fetch reference image URL từ UID (1 lần khi load page) ──────
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/verify/${uid}`, { cache: 'no-store' });
        if (!r.ok) return;
        const data = await r.json();
        const url = data?.data?.loHang?.sanPham?.hinhAnhUrl
                 || data?.data?.loHang?.sanPham?.hinhAnh
                 || null;
        if (!cancelled && url) setReferenceUrl(url);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [uid]);

  // ── Extract features cho reference image ngay khi ML + ref URL sẵn sàng ──
  useEffect(() => {
    if (!mlReady || !referenceUrl || referenceFeatures) return;
    if (!refImgRef.current) return;
    const img = refImgRef.current;
    const tryExtract = async () => {
      if (!img.complete || img.naturalWidth === 0) return;
      try {
        const feats = await extractFeatures(img);
        if (feats) setReferenceFeatures(feats);
      } catch (e) {
        console.error('Ref feature extract failed:', e);
      }
    };
    if (img.complete) tryExtract();
    else img.addEventListener('load', tryExtract, { once: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mlReady, referenceUrl]);

  // ── File handling ───────────────────────────────────────────────
  const handleFile = (f: File) => {
    setError("");
    setResult(null);
    if (!f.type.startsWith("image/")) {
      setError(tr("Chỉ chấp nhận file ảnh", "Image files only"));
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError(tr("Ảnh tối đa 10MB", "Max 10MB"));
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStatus("selecting");
  };

  // ── Extract MobileNet features client-side ─────────────────────
  async function extractFeatures(imgEl: HTMLImageElement): Promise<number[] | null> {
    if (!modelRef.current || !window.tf) return null;
    try {
      const activation = modelRef.current.infer(imgEl, true) as any;
      const dataArr = await activation.data();
      activation.dispose();
      return Array.from(dataArr) as number[];
    } catch (e) {
      console.error("Feature extract error:", e);
      return null;
    }
  }

  // ── Submit to API ───────────────────────────────────────────────
  const handleVerify = async () => {
    if (!file || !uid) return;
    setStatus("processing");
    setError("");

    // Try to extract features client-side if ML ready
    let features: number[] | null = null;
    if (mlReady && previewImgRef.current && previewImgRef.current.complete) {
      features = await extractFeatures(previewImgRef.current);
    }

    const fd = new FormData();
    fd.append("image", file);
    fd.append("uid", String(uid));
    if (features) {
      fd.append("features", JSON.stringify(features));
    }
    // BƯỚC AI NÂNG CAO: gửi feature vector của ảnh tham chiếu (nếu có)
    // → server compute cosine similarity giữa 2 vector → verdict chính xác hơn
    if (referenceFeatures) {
      fd.append("referenceFeatures", JSON.stringify(referenceFeatures));
    }

    try {
      const res = await fetch("/api/verify-image", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || tr("Lỗi server", "Server error"));
        setStatus("error");
        return;
      }
      setResult(data);
      setStatus("result");
    } catch (e: any) {
      setError(e.message || tr("Lỗi kết nối", "Connection error"));
      setStatus("error");
    }
  };

  const reset = () => {
    setFile(null); setPreview(null); setResult(null); setError("");
    setStatus("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  // ── Status colors ───────────────────────────────────────────────
  const verdictStyle: Record<Verdict, { bg: string; text: string; icon: string; label: string }> = {
    genuine: { bg: "from-[#4A7C5C]/30 to-[#4A7C5C]/5",    text: "text-[#6FB585]",   icon: "verified", label: tr("Chính hãng", "Genuine") },
    suspect: { bg: "from-[#C8A557]/30 to-[#C8A557]/5",    text: "text-[#C8A557]",   icon: "warning",  label: tr("Nghi ngờ", "Suspicious") },
    fake:    { bg: "from-red-500/30 to-red-500/5",         text: "text-red-400",     icon: "gpp_bad",  label: tr("Hàng giả", "Counterfeit") },
    unknown: { bg: "from-slate-500/30 to-slate-500/5",     text: "text-slate-300",   icon: "help",     label: tr("Chưa rõ", "Unknown") },
  };

  return (
    <>
      {/* Load TF.js + MobileNet from CDN — small ~150KB total gzipped */}
      <Script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js" strategy="afterInteractive" />
      <Script src="https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/dist/mobilenet.min.js" strategy="afterInteractive" />

      {/* Hidden reference image — extract features client-side khi load xong */}
      {referenceUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          ref={refImgRef}
          src={referenceUrl}
          alt="reference"
          crossOrigin="anonymous"
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
        />
      )}

      <div className="min-h-screen w-full bg-[#0B1623] text-[#F6F1E8]" style={{ minHeight: "100dvh" }}>
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-[#0B1623]/95 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#C8A557] font-bold uppercase tracking-wider">{tr("AI Vision", "AI Vision")}</p>
            <p className="text-sm font-bold leading-tight truncate">{tr("Xác minh ảnh sản phẩm", "Verify product image")}</p>
          </div>
          {/* ML status indicator */}
          <div className="flex items-center gap-1.5 text-[10px] font-medium" title={mlReady ? "MobileNet ready" : "Loading…"}>
            <span className={`w-2 h-2 rounded-full ${mlReady ? "bg-[#6FB585] animate-pulse" : mlLoading ? "bg-[#C8A557] animate-pulse" : "bg-slate-500"}`} />
            <span className={mlReady ? "text-[#6FB585]" : "text-slate-400"}>
              {mlReady ? "ML" : mlLoading ? tr("Tải ML…", "ML…") : tr("Cơ bản", "Basic")}
            </span>
          </div>
        </div>

        <div className="px-4 py-5 max-w-2xl mx-auto pb-[120px]">
          {/* UID badge */}
          <div className="mb-4 p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-[#C8A557]">tag</span>
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">UID:</span>
            <code className="text-xs font-mono text-[#C8A557] truncate flex-1">{String(uid).substring(0, 24)}…</code>
          </div>

          {/* IDLE — instructions + upload */}
          {(status === "idle" || status === "selecting") && (
            <>
              <div className="bg-gradient-to-br from-[#C8A557]/10 to-transparent border border-[#C8A557]/20 rounded-2xl p-5 mb-5">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-2xl text-[#C8A557] shrink-0 mt-0.5">photo_camera</span>
                  <div className="text-sm leading-relaxed">
                    <p className="font-bold text-white mb-1">{tr("Cách quét ảnh sản phẩm", "How to scan product image")}</p>
                    <ul className="text-xs text-slate-300 space-y-1 list-decimal list-inside">
                      <li>{tr("Chụp ảnh sản phẩm rõ nét, đủ ánh sáng (full mặt trước bao bì)", "Take a clear, well-lit photo (full product front)")}</li>
                      <li>{tr("Tránh phản chiếu/lóa nhãn — đảm bảo logo + tên SP đọc được", "Avoid glare — ensure logo + name readable")}</li>
                      <li>{tr("AI sẽ so sánh với ảnh chính chủ trong DB → trả Trust Score", "AI compares with DB reference → returns Trust Score")}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 p-5 rounded-2xl border border-[#C8A557]/30 bg-gradient-to-br from-[#C8A557]/15 to-transparent hover:from-[#C8A557]/25 transition active:scale-95"
                >
                  <span className="material-symbols-outlined text-3xl text-[#C8A557]">photo_camera</span>
                  <span className="text-sm font-bold">{tr("Chụp ảnh", "Camera")}</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 p-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition active:scale-95"
                >
                  <span className="material-symbols-outlined text-3xl text-slate-300">add_photo_alternate</span>
                  <span className="text-sm font-bold">{tr("Chọn từ thư viện", "Gallery")}</span>
                </button>
              </div>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />

              {/* Preview if selected */}
              {preview && (
                <div className="mb-5">
                  <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      ref={previewImgRef}
                      src={preview}
                      alt="Preview"
                      className="w-full max-h-[400px] object-contain"
                      crossOrigin="anonymous"
                    />
                    <button
                      onClick={reset}
                      className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 backdrop-blur text-white flex items-center justify-center hover:bg-black/80 transition"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>

                  <button
                    onClick={handleVerify}
                    className="w-full mt-4 py-4 rounded-2xl bg-gradient-to-r from-[#E4D2A1] to-[#C8A557] text-[#0B1623] font-bold text-base shadow-lg shadow-[#C8A557]/25 hover:brightness-105 transition active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                    {tr("Phân tích bằng AI", "Analyze with AI")}
                  </button>
                  <p className="text-[10px] text-center text-slate-500 mt-2">
                    {mlReady
                      ? tr("✓ MobileNet đã sẵn — phân tích đầy đủ", "✓ MobileNet ready — full analysis")
                      : tr("⚙ Chế độ cơ bản (SHA-256 + dimensions + histogram)", "⚙ Basic mode (SHA-256 + dimensions + histogram)")}
                  </p>
                </div>
              )}
            </>
          )}

          {/* PROCESSING */}
          {status === "processing" && preview && (
            <div className="text-center py-10">
              <div className="relative inline-block mb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Analyzing" className="w-48 h-48 object-cover rounded-2xl border-2 border-[#C8A557]/30" />
                {/* Scanning line overlay */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                  <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C8A557] to-transparent shadow-[0_0_20px_#C8A557] animate-[scan_2s_linear_infinite]" />
                </div>
              </div>
              <p className="text-base font-bold text-[#C8A557] mb-2 animate-pulse">{tr("AI đang phân tích…", "AI analyzing…")}</p>
              <div className="text-xs text-slate-400 space-y-1">
                <p>• {tr("Tính SHA-256 hash ảnh", "Compute SHA-256")}</p>
                <p>• {tr("So sánh kích thước với ảnh chính chủ", "Compare with reference")}</p>
                <p>• {tr("Phân tích histogram màu (cosine similarity)", "Color histogram analysis")}</p>
                {mlReady && <p>• {tr("MobileNet feature vector (1024 dim)", "MobileNet features (1024 dim)")}</p>}
              </div>
            </div>
          )}

          {/* RESULT */}
          {status === "result" && result && (
            <>
              {(() => {
                const v = verdictStyle[result.status];
                return (
                  <div className={`rounded-3xl p-6 mb-5 border bg-gradient-to-br ${v.bg} border-white/10`}>
                    <div className="flex flex-col items-center text-center mb-4">
                      <span className={`material-symbols-outlined text-6xl ${v.text} mb-2`} style={{ fontVariationSettings: "'FILL' 1" }}>{v.icon}</span>
                      <p className={`text-2xl font-black ${v.text}`}>{v.label}</p>
                      <p className="text-sm text-slate-300 mt-1 leading-relaxed">{result.message}</p>
                    </div>

                    {/* Confidence bar */}
                    <div className="bg-white/5 rounded-2xl p-4 mb-3">
                      <div className="flex justify-between items-baseline mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Trust Score</span>
                        <span className={`text-2xl font-black ${v.text}`}>{result.score}<span className="text-sm opacity-60">/100</span></span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${result.score >= 85 ? "bg-[#6FB585]" : result.score >= 65 ? "bg-[#C8A557]" : "bg-red-500"}`}
                          style={{ width: `${Math.min(100, result.score)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 6-color Risk Checklist (Module 3 §5) */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4 mb-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px] text-[#C8A557]">psychology</span>
                  {tr("AI giải thích — Checklist 6 màu", "AI Reasoning — 6-color Checklist")}
                </h3>
                {(() => {
                  // Map reasoning lines → ChecklistItems với severity tự động
                  const items: ChecklistItem[] = result.reasoning.map((r) => {
                    let sev: Severity = 'pass';
                    const low = r.toLowerCase();
                    if (low.includes('khớp 100%') || low.includes('match 100%')) sev = 'pass';
                    else if (low.includes('mobilenet') && (low.match(/\d+/) || ['1']).map(n => parseInt(String(n)) || 0)[0] >= 78) sev = 'pass';
                    else if (low.includes('không khớp') || low.includes('không tìm thấy') || low.includes('sai lệch')) sev = 'risk';
                    else if (low.includes('nghi') || low.includes('khác')) sev = 'suspect';
                    else if (low.includes('chưa có') || low.includes('không thể')) sev = 'unknown';
                    else if (low.includes('cơ bản') || low.includes('histogram')) sev = 'monitor';
                    return { label: r, severity: sev };
                  });

                  // Total score → severity
                  const sev = severityFromScore(result.score);
                  const conclusion =
                    result.status === 'genuine' ? `${tr('Chính hãng', 'Genuine')} — ${result.score}/100`
                    : result.status === 'suspect' ? `${tr('Nghi vấn', 'Suspicious')} — ${result.score}/100`
                    : result.status === 'fake' ? `${tr('Hàng giả', 'Counterfeit')} — ${result.score}/100`
                    : `${tr('Chưa rõ', 'Unknown')} — chưa đủ data`;

                  return (
                    <RiskChecklist
                      items={items}
                      totalScore={result.score}
                      conclusion={conclusion}
                      showLegend
                    />
                  );
                })()}
                <p className="text-[10px] text-slate-500 mt-3 pt-3 border-t border-white/5 font-mono">
                  Algorithm: <span className="text-slate-300">{result.algorithm}</span>
                </p>
              </div>

              {/* Tech details (collapsible) */}
              {result.details && (
                <details className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-5 group">
                  <summary className="text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px] text-[#C8A557] group-open:rotate-90 transition-transform">chevron_right</span>
                    {tr("Chi tiết kỹ thuật", "Technical details")}
                  </summary>
                  <div className="mt-3 space-y-2 text-[11px] font-mono">
                    {result.details.uploadedHash && (
                      <p><span className="text-slate-400">Uploaded hash:</span><br /><span className="text-[#C8A557] break-all">{result.details.uploadedHash}</span></p>
                    )}
                    {result.details.referenceHash && (
                      <p><span className="text-slate-400">Reference hash:</span><br /><span className="text-[#6FB585] break-all">{result.details.referenceHash}</span></p>
                    )}
                    {result.details.uploadedDim && (
                      <p><span className="text-slate-400">Uploaded:</span> <span className="text-slate-200">{result.details.uploadedDim.width}×{result.details.uploadedDim.height} ({result.details.uploadedDim.format})</span></p>
                    )}
                    {result.details.referenceDim && (
                      <p><span className="text-slate-400">Reference:</span> <span className="text-slate-200">{result.details.referenceDim.width}×{result.details.referenceDim.height} ({result.details.referenceDim.format})</span></p>
                    )}
                  </div>
                </details>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={reset}
                  className="py-3.5 rounded-2xl border border-white/15 bg-white/5 text-white font-bold text-sm hover:bg-white/10 transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                  {tr("Quét lại", "Try again")}
                </button>
                {result.status === "fake" || result.status === "suspect" ? (
                  <Link
                    href={`/dashboard/report?uid=${uid}`}
                    className="py-3.5 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">report</span>
                    {tr("Báo cáo", "Report")}
                  </Link>
                ) : (
                  <Link
                    href={`/verify/${uid}`}
                    className="py-3.5 rounded-2xl bg-gradient-to-r from-[#E4D2A1] to-[#C8A557] text-[#0B1623] font-bold text-sm hover:brightness-105 transition active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    {tr("Xem chi tiết SP", "Product details")}
                  </Link>
                )}
              </div>
            </>
          )}

          {/* ERROR */}
          {(status === "error" || error) && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 mb-5 flex items-start gap-3">
              <span className="material-symbols-outlined text-2xl text-red-400 shrink-0">error</span>
              <div className="flex-1">
                <p className="font-bold text-red-300 mb-1">{tr("Lỗi", "Error")}</p>
                <p className="text-sm text-slate-300">{error}</p>
                <button
                  onClick={reset}
                  className="mt-3 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 transition"
                >
                  {tr("Thử lại", "Try again")}
                </button>
              </div>
            </div>
          )}

          {/* ML loading hint at bottom */}
          {!mlReady && (status === "idle" || status === "selecting") && (
            <div className="mt-6 text-[10px] text-slate-500 text-center">
              {mlLoading
                ? tr("Đang tải MobileNet (~5MB) để phân tích sâu hơn…", "Loading MobileNet (~5MB) for deeper analysis…")
                : mlError
                  ? `ML load failed: ${mlError}`
                  : tr("ML model sẽ tự load sau vài giây", "ML model auto-loads in a few seconds")}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes scan {
          0%   { top: 0%; opacity: 0; }
          10%  { opacity: 1; }
          50%  { top: 100%; opacity: 1; }
          60%  { opacity: 0; }
          100% { top: 0%; opacity: 0; }
        }
      `}</style>
    </>
  );
}
