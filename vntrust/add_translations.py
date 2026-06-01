#!/usr/bin/env python3
"""Safely append i18n translations to LanguageContext.tsx"""

ADDITIONS = '''
  // ── Verify Page ──
  verify_badge:      { vi: "Cổng Xác thực Trung tâm (Zero-Trust)", en: "Central Authentication Gateway (Zero-Trust)", zh: "中央认证网关", ja: "中央認証ゲートウェイ", ko: "중앙 인증 게이트웨이", fr: "Passerelle d\'authentification centrale" },
  verify_title:      { vi: "Mạng lưới đối soát", en: "Verification Network", zh: "核查网络", ja: "検証ネットワーク", ko: "검증 네트워크", fr: "Réseau de vérification" },
  verify_sub:        { vi: "Chọn phương thức phù hợp để bắt đầu quy trình kiểm định. Mọi dữ liệu đều được ánh xạ lên Sổ cái Bất biến Blockchain VNTrust.", en: "Choose the appropriate method to begin the verification process. All data is mapped to the VNTrust Immutable Blockchain Ledger.", zh: "选择合适的方式开始验证流程。所有数据均映射到VNTrust不可变区块链账本。", ja: "検証プロセスを開始する適切な方法を選択してください。", ko: "검증 프로세스를 시작하기 위해 적절한 방법을 선택하세요.", fr: "Choisissez la méthode appropriée pour commencer le processus de vérification." },
  verify_new:        { vi: "MỚI", en: "NEW", zh: "新功能", ja: "新機能", ko: "신규", fr: "NOUVEAU" },
  verify_card1_title:{ vi: "Quét Mã Bảo Mật", en: "Scan Security Code", zh: "扫描安全码", ja: "セキュリティコードをスキャン", ko: "보안 코드 스캔", fr: "Scanner le code de sécurité" },
  verify_card1_desc: { vi: "Sử dụng Camera thiết bị để quét Tem Chống Giả (QR / Mã Vạch 1D) chuẩn xác nhất.", en: "Use your device camera to scan Anti-Counterfeit Stamps (QR / 1D Barcode) with the highest accuracy.", zh: "使用设备摄像头扫描防伪贴标（QR码/一维条形码），准确率最高。", ja: "デバイスカメラで偽造防止スタンプをスキャンします。", ko: "기기 카메라를 사용하여 위조 방지 스탬프를 스캔하세요.", fr: "Utilisez la caméra de votre appareil pour scanner les tampons anti-contrefaçon." },
  verify_card1_cta:  { vi: "Bắt đầu Quét", en: "Start Scanning", zh: "开始扫描", ja: "スキャン開始", ko: "스캔 시작", fr: "Commencer le scan" },
  verify_card2_title:{ vi: "Nhập Mã Serial", en: "Enter Serial Code", zh: "输入序列号", ja: "シリアルコードを入力", ko: "시리얼 코드 입력", fr: "Saisir le code série" },
  verify_card2_desc: { vi: "Tra cứu chéo bằng cách nhập mã ký tự (UID) in dọc tem thẻ cào hoặc mã in trên nhãn.", en: "Cross-check by entering the character code (UID) printed on the scratch card or label.", zh: "通过输入刮刮卡或标签上印制的字符码进行交叉核验。", ja: "スクラッチカードに印刷された文字コードを入力してクロスチェックします。", ko: "스크래치 카드에 인쇄된 문자 코드를 입력하여 교차 확인하세요.", fr: "Vérification croisée en saisissant le code alphanumérique imprimé sur la carte." },
  verify_card2_cta:  { vi: "Nhập Dữ liệu", en: "Enter Data", zh: "输入数据", ja: "データを入力", ko: "데이터 입력", fr: "Saisir les données" },
  verify_card3_title:{ vi: "AI Đối Soát Giấy Tờ", en: "AI Document Verification", zh: "AI文件核查", ja: "AI書類照合", ko: "AI 문서 검증", fr: "Vérification de documents par IA" },
  verify_card3_desc: { vi: "Tải lên Chứng nhận, Vi bằng, Invoice. Công nghệ OCR bóc tách và phân tích mộc chữ ký giả mạo.", en: "Upload Certificates, Notarial Records, Invoices. OCR technology extracts and analyzes forged seals and signatures.", zh: "上传证书、公证记录、发票。OCR技术提取并分析伪造的印章和签名。", ja: "証明書をアップロード。OCR技術で偽造の印章と署名を分析します。", ko: "증명서를 업로드하세요. OCR 기술로 위조 도장과 서명을 분석합니다.", fr: "Téléchargez des certificats. La technologie OCR extrait les cachets et signatures falsifiés." },
  verify_card3_cta:  { vi: "Tải file lên", en: "Upload File", zh: "上传文件", ja: "ファイルをアップロード", ko: "파일 업로드", fr: "Télécharger le fichier" },

  // ── Enterprise Page ──
  ent_badge:         { vi: "Giải pháp B2B Toàn diện", en: "Comprehensive B2B Solution", zh: "全面的B2B解决方案", ja: "包括的なB2Bソリューション", ko: "종합 B2B 솔루션", fr: "Solution B2B complète" },
  ent_title:         { vi: "Nền tảng Quản trị", en: "Management Platform", zh: "管理平台", ja: "管理プラットフォーム", ko: "관리 플랫폼", fr: "Plateforme de gestion" },
  ent_sub:           { vi: "Hệ sinh thái chống giả mạo và quản lý chuỗi cung ứng bằng công nghệ siêu thông minh. Chúng tôi cung cấp giải pháp chuyển đổi số toàn diện giúp doanh nghiệp bảo vệ di sản thương hiệu, minh bạch hoá nguồn gốc và trực tiếp giao tiếp với tệp người dùng cuối.", en: "An anti-counterfeiting ecosystem powered by hyper-intelligent technology. We provide comprehensive digital transformation solutions to protect brand heritage and ensure origin transparency.", zh: "基于超智能技术的防伪和供应链管理生态系统，帮助企业保护品牌遗产、透明化溯源。", ja: "超知能技術を活用した偽造防止エコシステム。ブランド資産の保護と原産地の透明化を支援します。", ko: "초지능 기술로 구동되는 위조 방지 생태계. 브랜드 유산 보호와 원산지 투명성을 돕습니다.", fr: "Un écosystème anti-contrefaçon alimenté par une technologie hyper-intelligente pour protéger le patrimoine de marque." },
  ent_features_title:{ vi: "Tính năng Cốt lõi", en: "Core Features", zh: "核心功能", ja: "コア機能", ko: "핵심 기능", fr: "Fonctionnalités principales" },
  ent_f1_title:      { vi: "Số hoá Chuỗi Cung ứng", en: "Supply Chain Digitization", zh: "供应链数字化", ja: "サプライチェーンのデジタル化", ko: "공급망 디지털화", fr: "Numérisation de la chaîne d\'approvisionnement" },
  ent_f1_desc:       { vi: "Theo dõi đường đi của từng đơn vị sản phẩm từ xưởng sản xuất, kho bãi, qua nhà phân phối đến điểm bán lẻ trên hệ thống bản đồ nhiệt thời gian thực.", en: "Track each product unit from factory, warehouse, through distributors to retail points on a real-time heat map.", zh: "在实时热力图上追踪每件产品从工厂到零售点的全程路径。", ja: "リアルタイムヒートマップで各製品の工場から小売店までの移動を追跡します。", ko: "실시간 히트맵에서 공장, 창고, 소매점까지 각 제품 단위를 추적합니다.", fr: "Suivez chaque unité de produit de l\'usine aux points de vente sur une carte thermique en temps réel." },
  ent_f2_title:      { vi: "Xác thực Chống giả Tức thời", en: "Instant Anti-counterfeit Verification", zh: "即时防伪验证", ja: "即時偽造防止検証", ko: "즉각 위조 방지 인증", fr: "Vérification anti-contrefaçon instantanée" },
  ent_f2_desc:       { vi: "Bộ thẻ sản phẩm được gắn định danh mã QR động. Khách hàng dễ dàng dùng Camera điện thoại để check mã, nhận chứng chỉ chính hãng trực quan.", en: "Product cards embedded with dynamic QR identity codes. Customers use their phone camera to check codes and receive authenticity certificates.", zh: "产品卡片嵌入动态QR身份码。客户可用手机摄像头扫码，获取正品证书。", ja: "製品カードにダイナミックQRコードを埋め込み。顧客はスマホで正規品証明書を受け取れます。", ko: "제품 카드에 동적 QR 식별 코드 내장. 고객이 정품 인증서를 받을 수 있습니다.", fr: "Les cartes produits dotées de codes QR dynamiques. Les clients reçoivent des certificats d\'authenticité." },
  ent_f3_title:      { vi: "Báo cáo Mảng AI Cảnh Báo", en: "AI Alert Analytics", zh: "AI预警分析报告", ja: "AIアラート分析レポート", ko: "AI 경고 분석", fr: "Rapports d\'alertes IA" },
  ent_f3_desc:       { vi: "Thu thập và phân tích dữ liệu quét toàn thế giới. Tự động phát giác ngay hành vi làm giả khi 1 lô hàng/mã số có luồng quét bất thường.", en: "Collect and analyze global scan data. Automatically detect counterfeiting when a batch has abnormal scan patterns.", zh: "收集并分析全球扫描数据。自动检测批次异常扫描流量中的伪造行为。", ja: "グローバルスキャンデータを分析。異常なスキャンパターンで偽造行為を自動検出します。", ko: "전 세계 스캔 데이터를 분석합니다. 비정상 스캔 패턴이 있을 때 위조 행위를 자동 감지합니다.", fr: "Collectez les données de scan mondiales. Détectez automatiquement les comportements de contrefaçon." },
  ent_f4_title:      { vi: "Tích hợp Hệ thống (ERP)", en: "System Integration (ERP)", zh: "系统集成（ERP）", ja: "システム統合（ERP）", ko: "시스템 통합 (ERP)", fr: "Intégration système (ERP)" },
  ent_f4_desc:       { vi: "Giao thức API kết nối sẵn với Oracle, SAP, phần mềm quản kho nội khối. Đẩy dữ liệu theo kiện hàng tự động không cần thao tác dán mã thủ công.", en: "API protocols ready to connect with Oracle, SAP, internal warehouse software. Push data per shipment automatically without manual code entry.", zh: "API协议可与Oracle、SAP及内部仓储软件直接对接，按货件自动推送数据。", ja: "Oracle、SAP、社内倉庫ソフトウェアとの接続に対応。手動入力不要で貨物ごとにデータを自動プッシュ。", ko: "Oracle, SAP와 연결 준비된 API 프로토콜. 수동 코드 입력 없이 화물별 데이터를 자동 전송합니다.", fr: "Protocoles API prêts à se connecter avec Oracle, SAP. Poussez les données par expédition automatiquement." },
  ent_process_title: { vi: "Quy trình Vận hành Chuẩn", en: "Standard Operating Process", zh: "标准运营流程", ja: "標準運営プロセス", ko: "표준 운영 프로세스", fr: "Processus opérationnel standard" },
  ent_s1_title:      { vi: "Gắn Định Danh (Tagging)", en: "Identity Tagging", zh: "身份标签贴标", ja: "識別タグ付け", ko: "식별 태깅", fr: "Étiquetage d\'identité" },
  ent_s1_desc:       { vi: "Sản phẩm ở nhà máy được gắn mã QR VNTrust công nghệ nén mật mã trước khi đóng thùng và xuất xưởng ra thị trường.", en: "Products at the factory are tagged with VNTrust QR codes using encryption technology before packaging and market release.", zh: "工厂产品在包装出厂前贴附采用加密技术的VNTrust QR码。", ja: "工場の製品は梱包前に暗号化QRコードでタグ付けされます。", ko: "공장의 제품은 포장 전에 암호화 QR 코드로 태깅됩니다.", fr: "Les produits sont étiquetés avec des codes QR VNTrust avant l\'emballage." },
  ent_s2_title:      { vi: "Kích hoạt và Phân phối", en: "Activation and Distribution", zh: "激活与分发", ja: "有効化と配布", ko: "활성화 및 유통", fr: "Activation et Distribution" },
  ent_s2_desc:       { vi: "Tổng kho / Đại lý quét mã lô hàng lúc nhập kho, kích hoạt trạng thái hợp pháp trên hệ thống kiểm soát trung tâm.", en: "Warehouses and Agents scan batch codes upon receiving, activating legal circulation status on the central control system.", zh: "总仓和代理商在入库时扫描批次码，在中央控制系统中激活合法流通状态。", ja: "倉庫と代理店が入庫時にバッチコードをスキャンし、合法流通ステータスを有効化します。", ko: "창고와 대리점이 입고 시 배치 코드를 스캔하여 합법적 유통 상태를 활성화합니다.", fr: "Les entrepôts et agents scannent les codes de lot à la réception, activant le statut de circulation légale." },
  ent_s3_title:      { vi: "Người dùng Xác minh", en: "Consumer Verification", zh: "消费者验证", ja: "消費者検証", ko: "소비자 인증", fr: "Vérification du consommateur" },
  ent_s3_desc:       { vi: "Phía người mua chỉ cần một chiếc smartphone quét mã QR trên hộp. Nhận ngay chứng minh nguồn gốc chính hiệu một cách nhanh chóng.", en: "Buyers only need a smartphone to scan the QR code on the box. Instantly receive proof of authentic origin.", zh: "买家只需用智能手机扫描包装盒上的QR码，即可即时获得正品溯源证明。", ja: "購入者はスマートフォンでQRコードをスキャンするだけで正規品証明を受け取れます。", ko: "구매자는 스마트폰으로 QR 코드를 스캔하기만 하면 즉시 정품 원산지 증명을 받으세요.", fr: "Les acheteurs scannent le code QR et reçoivent instantanément la preuve d\'origine authentique." },
'''

path = 'src/contexts/LanguageContext.tsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

# Insert before the closing };
insert_point = content.rfind('\n};')
if insert_point == -1:
    print("ERROR: could not find closing };")
else:
    new_content = content[:insert_point] + ADDITIONS + content[insert_point:]
    with open(path, 'w', encoding='utf-8', newline='\r\n') as f:
        f.write(new_content)
    print("SUCCESS: added", len(ADDITIONS), "chars")
    # Verify
    with open(path, encoding='utf-8') as f:
        lines = f.readlines()
    print("Total lines:", len(lines))
    # Check no unescaped quotes
    for i, line in enumerate(lines, 1):
        if 'zh:' in line and '合法流通中' in line:
            print(f"WARNING line {i}: check quotes around 合法流通中")
