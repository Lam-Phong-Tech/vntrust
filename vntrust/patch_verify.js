const fs = require('fs');
let code = fs.readFileSync('src/app/verify/[uid]/page.tsx', 'utf8');

const search = `{/* Product Specs */}
            <div className="md:col-span-4 flex flex-col gap-4 sm:gap-6">
              <div className="bg-surface-container-low p-5 sm:p-6 rounded-xl flex flex-col justify-between min-h-[160px] sm:min-h-[200px]">`;

const replacement = `{/* Product Specs & 3D Image */}
            <div className="md:col-span-4 flex flex-col gap-4 sm:gap-6">
              {sanPham.hinhAnhUrl && (
                <div className="bg-surface-container-low rounded-xl overflow-hidden relative group aspect-square flex items-center justify-center perspective-[1000px]">
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-tertiary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                  <div className="relative w-[80%] h-[80%] transition-transform duration-500 ease-out transform-gpu group-hover:scale-105 group-hover:rotate-x-12 group-hover:rotate-y-[-12deg] shadow-2xl rounded-2xl overflow-hidden">
                    <img src={sanPham.hinhAnhUrl} alt={sanPham.ten} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 -translate-x-full group-hover:translate-x-full ease-in-out"></div>
                  </div>
                  <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">3d_rotation</span> 3D View
                  </div>
                </div>
              )}
              <div className="bg-surface-container-low p-5 sm:p-6 rounded-xl flex flex-col justify-between min-h-[160px] sm:min-h-[200px]">`;

if (code.includes(search)) {
  fs.writeFileSync('src/app/verify/[uid]/page.tsx', code.replace(search, replacement));
  console.log('Added 3D image view');
} else {
  console.log('Search string not found.');
}
