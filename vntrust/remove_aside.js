const fs = require('fs');

const files = [
  'src/app/supply-chain/page.tsx',
  'src/app/dashboard/security/page.tsx',
  'src/app/dashboard/page.tsx',
  'src/app/dashboard/inventory/page.tsx',
  'src/app/dashboard/history/page.tsx',
  'src/app/dashboard/haukiem/page.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.log('Skipping', file);
    continue;
  }
  let content = fs.readFileSync(file, 'utf-8');
  
  // Regex to match the sidebar wrapper and content and aside block
  // First, we can just remove <aside ...> ... </aside>
  content = content.replace(/<aside[\s\S]*?<\/aside>/, '');
  
  // Now replace md:ml-64 with mx-auto max-w-7xl w-full
  content = content.replace(/md:ml-64/g, 'mx-auto max-w-7xl w-full');
  
  // also clean up any empty Sidebar comments
  content = content.replace(/{\/\* Sidebar \*\/}/gi, '');
  content = content.replace(/{\/\* SideNavBar \*\/}/gi, '');
  content = content.replace(/{\/\* Main Content Area \*\/}/gi, '');
  content = content.replace(/{\/\* Main \*\/}/gi, '');

  // Remove `pt-8 md:pt-0` from root flex container if any
  content = content.replace(/pt-8 md:pt-0/, '');
  // Some places it was `min-h-\[calc\(100vh-80px\)\]`. This is fine to leave or remove.
  // Actually the main will take whatever height it needs.
  
  fs.writeFileSync(file, content);
  console.log('Updated', file);
}
