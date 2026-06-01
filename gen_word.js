const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, PageBreak } = require('docx');
const fs = require('fs');
const path = require('path');

// Read source files
const nghiepVu = fs.readFileSync('nghiep_vu_chi_tiet.md', 'utf8');
const useCases = fs.readFileSync('use_cases.md', 'utf8');

function parseMarkdownLine(line) {
  const paras = [];
  
  if (line.startsWith('# ')) {
    return [new Paragraph({ text: line.replace(/^# /, '').replace(/[📋🛡️🔑🔍🤖🔔🔗📅⚙️]/g, '').trim(), heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } })];
  }
  if (line.startsWith('## ')) {
    return [new Paragraph({ text: line.replace(/^## /, '').replace(/[📋🛡️🔑🔍🤖🔔🔗📅⚙️📁]/g, '').trim(), heading: HeadingLevel.HEADING_2, spacing: { before: 360, after: 160 } })];
  }
  if (line.startsWith('### ')) {
    return [new Paragraph({ text: line.replace(/^### /, '').replace(/[📋🛡️🔑🔍🤖🔔🔗📅⚙️📁]/g, '').trim(), heading: HeadingLevel.HEADING_3, spacing: { before: 280, after: 120 } })];
  }
  if (line.startsWith('#### ')) {
    return [new Paragraph({ text: line.replace(/^#### /, '').replace(/[📋🛡️🔑🔍🤖🔔🔗📅⚙️📁]/g, '').trim(), heading: HeadingLevel.HEADING_4, spacing: { before: 200, after: 80 } })];
  }
  if (line.startsWith('##### ')) {
    return [new Paragraph({ text: line.replace(/^##### /, '').replace(/[📋🛡️🔑🔍🤖🔔🔗📅⚙️📁]/g, '').trim(), heading: HeadingLevel.HEADING_5, spacing: { before: 160, after: 60 } })];
  }
  if (line.startsWith('- ') || line.startsWith('* ')) {
    const text = line.replace(/^[-*] /, '').replace(/\*\*(.*?)\*\*/g, '$1').trim();
    return [new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 60 } })];
  }
  if (/^\d+\. /.test(line)) {
    const num = line.match(/^(\d+)/)?.[1] || '';
    const text = line.replace(/^\d+\. /, '').replace(/\*\*(.*?)\*\*/g, '$1').trim();
    return [new Paragraph({ children: [new TextRun({ text: num + '. ' + text })], spacing: { after: 60 } })];
  }
  if (line.trim() === '' || line.startsWith('---') || line.startsWith('```') || line.startsWith('|---|') || line.startsWith('|:---') || line.startsWith('> 📌') || line.startsWith('> ⚠️') || line.startsWith('> 💡')) {
    return [];
  }
  if (line.startsWith('|')) {
    return []; // skip table lines, we handle tables separately
  }
  if (line.trim()) {
    const text = line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/[📋🛡️🔑🔍🤖🔔🔗📅⚙️📁💡⚠️📌✅❌👁️🟢🟡🔴⚫🎨]/g, '').trim();
    if (text) {
      return [new Paragraph({ children: [new TextRun({ text })], spacing: { after: 80 } })];
    }
  }
  return [];
}

function parseMarkdownTable(lines, startIdx) {
  let i = startIdx;
  const rows = [];
  while (i < lines.length && lines[i].startsWith('|')) {
    const cols = lines[i].split('|').filter((c, idx, arr) => idx > 0 && idx < arr.length - 1).map(c => c.replace(/\*\*(.*?)\*\*/g, '$1').replace(/[📋🛡️🔑🔍🤖🔔🔗📅⚙️📁💡⚠️📌✅❌👁️🟢🟡🔴⚫🎨:]/g, '').trim());
    if (!cols.every(c => c.replace(/-/g, '').trim() === '')) {
      rows.push(cols);
    }
    i++;
  }
  if (rows.length < 2) return { para: [], nextIdx: i };
  
  const tableRows = rows.map((row, rowIdx) => new TableRow({
    children: row.map(cell => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: cell, bold: rowIdx === 0, size: 18 })] })],
      width: { size: Math.floor(9000 / row.length), type: WidthType.DXA },
    }))
  }));
  
  const table = new Table({
    rows: tableRows,
    width: { size: 9000, type: WidthType.DXA },
  });
  
  return { para: [table, new Paragraph({ text: '', spacing: { after: 120 } })], nextIdx: i };
}

function mdToElements(md) {
  const lines = md.split('\n');
  const elements = [];
  let i = 0;
  let inCodeBlock = false;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('```')) { inCodeBlock = !inCodeBlock; i++; continue; }
    if (inCodeBlock) { i++; continue; }
    if (line.startsWith('|') && !line.startsWith('|---') && !line.startsWith('|:--')) {
      const result = parseMarkdownTable(lines, i);
      elements.push(...result.para);
      i = result.nextIdx;
      continue;
    }
    const paras = parseMarkdownLine(line);
    elements.push(...paras);
    i++;
  }
  return elements;
}

async function main() {
  console.log('Building Word document...');
  
  const titlePage = [
    new Paragraph({ text: '', spacing: { after: 1200 } }),
    new Paragraph({ children: [new TextRun({ text: 'TÀI LIỆU NGHIỆP VỤ ĐẦY ĐỦ', bold: true, size: 48, color: '1a56db' })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
    new Paragraph({ children: [new TextRun({ text: 'HỆ THỐNG VNTRUST', bold: true, size: 56, color: '0e3a8c' })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
    new Paragraph({ children: [new TextRun({ text: 'Chống hàng giả & Xác thực nguồn gốc sản phẩm Việt Nam', size: 28, italics: true, color: '374151' })], alignment: AlignmentType.CENTER, spacing: { after: 800 } }),
    new Paragraph({ children: [new TextRun({ text: 'Phiên bản: 2.0  |  Ngày cập nhật: 14/05/2026', size: 22, color: '6b7280' })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
    new Paragraph({ children: [new TextRun({ text: 'Bảo mật: Nội bộ - Không phát tán ra bên ngoài', size: 20, color: 'dc2626', bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 1000 } }),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  const tocElements = [
    new Paragraph({ text: 'MỤC LỤC', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
    new Paragraph({ text: 'I. Tổng quan hệ thống VNTrust', spacing: { after: 80 } }),
    new Paragraph({ text: 'II. Kiến trúc chức năng - 6 Phân hệ', spacing: { after: 80 } }),
    new Paragraph({ text: 'III. Nền tảng TrustCheck - Giám sát cộng đồng', spacing: { after: 80 } }),
    new Paragraph({ text: 'IV. Thiết kế bảo mật & Pháp lý', spacing: { after: 80 } }),
    new Paragraph({ text: 'V. Hệ thống Đối sát & Cảnh báo hàng giả', spacing: { after: 80 } }),
    new Paragraph({ text: 'VI. Cảnh báo Vòng đời & Hạn hiệu lực', spacing: { after: 80 } }),
    new Paragraph({ text: 'VII. Bảng điều khiển Tuân thủ', spacing: { after: 80 } }),
    new Paragraph({ text: 'VIII. Quản lý Hậu kiểm & Phân tích chất lượng', spacing: { after: 80 } }),
    new Paragraph({ text: 'IX. Use Cases chi tiết (UC01–UC20)', spacing: { after: 80 } }),
    new Paragraph({ text: 'X. Phân quyền & Xác thực người dùng (KYC)', spacing: { after: 80 } }),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  const nghiepVuElements = mdToElements(nghiepVu);
  
  const separator1 = [new Paragraph({ children: [new PageBreak()] })];

  const ucTitle = [
    new Paragraph({ text: 'USE CASES CHI TIẾT TỪNG CHỨC NĂNG', heading: HeadingLevel.HEADING_1 }),
  ];
  const useCaseElements = mdToElements(useCases);

  const separator2 = [new Paragraph({ children: [new PageBreak()] })];

  const authSection = [
    new Paragraph({ text: 'PHÂN QUYỀN & XÁC THỰC NGƯỜI DÙNG (KYC)', heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
    new Paragraph({ text: 'Hệ thống tách biệt hoàn toàn 4 loại tài khoản:', spacing: { after: 80 } }),
    new Paragraph({ text: '1. Admin (Quản trị viên): Truy cập toàn bộ hệ thống, duyệt KYC, quản lý người dùng. Không có chức năng đăng ký từ UI.', bullet: { level: 0 }, spacing: { after: 60 } }),
    new Paragraph({ text: '2. Nhà sản xuất (NSX): Quản lý sản phẩm, lô hàng, mã QR. Phải đăng ký và chờ Admin duyệt KYC mới được đăng nhập.', bullet: { level: 0 }, spacing: { after: 60 } }),
    new Paragraph({ text: '3. Nhà nhập khẩu (NNK): Tương tự NSX, quản lý hàng nhập khẩu. Bắt buộc qua quy trình KYC.', bullet: { level: 0 }, spacing: { after: 60 } }),
    new Paragraph({ text: '4. Người tiêu dùng: Quét mã QR, xác thực sản phẩm, gửi báo cáo nghi ngờ.', bullet: { level: 0 }, spacing: { after: 120 } }),
    new Paragraph({ text: 'Quy trình KYC bắt buộc:', heading: HeadingLevel.HEADING_3 }),
    new Paragraph({ children: [new TextRun({ text: '1. Doanh nghiep dang ky tai khoan tai /login/manufacturer hoac /login/importer' })], spacing: { after: 60 } }),
    new Paragraph({ children: [new TextRun({ text: '2. He thong luu tai khoan voi trang thai pending (cho duyet)' })], spacing: { after: 60 } }),
    new Paragraph({ children: [new TextRun({ text: '3. Admin dang nhap, vao muc Phe duyet ho so, kiem tra ho so doanh nghiep' })], spacing: { after: 60 } }),
    new Paragraph({ children: [new TextRun({ text: '4. Admin duyet (verified) hoac tu choi (suspended)' })], spacing: { after: 60 } }),
    new Paragraph({ children: [new TextRun({ text: '5. Sau khi duoc duyet, doanh nghiep moi duoc phep dang nhap vao he thong' })], spacing: { after: 120 } }),
    new Paragraph({ text: 'Cơ chế bảo vệ:', heading: HeadingLevel.HEADING_3 }),
    new Paragraph({ text: 'API /api/auth/login kiểm tra trangThai của DoanhNghiep. Nếu là "pending" hoặc "suspended", hệ thống trả về lỗi 403 với thông báo rõ ràng cho người dùng.', spacing: { after: 80 } }),
    new Paragraph({ text: 'Mỗi phân quyền có trang đăng nhập/đăng ký riêng biệt tại /login/admin, /login/manufacturer, /login/importer, /login/consumer - không có form đăng nhập chung.', spacing: { after: 80 } }),
  ];

  const doc = new Document({
    sections: [{
      children: [
        ...titlePage,
        ...tocElements,
        ...nghiepVuElements,
        ...separator1,
        ...ucTitle,
        ...useCaseElements,
        ...separator2,
        ...authSection,
      ]
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = 'TAI_LIEU_NGHIEP_VU_VNTRUST_FULL.docx';
  fs.writeFileSync(outPath, buffer);
  console.log(`Done! File saved: ${outPath} (${Math.round(buffer.length/1024)} KB)`);
}

main().catch(console.error);
