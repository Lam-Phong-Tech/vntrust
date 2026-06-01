#!/usr/bin/env python3
"""Add missing sc_ and other keys back to LanguageContext.tsx"""

MISSING_KEYS = '''
  // ── Supply Chain & Dashboard ──
  sc_board:          { vi: "Bảng điều khiển", en: "Dashboard", zh: "控制台", ja: "ダッシュボード", ko: "대시보드", fr: "Tableau de bord" },
  sc_analytics:      { vi: "Phân tích", en: "Analytics", zh: "分析", ja: "分析", ko: "분석", fr: "Analyse" },
  sc_title:          { vi: "Phân tích Chuỗi Cung ứng", en: "Supply Chain Analytics", zh: "供应链分析", ja: "サプライチェーン分析", ko: "공급망 분석", fr: "Analyse de la chaîne d\'approvisionnement" },
  sc_30d:            { vi: "30 Ngày Qua", en: "Last 30 Days", zh: "过去30天", ja: "過去30日", ko: "지난 30일", fr: "30 derniers jours" },
  sc_7d:             { vi: "7 Ngày Qua", en: "Last 7 Days", zh: "过去7天", ja: "過去7日", ko: "지난 7일", fr: "7 derniers jours" },
  sc_90d:            { vi: "90 Ngày Qua", en: "Last 90 Days", zh: "过去90天", ja: "過去90日", ko: "지난 90일", fr: "90 derniers jours" },
  sc_total_auth:     { vi: "Tổng Số Lượt Xác Thực", en: "Total Authentications", zh: "总认证次数", ja: "総認証数", ko: "총 인증 수", fr: "Authentifications totales" },
  sc_fake_prev:      { vi: "Nỗ Lực Làm Giả Bị Ngăn Chặn", en: "Fake Attempts Prevented", zh: "已阻止的伪造尝试", ja: "阻止した偽造試行", ko: "차단된 위조 시도", fr: "Tentatives de faux empêchées" },
  sc_active:         { vi: "ĐANG HOẠT ĐỘNG", en: "ACTIVE", zh: "活跃中", ja: "アクティブ", ko: "활성", fr: "ACTIF" },
  sc_efficiency:     { vi: "Hiệu Quả Chuỗi Cung Ứng", en: "Supply Chain Efficiency", zh: "供应链效率", ja: "サプライチェーン効率", ko: "공급망 효율", fr: "Efficacité de la chaîne" },
  sc_optimal:        { vi: "TỐI ƯU", en: "OPTIMAL", zh: "最优", ja: "最適", ko: "최적", fr: "OPTIMAL" },
  sc_auth_speed:     { vi: "Tốc Độ Xác Thực", en: "Authentication Speed", zh: "认证速度", ja: "認証速度", ko: "인증 속도", fr: "Vitesse d\'authentification" },
  sc_live_traffic:   { vi: "Lưu lượng thực tế trên các nút mạng toàn cầu", en: "Live traffic across global nodes", zh: "全球节点实时流量", ja: "グローバルノードのライブトラフィック", ko: "글로벌 노드의 실시간 트래픽", fr: "Trafic en direct sur les noeuds" },
  sc_day:            { vi: "Ngày", en: "Day", zh: "天", ja: "日", ko: "일", fr: "Jour" },
  sc_week:           { vi: "Tuần", en: "Week", zh: "周", ja: "週", ko: "주", fr: "Semaine" },
  sc_month:          { vi: "Tháng", en: "Month", zh: "月", ja: "月", ko: "월", fr: "Mois" },
  sc_today:          { vi: "Hôm nay:", en: "Today:", zh: "今天：", ja: "本日：", ko: "오늘：", fr: "Aujourd\'hui:" },
  sc_trust_dist:     { vi: "Phân bổ Mức Độ Tinh cậy", en: "Trust Level Distribution", zh: "信任度分布", ja: "信頼レベル分布", ko: "신뢰 수준 분포", fr: "Répartition du niveau de confiance" },
  sc_safety_status:  { vi: "Trạng thái an toàn trên toàn hệ thống", en: "System-wide safety status", zh: "全系统安全状态", ja: "システム全体のセキュリティ状態", ko: "시스템 전체 안전 상태", fr: "Statut de sécurité du système" },
  sc_safe_score:     { vi: "ĐIỂM AN TOÀN", en: "SAFETY SCORE", zh: "安全评分", ja: "安全スコア", ko: "안전 점수", fr: "SCORE DE SÉCURITÉ" },
  sc_scan_activity:  { vi: "Hoạt Động Quét Toàn Quốc", en: "National Scan Activity", zh: "全国扫描活动", ja: "全国スキャン活動", ko: "전국 스캔 활동", fr: "Activité de scan nationale" },
  sc_geo_dist:       { vi: "Phân bổ xác thực theo vị trí địa lý", en: "Authentication distribution by geography", zh: "按地理位置的认证分布", ja: "地域別認証分布", ko: "지역별 인증 분포", fr: "Répartition par géographie" },
  sc_live_data:      { vi: "Dữ Liệu Trực Tiếp", en: "Live Data", zh: "实时数据", ja: "ライブデータ", ko: "실시간 데이터", fr: "Données en direct" },
  sc_new_scan:       { vi: "Lượt quét mới: Nút", en: "New scan: Node", zh: "新扫描：节点", ja: "新しいスキャン：ノード", ko: "새 스캔：노드", fr: "Nouveau scan: Noeud" },
  sc_latest_ledger:  { vi: "Nhật Ký Sổ Cái Mới Nhất", en: "Latest Ledger Logs", zh: "最新账本日志", ja: "最新台帳ログ", ko: "최신 원장 로그", fr: "Derniers journaux du grand livre" },
  sc_live:           { vi: "LIVE", en: "LIVE", zh: "实时", ja: "ライブ", ko: "라이브", fr: "EN DIRECT" },
  sc_realtime_block: { vi: "Cập nhật khối thời gian thực", en: "Real-time block updates", zh: "实时区块更新", ja: "リアルタイムブロック更新", ko: "실시간 블록 업데이트", fr: "Mises à jour des blocs en temps réel" },
  sc_full_network:   { vi: "Toàn Bộ Mạng Lưới Blockchain", en: "Full Blockchain Network", zh: "完整区块链网络", ja: "完全ブロックチェーンネットワーク", ko: "전체 블록체인 네트워크", fr: "Réseau complet de la blockchain" },
  sc_ai_running:     { vi: "Trình Phân Tích AI Đang Chạy", en: "AI Analyzer Running", zh: "AI分析器运行中", ja: "AIアナライザー稼働中", ko: "AI 분석기 실행 중", fr: "Analyseur IA en cours" },
  sc_scanning:       { vi: "Đang quét", en: "Scanning", zh: "正在扫描", ja: "スキャン中", ko: "스캔 중", fr: "Analyse en cours" },
  sc_hotspot:        { vi: "Điểm nóng", en: "Hotspot", zh: "热点", ja: "ホットスポット", ko: "핫스팟", fr: "Point chaud" },
  sc_tracking:       { vi: "Đang theo dõi", en: "Tracking", zh: "追踪中", ja: "追跡中", ko: "추적 중", fr: "En suivi" },
  sc_normal:         { vi: "Bình thường", en: "Normal", zh: "正常", ja: "正常", ko: "정상", fr: "Normal" },
  sc_export:         { vi: "EXPORT REPORT", en: "EXPORT REPORT", zh: "导出报告", ja: "レポート出力", ko: "보고서 내보내기", fr: "EXPORTER RAPPORT" },

  // ── AI & Dashboard ──
  ai_btn:            { vi: "TRỢ LÝ AI", en: "AI ASSISTANT", zh: "AI助手", ja: "AIアシスタント", ko: "AI 어시스턴트", fr: "ASSISTANT IA" },
  recent:            { vi: "Hoạt động Gần đây", en: "Recent Activity", zh: "最近活动", ja: "最近のアクティビティ", ko: "최근 활동", fr: "Activité récente" },
  map_title:         { vi: "BẢN ĐỒ VIỆT NAM", en: "VIETNAM MAP", zh: "越南地图", ja: "ベトナム地図", ko: "베트남 지도", fr: "CARTE VIETNAM" },
'''

path = 'src/contexts/LanguageContext.tsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

# Check if sc_board already exists
if 'sc_board' in content:
    print("sc_board already exists - skipping")
else:
    insert_point = content.rfind('\n};')
    if insert_point == -1:
        print("ERROR: cannot find closing };")
    else:
        new_content = content[:insert_point] + MISSING_KEYS + content[insert_point:]
        with open(path, 'w', encoding='utf-8', newline='\r\n') as f:
            f.write(new_content)
        print("SUCCESS")
        with open(path, encoding='utf-8') as f:
            lines = f.readlines()
        print("Total lines:", len(lines))
