"use client";

import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

type OriginalNode = {
  text?: string;
  attrs?: Partial<Record<"placeholder" | "title" | "aria-label" | "alt" | "value", string>>;
};

const EXACT: Record<string, string> = {
  "Bảng điều khiển": "Dashboard",
  "Quay lại": "Back",
  "Tổng quan": "Overview",
  "Người dùng": "Users",
  "Doanh nghiệp": "Enterprises",
  "Phân quyền": "Permissions",
  "Duyệt SP & Lô": "Product & Batch Approval",
  "Cảnh báo": "Alerts",
  "Điều tra": "Investigation",
  "Phân phối": "Distribution",
  "Báo cáo": "Reports",
  "Điểm thưởng": "Rewards",
  "Bảo mật": "Security",
  "Cấu hình": "Config",
  "Tích hợp": "Integration",
  "Đăng xuất": "Sign out",
  "Quản trị": "Admin",
  "Quản trị hệ thống": "System admin",
  "Tài khoản chờ duyệt": "Pending accounts",
  "Nhật ký gần đây": "Recent activity",
  "Người dùng theo vai trò": "Users by role",
  "Không có dữ liệu": "No data",
  "Không có yêu cầu nào": "No pending requests",
  "Chưa có nhật ký": "No activity yet",
  "Đang tải": "Loading",
  "Đang tải...": "Loading...",
  "Đang tải…": "Loading...",
  "Tất cả": "All",
  "Tất cả mức": "All levels",
  "Tất cả vai trò": "All roles",
  "Tất cả trạng thái": "All statuses",
  "Tất cả loại vi phạm": "All violation types",
  "Tất cả trường hợp": "All cases",
  "Chờ duyệt": "Pending",
  "Đã duyệt": "Approved",
  "Đã xác thực": "Verified",
  "Từ chối": "Rejected",
  "Đã từ chối": "Rejected",
  "Chưa xử lý": "Pending",
  "Đang điều tra": "Investigating",
  "Đã đóng": "Closed",
  "Nghiêm trọng": "Severe",
  "Trung bình": "Medium",
  "Thấp": "Low",
  "Cao": "High",
  "Mới": "New",
  "mới": "new",
  "mục": "items",
  "đã sửa": "custom",
  "mặc định": "default",
  "Tìm": "Search",
  "Tìm kiếm": "Search",
  "Lọc": "Filter",
  "Xóa bộ lọc": "Clear filters",
  "Làm mới": "Refresh",
  "Cập nhật": "Update",
  "Lưu": "Save",
  "Hủy": "Cancel",
  "Xóa": "Delete",
  "Khóa": "Lock",
  "Mở khóa": "Unlock",
  "Sửa": "Edit",
  "Xem": "View",
  "Chi tiết": "Details",
  "Duyệt": "Approve",
  "Phê duyệt": "Approve",
  "Thu hồi": "Revoke",
  "Tạo mới": "Create",
  "Thêm": "Add",
  "Đóng": "Close",
  "Phóng to": "Zoom",
  "Chọn": "Select",
  "Tải lên": "Upload",
  "Tải xuống": "Download",
  "Xuất dữ liệu": "Export",
  "Xuất báo cáo": "Export report",
  "Thao tác": "Actions",
  "Trạng thái": "Status",
  "Vai trò": "Role",
  "Vai trò người dùng": "User role",
  "Người dùng / Role": "User / Role",
  "Hành động": "Action",
  "Thời gian": "Time",
  "Email": "Email",
  "Số điện thoại": "Phone",
  "Không gắn DN": "No enterprise",
  "Đang hoạt động": "Active",
  "Bị khóa": "Locked",
  "Người tiêu dùng": "Consumer",
  "Cơ quan chức năng": "Authority",
  "Nhà sản xuất": "Manufacturer",
  "Nhập khẩu": "Importer",
  "Quản lý Cảnh báo": "Alert management",
  "Quản lý cảnh báo": "Alert management",
  "Quản lý người dùng": "User management",
  "Phê duyệt Hồ sơ KYC": "KYC profile approval",
  "Xác minh Doanh nghiệp": "Enterprise verification",
  "Thông tin doanh nghiệp": "Business information",
  "Tài liệu pháp lý": "Legal documents",
  "Giấy phép Kinh doanh": "Business license",
  "CMND / CCCD Người đại diện": "Representative ID card",
  "Giấy phép lưu hành": "Circulation license",
  "Tên doanh nghiệp": "Enterprise name",
  "Mã số thuế": "Tax code",
  "Loại hình": "Business type",
  "Người đại diện": "Representative",
  "Hotline": "Hotline",
  "Địa chỉ": "Address",
  "Ngành nghề": "Business sector",
  "Chưa cập nhật": "Not updated",
  "Thiếu": "Missing",
  "Đã nộp": "Submitted",
  "File PDF đã tải lên": "PDF uploaded",
  "Nhấn để xem/tải": "Click to view/download",
  "Doanh nghiệp chưa nộp tài liệu này": "Enterprise has not submitted this document",
  "Trạng thái hiện tại": "Current status",
  "Lý do": "Reason",
  "Lý do từ chối": "Rejection reason",
  "Báo cáo từ người dùng": "User report",
  "Tổng cảnh báo": "Total alerts",
  "Cảnh báo mở": "Open alerts",
  "Cảnh báo rủi ro đang mở": "Open risk alerts",
  "Nhật ký Cảnh báo": "Audit warnings",
  "Nhật ký Kiểm toán": "Audit log",
  "Tình trạng Hệ thống": "System health",
  "Danh sách NFR": "NFR checklist",
  "Lỗi hệ thống": "System errors",
  "Tổng log": "Total logs",
  "Mật khẩu yếu": "Weak passwords",
  "Open Alerts": "Open Alerts",
  "UID": "UID",
  "Loại SP": "Product type",
  "Vị trí": "Location",
  "Giá mua": "Price paid",
  "Liên hệ": "Contact",
  "Người báo cáo": "Reporter",
  "Hình ảnh đính kèm": "Attachments",
  "Ghi chú điều tra": "Investigation note",
  "Vị trí quét mã": "Scan location",
  "Vị trí nghi vấn": "Suspicious location",
  "Tọa độ": "Coordinates",
  "Địa chỉ IP": "IP address",
  "Mạng / ISP": "Network / ISP",
  "Thiết bị": "Device",
  "Hệ điều hành": "Operating system",
  "Lần quét": "Scan",
  "Hợp lệ": "Valid",
  "Kích hoạt": "Activated",
  "Tạo Cảnh báo Thủ công": "Create manual alert",
  "Lưu & Điều tra": "Save & investigate",
  "Điều tra Cảnh báo": "Investigate alert",
  "Sản phẩm": "Products",
  "Lô hàng": "Batches",
  "Sản phẩm & Kho": "Products & stock",
  "Lô hàng & Tem QR": "Batches & QR stamps",
  "Phân phối & Giao hàng": "Distribution & delivery",
  "Cảnh báo & Giám sát": "Alerts & monitoring",
  "Báo cáo & Phân tích": "Reports & analytics",
  "Tuân thủ & Chứng nhận": "Compliance & certificates",
  "Bảo mật & Nhật ký": "Security & logs",
  "Cấu hình hệ thống": "System configuration",
  "Quyền đang bật": "Active grants",
  "Nhóm quyền": "Modules",
  "Có thay đổi chưa lưu": "Unsaved changes",
  "Đã lưu": "Saved",
  "Đọc": "Read",
  "Ghi": "Write",
  "Duyệt Sản phẩm & Lô hàng": "Approve products & batches",
  "Sản phẩm chờ duyệt": "Pending products",
  "Lô hàng chờ duyệt": "Pending batches",
  "Tác vụ": "Tasks",
  "Tìm theo tên": "Search by name",
  "Tìm theo tên doanh nghiệp, MST hoặc email": "Search by enterprise name, tax code, or email",
  "Tìm theo tên, email, SĐT": "Search by name, email, phone",
  "Tìm kiếm action, user, IP": "Search action, user, IP",
  "Tìm kiếm tên sản phẩm, doanh nghiệp, thương hiệu": "Search product, enterprise, brand",
  "Báo cáo đa định dạng": "Multi-format reports",
  "Tổng quan quản trị": "Admin overview",
  "Tình hình hệ thống AI VeriGoods": "AI VeriGoods system status",
  "Tổng người dùng": "Total users",
  "Tổng sản phẩm": "Products",
  "Tem QR đã phát": "QR issued",
  "Tỷ lệ nghi giả": "Fake rate",
  "Không có lô tới hạn": "No expiring batches",
  "Xử lý": "Manage",
  "Không có kết quả": "No results",
  "Chưa có dữ liệu": "No data yet",
};

