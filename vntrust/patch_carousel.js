const fs = require('fs');

const NEW_KEYS = `
  // ── App Carousel ──
  app_dashboard:      { vi: "Bảng điều khiển", en: "Dashboard", zh: "仪表板", ja: "ダッシュボード", ko: "대시보드", fr: "Tableau de bord" },
  app_inventory:      { vi: "Quản lý Tài sản", en: "Asset Management", zh: "资产管理", ja: "資産管理", ko: "자산 관리", fr: "Gestion des actifs" },
  app_qr:             { vi: "Mã QR", en: "QR Code", zh: "QR码", ja: "QRコード", ko: "QR 코드", fr: "Code QR" },
  app_supply:         { vi: "Chuỗi cung ứng", en: "Supply Chain", zh: "供应链", ja: "サプライチェーン", ko: "공급망", fr: "Chaîne d'approvisionnement" },
  app_quality:        { vi: "Hậu kiểm", en: "Quality Check", zh: "质量检查", ja: "品質チェック", ko: "품질 검사", fr: "Contrôle de qualité" },
  app_history:        { vi: "Nhật ký", en: "History", zh: "历史记录", ja: "履歴", ko: "기록", fr: "Historique" },
  app_security:       { vi: "Bảo mật", en: "Security", zh: "安全性", ja: "セキュリティ", ko: "보안", fr: "Sécurité" },
  app_mobile_rep:     { vi: "Báo cáo Mobile", en: "Mobile Report", zh: "移动报告", ja: "モバイルレポート", ko: "모바일 보고서", fr: "Rapport Mobile" },
  app_sms:            { vi: "Cảnh báo SMS", en: "SMS Alert", zh: "短信警报", ja: "SMSアラート", ko: "SMS 알림", fr: "Alerte SMS" },
  app_scan_station:   { vi: "Trạm Quét Mobile", en: "Mobile Scan Station", zh: "移动扫描站", ja: "モバイル スキャン ステーション", ko: "모바일 스캔 스테이션", fr: "Station de scan mobile" },
`;

// Append keys
const langPath = 'src/contexts/LanguageContext.tsx';
let langContent = fs.readFileSync(langPath, 'utf8');
if (!langContent.includes('app_dashboard')) {
  const insertIndex = langContent.lastIndexOf('\n};');
  if (insertIndex !== -1) {
    langContent = langContent.slice(0, insertIndex) + NEW_KEYS + langContent.slice(insertIndex);
    fs.writeFileSync(langPath, langContent);
    console.log("Added carousel keys to LanguageContext.tsx");
  }
}

// Patch AppCarousel
const carPath = 'src/components/AppCarousel.tsx';
let carContent = fs.readFileSync(carPath, 'utf8');
if (!carContent.includes('useLanguage')) {
  carContent = 'import { useLanguage } from "@/contexts/LanguageContext";\n' + carContent;
  carContent = carContent.replace('export default function AppCarousel() {', 'export default function AppCarousel() {\n  const { t } = useLanguage();');
  
  carContent = carContent.replace('"Bảng điều khiển"', 't("app_dashboard")');
  carContent = carContent.replace('"Quản lý Tài sản"', 't("app_inventory")');
  carContent = carContent.replace('"Mã QR"', 't("app_qr")');
  carContent = carContent.replace('"Chuỗi cung ứng"', 't("app_supply")');
  carContent = carContent.replace('"Hậu kiểm"', 't("app_quality")');
  carContent = carContent.replace('"Nhật ký"', 't("app_history")');
  carContent = carContent.replace('"Bảo mật"', 't("app_security")');
  carContent = carContent.replace('"Báo cáo Mobile"', 't("app_mobile_rep")');
  carContent = carContent.replace('"Cảnh báo SMS"', 't("app_sms")');
  carContent = carContent.replace('"Trạm Quét Mobile"', 't("app_scan_station")');
  
  fs.writeFileSync(carPath, carContent);
  console.log("Patched AppCarousel.tsx");
}
