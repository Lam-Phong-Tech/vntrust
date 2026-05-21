const fs = require('fs');
const glob = require('glob'); // Not available? I'll just hardcode the known files.

const files = [
  'src/app/supply-chain/page.tsx',
  'src/app/dashboard/security/page.tsx',
  'src/app/dashboard/inventory/page.tsx',
  'src/app/dashboard/history/page.tsx',
  'src/app/dashboard/haukiem/page.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf-8');
  
  // Replace white backgrounds with glass effect
  content = content.replace(/bg-white/g, 'bg-white/5 glass-panel text-white');
  content = content.replace(/bg-slate-50/g, 'transparent');
  content = content.replace(/bg-slate-100/g, 'bg-white/10');
  content = content.replace(/bg-surface-container-lowest/g, 'glass-panel');
  content = content.replace(/bg-surface-container-low/g, 'glass-panel');
  content = content.replace(/bg-surface/g, 'transparent');
  content = content.replace(/border-slate-100/g, 'border-white/10');
  content = content.replace(/border-slate-200/g, 'border-white/20');
  
  // Replace dark texts with light
  content = content.replace(/text-slate-700/g, 'text-white');
  content = content.replace(/text-slate-600/g, 'text-slate-200');
  content = content.replace(/text-slate-500/g, 'text-slate-300');
  content = content.replace(/text-on-surface/g, 'text-white');
  
  // Any remaining generic gray text
  content = content.replace(/text-gray-900/g, 'text-white');
  content = content.replace(/text-gray-700/g, 'text-gray-200');

  fs.writeFileSync(file, content);
}
console.log('Done mapping themes for subpages');
