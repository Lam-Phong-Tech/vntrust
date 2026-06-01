import re

lang_file = r'vntrust/src/contexts/LanguageContext.tsx'
with open(lang_file, 'r', encoding='utf-8') as f:
    lang_content = f.read()

new_translations = """
  // ── Supply Chain & Dashboard ──
  sc_board: { vi: "Bảng điều khiển", en: "Dashboard", fr: "Tableau de bord" },
  sc_analytics: { vi: "Phân tích", en: "Analytics", fr: "Analyse" },
  sc_title: { vi: "Phân tích Chuỗi Cung ứng", en: "Supply Chain Analytics", fr: "Analyse de la chaîne d'approvisionnement" },
  sc_30d: { vi: "30 Ngày Qua", en: "Last 30 Days", fr: "30 derniers jours" },
  sc_7d: { vi: "7 Ngày Qua", en: "Last 7 Days", fr: "7 derniers jours" },
  sc_90d: { vi: "90 Ngày Qua", en: "Last 90 Days", fr: "90 derniers jours" },
  sc_total_auth: { vi: "Tổng Số Lượt Xác Thực", en: "Total Authentications", fr: "Authentifications totales" },
  sc_fake_prev: { vi: "Nỗ Lực Làm Giả Bị Ngăn Chặn", en: "Fake Attempts Prevented", fr: "Tentatives de faux empêchées" },
  sc_active: { vi: "ĐANG HOẠT ĐỘNG", en: "ACTIVE", fr: "ACTIF" },
  sc_efficiency: { vi: "Hiệu Quả Chuỗi Cung Ứng", en: "Supply Chain Efficiency", fr: "Efficacité de la chaîne" },
  sc_optimal: { vi: "TỐI ƯU", en: "OPTIMAL", fr: "OPTIMAL" },
  sc_auth_speed: { vi: "Tốc Độ Xác Thực", en: "Authentication Speed", fr: "Vitesse d'authentification" },
  sc_live_traffic: { vi: "Lưu lượng thực tế trên các nút mạng toàn cầu", en: "Live traffic across global nodes", fr: "Trafic en direct sur les nœuds" },
  sc_day: { vi: "Ngày", en: "Day", fr: "Jour" },
  sc_week: { vi: "Tuần", en: "Week", fr: "Semaine" },
  sc_month: { vi: "Tháng", en: "Month", fr: "Mois" },
  sc_today: { vi: "Hôm nay:", en: "Today:", fr: "Aujourd'hui:" },
  sc_trust_dist: { vi: "Phân bổ Mức Độ Tinh cậy", en: "Trust Level Distribution", fr: "Répartition du niveau de confiance" },
  sc_safety_status: { vi: "Trạng thái an toàn trên toàn hệ thống", en: "System-wide safety status", fr: "Statut de sécurité du système" },
  sc_safe_score: { vi: "ĐIỂM AN TOÀN", en: "SAFETY SCORE", fr: "SCORE DE SÉCURITÉ" },
  sc_scan_activity: { vi: "Hoạt Động Quét Toàn Quốc", en: "National Scan Activity", fr: "Activité de scan nationale" },
  sc_geo_dist: { vi: "Phân bổ xác thực theo vị trí địa lý", en: "Authentication distribution by geography", fr: "Répartition par géographie" },
  sc_live_data: { vi: "Dữ Liệu Trực Tiếp", en: "Live Data", fr: "Données en direct" },
  sc_new_scan: { vi: "Lượt quét mới: Nút", en: "New scan: Node", fr: "Nouveau scan: Nœud" },
  sc_latest_ledger: { vi: "Nhật Ký Sổ Cái Mới Nhất", en: "Latest Ledger Logs", fr: "Derniers journaux du grand livre" },
  sc_live: { vi: "LIVE", en: "LIVE", fr: "EN DIRECT" },
  sc_realtime_block: { vi: "Cập nhật khối thời gian thực", en: "Real-time block updates", fr: "Mises à jour des blocs en temps réel" },
  sc_full_network: { vi: "Toàn Bộ Mạng Lưới Blockchain", en: "Full Blockchain Network", fr: "Réseau complet de la blockchain" },
  sc_ai_running: { vi: "Trình Phân Tích AI Đang Chạy", en: "AI Analyzer Running", fr: "Analyseur IA en cours" },
  sc_scanning: { vi: "Đang quét", en: "Scanning", fr: "Analyse en cours" },
  sc_hotspot: { vi: "Điểm nóng", en: "Hotspot", fr: "Point chaud" },
  sc_tracking: { vi: "Đang theo dõi", en: "Tracking", fr: "En suivi" },
  sc_normal: { vi: "Bình thường", en: "Normal", fr: "Normal" },
  sc_export: { vi: "EXPORT REPORT", en: "EXPORT REPORT", fr: "EXPORTER RAPPORT" },
"""

