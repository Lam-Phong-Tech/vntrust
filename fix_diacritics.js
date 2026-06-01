const fs = require('fs');
const CTX = 'D:/Web hang gia/vntrust/src/contexts/LanguageContext.tsx';
let ctx = fs.readFileSync(CTX, 'utf8');

// Các key cần fix — vi đúng dấu + các ngôn ngữ khác
const FIXES = {
  // vuid_*
  vuid_0:  { vi: "Sản phẩm không xác định", en: "Unknown Product", zh: "未知产品", ja: "不明な製品", ko: "알 수 없는 제품", fr: "Produit inconnu" },
  vuid_1:  { vi: "Không có mô tả", en: "No description", zh: "暂无描述", ja: "説明なし", ko: "설명 없음", fr: "Pas de description" },
  vuid_2:  { vi: "Cảnh báo: Hàng giả", en: "Warning: Counterfeit", zh: "警告：假冒品", ja: "警告：偽造品", ko: "경고: 위조품", fr: "Avertissement : Contrefaçon" },
  vuid_3:  { vi: "Cảnh báo: Hết hạn", en: "Warning: Expired", zh: "警告：已过期", ja: "警告：期限切れ", ko: "경고: 만료됨", fr: "Avertissement : Expiré" },
  vuid_4:  { vi: "Bất thường Bảo mật", en: "Security Anomaly", zh: "安全异常", ja: "セキュリティ異常", ko: "보안 이상", fr: "Anomalie de sécurité" },
  vuid_5:  { vi: "Xác thực Chính hãng", en: "Authentic Verified", zh: "正品认证", ja: "正規品認証済み", ko: "정품 인증됨", fr: "Authentique vérifié" },
  vuid_6:  { vi: "Mã:", en: "Code:", zh: "编码：", ja: "コード：", ko: "코드:", fr: "Code :" },
  vuid_7:  { vi: "Tài sản Không hợp lệ", en: "Invalid Asset", zh: "无效资产", ja: "無効な資産", ko: "유효하지 않은 자산", fr: "Actif invalide" },
  vuid_8:  { vi: "Hoạt động Đáng ngờ", en: "Suspicious Activity", zh: "可疑活动", ja: "疑わしい活動", ko: "의심스러운 활동", fr: "Activité suspecte" },
  vuid_9:  { vi: "Sản phẩm Hết hạn", en: "Expired Product", zh: "已过期产品", ja: "期限切れ製品", ko: "만료된 제품", fr: "Produit expiré" },
  vuid_10: { vi: "Sản phẩm này không tồn tại trên sổ cái blockchain. Đây có thể là hàng giả.", en: "This product does not exist on the blockchain ledger. It may be counterfeit.", zh: "该产品不在区块链账本中，可能是假冒品。", ja: "この製品はブロックチェーン台帳に存在しません。偽造品の可能性があります。", ko: "이 제품은 블록체인 원장에 없습니다. 위조품일 수 있습니다.", fr: "Ce produit est absent du registre blockchain. Il peut être contrefait." },
  vuid_11: { vi: "Sản phẩm này đã được quét", en: "This product has been scanned", zh: "该产品已被扫描", ja: "この製品はスキャンされました", ko: "이 제품은 스캔되었습니다", fr: "Ce produit a été scanné" },
  vuid_12: { vi: "lần. Hoạt động bất thường này đã bị gắn cờ.", en: "times. This abnormal activity has been flagged.", zh: "次。此异常活动已被标记。", ja: "回。この異常な活動にフラグが立てられました。", ko: "번. 이 비정상적인 활동이 표시되었습니다.", fr: "fois. Cette activité anormale a été signalée." },
  vuid_13: { vi: "Sản phẩm là chính hãng nhưng đã quá hạn sử dụng.", en: "The product is genuine but has passed its expiry date.", zh: "产品为正品，但已超过保质期。", ja: "製品は正規品ですが有効期限が切れています。", ko: "제품은 정품이지만 유효 기간이 지났습니다.", fr: "Le produit est authentique mais périmé." },
  vuid_14: { vi: "Sản phẩm đã được xác thực thành công qua Sổ cái Bất biến VNTrust. Nguồn gốc 100%.", en: "Product verified via VNTrust Immutable Ledger. Origin confirmed 100%.", zh: "产品已通过VNTrust不可变账本验证。来源100%确认。", ja: "VNTrust不変台帳で製品が検証されました。原産地100%確認済み。", ko: "VNTrust 불변 원장을 통해 제품이 검증되었습니다. 원산지 100% 확인됨.", fr: "Produit vérifié via le registre VNTrust. Origine confirmée à 100%." },
  vuid_15: { vi: "Định danh Sản phẩm", en: "Product Identity", zh: "产品身份", ja: "製品ID", ko: "제품 ID", fr: "Identité du produit" },
  vuid_16: { vi: "Nhật ký Sản xuất", en: "Production Log", zh: "生产日志", ja: "生産ログ", ko: "생산 로그", fr: "Journal de production" },
  vuid_17: { vi: "Mã lô hàng", en: "Batch Code", zh: "批次编码", ja: "バッチコード", ko: "배치 코드", fr: "Code de lot" },
  vuid_18: { vi: "Ngày sản xuất", en: "Manufacturing Date", zh: "生产日期", ja: "製造日", ko: "제조일", fr: "Date de fabrication" },
  vuid_19: { vi: "XEM HASH BLOCKCHAIN", en: "VIEW BLOCKCHAIN HASH", zh: "查看区块链哈希", ja: "ブロックチェーンハッシュを表示", ko: "블록체인 해시 보기", fr: "VOIR LE HASH BLOCKCHAIN" },
  vuid_20: { vi: "Hành trình Bản sao Kỹ thuật số", en: "Digital Twin Journey", zh: "数字孪生旅程", ja: "デジタルツインジャーニー", ko: "디지털 트윈 여정", fr: "Parcours du jumeau numérique" },
  vuid_21: { vi: "Trạng thái Hiện tại", en: "Current Status", zh: "当前状态", ja: "現在のステータス", ko: "현재 상태", fr: "Statut actuel" },
  vuid_22: { vi: "Được xác thực bởi Người dùng", en: "Verified by User", zh: "已由用户验证", ja: "ユーザーにより認証済み", ko: "사용자가 인증함", fr: "Vérifié par utilisateur" },
  vuid_23: { vi: "Hôm nay • Lần quét #", en: "Today • Scan #", zh: "今天 • 扫描 #", ja: "今日 • スキャン #", ko: "오늘 • 스캔 #", fr: "Aujourd'hui • Scan #" },
  vuid_24: { vi: "Khởi tạo Sổ cái Genesis", en: "Genesis Ledger Initialized", zh: "创世账本已初始化", ja: "Genesis台帳初期化済み", ko: "제네시스 원장 초기화됨", fr: "Registre Genesis initialisé" },
  vuid_25: { vi: "Khởi động Hệ thống • Nút Bảo mật 01", en: "System Boot • Security Node 01", zh: "系统启动 • 安全节点01", ja: "システム起動 • セキュリティノード01", ko: "시스템 부팅 • 보안 노드 01", fr: "Démarrage système • Nœud sécurisé 01" },
  vuid_26: { vi: "Vị trí Xác thực Lần cuối", en: "Last Verification Location", zh: "最后验证位置", ja: "最終検証場所", ko: "마지막 인증 위치", fr: "Dernière position de vérification" },
  vuid_27: { vi: "IP Khu vực Hiện tại", en: "Current IP Region", zh: "当前IP区域", ja: "現在のIP地域", ko: "현재 IP 지역", fr: "Région IP actuelle" },
  vuid_28: { vi: "Đang lấy Kinh độ/Vĩ độ...", en: "Fetching coordinates...", zh: "正在获取坐标...", ja: "座標を取得中...", ko: "좌표 가져오는 중...", fr: "Récupération des coordonnées..." },
  vuid_29: { vi: "Chứng nhận & Tiêu chuẩn Chất lượng", en: "Certificates & Quality Standards", zh: "证书和质量标准", ja: "証明書と品質基準", ko: "인증서 및 품질 기준", fr: "Certificats et normes de qualité" },
  vuid_30: { vi: "Các văn bản chứng nhận kỹ thuật số được đính kèm trên sổ cái.", en: "Digital certificates attached to the blockchain ledger.", zh: "附在区块链账本上的数字证书。", ja: "ブロックチェーン台帳に添付されたデジタル証明書。", ko: "블록체인 원장에 첨부된 디지털 인증서.", fr: "Certificats numériques attachés au registre blockchain." },
  vuid_31: { vi: "Cơ quan Thẩm quyền", en: "Issuing Authority", zh: "颁发机构", ja: "発行機関", ko: "발급 기관", fr: "Autorité émettrice" },
  vuid_32: { vi: "Ngày cấp", en: "Issue Date", zh: "颁发日期", ja: "発行日", ko: "발급일", fr: "Date d'émission" },
  vuid_33: { vi: "Hết hạn", en: "Expires", zh: "到期", ja: "有効期限", ko: "만료", fr: "Expire" },
  vuid_34: { vi: "Chưa có chứng nhận kỹ thuật số nào.", en: "No digital certificates have been issued for this product.", zh: "该产品尚未颁发数字证书。", ja: "この製品にはデジタル証明書が発行されていません。", ko: "이 제품에 대해 발급된 디지털 인증서가 없습니다.", fr: "Aucun certificat numérique émis pour ce produit." },

  // vscan_*
  vscan_0: { vi: "Không tìm thấy camera nào trên thiết bị.", en: "No camera found on this device.", zh: "此设备未找到摄像头。", ja: "このデバイスにカメラが見つかりません。", ko: "이 기기에서 카메라를 찾을 수 없습니다.", fr: "Aucune caméra trouvée sur cet appareil." },
  vscan_1: { vi: "Không thể khởi động camera. Vui lòng cấp quyền thiết bị.", en: "Cannot start camera. Please grant device permissions.", zh: "无法启动摄像头，请授予权限。", ja: "カメラを起動できません。権限を付与してください。", ko: "카메라를 시작할 수 없습니다. 권한을 허용해 주세요.", fr: "Impossible de démarrer la caméra. Accordez les autorisations." },
  vscan_2: { vi: "Về Trung tâm Xác thực", en: "Back to Verification Center", zh: "返回认证中心", ja: "認証センターに戻る", ko: "인증 센터로 돌아가기", fr: "Retour au centre de vérification" },
  vscan_3: { vi: "Mã QR", en: "QR Code", zh: "二维码", ja: "QRコード", ko: "QR 코드", fr: "Code QR" },
  vscan_4: { vi: "Mã Vạch", en: "Barcode", zh: "条形码", ja: "バーコード", ko: "바코드", fr: "Code-barres" },
  vscan_5: { vi: "Hãy đảm bảo môi trường đủ sáng và tem không bị nhàu nát.", en: "Ensure the environment is well-lit and the stamp is not crumpled.", zh: "确保环境光线充足且标签没有褶皱。", ja: "環境が明るく、スタンプが折れていないことを確認してください。", ko: "환경이 밝고 스탬프가 구겨지지 않았는지 확인하세요.", fr: "Assurez-vous que l'environnement est éclairé et le tampon non froissé." },
  vscan_6: { vi: "Vùng tối xung quanh (mô phỏng)", en: "Dark overlay (simulation)", zh: "暗色覆盖（模拟）", ja: "暗いオーバーレイ（シミュレーション）", ko: "어두운 오버레이(시뮬레이션)", fr: "Superposition sombre (simulation)" },
  vscan_7: { vi: "Khung cắt sáng (Cutout)", en: "Light cutout frame", zh: "明亮裁切框", ja: "明るいカットアウト枠", ko: "밝은 컷아웃 프레임", fr: "Cadre de découpe lumineux" },
  vscan_8: { vi: "4 Góc định vị", en: "4 Corner markers", zh: "4个定位角", ja: "4隅マーカー", ko: "4개 모서리 마커", fr: "4 marqueurs de coin" },
  vscan_9: { vi: "Đường quét ngang (Laser line)", en: "Horizontal scan line (Laser)", zh: "水平扫描线（激光）", ja: "水平スキャンライン（レーザー）", ko: "수평 스캔 라인(레이저)", fr: "Ligne de scan horizontale (Laser)" },

  // vman_*
  vman_0: { vi: "Về Trung tâm Xác thực", en: "Back to Verification Center", zh: "返回认证中心", ja: "認証センターに戻る", ko: "인증 센터로 돌아가기", fr: "Retour au centre de vérification" },
  vman_1: { vi: "Tra cứu Mã Serial", en: "Serial Code Lookup", zh: "序列号查询", ja: "シリアルコード検索", ko: "시리얼 코드 조회", fr: "Recherche de code série" },
  vman_2: { vi: "Nhập chuỗi định danh duy nhất (UUID/Serial) in chìm dưới lớp phủ tem VNTrust chống giả.", en: "Enter the unique identification string (UUID/Serial) on the VNTrust anti-counterfeit stamp.", zh: "输入VNTrust防伪标签上的唯一标识字符串（UUID/Serial）。", ja: "VNTrust偽造防止スタンプの一意識別文字列を入力してください。", ko: "VNTrust 위조 방지 스탬프의 고유 식별 문자열을 입력하세요.", fr: "Entrez la chaîne d'identification unique sur le tampon VNTrust." },
  vman_3: { vi: "Mã định danh (UID)", en: "Identifier Code (UID)", zh: "识别码（UID）", ja: "識別コード（UID）", ko: "식별 코드(UID)", fr: "Code d'identification (UID)" },
  vman_4: { vi: "Xác thực Tức thì", en: "Instant Verify", zh: "即时验证", ja: "即時検証", ko: "즉시 검증", fr: "Vérification instantanée" },
  vman_5: { vi: "Mã hóa Cấp Ngân hàng", en: "Bank-Grade Encryption", zh: "银行级加密", ja: "銀行レベルの暗号化", ko: "은행 수준 암호화", fr: "Chiffrement niveau bancaire" },
  vman_6: { vi: "Giao dịch truy vấn của bạn được mã hóa hoàn toàn.", en: "Your query transaction is fully encrypted.", zh: "您的查询交易已完全加密。", ja: "クエリトランザクションは完全に暗号化されています。", ko: "귀하의 쿼리 트랜잭션은 완전히 암호화되어 있습니다.", fr: "Votre transaction est entièrement chiffrée." },

  // vai_*
  vai_0:  { vi: "Định dạng file không hỗ trợ", en: "Unsupported file format", zh: "不支持的文件格式", ja: "サポートされていないファイル形式", ko: "지원되지 않는 파일 형식", fr: "Format de fichier non pris en charge" },
  vai_1:  { vi: "Giấy chứng nhận (Tự động)", en: "Certificate (Auto)", zh: "证书（自动）", ja: "証明書（自動）", ko: "인증서 (자동)", fr: "Certificat (Auto)" },
  vai_2:  { vi: "Chứng nhận VietGAP", en: "VietGAP Certificate", zh: "VietGAP证书", ja: "VietGAP証明書", ko: "VietGAP 인증서", fr: "Certificat VietGAP" },
  vai_3:  { vi: "Chứng nhận ISO", en: "ISO Certificate", zh: "ISO证书", ja: "ISO証明書", ko: "ISO 인증서", fr: "Certificat ISO" },
  vai_4:  { vi: "Không tìm thấy", en: "Not found", zh: "未找到", ja: "見つかりません", ko: "찾을 수 없음", fr: "Non trouvé" },
  vai_5:  { vi: "Không thể nhận diện văn bản rõ ràng.", en: "Cannot clearly recognize text.", zh: "无法清晰识别文本。", ja: "テキストを明確に認識できません。", ko: "텍스트를 명확히 인식할 수 없습니다.", fr: "Impossible de reconnaître clairement le texte." },
  vai_6:  { vi: "Về Trung tâm Xác thực", en: "Back to Verification Center", zh: "返回认证中心", ja: "認証センターに戻る", ko: "인증 센터로 돌아가기", fr: "Retour au centre de vérification" },
  vai_7:  { vi: "Bắt đầu Xác thực AI", en: "Start AI Verification", zh: "开始AI验证", ja: "AI認証を開始", ko: "AI 검증 시작", fr: "Démarrer la vérification IA" },
  vai_8:  { vi: "Ghi nhận Phân tích", en: "Analysis Record", zh: "分析记录", ja: "分析記録", ko: "분석 기록", fr: "Enregistrement d'analyse" },
  vai_9:  { vi: "Dữ liệu bóc tách (OCR):", en: "Extracted data (OCR):", zh: "提取的数据（OCR）：", ja: "抽出データ（OCR）：", ko: "추출된 데이터 (OCR):", fr: "Données extraites (OCR) :" },
  vai_10: { vi: "Không tìm thấy ký tự nào", en: "No characters found", zh: "未找到任何字符", ja: "文字が見つかりません", ko: "문자를 찾을 수 없음", fr: "Aucun caractère trouvé" },
};

