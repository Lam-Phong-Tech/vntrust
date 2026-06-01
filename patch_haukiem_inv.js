const fs = require('fs');

// ── 1. HAUKIEM: thêm useLanguage + dịch tất cả hardcode ──
let hk = fs.readFileSync('D:/Web hang gia/vntrust/src/app/dashboard/haukiem/page.tsx','utf8');

// Add import
hk = hk.replace(
  `import { useLogs } from "@/hooks/useLogs";`,
  `import { useLogs } from "@/hooks/useLogs";\nimport { useLanguage } from "@/contexts/LanguageContext";`
);
// Add hook
hk = hk.replace(
  `export default function HauKiemPage() {\n  const [data`,
  `export default function HauKiemPage() {\n  const { t } = useLanguage();\n  const [data`
);

// Toast messages
hk = hk.replace(`"✗ Ngày lấy mẫu không thể ở tương lai"`, `t("hk_err_future_sample")`);
hk = hk.replace(`"✗ Ngày ra kết quả không thể trước ngày lấy mẫu"`, `t("hk_err_result_before_sample")`);
hk = hk.replace(`"Lỗi không xác định"`, `t("hk_err_unknown")`);
hk = hk.replace(`"✓ Đã thêm kết quả phân tích thành công"`, `t("hk_success_add")`);

// doiTuongLabel
hk = hk.replace(`case 'doanhnghiep': return 'Doanh nghiệp';`, `case 'doanhnghiep': return t("hk_entity_biz");`);
hk = hk.replace(`case 'nguoitieudung': return 'Người tiêu dùng';`, `case 'nguoitieudung': return t("hk_entity_consumer");`);
hk = hk.replace(`case 'doituongthu3': return 'Đối tác thứ 3 / QLTT';`, `case 'doituongthu3': return t("hk_entity_3rd");`);

// statusBadge
hk = hk.replace(`>Đã xác minh<`, `>{t("hk_verified")}<`);
hk = hk.replace(`>Chờ duyệt<`, `>{t("hk_pending")}<`);
hk = hk.replace(`>Từ chối<`, `>{t("hk_rejected")}<`);

// Header
hk = hk.replace(`>Giám sát Chất lượng<`, `>{t("hk_label")}<`);
hk = hk.replace(`>Upload Kết quả Phân tích<`, `>{t("hk_upload_btn")}<`);
hk = hk.replace(`>Chưa có kết quả giám định nào<`, `>{t("hk_no_data")}<`);
hk = hk.replace(`>Tải lên kết quả test để cập nhật hồ sơ chất lượng công khai.<`, `>{t("hk_no_data_sub")}<`);
hk = hk.replace(`>+ Tải lên Kết quả<`, `>+ {t("hk_upload_btn")}<`);

// Table headers
hk = hk.replace(`>Sản phẩm<`, `>{t("hk_col_product")}<`);
hk = hk.replace(`>Cơ sở / Ngày Test<`, `>{t("hk_col_lab")}<`);
hk = hk.replace(`>Đối tượng<`, `>{t("hk_col_entity")}<`);
hk = hk.replace(`>Kết quả<`, `>{t("hk_col_result")}<`);
hk = hk.replace(`>Xác minh<`, `>{t("hk_col_verify")}<`);

// Inline text in rows
hk = hk.replace(`>Không xác định<`, `>{t("hk_unknown")}<`);
hk = hk.replace(`>Đạt chuẩn\n`, `>{t("hk_pass")}\n`);
hk = hk.replace(`>Vuợt ngưỡng\n`, `>{t("hk_fail")}\n`);

// Modal
hk = hk.replace(`>Tải lên Kết quả Phân tích</h2>`, `>{t("hk_upload_btn")}</h2>`);
hk = hk.replace(`>Sản phẩm lấy mẫu *<`, `>{t("hk_field_product")}<`);
hk = hk.replace(`>-- Chọn sản phẩm --<`, `>{t("hk_select_product")}<`);
hk = hk.replace(`>Cơ sở phân tích *<`, `>{t("hk_field_lab")}<`);
hk = hk.replace(`>Người gửi mẫu<`, `>{t("hk_field_sender")}<`);
hk = hk.replace(`<option value="doanhnghiep">Doanh nghiệp</option>`, `<option value="doanhnghiep">{t("hk_entity_biz")}</option>`);
hk = hk.replace(`<option value="nguoitieudung">Người tiêu dùng</option>`, `<option value="nguoitieudung">{t("hk_entity_consumer")}</option>`);
hk = hk.replace(`<option value="doituongthu3">Quản lý thị trường</option>`, `<option value="doituongthu3">{t("hk_entity_3rd")}</option>`);
hk = hk.replace(`>Ngày lấy mẫu *<`, `>{t("hk_field_sample_date")}<`);
hk = hk.replace(`>Ngày ra kết quả *<`, `>{t("hk_field_result_date")}<`);
hk = hk.replace(`>Tổng quan kết quả<`, `>{t("hk_field_result_summary")}<`);
hk = hk.replace(`>Đạt chỉ tiêu (Đảm bảo)<`, `>{t("hk_result_pass")}<`);
hk = hk.replace(`>Vượt ngưỡng quy định<`, `>{t("hk_result_fail")}<`);
hk = hk.replace(`>Chỉ tiêu vượt ngưỡng<`, `>{t("hk_field_exceed")}<`);
hk = hk.replace(`>Huỷ\n              </button>\n              <button onClick={handleSubmit}`, `>{t("common_cancel")}\n              </button>\n              <button onClick={handleSubmit}`);
hk = hk.replace(`>Lưu Hệ thống<`, `>{t("common_save")}<`);