lang_content = lang_content.replace('  // ── AI button ──', new_translations + '\n  // ── AI button ──')
with open(lang_file, 'w', encoding='utf-8') as f:
    f.write(lang_content)

sc_file = r'vntrust/src/app/supply-chain/page.tsx'
with open(sc_file, 'r', encoding='utf-8') as f:
    sc_content = f.read()

sc_content = sc_content.replace('import { useState, useEffect } from "react";', 'import { useState, useEffect } from "react";\nimport { useLanguage } from "@/contexts/LanguageContext";')
sc_content = sc_content.replace('const [timeRange, setTimeRange] = useState("30");', 'const [timeRange, setTimeRange] = useState("30");\n  const { t } = useLanguage();')

replacements = [
    ('>Bảng điều khiển<', '>{t("sc_board")}<'),
    ('>Phân tích<', '>{t("sc_analytics")}<'),
    ('>Phân tích Chuỗi Cung ứng<', '>{t("sc_title")}<'),
    ('>30 Ngày Qua<', '>{t("sc_30d")}<'),
    ('>7 Ngày Qua<', '>{t("sc_7d")}<'),
    ('>90 Ngày Qua<', '>{t("sc_90d")}<'),
    ('>Tổng Số Lượt Xác Thực<', '>{t("sc_total_auth")}<'),
    ('>Nỗ Lực Làm Giả Bị Ngăn Chặn<', '>{t("sc_fake_prev")}<'),
    ('>ĐANG HOẠT ĐỘNG<', '>{t("sc_active")}<'),
    ('>Hiệu Quả Chuỗi Cung Ứng<', '>{t("sc_efficiency")}<'),
    ('>TỐI ƯU<', '>{t("sc_optimal")}<'),
    ('>Tốc Độ Xác Thực <', '>{t("sc_auth_speed")} <'),
    ('>Lưu lượng thực tế trên các nút mạng toàn cầu<', '>{t("sc_live_traffic")}<'),
    ('>Ngày<', '>{t("sc_day")}<'),
    ('>Tuần<', '>{t("sc_week")}<'),
    ('>Tháng<', '>{t("sc_month")}<'),
    ('Hôm nay:', '{t("sc_today")}'),
    ('>Phân bổ Mức Độ Tinh cậy<', '>{t("sc_trust_dist")}<'),
    ('>Trạng thái an toàn trên toàn hệ thống<', '>{t("sc_safety_status")}<'),
    ('>ĐIỂM AN TOÀN<', '>{t("sc_safe_score")}<'),
    ('>Hoạt Động Quét Toàn Quốc<', '>{t("sc_scan_activity")}<'),
    ('>Phân bổ xác thực theo vị trí địa lý<', '>{t("sc_geo_dist")}<'),
    ('>Dữ Liệu Trực Tiếp<', '>{t("sc_live_data")}<'),
    ('Lượt quét mới: Nút', '{t("sc_new_scan")}'),
    ('>Nhật Ký Sổ Cái Mới Nhất', '>{t("sc_latest_ledger")}'),
    ('> LIVE<', '> {t("sc_live")}<'),
    ('>Cập nhật khối thời gian thực<', '>{t("sc_realtime_block")}<'),
    ('>Toàn Bộ Mạng Lưới Blockchain<', '>{t("sc_full_network")}<'),
    ('>Trình Phân Tích AI Đang Chạy<', '>{t("sc_ai_running")}<'),
    ('Đang quét', '{t("sc_scanning")}'),
]

for old, new in replacements:
    sc_content = sc_content.replace(old, new)

with open(sc_file, 'w', encoding='utf-8') as f:
    f.write(sc_content)

db_file = r'vntrust/src/app/dashboard/page.tsx'
with open(db_file, 'r', encoding='utf-8') as f:
    db_content = f.read()

db_replacements = [
    ('Điểm nóng', '{t("sc_hotspot")}'),
    ('Đang theo dõi', '{t("sc_tracking")}'),
    ('Bình thường', '{t("sc_normal")}'),
    ('EXPORT REPORT', '{t("sc_export")}'),
]

for old, new in db_replacements:
    db_content = db_content.replace(old, new)

with open(db_file, 'w', encoding='utf-8') as f:
    f.write(db_content)

print('Translation applied successfully!')