const PHRASES: Array<[RegExp, string]> = [
  [/Bảng điều khiển/g, "Dashboard"],
  [/Quay lại/g, "Back"],
  [/Tất cả/g, "All"],
  [/Đang tải/g, "Loading"],
  [/Không có dữ liệu/g, "No data"],
  [/Không tìm thấy/g, "Not found"],
  [/Chưa có/g, "No"],
  [/Chờ duyệt/g, "Pending"],
  [/Đã duyệt/g, "Approved"],
  [/Từ chối/g, "Rejected"],
  [/Đã đóng/g, "Closed"],
  [/Chưa xử lý/g, "Pending"],
  [/Đang điều tra/g, "Investigating"],
  [/Nghiêm trọng/g, "Severe"],
  [/Trung bình/g, "Medium"],
  [/Thấp/g, "Low"],
  [/Cao/g, "High"],
  [/Doanh nghiệp/g, "Enterprise"],
  [/Người dùng/g, "User"],
  [/Sản phẩm/g, "Product"],
  [/Lô hàng/g, "Batch"],
  [/Cảnh báo/g, "Alert"],
  [/Báo cáo/g, "Report"],
  [/Điều tra/g, "Investigation"],
  [/Phân phối/g, "Distribution"],
  [/Bảo mật/g, "Security"],
  [/Cấu hình/g, "Config"],
  [/Tích hợp/g, "Integration"],
  [/Phân quyền/g, "Permissions"],
  [/Quản lý/g, "Manage"],
  [/Phê duyệt/g, "Approve"],
  [/Duyệt/g, "Approve"],
  [/Thu hồi/g, "Revoke"],
  [/Tạo/g, "Create"],
  [/Thêm/g, "Add"],
  [/Xóa/g, "Delete"],
  [/Khóa/g, "Lock"],
  [/Mở khóa/g, "Unlock"],
  [/Lưu/g, "Save"],
  [/Hủy/g, "Cancel"],
  [/Đóng/g, "Close"],
  [/Xem/g, "View"],
  [/Chi tiết/g, "Details"],
  [/Trạng thái/g, "Status"],
  [/Vai trò/g, "Role"],
  [/Thao tác/g, "Actions"],
  [/Thời gian/g, "Time"],
  [/Hành động/g, "Action"],
  [/Địa chỉ/g, "Address"],
  [/Số điện thoại|SĐT/g, "Phone"],
  [/Mã số thuế|MST/g, "Tax code"],
  [/Tên doanh nghiệp/g, "Enterprise name"],
  [/Người đại diện/g, "Representative"],
  [/Tài liệu pháp lý/g, "Legal documents"],
  [/Giấy phép lưu hành/g, "Circulation license"],
  [/Giấy phép Kinh doanh/g, "Business license"],
];

