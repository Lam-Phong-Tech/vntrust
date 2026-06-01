"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ── Phần 11: Giả định, Ràng buộc & Rủi ro ─────────────────────────────────

// TABLE 16: Ràng buộc (Constraints)
const CONSTRAINTS = [
  {
    id: "C-01",
    title: "Luật bảo vệ dữ liệu cá nhân",
    detail: "QĐ-54/2019/NĐ-CP — không được lưu dữ liệu người dùng không cần thiết",
    source: "Pháp luật Việt Nam",
    impact: "high",
    status: "compliant",
  },
  {
    id: "C-02",
    title: "Báo cáo ẩn danh không cần đăng nhập",
    detail: "Người dùng báo cáo ẩn danh → không yêu cầu đăng nhập, nhưng vẫn phải validate CAPTCHA/Device ID",
    source: "Yêu cầu BR-05",
    impact: "medium",
    status: "compliant",
  },
  {
    id: "C-03",
    title: "Budget & Timeline MVP",
    detail: "MVP phải hoàn thành trong 8–10 tuần. Chi phí ≤ Budget được phê duyệt (VND)",
    source: "Quyết định quản lý",
    impact: "high",
    status: "compliant",
  },
  {
    id: "C-04",
    title: "Chỉ hỗ trợ Tiếng Việt giai đoạn 1",
    detail: "Mở rộng ngôn ngữ (Anh, Trung) khi có tài chính thêm ở giai đoạn 2+",
    source: "Scope & Resource Planning",
    impact: "low",
    status: "compliant",
  },
  {
    id: "C-05",
    title: "Hỗ trợ chính Android & iOS",
    detail: "Web app là optional — tập trung phát triển mobile app trước",
    source: "Chiến lược phát triển",
    impact: "medium",
    status: "compliant",
  },
  {
    id: "C-06",
    title: "Camera AI bắt đầu từ giai đoạn 2",
    detail: "Giai đoạn 1 chỉ xác thực via API — Camera AI & Edge AI triển khai sau MVP",
    source: "Roadmap kỹ thuật",
    impact: "medium",
    status: "compliant",
  },
];

// Section 11.1: Giả định (Assumptions)
const ASSUMPTIONS = [
  { id: "A-01", text: "Cơ quan nhà nước sẽ hợp tác tích cực, cung cấp API dữ liệu chứng thực, hỗ trợ quá trình triển khai" },
  { id: "A-02", text: "Doanh nghiệp sẽ tích cực cập nhật thông tin sản phẩm, lô hàng lên hệ thống (định kỳ hàng tuần)" },
  { id: "A-03", text: "Người tiêu dùng sẽ sử dụng hệ thống để quét QR, xem thông tin sản phẩm, báo cáo hàng giả" },
  { id: "A-04", text: "Internet connectivity ở các điểm bán là ổn định (hoặc hỗ trợ offline caching cho camera AI)" },
  { id: "A-05", text: "Hệ thống có đủ tài chính (budget dự kiến), nhân sự để phát triển, vận hành 24/7, hỗ trợ 365 ngày/năm" },
  { id: "A-06", text: "Các doanh nghiệp sẽ sẵn sàng in QR code động trên bao bì (không tăng chi phí sản xuất quá nhiều)" },
  { id: "A-07", text: "Thị trường có nhu cầu thực sự về giải pháp chống hàng giả (market demand được xác nhận)" },
];

// TABLE 17: Rủi ro (Risk Register)
const RISKS = [
  {
    id: "RK-01",
    title: "Doanh nghiệp chậm cập nhật thông tin sản phẩm",
    detail: "Hệ thống có dữ liệu cũ, kém chính xác (>6 tháng không cập nhật)",
    probability: "low",
    impact: "medium",
    score: 2,
    mitigation: "Gửi thông báo nhắc nhở hàng tuần; tính phí nếu dữ liệu quá cũ (>6 tháng)",
    status: "mitigated",
  },
  {
    id: "RK-02",
    title: "AI phát hiện hàng giả False Positive >10%",
    detail: "Mất lòng tin người dùng, gây khiếu nại từ doanh nghiệp",
    probability: "low",
    impact: "medium",
    score: 2,
    mitigation: "Kiểm thử AI kỹ lưỡng; cho phép Admin override; thu thập feedback; fine-tuning liên tục",
    status: "mitigated",
  },
  {
    id: "RK-03",
    title: "API Hải quan / Bộ Y tế không ổn định hoặc chậm",
    detail: "Hệ thống bị ảnh hưởng khi phụ thuộc external API",
    probability: "low",
    impact: "low",
    score: 1,
    mitigation: "Cache + retry logic + fallback; monitoring 24/7; SLA thỏa thuận với nhà cung cấp API",
    status: "mitigated",
  },
  {
    id: "RK-04",
    title: "Vấn đề bảo mật: Data breach, hack hệ thống",
    detail: "Dữ liệu bị lộ, ảnh hưởng uy tín và pháp lý",
    probability: "low",
    impact: "critical",
    score: 3,
    mitigation: "Audit bảo mật định kỳ (quarterly); mã hóa dữ liệu; giám sát 24/7; pentest; SOC team",
    status: "mitigated",
  },
  {
    id: "RK-05",
    title: "Cộng đồng doanh nghiệp không hợp tác / chậm tham gia",
    detail: "Thiếu dữ liệu đầu vào, hệ thống kém hiệu quả",
    probability: "low",
    impact: "medium",
    score: 2,
    mitigation: "Marketing campaign; partnership với hiệp hội ngành; incentive (free trial 3 tháng)",
    status: "mitigated",
  },
  {
    id: "RK-06",
    title: "Thanh tra / cơ quan quản lý không tích cực sử dụng",
    detail: "Giảm hiệu quả thực thi pháp luật, hệ thống mất giá trị",
    probability: "low",
    impact: "low",
    score: 1,
    mitigation: "Demo intensive; training; provide actionable insights (heatmap, enforcement data); SLA 99.5%",
    status: "mitigated",
  },
  {
    id: "RK-07",
    title: "Hiệu năng kém khi load cao (khách hàng quét nhiều đồng thời)",
    detail: "Hệ thống chậm / down ảnh hưởng trải nghiệm người dùng",
    probability: "low",
    impact: "low",
    score: 1,
    mitigation: "Load testing; auto-scaling; database optimization; CDN; alert khi P95 > 200ms",
    status: "mitigated",
  },
];

