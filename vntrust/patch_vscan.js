const fs = require('fs');

const dict = {
  "Không tìm thấy camera nào trên thiết bị.": "Không tìm thấy camera nào trên thiết bị.",
  "Không thể khởi động camera. Vui lòng cấp quyền thiết bị.": "Không thể khởi động camera. Vui lòng cấp quyền thiết bị.",
  "Về Trung tâm Xác thực": "Về Trung tâm Xác thực",
  "Mã QR": "Mã QR",
  "Mã Vạch": "Mã Vạch",
  "Hãy đảm bảo môi trường đủ sáng và tem không bị nhàu nát.": "Hãy đảm bảo môi trường đủ sáng và tem không bị nhàu nát.",
  "Vùng tối xung quanh (mô phỏng)": "Vùng tối xung quanh (mô phỏng)",
  "Khung cắt sáng (Cutout)": "Khung cắt sáng (Cutout)",
  "4 Góc định vị": "4 Góc định vị",
  "Đường quét ngang (Laser line)": "Đường quét ngang (Laser line)"
};

const pagePath = 'src/app/verify/scan/page.tsx';
let content = fs.readFileSync(pagePath, 'utf8');

const contextPath = 'src/contexts/LanguageContext.tsx';
let contextContent = fs.readFileSync(contextPath, 'utf8');

let newKeysStr = "\n  // ── Verify Scan Page ──\n";
let i = 0;
for (const [viText, _] of Object.entries(dict)) {
  const key = "vscan_" + i;
  newKeysStr += `  ${key}: { vi: "${viText}", en: "${viText}", zh: "${viText}", ja: "${viText}", ko: "${viText}", fr: "${viText}" },\n`;
  
  if (viText.includes("Không tìm thấy") || viText.includes("Không thể khởi động")) {
    content = content.replace(`"${viText}"`, `t("${key}")`);
  } else if (viText.includes("Vùng tối") || viText.includes("Khung cắt") || viText.includes("4 Góc") || viText.includes("Đường quét")) {
    content = content.replace(`{/* ${viText} */}`, `{/* {t("${key}")} */}`);
  } else {
    content = content.replace(`>${viText}<`, `>{t("${key}")}<`);
    content = content.replace(viText, `{t("${key}")}`);
  }
  i++;
}

fs.writeFileSync(pagePath, content, 'utf8');

if (!contextContent.includes('// ── Verify Scan Page ──')) {
  contextContent = contextContent.replace('};', newKeysStr + '};');
  fs.writeFileSync(contextPath, contextContent, 'utf8');
}

console.log("Done patching Verify Scan Page");
