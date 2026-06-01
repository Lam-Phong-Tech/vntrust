// Rewrite the @media (max-width:480px) block to fix dropdown/map regressions
const fs = require('fs');
const path = require('path');

const cssPath = path.resolve(__dirname, '../vntrust/src/app/globals.css');
let css = fs.readFileSync(cssPath, 'utf8');

const startMarker = '/* ╔══════════════════════════════════════════════════════════════════╗\n   ║  EXTRA MOBILE FIT';
const startIdx = css.indexOf(startMarker);
if (startIdx === -1) { console.error('marker not found'); process.exit(1); }

const before = css.slice(0, startIdx);

const newBlock = `/* ╔══════════════════════════════════════════════════════════════════╗
   ║  MOBILE FIT — viewport ≤480px (rewrite v2 — safer)               ║
   ║  Không phá dropdown/map/panels position:absolute                 ║
   ╚══════════════════════════════════════════════════════════════════╝ */

@media (max-width: 480px) {
  /* A. Cho phép flex/grid items shrink */
  *, *::before, *::after { min-width: 0; }

  /* B. Word-break cho text dài; loại trừ SVG/icon/code/chart */
  body, body * { word-break: break-word; overflow-wrap: anywhere; }
  code, pre, [class*="font-mono"],
  svg, svg *, .material-symbols-outlined,
  [data-no-break], [role="img"] {
    word-break: normal !important;
    overflow-wrap: normal !important;
  }
  svg text, svg tspan {
    word-break: keep-all !important;
    white-space: pre !important;
  }
  code, pre, [class*="font-mono"] { overflow-x: auto; }

  /* C. Modal overlay (.fixed.inset-0 hoặc [role=dialog]) — co theo viewport */
  .fixed.inset-0 > [class*="max-w-"]:not([class*="absolute"]),
  [role="dialog"] [class*="max-w-"] {
    max-width: calc(100vw - 16px) !important;
  }

  /* D. Tables — scroll-x + font giảm */
  table {
    display: block; overflow-x: auto; max-width: 100%;
    font-size: 11px; -webkit-overflow-scrolling: touch;
  }
  table th, table td {
    padding: 6px 8px;
    white-space: normal;
    word-break: break-word;
  }

  /* E. Grid 2-col tự stack — chỉ áp khi KHÔNG có responsive prefix */
  [class*="grid-cols-2"]:not([class*="sm:grid"]):not([class*="md:grid"]):not([class*="lg:grid"]):not([class*="xl:grid"]) {
    grid-template-columns: 1fr !important;
  }

  /* F. Heading siêu lớn cap (kèm context h1/h2 để không dính component nhỏ) */
  h1[class*="text-4xl"], h1[class*="text-5xl"], h1[class*="text-6xl"] { font-size: 1.6rem !important; }
  h2[class*="text-3xl"], h2[class*="text-4xl"] { font-size: 1.3rem !important; }

  /* G. Padding container outer giảm — chỉ wrapper page */
  main > .p-8, main > .p-10, main > .p-12,
  main > div > .p-8, main > div > .p-10, main > div > .p-12 {
    padding: 0.75rem !important;
  }

  /* H. Mobile bottom nav clearance */
  main { padding-bottom: 80px !important; }
}
`;

const out = before + newBlock;
fs.writeFileSync(cssPath, out, 'utf8');
console.log('Done. Old size:', css.length, '→ new size:', out.length);
