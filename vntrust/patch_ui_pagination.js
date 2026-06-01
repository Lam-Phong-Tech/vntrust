const fs = require('fs');

const file1 = 'c:/xampp/htdocs/Web-chong-hang-gia-main/vntrust/src/app/dashboard/haukiem/page.tsx';
let content1 = fs.readFileSync(file1, 'utf8');

// 1. Add pagination states
if (!content1.includes('const [pageHk, setPageHk] = useState(1)')) {
  content1 = content1.replace(
    "const [activeTab, setActiveTab] = useState<'haukiem' | 'certs'>('haukiem');",
    "const [activeTab, setActiveTab] = useState<'haukiem' | 'certs'>('haukiem');\\n  const [pageHk, setPageHk] = useState(1);\\n  const [pageCert, setPageCert] = useState(1);\\n  const ITEMS_PER_PAGE = 5;"
  );
}

// 2. Add pagination logic
if (!content1.includes('const paginatedHk = data.slice')) {
  content1 = content1.replace(
    "return (\\n    <div className=\\"flex transparent font-body \\">",
    "const paginatedHk = data.slice((pageHk - 1) * ITEMS_PER_PAGE, pageHk * ITEMS_PER_PAGE);\\n  const paginatedCerts = certs.slice((pageCert - 1) * ITEMS_PER_PAGE, pageCert * ITEMS_PER_PAGE);\\n\\n  return (\\n    <div className=\\"flex transparent font-body \\">"
  );
}

// 3. Fix table width issues
content1 = content1.replace(/min-w-\[640px\]/g, 'min-w-[1000px]');
content1 = content1.replace(/<th className="px-4 sm:px-6 py-4">\{t\("hk_col_product"\)\}<\/th>/g, '<th className="px-4 sm:px-6 py-4 min-w-[280px]">{t("hk_col_product")}</th>');
content1 = content1.replace(/<th className="px-4 sm:px-6 py-4">SẢN PHẨM<\/th>/g, '<th className="px-4 sm:px-6 py-4 min-w-[280px]">SẢN PHẨM</th>');

