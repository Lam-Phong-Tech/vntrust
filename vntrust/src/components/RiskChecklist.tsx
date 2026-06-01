"use client";
// Module 3 — Risk Checklist 6-color severity (theo file 3 §5)
// Reusable component cho AI verify result + compliance dashboard

export type Severity = 'pass' | 'monitor' | 'suspect' | 'risk' | 'fraud' | 'unknown';

export interface ChecklistItem {
  label: string;
  severity: Severity;
  detail?: string;      // mô tả thêm
  score?: number;       // điểm góp (optional)
}

export interface RiskChecklistProps {
  items: ChecklistItem[];
  totalScore?: number;  // 0-100
  showLegend?: boolean;
  conclusion?: string;  // text kết luận
  compact?: boolean;    // mobile-friendly compact mode
}

// ─── 6-color palette (theo tài liệu file 3 §5) ────────────────────
export const SEVERITY_META: Record<Severity, {
  icon: string;
  bg: string;
  text: string;
  border: string;
  label: string;
  scoreRange: string;
}> = {
  pass:    { icon: '🟢', bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/40', label: 'ĐẠT',         scoreRange: '0–20'   },
  monitor: { icon: '🟡', bg: 'bg-amber-500/15',   text: 'text-amber-300',   border: 'border-amber-500/40',   label: 'THEO DÕI',    scoreRange: '21–40'  },
  suspect: { icon: '🟠', bg: 'bg-orange-500/15',  text: 'text-orange-300',  border: 'border-orange-500/40',  label: 'NGHI VẤN',    scoreRange: '41–60'  },
  risk:    { icon: '🔴', bg: 'bg-red-500/15',     text: 'text-red-300',     border: 'border-red-500/40',     label: 'RỦI RO CAO',  scoreRange: '61–80'  },
  fraud:   { icon: '⚫', bg: 'bg-slate-800/50',   text: 'text-slate-200',   border: 'border-slate-700',      label: 'GIẢ MẠO',     scoreRange: '81–100' },
  unknown: { icon: '🔵', bg: 'bg-blue-500/15',    text: 'text-blue-300',    border: 'border-blue-500/40',    label: 'CHƯA ĐỦ DATA', scoreRange: '—'    },
};

// Tính conclusion từ totalScore
export function severityFromScore(score: number): Severity {
  if (score >= 81) return 'fraud';
  if (score >= 61) return 'risk';
  if (score >= 41) return 'suspect';
  if (score >= 21) return 'monitor';
  return 'pass';
}

export default function RiskChecklist({
  items,
  totalScore,
  showLegend = false,
  conclusion,
  compact = false,
}: RiskChecklistProps) {
  // Auto-determine overall severity from total score or worst item
  let overallSev: Severity;
  if (typeof totalScore === 'number') {
    overallSev = severityFromScore(totalScore);
  } else {
    const SEVERITY_ORDER: Severity[] = ['fraud', 'risk', 'suspect', 'monitor', 'pass', 'unknown'];
    overallSev = items.reduce<Severity>((worst, item) => {
      const wi = SEVERITY_ORDER.indexOf(worst);
      const ii = SEVERITY_ORDER.indexOf(item.severity);
      return ii < wi ? item.severity : worst;
    }, 'pass');
  }
  const overallMeta = SEVERITY_META[overallSev];

  return (
    <div className="space-y-3">
      {/* Header — tổng kết */}
      <div className={`rounded-2xl border ${overallMeta.border} ${overallMeta.bg} p-3 sm:p-4 flex items-center gap-3`}>
        <span className="text-2xl sm:text-3xl shrink-0">{overallMeta.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-xs uppercase tracking-widest font-bold ${overallMeta.text}`}>
            Risk Assessment Checklist
          </p>
          <p className={`text-base sm:text-lg font-black ${overallMeta.text}`}>
            {overallMeta.label}
          </p>
        </div>
        {typeof totalScore === 'number' && (
          <div className="text-right shrink-0">
            <p className={`text-2xl sm:text-3xl font-black ${overallMeta.text}`}>{totalScore}<span className="text-sm opacity-60">/100</span></p>
            <p className="text-[10px] text-slate-400 font-mono">Risk Score</p>
          </div>
        )}
      </div>

      {/* Items list */}
      <div className="space-y-1.5">
        {items.map((item, i) => {
          const meta = SEVERITY_META[item.severity];
          return (
            <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-xl border ${meta.border} ${meta.bg}`}>
              <span className="text-base sm:text-lg shrink-0 leading-tight">{meta.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white leading-tight">{item.label}</p>
                {item.detail && (
                  <p className={`text-[11px] ${meta.text} mt-0.5 leading-relaxed`}>{item.detail}</p>
                )}
              </div>
              {typeof item.score === 'number' && (
                <span className={`text-xs font-mono font-bold shrink-0 ${meta.text}`}>
                  {item.score > 0 ? '+' : ''}{item.score}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Conclusion */}
      {conclusion && (
        <div className={`rounded-xl border-2 ${overallMeta.border} ${overallMeta.bg} p-3 sm:p-4 mt-3`}>
          <p className={`text-xs font-bold uppercase tracking-wider ${overallMeta.text} mb-1`}>
            Kết luận
          </p>
          <p className={`text-sm sm:text-base font-bold ${overallMeta.text}`}>{conclusion}</p>
        </div>
      )}

      {/* Legend (optional) */}
      {showLegend && !compact && (
        <details className="mt-4 text-xs">
          <summary className="cursor-pointer text-slate-400 hover:text-white font-bold">
            Bảng màu severity (6 mức)
          </summary>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
            {(Object.keys(SEVERITY_META) as Severity[]).map(sev => {
              const m = SEVERITY_META[sev];
              return (
                <div key={sev} className={`p-2 rounded-lg border ${m.border} ${m.bg} text-[10px]`}>
                  <p className={`font-bold ${m.text}`}>{m.icon} {m.label}</p>
                  <p className="text-slate-400 font-mono">{m.scoreRange}</p>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}