const EN_EXACT: Record<string, string> = {
  "Recent activity": "Nhật ký gần đây",
  "Recent Activity": "Nhật ký gần đây",
  "KYC profile approval": "Phê duyệt hồ sơ KYC",
  "Product & Batch Approval": "Duyệt sản phẩm & lô hàng",
  "Approvals": "Kiểm duyệt",
  "Approval": "Phê duyệt",
  "Rewards": "Điểm thưởng",
  "Manage and issue reward points to users": "Quản lý và cấp điểm thưởng cho người dùng",
  "Manage và cấp điểm thưởng cho người dùng": "Quản lý và cấp điểm thưởng cho người dùng",
  "Pending Admin": "Chờ quản trị duyệt",
  "Pending": "Chờ duyệt",
  "Approved": "Đã duyệt",
  "Rejected": "Từ chối",
  "Verified": "Đã xác thực",
  "Medium": "Trung bình",
  "High": "Cao",
  "Low": "Thấp",
  "Severe": "Nghiêm trọng",
  "DN_SUSPENDED_CASCADE": "Doanh nghiệp bị khóa dây chuyền",
  "Open alerts": "Cảnh báo mở",
  "System errors": "Lỗi hệ thống",
  "Audit warnings": "Nhật ký cảnh báo",
  "Admin overview": "Tổng quan quản trị",
  "AI VeriGoods system status": "Tình hình hệ thống AI VeriGoods",
  "Total users": "Tổng người dùng",
  "Products": "Sản phẩm",
  "QR issued": "Tem QR đã phát",
  "Fake rate": "Tỷ lệ nghi giả",
  "No data": "Không có dữ liệu",
  "No data yet": "Chưa có dữ liệu",
  "No pending requests": "Không có yêu cầu nào",
  "No activity yet": "Chưa có nhật ký",
  "Loading": "Đang tải",
  "Loading...": "Đang tải...",
  "Search": "Tìm kiếm",
  "Filter": "Lọc",
  "Refresh": "Làm mới",
  "Save": "Lưu",
  "Cancel": "Hủy",
  "Delete": "Xóa",
  "Lock": "Khóa",
  "Unlock": "Mở khóa",
  "Edit": "Sửa",
  "View": "Xem",
  "Details": "Chi tiết",
  "Approve": "Duyệt",
  "Revoke": "Thu hồi",
  "Actions": "Thao tác",
  "Status": "Trạng thái",
  "Role": "Vai trò",
  "Action": "Hành động",
  "Time": "Thời gian",
  "User": "Người dùng",
  "Consumer": "Người tiêu dùng",
  "Manufacturer": "Nhà sản xuất",
  "Importer": "Nhập khẩu",
  "Enterprise": "Doanh nghiệp",
};

