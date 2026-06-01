"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

// Phần 12: Lộ trình triển khai theo giai đoạn (TABLE 18)
const PHASES = [
  {
    id: 1,
    name: "Giai đoạn 1",
    subtitle: "MVP — Nền tảng cốt lõi",
    duration: "T+1 → T+8 tuần",
    status: "in_progress",
    color: "cyan",
    milestone: "Gate 1 (T+8 tuần)",
    budget: "~35% tổng budget",
    team: "Backend 4 · Frontend 3 · QA 2 · PM 1",
    features: [
      { text: "Đăng ký & KYC doanh nghiệp (upload giấy tờ, AI verify)", done: true },
      { text: "Tạo sản phẩm + sinh QR động + Serial duy nhất", done: true },
      { text: "Bulk upload CSV sản phẩm (FR-PRD-07)", done: true },
      { text: "Tạo lô hàng + khai báo hải quan (FR-BAT-07)", done: true },
      { text: "Kích hoạt lô → Đang lưu thông (FR-BAT-02)", done: true },
      { text: "Nhập/Xuất kho với timestamp & GPS (FR-BAT-05)", done: true },
      { text: "Người tiêu dùng quét QR xem hành trình (FR-CNS-01)", done: true },
      { text: "Báo cáo ẩn danh hàng giả (BR-05)", done: true },
      { text: "Dashboard cảnh báo real-time (BR-06)", done: true },
      { text: "Phân quyền RBAC đa tầng (BR-08)", done: true },
      { text: "Audit log ≥1 năm (NFR-SC-05)", done: true },
      { text: "Security headers + Rate limiting (NFR-SC-04)", done: true },
    ],
  },
  {
    id: 2,
    name: "Giai đoạn 2",
    subtitle: "AI & Scaling",
    duration: "T+9 → T+16 tuần",
    status: "pending",
    color: "purple",
    milestone: "Gate 2 (T+16 tuần)",
    budget: "~40% tổng budget",
    team: "Backend 4 · AI Engineer 2–3 · DevOps 2 · QA 3",
    features: [
      { text: "Computer Vision — phát hiện hàng giả qua ảnh bao bì (YOLOv8)", done: false },
      { text: "OCR phân tích text trên bao bì (PaddleOCR)", done: false },
      { text: "Anomaly detection — hành vi quét bất thường", done: false },
      { text: "Camera AI tại điểm bán (Edge Gateway + MQTT)", done: false },
      { text: "API Hải quan tích hợp thật (OAuth2 + mTLS)", done: false },
      { text: "API Bộ Y tế / ATTP tích hợp thật", done: false },
      { text: "Heatmap hàng giả theo khu vực (Big Data)", done: false },
      { text: "Microservices + Kafka event streaming", done: false },
      { text: "Redis caching cho QR hot data", done: false },
      { text: "Database replication multi-region", done: false },
      { text: "2FA bắt buộc cho doanh nghiệp (NFR-SC-03)", done: false },
      { text: "Auto-scaling Kubernetes", done: false },
    ],
  },
  {
    id: 3,
    name: "Giai đoạn 3",
    subtitle: "Production Launch",
    duration: "T+17 → T+24 tuần",
    status: "pending",
    color: "emerald",
    milestone: "Gate 3 (T+24 tuần) → Public Launch",
    budget: "~15% tổng budget",
    team: "Full team + Marketing",
    features: [
      { text: "Load testing ≥10,000 req/giây (NFR-PF-02)", done: false },
      { text: "Pentest & Security Audit toàn diện", done: false },
      { text: "SLA 99.5% signed với khách hàng", done: false },
      { text: "CDN deployment (giảm latency ≥30%)", done: false },
      { text: "Mobile app iOS + Android (App Store / Google Play)", done: false },
      { text: "Onboarding ≥50 doanh nghiệp", done: false },
      { text: "Training & Documentation hoàn chỉnh", done: false },
      { text: "24/7 NOC monitoring (Prometheus + Grafana)", done: false },
      { text: "API public cho cơ quan nhà nước (Bộ CT, Thanh tra)", done: false },
    ],
  },
  {
    id: 4,
    name: "Giai đoạn 4",
    subtitle: "Scale & Ecosystem",
    duration: "T+25 → T+36 tuần",
    status: "pending",
    color: "amber",
    milestone: "Hệ sinh thái đối tác",
    budget: "Tái đầu tư từ doanh thu",
    team: "Mở rộng đội ngũ",
    features: [
      { text: "Blockchain hash cho toàn bộ supply chain", done: false },
      { text: "API partner cho đại lý phân phối", done: false },
      { text: "Tích hợp thanh toán (VNPay, Stripe)", done: false },
      { text: "Mở rộng đa ngôn ngữ (English, Chinese)", done: false },
      { text: "Chứng nhận ISO 27001 (Information Security)", done: false },
      { text: "Xuất khẩu sang thị trường ASEAN", done: false },
      { text: "AI predictive analytics — dự báo khu vực rủi ro", done: false },
    ],
  },
];

