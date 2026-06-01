const fs = require('fs');

function replaceAll(str, mapObj) {
  let re = new RegExp(Object.keys(mapObj).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join("|"), "g");
  return str.replace(re, function(matched) {
    return mapObj[matched];
  });
}

const NEW_KEYS = `
  // ── History & Logs ──
  hist_login_success: { vi: "Đăng nhập hệ thống thành công", en: "System login successful", zh: "系统登录成功", ja: "システムログイン成功", ko: "시스템 로그인 성공", fr: "Connexion au système réussie" },
  hist_mfr_demo:      { vi: "Nhà sản xuất (Demo)", en: "Manufacturer (Demo)", zh: "制造商（演示）", ja: "製造業者（デモ）", ko: "제조업체 (데모)", fr: "Fabricant (Démo)" },
  hist_imp_demo:      { vi: "Nhà nhập khẩu (Demo)", en: "Importer (Demo)", zh: "进口商（演示）", ja: "輸入業者（デモ）", ko: "수입업체 (데모)", fr: "Importateur (Démo)" },

  // ── Quality Monitoring ──
  qual_title:         { vi: "GIÁM SÁT CHẤT LƯỢNG", en: "QUALITY MONITORING", zh: "质量监控", ja: "品質監視", ko: "품질 모니터링", fr: "SURVEILLANCE DE LA QUALITÉ" },
  qual_post:          { vi: "Post-Market Surveillance", en: "Post-Market Surveillance", zh: "上市后监督", ja: "市販後監視", ko: "시판 후 감시", fr: "Surveillance post-commercialisation" },
  qual_upload:        { vi: "Upload Kết quả Phân tích", en: "Upload Analysis Result", zh: "上传分析结果", ja: "分析結果をアップロード", ko: "분석 결과 업로드", fr: "Télécharger le résultat de l'analyse" },
  qual_prod:          { vi: "SẢN PHẨM", en: "PRODUCT", zh: "产品", ja: "製品", ko: "제품", fr: "PRODUIT" },
  qual_date:          { vi: "CƠ SỞ / NGÀY TEST", en: "FACILITY / TEST DATE", zh: "设施 / 测试日期", ja: "施設 / テスト日", ko: "시설 / 테스트 날짜", fr: "INSTALLATION / DATE DU TEST" },
  qual_target:        { vi: "ĐỐI TƯỢNG", en: "TARGET", zh: "目标", ja: "対象", ko: "대상", fr: "CIBLE" },
  qual_result:        { vi: "KẾT QUẢ", en: "RESULT", zh: "结果", ja: "結果", ko: "결과", fr: "RÉSULTAT" },
  qual_verify:        { vi: "XÁC MINH", en: "VERIFICATION", zh: "验证", ja: "検証", ko: "검증", fr: "VÉRIFICATION" },
  qual_unknown:       { vi: "Không xác định", en: "Unknown", zh: "未知", ja: "不明", ko: "알 수 없음", fr: "Inconnu" },
  qual_consumer:      { vi: "Người tiêu dùng", en: "Consumer", zh: "消费者", ja: "消費者", ko: "소비자", fr: "Consommateur" },
  qual_passed:        { vi: "Đạt chuẩn", en: "Passed", zh: "合格", ja: "合格", ko: "합격", fr: "Réussi" },
  qual_pending:       { vi: "Chờ duyệt", en: "Pending", zh: "待定", ja: "保留中", ko: "보류 중", fr: "En attente" },

  // ── Serial Verification ──
  ser_title:          { vi: "Tra cứu Mã Serial", en: "Serial Code Lookup", zh: "序列号查询", ja: "シリアルコード検索", ko: "시리얼 코드 조회", fr: "Recherche de code série" },
  ser_desc:           { vi: "Nhập chuỗi định danh duy nhất (UUID/Serial) in chìm dưới lớp phủ tem VNTrust chống giả.", en: "Enter the unique identification string (UUID/Serial) hidden under the VNTrust anti-counterfeiting stamp layer.", zh: "输入隐藏在VNTrust防伪标志层下的唯一标识字符串（UUID/Serial）。", ja: "VNTrust偽造防止スタンプ層の下に隠されている一意の識別文字列（UUID /シリアル）を入力します。", ko: "VNTrust 위조 방지 스탬프 층 아래에 숨겨진 고유 식별 문자열(UUID/Serial)을 입력하세요.", fr: "Saisissez la chaîne d'identification unique (UUID/Série) cachée sous la couche du cachet anti-contrefaçon VNTrust." },
  ser_uid:            { vi: "MÃ ĐỊNH DANH (UID)", en: "IDENTIFIER CODE (UID)", zh: "识别码（UID）", ja: "識別コード（UID）", ko: "식별 코드(UID)", fr: "CODE D'IDENTIFICATION (UID)" },
  ser_verify_btn:     { vi: "XÁC THỰC TỨC THÌ", en: "INSTANT VERIFY", zh: "即时验证", ja: "即時検証", ko: "즉시 검증", fr: "VÉRIFICATION INSTANTANÉE" },
  ser_enc_title:      { vi: "Mã hóa Cấp Ngân hàng", en: "Bank-Grade Encryption", zh: "银行级加密", ja: "銀行レベルの暗号化", ko: "은행 수준 암호화", fr: "Cryptage de niveau bancaire" },
  ser_enc_desc:       { vi: "Giao dịch truy vấn của bạn được mã hóa hoàn toàn. VNTrust ẩn danh địa chỉ mạng để đảm bảo tính riêng tư trong đối soát.", en: "Your query transaction is fully encrypted. VNTrust anonymizes network addresses to ensure privacy during cross-checking.", zh: "您的查询交易已完全加密。 VNTrust对网络地址进行匿名处理，以确保在交叉核对期间保护隐私。", ja: "クエリトランザクションは完全に暗号化されます。 VNTrustは、クロスチェック中にプライバシーを確​​保するためにネットワークアドレスを匿名化します。", ko: "쿼리 트랜잭션은 완전히 암호화됩니다. VNTrust는 교차 확인 중에 개인 정보를 보장하기 위해 네트워크 주소를 익명화합니다.", fr: "Votre transaction de requête est entièrement cryptée. VNTrust anonymise les adresses réseau pour garantir la confidentialité." },

  // ── QR Scan ──
  qr_title:           { vi: "Quét Mã Bảo Mật", en: "Scan Security Code", zh: "扫描安全码", ja: "セキュリティコードをスキャン", ko: "보안 코드 스캔", fr: "Scanner le code de sécurité" },
  qr_desc:            { vi: "Hướng camera thiết bị vào mã QR hoặc Mã Vạch trên tem chống giả VNTrust. Hệ thống sẽ tự động nhận diện.", en: "Point your device camera at the QR code or Barcode on the VNTrust anti-counterfeit stamp. The system will auto-detect.", zh: "将设备相机对准VNTrust防伪标签上的QR码或条形码。系统将自动检测。", ja: "デバイスカメラをVNTrust偽造防止スタンプのQRコードまたはバーコードに向けます。システムが自動検出します。", ko: "기기 카메라를 VNTrust 위조 방지 스탬프의 QR 코드 또는 바코드로 향하세요. 시스템이 자동으로 감지합니다.", fr: "Pointez l'appareil photo vers le code QR ou le code-barres sur le tampon anti-contrefaçon. Le système détectera automatiquement." },
  qr_tab_qr:          { vi: "Mã QR", en: "QR Code", zh: "QR码", ja: "QRコード", ko: "QR 코드", fr: "Code QR" },
  qr_tab_bar:         { vi: "Mã Vạch", en: "Barcode", zh: "条形码", ja: "バーコード", ko: "바코드", fr: "Code-barres" },
  qr_tip:             { vi: "Hãy đảm bảo môi trường đủ sáng và tem không bị nhàu nát.", en: "Ensure the environment is well-lit and the stamp is not crumpled.", zh: "确保环境光线充足且邮票没有弄皱。", ja: "環境が明るく、スタンプがしわになっていないことを確認してください。", ko: "환경이 밝고 스탬프가 구겨지지 않았는지 확인하세요.", fr: "Assurez-vous que l'environnement est bien éclairé et que le timbre n'est pas froissé." },
  verify_back:        { vi: "Về Trung tâm Xác thực", en: "Back to Verification Center", zh: "返回认证中心", ja: "認証センターに戻る", ko: "인증 센터로 돌아가기", fr: "Retour au centre de vérification" },
`;

