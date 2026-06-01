const fs = require('fs');
const path = 'src/app/verify/[uid]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const dict = {
  "Sản phẩm không xác định": "Sản phẩm không xác định",
  "Không có mô tả": "Không có mô tả",
  "Cảnh báo: Hàng giả": "Cảnh báo: Hàng giả",
  "Cảnh báo: Hết hạn": "Cảnh báo: Hết hạn",
  "Bất thường Bảo mật": "Bất thường Bảo mật",
  "Xác thực Chính hãng": "Xác thực Chính hãng",
  "Mã:": "Mã:",
  "Tài sản Không hợp lệ": "Tài sản Không hợp lệ",
  "Hoạt động Đáng ngờ": "Hoạt động Đáng ngờ",
  "Sản phẩm Hết hạn": "Sản phẩm Hết hạn",
  "Sản phẩm này không tồn tại trên sổ cái blockchain của chúng tôi. Đây có thể là hàng giả.": "Sản phẩm này không tồn tại trên sổ cái blockchain của chúng tôi. Đây có thể là hàng giả.",
  "Sản phẩm này đã bị quét": "Sản phẩm này đã bị quét",
  "lần. Hoạt động bất thường này đã bị gắn cờ.": "lần. Hoạt động bất thường này đã bị gắn cờ.",
  "Sản phẩm là chính hãng nhưng đã quá hạn sử dụng.": "Sản phẩm là chính hãng nhưng đã quá hạn sử dụng.",
  "Sản phẩm đã được quét và xác thực thành công qua Sổ cái Bất biến VNTrust. Nguồn gốc và xuất xứ được xác nhận 100%.": "Sản phẩm đã được quét và xác thực thành công qua Sổ cái Bất biến VNTrust. Nguồn gốc và xuất xứ được xác nhận 100%.",
  "Định danh Sản phẩm": "Định danh Sản phẩm",
  "Nhật ký Sản xuất": "Nhật ký Sản xuất",
  "Mã lô hàng": "Mã lô hàng",
  "Ngày sản xuất": "Ngày sản xuất",
  "XEM HASH BLOCKCHAIN": "XEM HASH BLOCKCHAIN",
  "Hành trình Bản sao Kỹ thuật số": "Hành trình Bản sao Kỹ thuật số",
  "Trạng thái Hiện tại": "Trạng thái Hiện tại",
  "Được xác thực bởi Người dùng": "Được xác thực bởi Người dùng",
  "Hôm nay • Lần quét #": "Hôm nay • Lần quét #",
  "Khởi tạo Sổ cái Genesis": "Khởi tạo Sổ cái Genesis",
  "Khởi động Hệ thống • Nút Bảo mật 01": "Khởi động Hệ thống • Nút Bảo mật 01",
  "Vị trí Xác thực Lần cuối": "Vị trí Xác thực Lần cuối",
  "IP Khu vực Hiện tại": "IP Khu vực Hiện tại",
  "Đang lấy Kinh độ/Vĩ độ...": "Đang lấy Kinh độ/Vĩ độ...",
  "Chứng nhận & Tiêu chuẩn Chất lượng": "Chứng nhận & Tiêu chuẩn Chất lượng",
  "Các văn bản chứng nhận kỹ thuật số được đính kèm trên sổ cái.": "Các văn bản chứng nhận kỹ thuật số được đính kèm trên sổ cái.",
  "Cơ quan Thẩm quyền": "Cơ quan Thẩm quyền",
  "Ngày cấp": "Ngày cấp",
  "Hết hạn": "Hết hạn",
  "Chưa có chứng nhận kỹ thuật số nào được ban hành cho sản phẩm này.": "Chưa có chứng nhận kỹ thuật số nào được ban hành cho sản phẩm này."
};

const contextPath = 'src/contexts/LanguageContext.tsx';
let contextContent = fs.readFileSync(contextPath, 'utf8');

let newKeysStr = "\n  // ── Verify Result [uid] ──\n";
let i = 0;
for (const [viText, _] of Object.entries(dict)) {
  const key = "vuid_" + i;
  newKeysStr += `  ${key}: { vi: "${viText}", en: "${viText}", zh: "${viText}", ja: "${viText}", ko: "${viText}", fr: "${viText}" },\n`;
  
  // Replace in content
  // Handle variables carefully
  if (viText === "Sản phẩm này đã bị quét") {
    content = content.replace("Sản phẩm này đã bị quét ${result?.scanCount} lần. Hoạt động bất thường này đã bị gắn cờ.", "${t('vuid_" + i + "')} ${result?.scanCount} ${t('vuid_" + (i+1) + "')}");
  } else if (viText === "lần. Hoạt động bất thường này đã bị gắn cờ.") {
    // handled above
  } else if (viText === "Hôm nay • Lần quét #") {
    content = content.replace("Hôm nay • Lần quét #${result?.scanCount}", "${t('vuid_" + i + "')}${result?.scanCount}");
  } else if (viText === "Mã:") {
    content = content.replace("Mã: {uid}", "{t('vuid_" + i + "')} {uid}");
  } else {
    // Normal replace
    let safeText = viText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    content = content.replace(new RegExp('"' + safeText + '"', 'g'), '{t("' + key + '")}');
    content = content.replace(new RegExp("'" + safeText + "'", 'g'), '{t("' + key + '")}');
    content = content.replace(new RegExp('>' + safeText + '<', 'g'), '>{t("' + key + '")}<');
  }
  i++;
}

if (!content.includes('useLanguage')) {
  content = content.replace('import { useParams } from "next/navigation";', 'import { useParams } from "next/navigation";\nimport { useLanguage } from "@/contexts/LanguageContext";');
  content = content.replace('const { uid } = useParams();', 'const { uid } = useParams();\n  const { t } = useLanguage();');
}

fs.writeFileSync(path, content, 'utf8');

if (!contextContent.includes('// ── Verify Result [uid] ──')) {
  contextContent = contextContent.replace('};', newKeysStr + '};');
  fs.writeFileSync(contextPath, contextContent, 'utf8');
}

console.log("Done patching verify/[uid]");