const TIMELINE_EVENTS = [
  { week: "T+0",  event: "Kick-off & Team setup", type: "milestone" },
  { week: "T+2",  event: "KYC module hoàn thành", type: "done" },
  { week: "T+4",  event: "QR + Supply chain done", type: "done" },
  { week: "T+6",  event: "Analytics + Security done", type: "done" },
  { week: "T+8",  event: "Gate 1: MVP Demo (5 doanh nghiệp UAT)", type: "gate" },
  { week: "T+12", event: "AI model training + Camera pilot", type: "pending" },
  { week: "T+16", event: "Gate 2: AI live + Gov Integration", type: "gate" },
  { week: "T+20", event: "Performance tuning + Security audit", type: "pending" },
  { week: "T+24", event: "Gate 3: Public Launch", type: "gate" },
  { week: "T+36", event: "Giai đoạn 4: Ecosystem & Scale", type: "future" },
];

const PHASE_COLORS: Record<string, { text: string; border: string; bg: string; badge: string }> = {
  cyan:    { text: "text-[#C8A557]",    border: "border-[#C8A557]/30",    bg: "bg-[#C8A557]/10",    badge: "bg-[#C8A557]" },
  purple:  { text: "text-[#C8A557]",  border: "border-[#C8A557]/30",  bg: "bg-[#C8A557]/10",  badge: "bg-[#C8A557]" },
  emerald: { text: "text-[#6FB585]", border: "border-[#4A7C5C]/30", bg: "bg-[#4A7C5C]/10", badge: "bg-[#4A7C5C]" },
  amber:   { text: "text-[#C8A557]",   border: "border-[#C8A557]/30",   bg: "bg-[#C8A557]/10",   badge: "bg-[#C8A557]" },
};

const TIMELINE_STYLE: Record<string, { dot: string; textCls: string }> = {
  done:      { dot: "bg-[#4A7C5C]", textCls: "text-emerald-300" },
  gate:      { dot: "bg-[#C8A557] ring-2 ring-[#C8A557]/40 ring-offset-1 ring-offset-transparent", textCls: "text-cyan-300 font-bold" },
  milestone: { dot: "bg-white",       textCls: "text-white font-bold" },
  pending:   { dot: "bg-slate-500",   textCls: "text-slate-400" },
  future:    { dot: "bg-[#C8A557]",   textCls: "text-amber-300" },
};

