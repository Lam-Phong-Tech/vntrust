const fs = require('fs');

const path = 'src/contexts/LanguageContext.tsx';
let content = fs.readFileSync(path, 'utf8');

const NEW_KEYS = `
  // ── Chat Quick Buttons ──
  chat_q_qr:         { vi: "Cách tra mã QR?", en: "How to scan QR?", zh: "如何扫描QR？", ja: "QRスキャン方法？", ko: "QR 스캔 방법?", fr: "Comment scanner QR?" },
  chat_q_fake:       { vi: "Báo cáo hàng giả", en: "Report fake", zh: "举报假货", ja: "偽造を報告", ko: "가품 신고", fr: "Signaler un faux" },
  chat_q_price:      { vi: "Giá dịch vụ", en: "Service pricing", zh: "服务价格", ja: "サービス価格", ko: "서비스 가격", fr: "Tarifs des services" },
  chat_q_support:    { vi: "Liên hệ hỗ trợ", en: "Contact support", zh: "联系支持", ja: "サポートに連絡", ko: "고객 지원", fr: "Contacter le support" },
  chat_q_app:        { vi: "Hướng dẫn dùng app", en: "App guide", zh: "应用指南", ja: "アプリガイド", ko: "앱 가이드", fr: "Guide de l'application" },
`;

if (!content.includes('chat_q_qr')) {
  const insertIndex = content.lastIndexOf('\n};');
  if (insertIndex !== -1) {
    content = content.slice(0, insertIndex) + NEW_KEYS + content.slice(insertIndex);
    fs.writeFileSync(path, content);
    console.log("Added chat_q_ keys successfully.");
  }
}

// ── Patch Login ──
const loginPath = 'src/app/login/page.tsx';
let loginContent = fs.readFileSync(loginPath, 'utf8');

if (!loginContent.includes('useLanguage')) {
  loginContent = loginContent.replace('import { useRouter } from "next/navigation";', 'import { useRouter } from "next/navigation";\nimport { useLanguage } from "@/contexts/LanguageContext";');
}

if (!loginContent.includes('const { t } = useLanguage();')) {
  loginContent = loginContent.replace('export default function LoginPage() {', 'export default function LoginPage() {\n  const { t } = useLanguage();');
}

const loginReplacements = [
  ['"Đăng nhập để vào bảng điều khiển"', 't("login_sub")'],
  ['"Email hoặc Tên đăng nhập"', 't("login_user")'],
  ['"Mật khẩu"', 't("login_pass")'],
  ['"Đăng nhập Hệ thống"', 't("login_btn")'],
  ['"Tạo tài khoản mới"', 't("login_register")'],
  ['"Quên mật khẩu?"', 't("login_forgot")'],
];

loginReplacements.forEach(([from, to]) => {
  loginContent = loginContent.split(from).join(to);
});

fs.writeFileSync(loginPath, loginContent);
console.log('Login page patched.');
