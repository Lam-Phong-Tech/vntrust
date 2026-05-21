#!/usr/bin/env python3
"""Add remaining missing sc keys for supply-chain inline text"""

EXTRA_KEYS = '''
  // ── Supply Chain inline text ──
  sc_active_badge:   { vi: "ĐANG HOẠT ĐỘNG", en: "ACTIVE", zh: "活跃中", ja: "アクティブ", ko: "활성", fr: "ACTIF" },
  sc_ai_detect:      { vi: "Phát hiện bởi Phân tích Phân cực AI", en: "Detected by Polarization AI Analytics", zh: "由极化AI分析检测", ja: "偏光AI分析によって検出", ko: "편광 AI 분석으로 감지", fr: "Détecté par l\'analyse IA de polarisation" },
  sc_latency:        { vi: "Độ trễ Blockchain:", en: "Blockchain Latency:", zh: "区块链延迟：", ja: "ブロックチェーン遅延：", ko: "블록체인 지연：", fr: "Latence blockchain :" },
  sc_unit_scans:     { vi: "lượt", en: "scans", zh: "次", ja: "回", ko: "회", fr: "scans" },
  sc_data_per_sec:   { vi: "dữ liệu/giây", en: "data/sec", zh: "数据/秒", ja: "データ/秒", ko: "데이터/초", fr: "données/sec" },
  sc_action_log1:    { vi: "Thực thi Hợp đồng Thông minh", en: "Smart Contract Execution", zh: "智能合约执行", ja: "スマートコントラクト実行", ko: "스마트 컨트랙트 실행", fr: "Exécution de contrat intelligent" },
  sc_action_log2:    { vi: "Xác nhận NFT Lô hàng mới", en: "New Batch NFT Confirmed", zh: "新批次NFT已确认", ja: "新バッチNFT確認済み", ko: "신규 배치 NFT 확인됨", fr: "NFT de nouveau lot confirmé" },
  sc_action_log3:    { vi: "Đồng bộ Giao dịch Blockchain", en: "Blockchain Transaction Sync", zh: "区块链交易同步", ja: "ブロックチェーン取引同期", ko: "블록체인 거래 동기화", fr: "Synchronisation des transactions blockchain" },
  sc_action_log4:    { vi: "Cập nhật Trạng thái Phân cực AI", en: "AI Polarization Status Update", zh: "AI极化状态更新", ja: "AI偏光ステータス更新", ko: "AI 편광 상태 업데이트", fr: "Mise à jour du statut IA de polarisation" },
  sc_log_auth_done:  { vi: "Xác Thực Lô Hàng Hoàn Tất", en: "Batch Authentication Complete", zh: "批次验证完成", ja: "バッチ認証完了", ko: "배치 인증 완료", fr: "Authentification de lot terminée" },
  sc_log_blocked:    { vi: "Ngăn Chặn Hoạt Động Bất Thường", en: "Abnormal Activity Blocked", zh: "已阻止异常活动", ja: "異常活動を遮断", ko: "비정상 활동 차단됨", fr: "Activité anormale bloquée" },
  sc_log_contract:   { vi: "Thực Thi Hợp Đồng Thông Minh", en: "Smart Contract Executed", zh: "智能合约已执行", ja: "スマートコントラクト実行済み", ko: "스마트 컨트랙트 실행됨", fr: "Contrat intelligent exécuté" },
  sc_log_just_now:   { vi: "Vừa xong", en: "Just now", zh: "刚刚", ja: "たった今", ko: "방금 전", fr: "À l\'instant" },
  sc_log_mins_ago:   { vi: "phút trước", en: "min ago", zh: "分钟前", ja: "分前", ko: "분 전", fr: "min. avant" },
  sc_log_fraud:      { vi: "Ngăn Chặn Cố Gắng Làm Giả", en: "Counterfeit Attempt Blocked", zh: "已阻止伪造尝试", ja: "偽造試行を遮断", ko: "위조 시도 차단됨", fr: "Tentative de contrefaçon bloquée" },
  sc_log_found_at:   { vi: "Phát hiện tại", en: "Detected at", zh: "发现于", ja: "発見場所：", ko: "발견 위치：", fr: "Détecté à" },
  sc_log_sig_viol:   { vi: "Vi phạm chữ ký:", en: "Signature violation:", zh: "签名违规：", ja: "署名違反：", ko: "서명 위반：", fr: "Violation de signature :" },
  sc_log_sync:       { vi: "Đồng bộ dữ liệu mạng: Nút", en: "Network data sync: Node", zh: "网络数据同步：节点", ja: "ネットワークデータ同期：ノード", ko: "네트워크 데이터 동기화：노드", fr: "Sync données réseau : Noeud" },
  sc_log_new_node:   { vi: "Kết Nối Nút Mạng Mới:", en: "New Network Node Connected:", zh: "新网络节点已连接：", ja: "新しいネットワークノード接続済み：", ko: "새 네트워크 노드 연결됨：", fr: "Nouveau noeud réseau connecté :" },
  sc_log_auth_cert:  { vi: "Xác thực Cấp phép", en: "Licensed Authentication", zh: "授权认证", ja: "ライセンス認証", ko: "인가 인증", fr: "Authentification autorisée" },
'''

path = 'src/contexts/LanguageContext.tsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

if 'sc_active_badge' in content:
    print("Already exists - skipping")
else:
    insert_point = content.rfind('\n};')
    new_content = content[:insert_point] + EXTRA_KEYS + content[insert_point:]
    with open(path, 'w', encoding='utf-8', newline='\r\n') as f:
        f.write(new_content)
    with open(path, encoding='utf-8') as f:
        lines = f.readlines()
    print("SUCCESS - Total lines:", len(lines))