// 4. Update loops to use paginated data
content1 = content1.replace(/\{data\.map\(\(hk: HauKiem\) => \(/g, '{paginatedHk.map((hk: HauKiem) => (');
content1 = content1.replace(/\{data\.map\(hk => \(/g, '{paginatedHk.map(hk => (');

content1 = content1.replace(/\{certs\.map\(\(cert: ChungNhan\) => \(/g, '{paginatedCerts.map((cert: ChungNhan) => (');
content1 = content1.replace(/\{certs\.map\(cert => \(/g, '{paginatedCerts.map(cert => (');

// 5. Inject Pagination UI for Haukiem
if (!content1.includes('Tổng trang HauKiem')) {
  content1 = content1.replace(
    "</tbody>\\n              </table>\\n            </div>\\n            </div>\\n          )\\n        ) : (",
    "</tbody>\\n              </table>\\n            </div>\\n            \\n            {data.length > ITEMS_PER_PAGE && (\\n              <div className=\\"flex justify-center items-center gap-4 p-4 border-t border-white/10\\">\\n                <button onClick={() => setPageHk(p => Math.max(1, p - 1))} disabled={pageHk === 1} className=\\"px-4 py-2 bg-white/5 rounded-xl text-white disabled:opacity-30\\">Trước</button>\\n                <span className=\\"text-slate-400 text-sm\\">Trang {pageHk} / {Math.ceil(data.length / ITEMS_PER_PAGE)}</span>\\n                <button onClick={() => setPageHk(p => Math.min(Math.ceil(data.length / ITEMS_PER_PAGE), p + 1))} disabled={pageHk === Math.ceil(data.length / ITEMS_PER_PAGE)} className=\\"px-4 py-2 bg-white/5 rounded-xl text-white disabled:opacity-30\\">Sau</button>\\n              </div>\\n            )}\\n\\n            </div>\\n          )\\n        ) : ("
  );
}

// 6. Inject Pagination UI for Certs
if (!content1.includes('Tổng trang Certs')) {
  content1 = content1.replace(
    "</tbody>\\n              </table>\\n            </div>\\n          )\\n        )}",
    "</tbody>\\n              </table>\\n            </div>\\n            \\n            {certs.length > ITEMS_PER_PAGE && (\\n              <div className=\\"flex justify-center items-center gap-4 p-4 border-t border-white/10\\">\\n                <button onClick={() => setPageCert(p => Math.max(1, p - 1))} disabled={pageCert === 1} className=\\"px-4 py-2 bg-white/5 rounded-xl text-white disabled:opacity-30\\">Trước</button>\\n                <span className=\\"text-slate-400 text-sm\\">Trang {pageCert} / {Math.ceil(certs.length / ITEMS_PER_PAGE)}</span>\\n                <button onClick={() => setPageCert(p => Math.min(Math.ceil(certs.length / ITEMS_PER_PAGE), p + 1))} disabled={pageCert === Math.ceil(certs.length / ITEMS_PER_PAGE)} className=\\"px-4 py-2 bg-white/5 rounded-xl text-white disabled:opacity-30\\">Sau</button>\\n              </div>\\n            )}\\n\\n          )\\n        )}"
  );
}

fs.writeFileSync(file1, content1);
console.log('Patched haukiem/page.tsx');


const file2 = 'c:/xampp/htdocs/Web-chong-hang-gia-main/vntrust/src/app/dashboard/distribution/page.tsx';
let content2 = fs.readFileSync(file2, 'utf8');

// 1. Add pagination states
if (!content2.includes('const [pageBatch, setPageBatch] = useState(1)')) {
  content2 = content2.replace(
    "const [orders, setOrders] = useState<DonChuyenHang[]>([]);",
    "const [orders, setOrders] = useState<DonChuyenHang[]>([]);\\n  const [pageBatch, setPageBatch] = useState(1);\\n  const [pageOrder, setPageOrder] = useState(1);\\n  const ITEMS_PER_PAGE = 5;"
  );
}

// 2. Add pagination logic
if (!content2.includes('const paginatedFiltered = filtered.slice')) {
  content2 = content2.replace(
    "return (\\n    <div className=\\"min-h-[calc(100vh-80px)]",
    "const paginatedFiltered = filtered.slice((pageBatch - 1) * ITEMS_PER_PAGE, pageBatch * ITEMS_PER_PAGE);\\n  const paginatedOrders = orders.slice((pageOrder - 1) * ITEMS_PER_PAGE, pageOrder * ITEMS_PER_PAGE);\\n\\n  return (\\n    <div className=\\"min-h-[calc(100vh-80px)]"
  );
}

// 3. Update loops to use paginated data
content2 = content2.replace(/\{filtered\.map\(batch => \(/g, '{paginatedFiltered.map(batch => (');
content2 = content2.replace(/\{orders\.map\(ord => \(/g, '{paginatedOrders.map(ord => (');

// 4. Inject Pagination UI for Batches
if (!content2.includes('Tổng trang Batches')) {
  content2 = content2.replace(
    "</div>\\n      </div>\\n\\n      {/* Transfer Orders List */}",
    "</div>\\n\\n        {filtered.length > ITEMS_PER_PAGE && (\\n          <div className=\\"flex justify-center items-center gap-4 mt-6\\">\\n            <button onClick={() => setPageBatch(p => Math.max(1, p - 1))} disabled={pageBatch === 1} className=\\"px-4 py-2 bg-white/5 rounded-xl text-white disabled:opacity-30\\">Trước</button>\\n            <span className=\\"text-slate-400 text-sm\\">Trang {pageBatch} / {Math.ceil(filtered.length / ITEMS_PER_PAGE)}</span>\\n            <button onClick={() => setPageBatch(p => Math.min(Math.ceil(filtered.length / ITEMS_PER_PAGE), p + 1))} disabled={pageBatch === Math.ceil(filtered.length / ITEMS_PER_PAGE)} className=\\"px-4 py-2 bg-white/5 rounded-xl text-white disabled:opacity-30\\">Sau</button>\\n          </div>\\n        )}\\n\\n      </div>\\n\\n      {/* Transfer Orders List */}"
  );
}

// 5. Inject Pagination UI for Orders
if (!content2.includes('Tổng trang Orders')) {
  content2 = content2.replace(
    "</div>\\n        </div>\\n      )}\\n\\n      {/* Action modal */}",
    "</div>\\n\\n          {orders.length > ITEMS_PER_PAGE && (\\n            <div className=\\"flex justify-center items-center gap-4 mt-6\\">\\n              <button onClick={() => setPageOrder(p => Math.max(1, p - 1))} disabled={pageOrder === 1} className=\\"px-4 py-2 bg-white/5 rounded-xl text-white disabled:opacity-30\\">Trước</button>\\n              <span className=\\"text-slate-400 text-sm\\">Trang {pageOrder} / {Math.ceil(orders.length / ITEMS_PER_PAGE)}</span>\\n              <button onClick={() => setPageOrder(p => Math.min(Math.ceil(orders.length / ITEMS_PER_PAGE), p + 1))} disabled={pageOrder === Math.ceil(orders.length / ITEMS_PER_PAGE)} className=\\"px-4 py-2 bg-white/5 rounded-xl text-white disabled:opacity-30\\">Sau</button>\\n            </div>\\n          )}\\n\\n        </div>\\n      )}\\n\\n      {/* Action modal */}"
  );
}

fs.writeFileSync(file2, content2);
console.log('Patched distribution/page.tsx');

