const fs = require('fs');

const dict = {
    "Chào bạn! 😊 Rất vui được gặp bạn hôm nay. Mình là AI của VNTrust nha — bạn cần tra serial, kiểm tra lô hàng, hay hỏi gì khác không?": "Chào bạn! 😊 Rất vui được gặp bạn hôm nay. Mình là AI của VNTrust nha — bạn cần tra serial, kiểm tra lô hàng, hay hỏi gì khác không?",
    "Hey! 👋 Mình đây. Có gì cần giúp không bạn? Nhập số serial để mình check ngay, hoặc hỏi thoải mái nhé!": "Hey! 👋 Mình đây. Có gì cần giúp không bạn? Nhập số serial để mình check ngay, hoặc hỏi thoải mái nhé!",
    "Không có gì bạn ơi 😄 Giúp được bạn là mình vui rồi. Cần gì thêm cứ hỏi nha!": "Không có gì bạn ơi 😄 Giúp được bạn là mình vui rồi. Cần gì thêm cứ hỏi nha!",
    "Oki! Lúc nào cũng sẵn sàng hỗ trợ bạn nhé 🙌": "Oki! Lúc nào cũng sẵn sàng hỗ trợ bạn nhé 🙌",
    "Bạn nhập thẳng số serial vào đây mình tra ngay nha! Ví dụ: EDG123456 🔎": "Bạn nhập thẳng số serial vào đây mình tra ngay nha! Ví dụ: EDG123456 🔎",
    "Để mình giúp! Bạn gõ mã serial hoặc UID từ tem QR vào đây nhé 😊": "Để mình giúp! Bạn gõ mã serial hoặc UID từ tem QR vào đây nhé 😊",
    "🚨 Nghe có vẻ nghiêm trọng! Bạn cho mình biết mã serial của sản phẩm không? Mình kiểm tra ngay.\\n\\n• Gọi: **1800 6789** (miễn phí 24/7)\\n• Email: report@vntrust.vn": "🚨 Nghe có vẻ nghiêm trọng! Bạn cho mình biết mã serial của sản phẩm không? Mình kiểm tra ngay.\\n\\n• Gọi: **1800 6789** (miễn phí 24/7)\\n• Email: report@vntrust.vn",
    "Để quản lý sản phẩm, bạn vào **Tài sản & Lô hàng** nhé 📦\\n• Thêm sản phẩm → Hệ thống tạo mã QR ngay\\n• Tạo lô hàng → Phân phối tem theo lô\\n\\nBạn đang cần làm bước nào?": "Để quản lý sản phẩm, bạn vào **Tài sản & Lô hàng** nhé 📦\\n• Thêm sản phẩm → Hệ thống tạo mã QR ngay\\n• Tạo lô hàng → Phân phối tem theo lô\\n\\nBạn đang cần làm bước nào?",
    "Bạn hỏi về giá à? 😄\\n🟢 **Starter** — Miễn phí (100 SP, 500 QR/tháng)\\n🔵 **Business** — 2.990.000₫/tháng\\n🟡 **Enterprise** — Liên hệ để được báo giá riêng": "Bạn hỏi về giá à? 😄\\n🟢 **Starter** — Miễn phí (100 SP, 500 QR/tháng)\\n🔵 **Business** — 2.990.000₫/tháng\\n🟡 **Enterprise** — Liên hệ để được báo giá riêng",
    "Chuỗi cung ứng VNTrust theo dõi **4,821 điểm** trên toàn quốc 🗺️\\nVào **Chuỗi Cung ứng** trên menu để xem bản đồ realtime nhé!": "Chuỗi cung ứng VNTrust theo dõi **4,821 điểm** trên toàn quốc 🗺️\\nVào **Chuỗi Cung ứng** trên menu để xem bản đồ realtime nhé!",
    "Bảo mật là ưu tiên số 1 của VNTrust đó! 🔐\\n• Mã hóa AES-256 toàn bộ data\\n• 2FA bắt buộc cho doanh nghiệp\\n• AI giám sát 24/7 < 10 giây": "Bảo mật là ưu tiên số 1 của VNTrust đó! 🔐\\n• Mã hóa AES-256 toàn bộ data\\n• 2FA bắt buộc cho doanh nghiệp\\n• AI giám sát 24/7 < 10 giây",
    "App VNTrust Mobile xịn lắm đó! 📱\\n• Quét QR bằng camera mà không cần nhập tay\\n• Offline mode khi mất mạng\\n\\nBấm **APP DOWNLOAD** trên thanh trên để tải!": "App VNTrust Mobile xịn lắm đó! 📱\\n• Quét QR bằng camera mà không cần nhập tay\\n• Offline mode khi mất mạng\\n\\nBấm **APP DOWNLOAD** trên thanh trên để tải!",
    "Xuất báo cáo thì dễ bạn ơi! 📊 Bấm nút **EXPORT OFFLINE REPORT** ở góc trên bản đồ là xong.": "Xuất báo cáo thì dễ bạn ơi! 📊 Bấm nút **EXPORT OFFLINE REPORT** ở góc trên bản đồ là xong.",
    "📞 Liên hệ ngay:\\n• **Hotline**: 1800 6789 (miễn phí, 24/7)\\n• **Email**: support@vntrust.vn\\n• **Zalo**: zalo.me/vntrust": "📞 Liên hệ ngay:\\n• **Hotline**: 1800 6789 (miễn phí, 24/7)\\n• **Email**: support@vntrust.vn\\n• **Zalo**: zalo.me/vntrust",
    "Hmm, mình chưa hiểu câu đó lắm 🤔 Bạn có thể nói rõ hơn không? Hoặc nhập số serial để mình tra cứu ngay!": "Hmm, mình chưa hiểu câu đó lắm 🤔 Bạn có thể nói rõ hơn không? Hoặc nhập số serial để mình tra cứu ngay!",
    "Câu hỏi thú vị! Bạn đang hỏi về sản phẩm cụ thể, cách dùng hệ thống, hay về giá cả?": "Câu hỏi thú vị! Bạn đang hỏi về sản phẩm cụ thể, cách dùng hệ thống, hay về giá cả?",
    "Bạn thử hỏi theo cách khác, hoặc nhập thẳng số serial để mình check nhanh nhé! 😊": "Bạn thử hỏi theo cách khác, hoặc nhập thẳng số serial để mình check nhanh nhé! 😊"
};