const EN_PHRASES: Array<[RegExp, string]> = [
  [/\bRecent activity\b/g, "Nhật ký gần đây"],
  [/\bKYC profile approval\b/g, "Phê duyệt hồ sơ KYC"],
  [/\bManage and issue reward points to users\b/g, "Quản lý và cấp điểm thưởng cho người dùng"],
  [/\bManage v[àa] cấp điểm thưởng cho người dùng\b/g, "Quản lý và cấp điểm thưởng cho người dùng"],
  [/\bPending Admin\b/g, "Chờ quản trị duyệt"],
  [/\bPending\b/g, "Chờ duyệt"],
  [/\bApproved\b/g, "Đã duyệt"],
  [/\bRejected\b/g, "Từ chối"],
  [/\bVerified\b/g, "Đã xác thực"],
  [/\bMedium\b/g, "Trung bình"],
  [/\bHigh\b/g, "Cao"],
  [/\bLow\b/g, "Thấp"],
  [/\bSevere\b/g, "Nghiêm trọng"],
  [/\bDN_SUSPENDED_CASCADE\b/g, "Doanh nghiệp bị khóa dây chuyền"],
  [/\bRewards\b/g, "Điểm thưởng"],
  [/\bApprovals\b/g, "Kiểm duyệt"],
  [/\bApproval\b/g, "Phê duyệt"],
  [/\bProduct\b/g, "Sản phẩm"],
  [/\bBatch\b/g, "Lô hàng"],
  [/\bEnterprise\b/g, "Doanh nghiệp"],
  [/\bConsumer\b/g, "Người tiêu dùng"],
  [/\bManufacturer\b/g, "Nhà sản xuất"],
  [/\bImporter\b/g, "Nhập khẩu"],
  [/\bAdmin\b/g, "Quản trị"],
];

