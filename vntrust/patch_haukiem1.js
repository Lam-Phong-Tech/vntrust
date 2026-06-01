const fs = require('fs');
let c = fs.readFileSync('src/app/dashboard/haukiem/page.tsx', 'utf8');

// 1. Add admin column header after hk_col_verify
const oldHeader = '>{t("hk_col_verify")}</th>\n                  </tr>\n                </thead>';
const newHeader = '>{t("hk_col_verify")}</th>\n                     {userRole === \'admin\' && (\n                       <th className="px-4 sm:px-6 py-4 whitespace-nowrap">H\u00e0nh \u0111\u1ed9ng</th>\n                     )}\n                  </tr>\n                </thead>';

if (c.includes(oldHeader)) {
  c = c.replace(oldHeader, newHeader);
  console.log('Header column added OK');
} else {
  console.log('Header pattern not found!');
}

// 2. Add admin action cells + verify modal before the last closing tag
// Find status badge td and add action td after it
const oldRow = '                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">\n                         {statusBadge(hk.trangThaiXacMinh)}\n                      </td>\n                    </tr>';
const newRow = '                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">\n                         {statusBadge(hk.trangThaiXacMinh)}\n                      </td>\n                      {userRole === \'admin\' && (\n                        <td className="px-4 sm:px-6 py-4">\n                          {hk.trangThaiXacMinh === \'pending\' ? (\n                            <div className="flex gap-2">\n                              <button\n                                onClick={() => { setVerifyModal({ hk, action: \'verify\' }); setVerifyNote(\'\'); }}\n                                className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold hover:bg-emerald-500/30 transition whitespace-nowrap flex items-center gap-1"\n                              >\n                                <span className="material-symbols-outlined text-[13px]">verified</span>\n                                X\u00e1c minh\n                              </button>\n                              <button\n                                onClick={() => { setVerifyModal({ hk, action: \'reject\' }); setVerifyNote(\'\'); }}\n                                className="px-3 py-1.5 bg-red-500/15 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-500/25 transition whitespace-nowrap flex items-center gap-1"\n                              >\n                                <span className="material-symbols-outlined text-[13px]">cancel</span>\n                                T\u1eeb ch\u1ed1i\n                              </button>\n                            </div>\n                          ) : (\n                            <span className="text-xs text-slate-500 italic">\u0110\u00e3 x\u1eed l\u00fd</span>\n                          )}\n                        </td>\n                      )}\n                    </tr>';

if (c.includes(oldRow)) {
  c = c.replace(oldRow, newRow);
  console.log('Action cells added OK');
} else {
  console.log('Row pattern not found, trying alternate...');
  // Try finding status badge td
  const idx = c.indexOf('statusBadge(hk.trangThaiXacMinh)}');
  if (idx > -1) {
    console.log('Found statusBadge at char index:', idx);
    console.log('Surrounding context:', JSON.stringify(c.substring(idx-50, idx+100)));
  }
}

// 3. Add verify modal before the last closing </div> before toast
const toastPattern = '{toast && (\n        <div className={`fixed bottom-8 right-8 z-50 px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm max-w-sm transition-all';
const verifyModalCode = `
      {/* Admin Verify Modal */}
      {verifyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setVerifyModal(null)}>
          <div className="bg-[#0f1e33] border border-white/10 rounded-3xl p-7 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className={\`w-10 h-10 rounded-xl flex items-center justify-center \${verifyModal.action === 'verify' ? 'bg-emerald-500/20' : 'bg-red-500/20'}\`}>
                <span className={\`material-symbols-outlined \${verifyModal.action === 'verify' ? 'text-emerald-400' : 'text-red-400'}\`}>
                  {verifyModal.action === 'verify' ? 'verified' : 'cancel'}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {verifyModal.action === 'verify' ? 'Xác minh Kết quả Hậu kiểm' : 'Từ chối Kết quả Hậu kiểm'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{verifyModal.hk.sanPham?.ten ?? 'Không rõ sản phẩm'}</p>
              </div>
            </div>

            {/* Result badge */}
            {verifyModal.hk.ketQua === 'khongdambao' && verifyModal.action === 'verify' && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 flex gap-2">
                <span className="material-symbols-outlined text-[15px] shrink-0 text-red-400">warning</span>
                <span>Kết quả này <strong>VƯỢT NGƯỠNG</strong>. Xác minh sẽ tự động tạo Cảnh báo Nghiêm trọng trong hệ thống!</span>
              </div>
            )}

            <div className="mb-5">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1.5">Thông tin phân tích</p>
              <p className="text-sm text-white font-semibold">{verifyModal.hk.coSoPhanTich}</p>
              <p className="text-xs text-slate-400 mt-0.5">{new Date(verifyModal.hk.ngayPhanTich).toLocaleDateString('vi-VN')}</p>
              {verifyModal.hk.chiTieuVuotNguong && (
                <p className="text-xs text-red-400 mt-1">Chỉ tiêu vượt: {verifyModal.hk.chiTieuVuotNguong}</p>
              )}
            </div>

            <div className="mb-5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Ghi chú của Admin (tùy chọn)
              </label>
              <textarea
                value={verifyNote}
                onChange={e => setVerifyNote(e.target.value)}
                rows={3}
                placeholder={verifyModal.action === 'verify' ? 'VD: Đã kiểm tra tài liệu gốc, xác nhận hợp lệ...' : 'VD: Tài liệu không đầy đủ, cần bổ sung thêm...'}
                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary transition resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setVerifyModal(null)}
                className="flex-1 py-3 border border-white/20 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 transition">
                Hủy
              </button>
              <button onClick={handleVerifyHauKiem} disabled={verifying}
                className={\`flex-1 py-3 rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 \${verifyModal.action === 'verify' ? 'bg-emerald-500 hover:bg-emerald-400 text-white' : 'bg-red-500/80 hover:bg-red-500 text-white'}\`}>
                {verifying && <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />}
                {verifyModal.action === 'verify' ? 'Xác nhận Xác minh' : 'Xác nhận Từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}

      `;

if (c.includes(toastPattern)) {
  c = c.replace(toastPattern, verifyModalCode + toastPattern);
  console.log('Verify modal added OK');
} else {
  console.log('Toast pattern not found!');
  const tIdx = c.indexOf('toast &&');
  if (tIdx > -1) console.log('Found toast at:', tIdx, 'Context:', JSON.stringify(c.substring(tIdx-5, tIdx+80)));
}

fs.writeFileSync('src/app/dashboard/haukiem/page.tsx', c);
console.log('File saved. Total lines:', c.split('\n').length);
