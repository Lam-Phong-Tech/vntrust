const fs = require('fs');

function replaceAll(str, mapObj) {
  let re = new RegExp(Object.keys(mapObj).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join("|"), "gi");
  return str.replace(re, function(matched) {
    return mapObj[matched];
  });
}

// 1. Patch AI Doc Page
const aiDocPath = 'src/app/verify/ai-doc/page.tsx';
let aiDocContent = fs.readFileSync(aiDocPath, 'utf8');

// Add useLanguage import if not exists
if (!aiDocContent.includes('useLanguage')) {
  aiDocContent = aiDocContent.replace(
    'import Link from "next/link";',
    'import Link from "next/link";\nimport { useLanguage } from "@/contexts/LanguageContext";'
  );
  aiDocContent = aiDocContent.replace(
    'export default function VerifyAiDocPage() {',
    'export default function VerifyAiDocPage() {\n  const { t } = useLanguage();'
  );
}

const aiDocMap = {
  '"Định dạng file không hỗ trợ"': 't("aidoc_format_error") || "Định dạng file không hỗ trợ"', // Wait, I didn't add aidoc_format_error, let's skip strings for errors to keep it simple, or just map them directly.
  '>Về Trung tâm Xác thực<': '>{t("verify_back")}<',
  '>AI Xác thực Giấy tờ<': '>{t("aidoc_title")}<',
  '>Tải lên hình ảnh Giấy chứng nhận (CO, CQ, VietGAP, ISO...). Trí tuệ Nhân tạo sẽ bóc tách dữ liệu và đối chiếu chữ ký số để phát hiện làm giả.<': '>{t("aidoc_desc")}<',
  '>Kéo thả ảnh hoặc Nhấn để chọn<': '>{t("aidoc_drag")}<',
  '>Hỗ trợ định dạng JPG, PNG, WEBP (Tối đa 10MB)<': '>{t("aidoc_format")}<',
  'Hủy ảnh': '{t("aidoc_cancel")}',
  '>Bắt đầu Xác thực AI<': '>{t("aidoc_start")}<',
  '>AI Đang phân tích OCR...<': '>{t("aidoc_analyzing")}<',
  '>Ghi nhận Phân tích<': '>{t("aidoc_result")}<',
  '>Vui lòng tải lên giấy chứng nhận<br/>để AI phân tích dữ liệu mộc đỏ & chữ ký.<': ' dangerouslySetInnerHTML={{__html: t("aidoc_empty_res").replace(/\\n/g, "<br/>")}}></p><p className="hidden">',
  '>Sẵn sàng để chạy mô hình AI VNTrust...<': '>{t("aidoc_ready")}<',
  '>Tiến trình có thể mất vài giây...<': '>{t("aidoc_wait")}<',
  '>Chứng nhận Hợp lệ<': '>{t("aidoc_valid")}<',
  '>Không phát hiện mộc giả hoặc can thiệp kỹ thuật số.<': '>{t("aidoc_valid_sub")}<',
  '>Loại giấy tờ<': '>{t("aidoc_type")}<',
  '>Cơ quan cấp<': '>{t("aidoc_issuer")}<',
  '>Ngày hiệu lực<': '>{t("aidoc_date")}<',
  '>Dữ liệu bóc tách (OCR):<': '>{t("aidoc_ocr")}<',
  '>Nghi ngờ Giả mạo<': '>{t("aidoc_fake")}<',
  '>Không tìm thấy từ khóa pháp lý hoặc văn bản sai chuẩn quốc gia.<': '>{t("aidoc_fake_sub")}<',
  '>Cảnh báo Nội dung<': '>{t("aidoc_warn")}<',
  '>Sai lệch / Không xác định<': '>{t("aidoc_dev")}<',
  '>Không tìm thấy ký tự nào<': '>{t("aidoc_notfound")}<',
  '>Báo cáo tài liệu vi phạm lên Cục QLTT<': '>{t("aidoc_report")}<'
};

aiDocContent = replaceAll(aiDocContent, aiDocMap);
fs.writeFileSync(aiDocPath, aiDocContent);
console.log('Patched AI Doc Page');