// Thay từng key trong file
for (const [key, vals] of Object.entries(FIXES)) {
  // Tạo regex tìm dòng key hiện tại
  const lineRegex = new RegExp(`  ${key}:\\s*\\{[^}]+\\},?`, 'g');
  const newLine = `  ${key}: { vi: "${vals.vi}", en: "${vals.en}", zh: "${vals.zh}", ja: "${vals.ja}", ko: "${vals.ko}", fr: "${vals.fr}" },`;
  if (lineRegex.test(ctx)) {
    ctx = ctx.replace(new RegExp(`  ${key}:\\s*\\{[^}]+\\},?`, 'g'), newLine);
    console.log('Fixed:', key);
  } else {
    console.log('WARN not found:', key);
  }
}

// Fix hardcode trong ai-doc page
const AIDOC = 'D:/Web hang gia/vntrust/src/app/verify/ai-doc/page.tsx';
let aidoc = fs.readFileSync(AIDOC, 'utf8');
aidoc = aidoc.replace(
  `let type = "Giấy chứng nhận (Tự động)";`,
  `let type = t("vai_1");`
);
fs.writeFileSync(AIDOC, aidoc, 'utf8');

fs.writeFileSync(CTX, ctx, 'utf8');
console.log('\n✅ All keys fixed with proper diacritics!');
