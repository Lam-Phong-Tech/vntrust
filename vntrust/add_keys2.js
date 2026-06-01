const fs = require('fs');
const path = 'src/contexts/LanguageContext.tsx';
let content = fs.readFileSync(path, 'utf8');

const NEW_KEYS = `
  // ── AI Doc Verify ──
  aidoc_title:       { vi: "AI Xác thực Giấy tờ", en: "AI Document Verification", zh: "AI文件认证", ja: "AI書類認証", ko: "AI 문서 검증", fr: "Vérification de documents IA" },
  aidoc_desc:        { vi: "Tải lên hình ảnh Giấy chứng nhận (CO, CQ, VietGAP, ISO...). Trí tuệ Nhân tạo sẽ bóc tách dữ liệu và đối chiếu chữ ký số để phát hiện làm giả.", en: "Upload certificate images (CO, CQ, VietGAP, ISO...). Artificial Intelligence will extract data and compare digital signatures to detect forgery.", zh: "上传证书图像（CO，CQ，VietGAP，ISO...）。人工智能将提取数据并比较数字签名以检测伪造。", ja: "証明書の画像（CO、CQ、VietGAP、ISOなど）をアップロードします。人工知能がデータを抽出し、デジタル署名を比較して偽造を検出します。", ko: "인증서 이미지(CO, CQ, VietGAP, ISO 등)를 업로드하세요. 인공지능이 데이터를 추출하고 디지털 서명을 비교하여 위조를 감지합니다.", fr: "Téléchargez des images de certificat (CO, CQ, VietGAP, ISO...). L'Intelligence Artificielle extraira les données et comparera les signatures numériques pour détecter les falsifications." },
  aidoc_drag:        { vi: "Kéo thả ảnh hoặc Nhấn để chọn", en: "Drag & drop image or Click to select", zh: "拖放图像或单击以选择", ja: "画像をドラッグ＆ドロップまたはクリックして選択", ko: "이미지를 드래그 앤 드롭하거나 클릭하여 선택", fr: "Glissez et déposez l'image ou cliquez pour sélectionner" },
  aidoc_format:      { vi: "Hỗ trợ định dạng JPG, PNG, WEBP (Tối đa 10MB)", en: "Supported formats: JPG, PNG, WEBP (Max 10MB)", zh: "支持的格式：JPG，PNG，WEBP（最大10MB）", ja: "サポートされる形式：JPG、PNG、WEBP（最大10MB）", ko: "지원되는 형식: JPG, PNG, WEBP (최대 10MB)", fr: "Formats pris en charge : JPG, PNG, WEBP (Max 10MB)" },
  aidoc_cancel:      { vi: "Hủy ảnh", en: "Cancel image", zh: "取消图像", ja: "画像をキャンセル", ko: "이미지 취소", fr: "Annuler l'image" },
  aidoc_start:       { vi: "Bắt đầu Xác thực AI", en: "Start AI Verification", zh: "开始AI验证", ja: "AI認証を開始", ko: "AI 검증 시작", fr: "Commencer la vérification IA" },
  aidoc_analyzing:   { vi: "AI Đang phân tích OCR...", en: "AI is analyzing OCR...", zh: "AI正在分析OCR...", ja: "AIがOCRを分析中...", ko: "AI가 OCR을 분석 중...", fr: "L'IA analyse l'OCR..." },
  aidoc_result:      { vi: "Ghi nhận Phân tích", en: "Analysis Record", zh: "分析记录", ja: "分析記録", ko: "분석 기록", fr: "Enregistrement d'analyse" },
  aidoc_empty_res:   { vi: "Vui lòng tải lên giấy chứng nhận\\nđể AI phân tích dữ liệu mộc đỏ & chữ ký.", en: "Please upload a certificate\\nfor AI to analyze red seal & signature data.", zh: "请上传证书\\n供AI分析红章和签名数据。", ja: "AIが赤い印鑑と署名データを分析するために\\n証明書をアップロードしてください。", ko: "AI가 빨간 도장 및 서명 데이터를 분석할 수 있도록\\n인증서를 업로드하세요.", fr: "Veuillez télécharger un certificat\\npour que l'IA analyse le sceau rouge et la signature." },
  aidoc_ready:       { vi: "Sẵn sàng để chạy mô hình AI VNTrust...", en: "Ready to run VNTrust AI model...", zh: "准备运行VNTrust AI模型...", ja: "VNTrust AIモデルを実行する準備ができました...", ko: "VNTrust AI 모델을 실행할 준비가 되었습니다...", fr: "Prêt à exécuter le modèle IA VNTrust..." },
  aidoc_wait:        { vi: "Tiến trình có thể mất vài giây...", en: "The process may take a few seconds...", zh: "此过程可能需要几秒钟...", ja: "プロセスには数秒かかる場合があります...", ko: "이 프로세스는 몇 초 정도 걸릴 수 있습니다...", fr: "Le processus peut prendre quelques secondes..." },
  aidoc_valid:       { vi: "Chứng nhận Hợp lệ", en: "Valid Certificate", zh: "有效证书", ja: "有効な証明書", ko: "유효한 인증서", fr: "Certificat valide" },
  aidoc_valid_sub:   { vi: "Không phát hiện mộc giả hoặc can thiệp kỹ thuật số.", en: "No fake seals or digital tampering detected.", zh: "未检测到假印章或数字篡改。", ja: "偽の印鑑やデジタル改ざんは検出されませんでした。", ko: "가짜 도장이나 디지털 변조가 감지되지 않았습니다.", fr: "Aucun faux sceau ou falsification numérique détecté." },
  aidoc_type:        { vi: "Loại giấy tờ", en: "Document Type", zh: "文件类型", ja: "ドキュメントタイプ", ko: "문서 유형", fr: "Type de document" },
  aidoc_issuer:      { vi: "Cơ quan cấp", en: "Issuer", zh: "签发机构", ja: "発行者", ko: "발급자", fr: "Émetteur" },
  aidoc_date:        { vi: "Ngày hiệu lực", en: "Effective Date", zh: "生效日期", ja: "発効日", ko: "발효일", fr: "Date d'entrée en vigueur" },
  aidoc_ocr:         { vi: "Dữ liệu bóc tách (OCR):", en: "Extracted data (OCR):", zh: "提取数据 (OCR):", ja: "抽出データ (OCR):", ko: "추출된 데이터 (OCR):", fr: "Données extraites (OCR):" },
  aidoc_fake:        { vi: "Nghi ngờ Giả mạo", en: "Suspected Forgery", zh: "涉嫌伪造", ja: "偽造の疑い", ko: "위조 의심", fr: "Falsification suspectée" },
  aidoc_fake_sub:    { vi: "Không tìm thấy từ khóa pháp lý hoặc văn bản sai chuẩn quốc gia.", en: "Legal keywords not found or text deviates from national standards.", zh: "未找到法律关键字或文本偏离国家标准。", ja: "法的なキーワードが見つからないか、テキストが国家標準から逸脱しています。", ko: "법적 키워드를 찾을 수 없거나 텍스트가 국가 표준에서 벗어납니다.", fr: "Mots-clés légaux introuvables ou le texte s'écarte des normes nationales." },
  aidoc_warn:        { vi: "Cảnh báo Nội dung", en: "Content Warning", zh: "内容警告", ja: "コンテンツ警告", ko: "콘텐츠 경고", fr: "Avertissement de contenu" },
  aidoc_dev:         { vi: "Sai lệch / Không xác định", en: "Deviated / Unknown", zh: "偏离 / 未知", ja: "逸脱 / 不明", ko: "일탈 / 알 수 없음", fr: "Dévié / Inconnu" },
  aidoc_notfound:    { vi: "Không tìm thấy ký tự nào", en: "No characters found", zh: "未找到任何字符", ja: "文字が見つかりません", ko: "문자를 찾을 수 없음", fr: "Aucun caractère trouvé" },
  aidoc_report:      { vi: "Báo cáo tài liệu vi phạm lên Cục QLTT", en: "Report violating document to Market Surveillance Agency", zh: "向市场监管局举报违规文件", ja: "市場監視局に違反文書を報告", ko: "시장 감시 기관에 위반 문서 신고", fr: "Signaler le document en violation à l'Agence de surveillance du marché" },
  verify_back:       { vi: "Về Trung tâm Xác thực", en: "Back to Verification Center", zh: "返回认证中心", ja: "認証センターに戻る", ko: "인증 센터로 돌아가기", fr: "Retour au centre de vérification" },
  
  // ── Missing Inventory ──
  inv_add_batch_btn: { vi: "Thêm lô hàng", en: "Add batch", zh: "添加批次", ja: "バッチを追加", ko: "배치 추가", fr: "Ajouter un lot" },
  inv_batch_code:    { vi: "Mã lô", en: "Batch code", zh: "批次代码", ja: "バッチコード", ko: "배치 코드", fr: "Code de lot" },
  inv_mfg_date:      { vi: "Ngày SX", en: "Mfg Date", zh: "生产日期", ja: "製造日", ko: "제조일", fr: "Date de fabrication" },
  inv_exp_date:      { vi: "Hạn dùng", en: "Exp Date", zh: "到期日", ja: "有効期限", ko: "만료일", fr: "Date d'expiration" },
  inv_stamp:         { vi: "tem", en: "stamps", zh: "贴标", ja: "スタンプ", ko: "스탬프", fr: "timbres" },
  inv_no_product:    { vi: "Chưa có sản phẩm nào", en: "No products yet", zh: "暂无产品", ja: "まだ製品がありません", ko: "아직 제품이 없습니다", fr: "Aucun produit pour le moment" },
  inv_add_first:     { vi: "+ Thêm sản phẩm đầu tiên", en: "+ Add first product", zh: "+ 添加第一个产品", ja: "+ 最初の製品を追加", ko: "+ 첫 번째 제품 추가", fr: "+ Ajouter le premier produit" },
  inv_click_add:     { vi: "Nhấn", en: "Click", zh: "点击", ja: "クリック", ko: "클릭", fr: "Cliquez sur" },
  inv_click_or:      { vi: "để thêm, hoặc", en: "to add, or", zh: "添加，或", ja: "して追加、または", ko: "하여 추가하거나", fr: "pour ajouter, ou" },
  inv_click_seed:    { vi: "nếu lần đầu dùng.", en: "if using for the first time.", zh: "如果第一次使用。", ja: "初めて使用する場合。", ko: "처음 사용하는 경우.", fr: "si c'est la première fois." },
  
  // ── Chat missing ──
  chat_greeting:     { vi: "Chào bạn! 👋 Mình là AI VNTrust, sẵn sàng giúp bạn:\\n• Tra cứu sản phẩm theo số serial\\n• Kiểm tra lô hàng & chuỗi cung ứng\\n• Hướng dẫn sử dụng hệ thống\\n• Hỗ trợ kỹ thuật 24/7\\n\\nBạn cần giúp gì hôm nay? 😊", en: "Hello! 👋 I am VNTrust AI, ready to help you:\\n• Lookup products by serial number\\n• Check batches & supply chain\\n• System usage guide\\n• 24/7 technical support\\n\\nHow can I help you today? 😊", zh: "你好！👋我是 VNTrust AI，随时准备为您提供帮助：\\n•按序列号查找产品\\n•检查批次和供应链\\n•系统使用指南\\n• 24/7技术支持\\n\\n今天我能帮您什么？😊", ja: "こんにちは！👋 VNTrust AIです。次のサポートを提供します：\\n•シリアル番号で製品を検索\\n•バッチとサプライチェーンを確認\\n•システム使用ガイド\\n•24時間年中無休の技術サポート\\n\\n今日はどのようにお手伝いしましょうか？😊", ko: "안녕하세요! 👋 VNTrust AI입니다. 다음을 도와드릴 수 있습니다:\\n•시리얼 번호로 제품 조회\\n•배치 및 공급망 확인\\n•시스템 사용 가이드\\n•24/7 기술 지원\\n\\n오늘 무엇을 도와드릴까요? 😊", fr: "Bonjour! 👋 Je suis l'IA VNTrust, prêt à vous aider:\\n• Recherche de produits par numéro de série\\n• Vérifier les lots & la chaîne d'approvisionnement\\n• Guide d'utilisation du système\\n• Support technique 24/7\\n\\nComment puis-je vous aider aujourd'hui? 😊" },
`;

if (!content.includes('aidoc_title')) {
  const insertIndex = content.lastIndexOf('\n};');
  if (insertIndex !== -1) {
    content = content.slice(0, insertIndex) + NEW_KEYS + content.slice(insertIndex);
    fs.writeFileSync(path, content);
    console.log("Added aidoc and remaining inventory keys.");
  }
}