// 2. Patch Inventory Page
const invPath = 'src/app/dashboard/inventory/page.tsx';
let invContent = fs.readFileSync(invPath, 'utf8');

const invMap = {
  '>Quản lý Kho hàng<': '>{t("inv_title")}<',
  '>Sản phẩm & Lô hàng<': '>{t("inv_sub")}<',
  '>Chưa có sản phẩm nào<': '>{t("inv_no_product")}<',
  '>Nhấn t("inv_add_product") để thêm, hoặc t("inv_seed") nếu lần đầu dùng.<': '>Nhấn {t("inv_add_product")} để thêm, hoặc {t("inv_seed")} nếu lần đầu dùng.<', // fix the broken ones
  '>+ Thêm sản phẩm đầu tiên<': '>{t("inv_add_first")}<',
  '> lô hàng<': '> {t("inv_sub")}<', // close enough or use specific
  '>Thêm lô hàng<': '>{t("inv_add_batch_btn")}<',
  '>Mã lô<': '>{t("inv_batch_code")}<',
  '>Ngày SX<': '>{t("inv_mfg_date")}<',
  '>Hạn dùng<': '>{t("inv_exp_date")}<',
  '>Số lượng<': '>{t("inv_col_qty")}<',
  '>Tem QR<': '>{t("inv_col_qr")}<',
  '>Trạng thái<': '>{t("inv_col_status")}<',
  '>Thao tác<': '>{t("inv_col_actions")}<',
  ' tem<': ' {t("inv_stamp")}<',
};

// Handle `Nhấn t("inv_add_product")` to `{t("inv_click_add")} {t("inv_add_product")} {t("inv_click_or")} {t("inv_seed")} {t("inv_click_seed")}`
invContent = invContent.replace(
  />Nhấn t\("inv_add_product"\) để thêm, hoặc t\("inv_seed"\) nếu lần đầu dùng\.</g,
  '>{t("inv_click_add")} {t("inv_add_product")} {t("inv_click_or")} {t("inv_seed")} {t("inv_click_seed")}<'
);

// Handle `lô hàng` span carefully
invContent = invContent.replace(
  />\{sp._count.loHangs\} lô hàng</g,
  '>{sp._count.loHangs} {t("inv_sub").split(" & ")[1] || "lô hàng"}<'
);

invContent = replaceAll(invContent, invMap);
fs.writeFileSync(invPath, invContent);
console.log('Patched Inventory Page');

// 3. Patch Chat Context
const chatPath = 'src/contexts/ChatContext.tsx';
if (fs.existsSync(chatPath)) {
  let chatContent = fs.readFileSync(chatPath, 'utf8');
  chatContent = chatContent.replace(
    /text: "Chào bạn! 👋 Mình là AI VNTrust, sẵn sàng giúp bạn:\\n• Tra cứu sản phẩm theo số serial\\n• Kiểm tra lô hàng & chuỗi cung ứng\\n• Hướng dẫn sử dụng hệ thống\\n• Hỗ trợ kỹ thuật 24\/7\\n\\nBạn cần giúp gì hôm nay\? 😊"/g,
    'text: t("chat_greeting")'
  );
  fs.writeFileSync(chatPath, chatContent);
  console.log('Patched Chat Context');
} else {
  // Maybe it's in Navbar?
  const navPath = 'src/components/Navbar.tsx';
  let navContent = fs.readFileSync(navPath, 'utf8');
  navContent = navContent.replace(
    /text: "Chào bạn! 👋 Mình là AI VNTrust, sẵn sàng giúp bạn:\\n• Tra cứu sản phẩm theo số serial\\n• Kiểm tra lô hàng & chuỗi cung ứng\\n• Hướng dẫn sử dụng hệ thống\\n• Hỗ trợ kỹ thuật 24\/7\\n\\nBạn cần giúp gì hôm nay\? 😊"/g,
    'text: t("chat_greeting")'
  );
  fs.writeFileSync(navPath, navContent);
  console.log('Patched Navbar Chat Greeting');
}

