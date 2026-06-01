const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/inventory/page.tsx', 'utf8');

const target = `                    </div>
                  </div>
                </>
              ) : (`;

const replacement = `                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">\u1ea2nh S\u1ea3n ph\u1ea9m <span className="text-slate-500 font-normal">(Tu\u1ef3 ch\u1ecdn)</span></label>
                    <div className="border-2 border-dashed border-white/20 rounded-xl p-3 text-center hover:border-primary/50 transition cursor-pointer relative">
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      {imagePreview ? (
                        <div className="relative">
                          <img src={imagePreview} alt="preview" className="w-full h-32 object-cover rounded-lg" />
                          <button type="button" onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs">\u2715</button>
                        </div>
                      ) : (
                        <div className="py-3">
                          <span className="material-symbols-outlined text-3xl text-slate-400 block mb-1">add_photo_alternate</span>
                          <p className="text-xs text-slate-400">Nh\u1ea5n \u0111\u1ec3 ch\u1ecdn \u1ea3nh \u00b7 JPG/PNG/WebP \u00b7 Max 5MB</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (`;

if (content.includes(target)) {
  fs.writeFileSync('src/app/dashboard/inventory/page.tsx', content.replace(target, replacement));
  console.log('OK - Image upload field added');
} else {
  // Find the closest match
  const idx = content.indexOf('                </>\n              ) : (');
  console.log('target not found exactly, closest idx:', idx);
  if (idx > 0) {
    console.log('context:', JSON.stringify(content.substring(idx - 60, idx + 30)));
  }
}