const PROB_STYLE: Record<string, string> = {
  low:    "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
  medium: "text-amber-300 bg-[#C8A557]/15 border-[#C8A557]/30",
  high:   "text-red-300 bg-red-500/15 border-red-500/30",
};
const IMPACT_STYLE: Record<string, string> = {
  low:      "text-slate-300 bg-white/5 border-white/10",
  medium:   "text-amber-300 bg-[#C8A557]/15 border-[#C8A557]/30",
  high:     "text-red-300 bg-red-500/15 border-red-500/30",
  critical: "text-violet-300 bg-violet-500/15 border-violet-500/30",
};
const RISK_STATUS: Record<string, { cls: string; label: string }> = {
  open:      { cls: "text-red-300 bg-red-500/15 border-red-500/30",       label: "Mở" },
  mitigated: { cls: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30", label: "Đã giảm thiểu" },
  closed:    { cls: "text-slate-400 bg-white/5 border-white/10",           label: "Đóng" },
};
const CONSTRAINT_STATUS: Record<string, { cls: string; label: string; icon: string }> = {
  compliant:   { cls: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30", label: "Tuân thủ",     icon: "check_circle" },
  in_progress: { cls: "text-amber-300 bg-[#C8A557]/15 border-[#C8A557]/30",       label: "Đang xử lý",  icon: "autorenew" },
  pending:     { cls: "text-slate-400 bg-white/5 border-white/10",               label: "Giai đoạn 2", icon: "schedule" },
};

function scoreColor(score: number) {
  if (score >= 8) return "text-violet-400 bg-violet-500/20";
  if (score >= 6) return "text-red-400 bg-red-500/20";
  if (score >= 4) return "text-[#C8A557] bg-[#C8A557]/20";
  return "text-emerald-400 bg-emerald-500/20";
}

export default function RiskPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"risk" | "constraint" | "assumption">("risk");
  const [sortByScore, setSortByScore] = useState(true);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "admin") router.replace("/dashboard");
  }, []);

  const openRisks     = RISKS.filter(r => r.status === "open").length;
  const mitigatedRisks = RISKS.filter(r => r.status === "mitigated").length;
  const avgScore      = Math.round(RISKS.reduce((a, r) => a + r.score, 0) / RISKS.length);
  const sortedRisks   = [...RISKS].sort((a, b) => sortByScore ? b.score - a.score : 0);

  return (
    <div className="min-h-[calc(100vh-80px)] p-6 md:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard" className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-2">
          <span className="material-symbols-outlined text-[14px]">arrow_back</span> Bảng điều khiển
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-red-400">warning</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white font-display">Giả định · Ràng buộc · Rủi ro</h1>
            <p className="text-sm text-slate-400">Phần 11: Assumptions · Constraints (TABLE 16) · Risk Register (TABLE 17)</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { label: "Rủi ro đang mở",     value: openRisks,     color: "text-red-400",     icon: "crisis_alert" },
          { label: "Đã giảm thiểu",      value: mitigatedRisks, color: "text-emerald-400", icon: "shield_check" },
          { label: "Risk Score TB",      value: avgScore,       color: avgScore >= 6 ? "text-red-400" : avgScore >= 4 ? "text-[#C8A557]" : "text-emerald-400", icon: "speed" },
          { label: "Ràng buộc",          value: CONSTRAINTS.length, color: "text-blue-400", icon: "rule" },
        ].map((s, i) => (
          <div key={i} className="glass-panel border border-white/10 rounded-2xl p-4">
            <span className={`material-symbols-outlined text-2xl ${s.color}`}>{s.icon}</span>
            <p className={`text-3xl font-black mt-1 ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[["risk","Risk Register","crisis_alert"],["constraint","Ràng buộc","rule"],["assumption","Giả định","lightbulb"]].map(([k,l,icon]) => (
          <button key={k} onClick={() => setActiveTab(k as any)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border transition ${activeTab === k ? "bg-red-500 text-white border-red-400" : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"}`}>
            <span className="material-symbols-outlined text-[15px]">{icon}</span>{l}
          </button>
        ))}
      </div>

      {/* ── RISK REGISTER (TABLE 17) ── */}
      {activeTab === "risk" && (
        <div className="space-y-4">
          {/* Risk matrix summary */}
          <div className="glass-panel border border-red-500/20 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-400 text-[18px]">grid_view</span>
              Ma trận Rủi ro (Probability × Impact)
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Critical (8–9)",  risks: RISKS.filter(r => r.score >= 8), cls: "border-violet-500/30 bg-violet-500/10" },
                { label: "High (6–7)",      risks: RISKS.filter(r => r.score >= 6 && r.score < 8), cls: "border-red-500/30 bg-red-500/10" },
                { label: "Medium/Low (≤5)", risks: RISKS.filter(r => r.score < 6), cls: "border-[#C8A557]/30 bg-[#C8A557]/10" },
              ].map((cell, i) => (
                <div key={i} className={`p-3 rounded-xl border ${cell.cls}`}>
                  <p className="text-xs font-bold text-white mb-2">{cell.label}</p>
                  {cell.risks.map(r => (
                    <p key={r.id} className="text-[10px] text-slate-300 mb-0.5">• {r.id}: {r.title.substring(0, 30)}...</p>
                  ))}
                  {cell.risks.length === 0 && <p className="text-[10px] text-slate-500">Không có</p>}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">7 rủi ro được xác định — sắp xếp theo Risk Score</p>
            <button onClick={() => setSortByScore(!sortByScore)}
              className="text-xs px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-slate-300 hover:bg-white/10 transition">
              {sortByScore ? "Sắp xếp theo mã" : "Sắp xếp theo điểm"}
            </button>
          </div>

          <div className="space-y-3">
            {sortedRisks.map(risk => {
              const st = RISK_STATUS[risk.status];
              return (
                <div key={risk.id} className="glass-panel border border-white/10 rounded-2xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-black px-2.5 py-1 rounded-lg font-mono ${scoreColor(risk.score)}`}>
                        {risk.score}/9
                      </span>
                      <div>
                        <p className="font-bold text-white text-sm">{risk.id}: {risk.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{risk.detail}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${st.cls}`}>{st.label}</span>
                  </div>

                  <div className="flex gap-2 mb-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PROB_STYLE[risk.probability]}`}>
                      XS: {risk.probability === "high" ? "Cao" : risk.probability === "medium" ? "TB" : "Thấp"}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${IMPACT_STYLE[risk.impact]}`}>
                      TĐ: {risk.impact === "critical" ? "Nghiêm trọng" : risk.impact === "high" ? "Cao" : risk.impact === "medium" ? "TB" : "Thấp"}
                    </span>
                  </div>

                  <div className="flex items-start gap-2 p-3 bg-white/5 rounded-xl text-xs text-slate-300">
                    <span className="material-symbols-outlined text-[14px] text-emerald-400 shrink-0 mt-0.5">health_and_safety</span>
                    <span><strong className="text-emerald-300">Biện pháp:</strong> {risk.mitigation}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CONSTRAINTS (TABLE 16) ── */}
      {activeTab === "constraint" && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400 mb-4">
            6 ràng buộc hệ thống — phải đảm bảo tuân thủ trong suốt quá trình phát triển và vận hành.
          </p>
          {CONSTRAINTS.map(c => {
            const st = CONSTRAINT_STATUS[c.status];
            return (
              <div key={c.id} className="glass-panel border border-white/10 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded">{c.id}</span>
                    <p className="font-bold text-white text-sm">{c.title}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${IMPACT_STYLE[c.impact]}`}>
                      Ảnh hưởng: {c.impact === "high" ? "Cao" : c.impact === "medium" ? "TB" : "Thấp"}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${st.cls}`}>
                      <span className="material-symbols-outlined text-[11px]">{st.icon}</span>
                      {st.label}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-slate-300 mb-2">{c.detail}</p>
                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">source</span>
                  Nguồn: {c.source}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ASSUMPTIONS ── */}
      {activeTab === "assumption" && (
        <div className="space-y-3">
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300 flex gap-2 mb-4">
            <span className="material-symbols-outlined text-[15px] shrink-0">info</span>
            <span>Giả định là các điều kiện được coi là đúng trong quá trình phân tích. Nếu giả định sai, cần đánh giá lại risk và roadmap.</span>
          </div>
          {ASSUMPTIONS.map((a, i) => (
            <div key={a.id} className="glass-panel border border-white/10 rounded-2xl p-4 flex items-start gap-4">
              <span className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black text-sm shrink-0">
                {i + 1}
              </span>
              <div>
                <span className="font-mono text-[10px] text-slate-500">{a.id}</span>
                <p className="text-sm text-white mt-0.5">{a.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