export default function RoadmapPage() {
  const [selectedPhase, setSelectedPhase] = useState<number | null>(null);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (!["admin", "manufacturer", "importer"].includes(role || "")) {
      // Allow all roles to view roadmap
    }
  }, []);

  const currentPhase = PHASES.find(p => p.status === "in_progress");
  const totalDone = PHASES.flatMap(p => p.features).filter(f => f.done).length;
  const totalFeatures = PHASES.flatMap(p => p.features).length;
  const pct = Math.round((totalDone / totalFeatures) * 100);

  return (
    <div className="min-h-[calc(100vh-80px)] p-6 md:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard" className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-2">
          <span className="material-symbols-outlined text-[14px]">arrow_back</span> Bảng điều khiển
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C8A557]/20 border border-[#C8A557]/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#C8A557]">map</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white font-display">Lộ trình Triển khai</h1>
              <p className="text-sm text-slate-400">Phần 12: Roadmap 4 giai đoạn · 6 tháng · TABLE 18</p>
            </div>
          </div>
          <div className="glass-panel border border-[#C8A557]/20 rounded-xl px-4 py-2 flex items-center gap-3">
            <div>
              <div className="w-32 bg-white/10 rounded-full h-2 mb-1">
                <div className="h-2 rounded-full bg-gradient-to-r from-[#C8A557] to-[#E4D2A1]" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-slate-400">{totalDone}/{totalFeatures} tính năng · {pct}% hoàn thành</p>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="glass-panel border border-white/10 rounded-2xl p-5 mb-8">
        <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#C8A557] text-[18px]">timeline</span>
          Timeline tổng quan — 36 tuần
        </h2>
        <div className="relative">
          <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-white/10 rounded-full" />
          <div className="space-y-3 pl-10">
            {TIMELINE_EVENTS.map((ev, i) => {
              const st = TIMELINE_STYLE[ev.type];
              return (
                <div key={i} className="relative flex items-center gap-4">
                  <div className={`absolute -left-6 w-3 h-3 rounded-full shrink-0 ${st.dot}`} />
                  <span className="text-[10px] font-mono text-slate-500 w-10 shrink-0">{ev.week}</span>
                  <span className={`text-sm ${st.textCls}`}>{ev.event}</span>
                  {ev.type === "gate" && (
                    <span className="text-[9px] px-2 py-0.5 bg-[#C8A557]/20 text-cyan-300 border border-[#C8A557]/30 rounded-full font-bold">GATE</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Phase selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {PHASES.map(ph => {
          const c = PHASE_COLORS[ph.color];
          const doneInPhase = ph.features.filter(f => f.done).length;
          return (
            <button key={ph.id} onClick={() => setSelectedPhase(selectedPhase === ph.id ? null : ph.id)}
              className={`p-4 rounded-2xl border text-left transition ${selectedPhase === ph.id ? `${c.bg} ${c.border}` : "glass-panel border-white/10 hover:border-white/20"}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-black px-2 py-0.5 rounded-full text-white ${c.badge}`}>GĐ {ph.id}</span>
                <span className={`text-xs font-bold flex items-center gap-1 ${
                  ph.status === "in_progress" ? "text-[#6FB585]" :
                  ph.status === "completed" ? "text-[#C8A557]" : "text-slate-500"
                }`}>
                  {ph.status === "in_progress" ? "✅ Active" : ph.status === "completed" ? "✅ Done" : "⏳ Kế hoạch"}
                </span>
              </div>
              <p className={`text-sm font-bold ${c.text} mb-0.5`}>{ph.name}</p>
              <p className="text-xs text-slate-400 mb-2">{ph.subtitle}</p>
              <div className="w-full bg-white/10 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${c.badge}`}
                  style={{ width: `${Math.round((doneInPhase / ph.features.length) * 100)}%` }} />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">{doneInPhase}/{ph.features.length} tính năng</p>
            </button>
          );
        })}
      </div>

      {/* Phase detail */}
      {selectedPhase && (() => {
        const ph = PHASES.find(p => p.id === selectedPhase)!;
        const c = PHASE_COLORS[ph.color];
        return (
          <div className={`glass-panel border rounded-2xl p-6 ${c.border} ${c.bg}`}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className={`text-xl font-black ${c.text}`}>{ph.name}: {ph.subtitle}</h2>
                <p className="text-sm text-slate-400 mt-1">{ph.duration} · Milestone: {ph.milestone}</p>
              </div>
              <div className="text-right text-xs text-slate-400">
                <p>Budget: {ph.budget}</p>
                <p>Team: {ph.team}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {ph.features.map((f, i) => (
                <div key={i} className={`flex items-center gap-2 p-2.5 rounded-xl text-sm ${f.done ? "bg-[#4A7C5C]/10 border border-[#4A7C5C]/20" : "bg-white/5 border border-white/10"}`}>
                  <span className={`material-symbols-outlined text-[16px] shrink-0 ${f.done ? "text-[#6FB585]" : "text-slate-500"}`}>
                    {f.done ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  <span className={f.done ? "text-white" : "text-slate-400"}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Current phase summary */}
      {!selectedPhase && currentPhase && (
        <div className="glass-panel border border-[#C8A557]/20 bg-[#C8A557]/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-[#C8A557]">play_circle</span>
            <h2 className="text-sm font-bold text-white">Đang thực hiện: {currentPhase.name} — {currentPhase.subtitle}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {currentPhase.features.map((f, i) => (
              <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${f.done ? "text-emerald-300" : "text-slate-500"}`}>
                <span className={`material-symbols-outlined text-[14px] ${f.done ? "text-[#6FB585]" : "text-slate-600"}`}>
                  {f.done ? "check_circle" : "radio_button_unchecked"}
                </span>
                {f.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