// Append keys
const langPath = 'src/contexts/LanguageContext.tsx';
let langContent = fs.readFileSync(langPath, 'utf8');
if (!langContent.includes('hist_login_success')) {
  const insertIndex = langContent.lastIndexOf('\n};');
  if (insertIndex !== -1) {
    langContent = langContent.slice(0, insertIndex) + NEW_KEYS + langContent.slice(insertIndex);
    fs.writeFileSync(langPath, langContent);
    console.log("Added new keys to LanguageContext.tsx");
  }
}

// Ensure useLanguage import
function ensureUseLanguage(content) {
  if (!content.includes('useLanguage')) {
    if (content.includes('import Link')) {
      content = content.replace('import Link', 'import { useLanguage } from "@/contexts/LanguageContext";\nimport Link');
    } else {
      content = 'import { useLanguage } from "@/contexts/LanguageContext";\n' + content;
    }
    // Also inject const { t } = useLanguage(); inside the component
    // this is a bit hacky but works for the main component exported as default
    content = content.replace(/export default function \w+\(\) \{/, match => match + '\n  const { t } = useLanguage();');
  }
  return content;
}

// 1. Patch History Page
const histPath = 'src/app/dashboard/history/page.tsx';
let histContent = fs.readFileSync(histPath, 'utf8');
histContent = histContent.replace(/>\{l\.action\}</g, '>{l.action === "Đăng nhập hệ thống thành công" ? t("hist_login_success") : l.action}<');
histContent = histContent.replace(/>\{l\.user\}</g, '>{l.user === "Nhà sản xuất (Demo)" ? t("hist_mfr_demo") : l.user === "Nhà nhập khẩu (Demo)" ? t("hist_imp_demo") : l.user}<');
fs.writeFileSync(histPath, histContent);
console.log("Patched History page");

// 2. Patch Quality Page
const qualPath = 'src/app/dashboard/quality/page.tsx';
if (fs.existsSync(qualPath)) {
  let qualContent = fs.readFileSync(qualPath, 'utf8');
  qualContent = ensureUseLanguage(qualContent);
  const qualMap = {
    '>GIÁM SÁT CHẤT LƯỢNG<': '>{t("qual_title")}<',
    '>Post-Market Surveillance<': '>{t("qual_post")}<',
    '>Upload Kết quả Phân tích<': '>{t("qual_upload")}<',
    '>SẢN PHẨM<': '>{t("qual_prod")}<',
    '>CƠ SỞ / NGÀY TEST<': '>{t("qual_date")}<',
    '>ĐỐI TƯỢNG<': '>{t("qual_target")}<',
    '>KẾT QUẢ<': '>{t("qual_result")}<',
    '>XÁC MINH<': '>{t("qual_verify")}<',
    '>Không xác định<': '>{t("qual_unknown")}<',
    '>Người tiêu dùng<': '>{t("qual_consumer")}<',
    '>Đạt chuẩn<': '>{t("qual_passed")}<',
    '>Chờ duyệt<': '>{t("qual_pending")}<',
  };
  qualContent = replaceAll(qualContent, qualMap);
  fs.writeFileSync(qualPath, qualContent);
  console.log("Patched Quality page");
}

// 3. Patch Serial Page
const serPath = 'src/app/verify/serial/page.tsx';
if (fs.existsSync(serPath)) {
  let serContent = fs.readFileSync(serPath, 'utf8');
  serContent = ensureUseLanguage(serContent);
  const serMap = {
    '>Về Trung tâm Xác thực<': '>{t("verify_back")}<',
    '>Tra cứu Mã Serial<': '>{t("ser_title")}<',
    '>Nhập chuỗi định danh duy nhất (UUID/Serial) in chìm dưới lớp phủ tem VNTrust chống giả.<': '>{t("ser_desc")}<',
    '>MÃ ĐỊNH DANH (UID)<': '>{t("ser_uid")}<',
    '>XÁC THỰC TỨC THÌ<': '>{t("ser_verify_btn")}<',
    '>Mã hóa Cấp Ngân hàng<': '>{t("ser_enc_title")}<',
    '>Giao dịch truy vấn của bạn được mã hóa hoàn toàn. VNTrust ẩn danh địa chỉ mạng để đảm bảo tính riêng tư trong đối soát.<': '>{t("ser_enc_desc")}<',
  };
  serContent = replaceAll(serContent, serMap);
  fs.writeFileSync(serPath, serContent);
  console.log("Patched Serial page");
}

// 4. Patch Scan Page
const scanPath = 'src/app/verify/scan/page.tsx';
if (fs.existsSync(scanPath)) {
  let scanContent = fs.readFileSync(scanPath, 'utf8');
  scanContent = ensureUseLanguage(scanContent);
  const scanMap = {
    '>Về Trung tâm Xác thực<': '>{t("verify_back")}<',
    '>Quét Mã Bảo Mật<': '>{t("qr_title")}<',
    '>Hướng camera thiết bị vào mã QR hoặc Mã Vạch trên tem chống giả VNTrust. Hệ thống sẽ tự động nhận diện.<': '>{t("qr_desc")}<',
    ' Mã QR<': ' {t("qr_tab_qr")}<',
    ' Mã Vạch<': ' {t("qr_tab_bar")}<',
    ' Hãy đảm bảo môi trường đủ sáng và tem không bị nhàu nát.<': ' {t("qr_tip")}<',
  };
  scanContent = replaceAll(scanContent, scanMap);
  fs.writeFileSync(scanPath, scanContent);
  console.log("Patched Scan page");
}