const navPath = 'src/components/Navbar.tsx';
let navContent = fs.readFileSync(navPath, 'utf8');

const contextPath = 'src/contexts/LanguageContext.tsx';
let contextContent = fs.readFileSync(contextPath, 'utf8');

let newKeysStr = "\n  // ── AI Shared Responses ──\n";
let i = 0;
for (const [viText, _] of Object.entries(dict)) {
  const key = "ai_resp_" + i;
  newKeysStr += `  ${key}: { vi: \`${viText}\`, en: \`${viText}\`, zh: \`${viText}\`, ja: \`${viText}\`, ko: \`${viText}\`, fr: \`${viText}\` },\n`;
  
  navContent = navContent.replace(`"${viText}"`, `t("${key}")`);
  i++;
}

// Convert export const AI_FALLBACK = [ ... ] to a function inside if needed, 
// actually since getSharedAIReply needs t, we should modify it:
navContent = navContent.replace(
  'export function getSharedAIReply(q: string): string {',
  'export function getSharedAIReply(q: string, t: any): string {'
);

navContent = navContent.replace(
  `const AI_RESPONSES: Array<{ match: RegExp; replies: string[] }> = [`,
  `const getAI_RESPONSES = (t: any): Array<{ match: RegExp; replies: string[] }> => [`
);
navContent = navContent.replace(
  `];\nexport const AI_FALLBACK = [`,
  `];\nexport const getAI_FALLBACK = (t: any) => [`
);
navContent = navContent.replace(
  `];\nexport function getSharedAIReply(q: string, t: any): string {`,
  `];\nexport function getSharedAIReply(q: string, t: any): string {`
);

// We need to fix the internal loops
navContent = navContent.replace(
  `  for (const rule of AI_RESPONSES) {`,
  `  for (const rule of getAI_RESPONSES(t)) {`
);
navContent = navContent.replace(
  `  return AI_FALLBACK[Math.floor(Math.random() * AI_FALLBACK.length)];`,
  `  const fallback = getAI_FALLBACK(t);\n  return fallback[Math.floor(Math.random() * fallback.length)];`
);

// Find where getSharedAIReply is called in AiNavModal
navContent = navContent.replace(
  `for (const rule of AI_RESPONSES) {`,
  `for (const rule of getAI_RESPONSES(t)) {`
);
navContent = navContent.replace(
  `if (!matched) reply = AI_FALLBACK[Math.floor(Math.random() * AI_FALLBACK.length)];`,
  `if (!matched) {\n        const fallback = getAI_FALLBACK(t);\n        reply = fallback[Math.floor(Math.random() * fallback.length)];\n      }`
);

fs.writeFileSync(navPath, navContent, 'utf8');

if (!contextContent.includes('// ── AI Shared Responses ──')) {
  contextContent = contextContent.replace('};', newKeysStr + '};');
  fs.writeFileSync(contextPath, contextContent, 'utf8');
}

console.log("Done patching AI Shared Responses");