const EN_EXACT_EXTRA: Record<string, string> = {
  "Pending accounts": "Tài khoản chờ duyệt",
  "Users by role": "Người dùng theo vai trò",
  "Admin Console": "Bảng quản trị",
  "Dashboard": "Tổng quan",
  "Overview": "Tổng quan",
  "Manage": "Xử lý",
  "Manage →": "Xử lý →",
  "All": "Tất cả",
  "All →": "Tất cả →",
  "Users": "Người dùng",
  "Enterprises": "Doanh nghiệp",
  "Permissions": "Phân quyền",
  "Reports": "Báo cáo",
  "Analytics": "Phân tích",
  "Config": "Cấu hình",
  "Integration": "Tích hợp",
  "Security": "Bảo mật",
  "Alerts": "Cảnh báo",
  "Investigation": "Điều tra",
  "Distribution": "Phân phối",
  "Operations": "Vận hành",
  "System": "Hệ thống",
  "Analytics & Rewards": "Phân tích & Thưởng",
  "Users & Enterprises": "Người dùng & Doanh nghiệp",
};

const EN_PHRASES_EXTRA: Array<[RegExp, string]> = [
  [/\bPending accounts\b/g, "Tài khoản chờ duyệt"],
  [/\bUsers by role\b/g, "Người dùng theo vai trò"],
  [/\bAdmin Console\b/g, "Bảng quản trị"],
  [/\bTotal users\b/g, "Tổng người dùng"],
  [/\bQR issued\b/g, "Tem QR đã phát"],
  [/\bOpen alerts\b/g, "Cảnh báo mở"],
  [/\bFake rate\b/g, "Tỷ lệ nghi giả"],
];

type TranslateDirection = "vi-to-en" | "en-to-vi";

const SKIP_SELECTOR = [
  "script",
  "style",
  "textarea",
  "code",
  "pre",
  "[data-no-auto-translate]",
  "[contenteditable='true']",
].join(",");

const ATTRS = ["placeholder", "title", "aria-label", "alt", "value"] as const;
const originals = new WeakMap<Node | Element, OriginalNode>();

function translateText(input: string, direction: TranslateDirection) {
  const trimmed = input.trim();
  if (!trimmed) return input;

  const exact = direction === "vi-to-en" ? EXACT : { ...EN_EXACT, ...EN_EXACT_EXTRA };
  const phrases = direction === "vi-to-en" ? PHRASES : [...EN_PHRASES_EXTRA, ...EN_PHRASES];

  if (exact[trimmed]) return input.replace(trimmed, exact[trimmed]);

  let output = input;
  for (const [pattern, replacement] of phrases) {
    output = output.replace(pattern, replacement);
  }
  return output;
}

function isSkippable(node: Node) {
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  return !!element?.closest(SKIP_SELECTOR);
}

function apply(root: ParentNode, direction: TranslateDirection | null) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (isSkippable(node)) return NodeFilter.FILTER_REJECT;
      if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

  for (const node of textNodes) {
    const original = originals.get(node)?.text ?? node.textContent ?? "";
    if (!originals.has(node)) originals.set(node, { text: original });
    const next = direction ? translateText(original, direction) : original;
    if (node.textContent !== next) node.textContent = next;
  }

  const elements = root.querySelectorAll<HTMLElement>("input, textarea, select, button, img, [title], [aria-label]");
  elements.forEach((element) => {
    if (element.closest(SKIP_SELECTOR)) return;

    const original = originals.get(element) ?? { attrs: {} };
    original.attrs ??= {};
    let changed = false;

    ATTRS.forEach((attr) => {
      const value = element.getAttribute(attr);
      if (!value) return;
      if (original.attrs?.[attr] === undefined) original.attrs![attr] = value;
      const next = direction ? translateText(original.attrs![attr] || value, direction) : original.attrs![attr] || value;
      if (value !== next) element.setAttribute(attr, next);
      changed = true;
    });

    if (changed) originals.set(element, original);
  });
}

export default function AdminAutoTranslator() {
  const { lang } = useLanguage();

  useEffect(() => {
    const root = document.querySelector(".admin-content");
    if (!root) return;

    const direction: TranslateDirection | null = lang === "en" ? "vi-to-en" : lang === "vi" ? "en-to-vi" : null;
    apply(root, direction);

    let frame = 0;
    const scheduleApply = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        apply(root, direction);
      });
    };

    const observer = new MutationObserver(() => {
      scheduleApply();
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTRS],
    });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [lang]);

  return null;
}
