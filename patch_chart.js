const fs = require('fs');
let c = fs.readFileSync('D:/Web hang gia/vntrust/src/app/supply-chain/page.tsx', 'utf8');

// 1. Replace the generatePath function + linePath with new smooth bezier version + endpoint vars
c = c.replace(
  /const generatePath[\s\S]*?const linePath = generatePath\(chartPoints\);/,
  `const generatePath = (pts) => {
    if (pts.length < 2) return '';
    const svgW = 800;
    const step = svgW / (pts.length - 1);
    let d = 'M 0 ' + pts[0];
    for (let i = 1; i < pts.length; i++) {
      const cpX = (i - 0.5) * step;
      d += ' C ' + cpX + ' ' + pts[i-1] + ', ' + cpX + ' ' + pts[i] + ', ' + (i * step) + ' ' + pts[i];
    }
    return d;
  };
  const linePath = generatePath(chartPoints);
  const lastPt = chartPoints[chartPoints.length - 1];
  const lastX = 800;`
);

// 2. Replace the SVG/chart section: fix viewBox, remove dashed animation, add real endpoint dot
c = c.replace(
  /\{\/\* Line Chart \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*\{\/\* Digital Twin Timeline \*\/\}/,
  (match) => match  // keep surrounding, just patch the inner SVG
);

// 3. Replace the inner SVG block
c = c.replace(
  /<svg className="w-full h-full" preserveAspectRatio="none" viewBox="-50 0 850 200">[\s\S]*?<\/svg>/,
  `<svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 200">
                    <defs>
                      <linearGradient id="grad1" x1="0%" x2="0%" y1="0%" y2="100%">
                        <stop offset="0%" style={{ stopColor: "#52c2c2", stopOpacity: 0.35 }}></stop>
                        <stop offset="100%" style={{ stopColor: "#52c2c2", stopOpacity: 0 }}></stop>
                      </linearGradient>
                    </defs>
                    <path d={\`\${linePath} V 200 H 0 Z\`} fill="url(#grad1)" className="transition-all duration-[2800ms] ease-in-out" />
                    <path d={linePath} fill="none" stroke="#52c2c2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" className="transition-all duration-[2800ms] ease-in-out" />
                    <circle cx={lastX} cy={lastPt} r="5" fill="#52c2c2" stroke="white" strokeWidth="2" className="transition-all duration-[2800ms] ease-in-out" />
                    <circle cx={lastX} cy={lastPt} r="10" fill="none" stroke="#52c2c2" strokeWidth="1" opacity="0.5" className="transition-all duration-[2800ms] ease-in-out" />
                  </svg>`
);

// 4. Remove the floating tooltip div inside the chart, and the overflow-hidden so we can put tooltip below
c = c.replace(
  /className="h-64 relative border-b border-outline-variant\/20 flex flex-col justify-between py-2 overflow-hidden"/,
  'className="h-64 relative border-b border-outline-variant/20 flex flex-col justify-between py-2"'
);

// 5. Remove the old hardcoded tooltip inside the SVG wrapper
c = c.replace(
  /<div className="absolute top-4 right-10 bg-slate-800 text-white p-3 rounded-lg text-xs font-bold shadow-xl">[\s\S]*?<\/div>/,
  ''
);

// 6. Add a proper tooltip row AFTER the chart div closing tag (after </div> of h-64 relative...)
//    We do this by replacing the closing section of the chart container
c = c.replace(
  /(<\/div>\s*)\s*\{\/\* Digital Twin or next section/,
  '$1'
);

// Simpler: inject below the h-64 closing div by finding the pattern after SVG section ends
c = c.replace(
  /(<\/div>\n\s*<\/div>\n\s*<\/div>\n\s*)\s*\n(\s*\{\/\* Digital Twin Timeline)/,
  (m, pre, next) => {
    return pre + '\n' + next;
  }
);

// 7. Remove dashed line animation CSS
c = c.replace(
  /\.path-anim \{[\s\S]*?\}\s*@keyframes dash \{[\s\S]*?\}/,
  ''
);

c = c.replace(
  /\.animate-\[slideIn_0\.3s_ease-out\] \{[\s\S]*?\}/,
  ''
);

fs.writeFileSync('D:/Web hang gia/vntrust/src/app/supply-chain/page.tsx', c, 'utf8');
console.log('Done!');
