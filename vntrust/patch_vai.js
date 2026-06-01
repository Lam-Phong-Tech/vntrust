const fs = require('fs');

const dict = {
  "Định dạng file không hỗ trợ": "Định dạng file không hỗ trợ",
  "Giấy chứng nhận (Tự động)": "Giấy chứng nhận (Tự động)",
  "Chứng nhận VietGAP": "Chứng nhận VietGAP",
  "Chứng nhận ISO": "Chứng nhận ISO",
  "Không tìm thấy": "Không tìm thấy",
  "Không thể nhận diện văn bản rõ ràng.": "Không thể nhận diện văn bản rõ ràng.",
  "Về Trung tâm Xác thực": "Về Trung tâm Xác thực",
  "Bắt đầu Xác thực AI": "Bắt đầu Xác thực AI",
  "Ghi nhận Phân tích": "Ghi nhận Phân tích",
  "Dữ liệu bóc tách (OCR):": "Dữ liệu bóc tách (OCR):",
  "Không tìm thấy ký tự nào": "Không tìm thấy ký tự nào"
};

const pagePath = 'src/app/verify/ai-doc/page.tsx';
let content = fs.readFileSync(pagePath, 'utf8');

const contextPath = 'src/contexts/LanguageContext.tsx';
let contextContent = fs.readFileSync(contextPath, 'utf8');

let newKeysStr = "\n  // ── Verify AI Doc Page ──\n";
let i = 0;
for (const [viText, _] of Object.entries(dict)) {
  const key = "vai_" + i;
  newKeysStr += `  ${key}: { vi: "${viText}", en: "${viText}", zh: "${viText}", ja: "${viText}", ko: "${viText}", fr: "${viText}" },\n`;
  
  // replace all occurrences of "viText" with t("key")
  // For JSX text like >Về Trung tâm Xác thực<, it will be replaced by >{t("vai_x")}<
  // For attributes or function calls like "Định dạng file không hỗ trợ", it will be replaced by t("vai_x")
  
  if (viText === "Về Trung tâm Xác thực" || viText === "Bắt đầu Xác thực AI" || viText === "Ghi nhận Phân tích" || viText === "Dữ liệu bóc tách (OCR):" || viText === "Không tìm thấy ký tự nào") {
    // try to replace JSX elements first
    content = content.replace(new RegExp(`>${viText}<`, 'g'), `>{t("${key}")}<`);
    content = content.replace(new RegExp(`>${viText}`, 'g'), `>{t("${key}")}`);
    content = content.replace(new RegExp(viText, 'g'), `{t("${key}")}`);
  } else {
    // string literals in JS
    content = content.replace(new RegExp(`"${viText}"`, 'g'), `t("${key}")`);
  }
  i++;
}

// Ensure useLanguage is imported
if (!content.includes('useLanguage')) {
  content = content.replace('import Link from "next/link";', 'import Link from "next/link";\nimport { useLanguage } from "@/contexts/LanguageContext";');
  content = content.replace('const [file, setFile] = useState<File | null>(null);', 'const { t } = useLanguage();\n  const [file, setFile] = useState<File | null>(null);');
}

fs.writeFileSync(pagePath, content, 'utf8');

if (!contextContent.includes('// ── Verify AI Doc Page ──')) {
  contextContent = contextContent.replace('};', newKeysStr + '};');
  fs.writeFileSync(contextPath, contextContent, 'utf8');
}

console.log("Done patching Verify AI Doc Page");