fs.writeFileSync('D:/Web hang gia/vntrust/src/app/dashboard/haukiem/page.tsx', hk, 'utf8');
console.log('✅ haukiem patched');

// ── 2. INVENTORY: dịch hardcode còn sót ──
let inv = fs.readFileSync('D:/Web hang gia/vntrust/src/app/dashboard/inventory/page.tsx','utf8');

const invReps = [
  [`"✗ Vui lòng điền đầy đủ thông tin"`, `t("inv_err_fill_all")`],
  [`"✗ Vui lòng chọn sản phẩm"`, `t("inv_err_select_product")`],
  [`"✗ Ngày sản xuất không hợp lệ"`, `t("inv_err_mfg_invalid")`],
  [`"✗ Ngày sản xuất không được lớn hơn hạn sử dụng"`, `t("inv_err_mfg_after_exp")`],
  [`"✗ Ngày sản xuất không thể ở tương lai"`, `t("inv_err_mfg_future")`],
  [`"✗ Số lượng phải là số nguyên dương"`, `t("inv_err_qty_positive")`],
  [`"✗ Số lượng không được vượt quá 10,000"`, `t("inv_err_qty_max")`],
  [`"✗ Vui lòng điền đầy đủ ngày SX và hạn dùng"`, `t("inv_err_fill_dates")`],
  [`"✗ Lỗi kết nối khi đồng bộ"`, `t("inv_err_sync")`],
  [`"✓ Database đã khởi tạo dữ liệu mẫu"`, `t("inv_seed_done")`],
  [`>+ Thêm sản phẩm đầu tiên<`, `>+ {t("inv_add_product")}<`],
  [`>Thêm lô hàng<`, `>{t("inv_add_batch")}<`],
  [`>Chỉnh sửa Lô hàng<`, `>{t("inv_edit_batch")}<`],
  [`>Số lượng tem (không thể sửa)<`, `>{t("inv_qty_readonly")}<`],
  [`>Lưu thay đổi<`, `>{t("inv_save_changes")}<`],
  [`>Xác nhận xóa lô hàng?<`, `>{t("inv_confirm_delete")}<`],
  [`>⚠ Không thể hoàn tác thao tác này!<`, `>{t("inv_irreversible")}<`],
  [`>Xóa vĩnh viễn<`, `>{t("inv_delete_forever")}<`],
  [`modal === "product" ? "Thêm Sản phẩm mới" : "Thêm Lô hàng mới"`, `modal === "product" ? t("inv_modal_add_product") : t("inv_modal_add_batch")`],
  [`modal === "product" ? "Tạo Sản phẩm" : "Tạo Lô hàng & In tem"`, `modal === "product" ? t("inv_create_product") : t("inv_create_batch_print")`],
  [`>Tên sản phẩm *<`, `>{t("inv_field_name")}<`],
  [`>Mô tả<`, `>{t("inv_field_desc")}<`],
  [`>Số lượng sản phẩm *<`, `>{t("inv_field_qty")}<`],
  [`>Hệ thống sẽ tự động tạo tem QR tương ứng<`, `>{t("inv_auto_qr")}<`],
  [`>Sản phẩm *<`, `>{t("inv_field_product")}<`],
  [`<option value="">-- Chọn sản phẩm --</option>`, `<option value="">{t("hk_select_product")}</option>`],
  [`>Ngày SX *<`, `>{t("inv_field_mfg_date")}<`],
  [`>Hạn dùng *<`, `>{t("inv_field_exp_date")}<`],
  [`>Sửa<`, `>{t("common_edit")}<`],
  [`>Xóa<`, `>{t("common_delete")}<`],
  [`>Huỷ</button>\n               <button onClick={handleEditBatch}`, `>{t("common_cancel")}</button>\n               <button onClick={handleEditBatch}`],
  [`>Huỷ</button>\n              <button onClick={handleDeleteBatch}`, `>{t("common_cancel")}</button>\n              <button onClick={handleDeleteBatch}`],
  [`>Huỷ\n               </button>\n              <button onClick={() => handleSubmit`, `>{t("common_cancel")}\n               </button>\n              <button onClick={() => handleSubmit`],
  [`<span className="sm:hidden">Sản phẩm</span>`, `<span className="sm:hidden">{t("inv_field_product")}</span>`],
  [` {sp._count.loHangs} lô hàng`, ` {sp._count.loHangs} {t("inv_batch_count")}`],
  [`tem QR" />\n                   `, `tem QR" />\n                   `], // skip
];

for (const [old, neu] of invReps) {
  if (inv.includes(old)) {
    inv = inv.replace(old, neu);
  } else {
    console.log('WARN inv skip:', old.toString().substring(0,50));
  }
}

fs.writeFileSync('D:/Web hang gia/vntrust/src/app/dashboard/inventory/page.tsx', inv, 'utf8');
console.log('✅ inventory patched');
