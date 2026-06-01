const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/inventory/page.tsx', 'utf8');

const searchBtn = `                      <button onClick={() => { setSelectedProduct(sp.id); setModal("batch"); }}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">add_box</span>
                        {t("inv_add_batch")}
                      </button>
                    </div>`;

const replaceBtn = `                      <button onClick={() => { setSelectedProduct(sp.id); setModal("batch"); }}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">add_box</span>
                        {t("inv_add_batch")}
                      </button>
                      <button onClick={() => { setSelectedProduct(sp.id); setModal("cert"); setForm({loai: 'ISO'}); }}
                        className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/30 rounded-lg text-xs font-bold text-emerald-400 transition flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">workspace_premium</span>
                        Upload Chứng nhận
                      </button>
                    </div>`;

if(code.includes(searchBtn)) {
  code = code.replace(searchBtn, replaceBtn);
  fs.writeFileSync('src/app/dashboard/inventory/page.tsx', code);
  console.log('Added button');
} else {
  console.log('Btn not found');
}
