const fs = require('fs');

const dict = {
  "Về Trung tâm Xác thực": "Về Trung tâm Xác thực",
  "Tra cứu Mã Serial": "Tra cứu Mã Serial",
  "Nhập chuỗi định danh duy nhất (UUID/Serial) in chìm dưới lớp phủ tem VNTrust chống giả.": "Nhập chuỗi định danh duy nhất (UUID/Serial) in chìm dưới lớp phủ tem VNTrust chống giả.",
  "Mã định danh (UID)": "Mã định danh (UID)",
  "Xác thực Tức thì": "Xác thực Tức thì",
  "Mã hóa Cấp Ngân hàng": "Mã hóa Cấp Ngân hàng",
  "Giao dịch truy vấn của bạn được mã hóa hoàn toàn. VNTrust ẩn danh địa chỉ mạng để đảm bảo tính riêng tư trong đối soát.": "Giao dịch truy vấn của bạn được mã hóa hoàn toàn. VNTrust ẩn danh địa chỉ mạng để đảm bảo tính riêng tư trong đối soát."
};

const pagePath = 'src/app/verify/manual/page.tsx';
let content = fs.readFileSync(pagePath, 'utf8');

const contextPath = 'src/contexts/LanguageContext.tsx';
let contextContent = fs.readFileSync(contextPath, 'utf8');

let newKeysStr = "\n  // ── Verify Manual Page ──\n";
let i = 0;
for (const [viText, _] of Object.entries(dict)) {
  const key = "vman_" + i;
  newKeysStr += `  ${key}: { vi: "${viText}", en: "${viText}", zh: "${viText}", ja: "${viText}", ko: "${viText}", fr: "${viText}" },\n`;
  content = content.replace(`>${viText}<`, `>{t("${key}")}<`);
  content = content.replace(viText, `{t("${key}")}`);
  i++;
}

// Ensure useLanguage is imported
if (!content.includes('useLanguage')) {
  content = content.replace('import Link from "next/link";', 'import Link from "next/link";\nimport { useLanguage } from "@/contexts/LanguageContext";');
  content = content.replace('const router = useRouter();', 'const router = useRouter();\n  const { t } = useLanguage();');
}

fs.writeFileSync(pagePath, content, 'utf8');

if (!contextContent.includes('// ── Verify Manual Page ──')) {
  contextContent = contextContent.replace('};', newKeysStr + '};');
  fs.writeFileSync(contextPath, contextContent, 'utf8');
}

console.log("Done patching Verify Manual Page");
