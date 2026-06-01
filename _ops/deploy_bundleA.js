// Bundle A — Unified Portal + Checklist 6-color + 2 roles mới
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const HOST='45.119.83.233',USER='root',PASS='Tailoc@2026';
const REMOTE='/var/www/vntrust', LOCAL=path.resolve(__dirname,'../vntrust');

const FILES = [
  'src/app/portal/page.tsx',
  'src/components/RiskChecklist.tsx',
  'src/app/verify/[uid]/photo/page.tsx',
  'src/components/MobileMenuDrawer.tsx',
  'src/app/dashboard/users/page.tsx',
  'src/app/api/admin/users/[id]/route.ts',
  'prisma/schema.prisma',
];

function run(c,cmd){return new Promise((r,j)=>{c.exec(cmd,(e,s)=>{if(e)return j(e);let o='';s.on('close',code=>r({code,o})).on('data',d=>o+=d.toString());});});}
async function main(){
  for(const r of FILES) if(!fs.existsSync(path.join(LOCAL,r))){console.error('miss',r);process.exit(1);}
  const c=new Client();
  await new Promise((r,j)=>c.on('ready',r).on('error',j).connect({host:HOST,port:22,username:USER,password:PASS,readyTimeout:10000}));
  console.log('[ssh] connected');
  const bk=`${REMOTE}/_backups/bundleA.${Date.now()}`;
  await run(c,`mkdir -p ${bk}`);
  for(const r of FILES) await run(c,`cp '${REMOTE}/${r}' '${bk}/${r.replace(/[/\\]/g,'_')}' 2>/dev/null || true`);
  const sftp=await new Promise((r,j)=>c.sftp((e,s)=>e?j(e):r(s)));
  for(const r of FILES){
    const d = path.posix.dirname(r);
    await run(c, `mkdir -p '${REMOTE}/${d}'`);
    await new Promise((rs,j)=>sftp.fastPut(path.join(LOCAL,r),`${REMOTE}/${r}`,e=>e?j(e):rs()));
    console.log('✓',r);
  }
  // Regen prisma client (vaiTro comment update)
  const gen = await run(c, `cd ${REMOTE} && npx prisma generate 2>&1`);
  console.log('   prisma:', gen.o.split('\n').slice(-2).join(' | '));
  console.log('[build]...');
  const b=await run(c,`cd ${REMOTE} && npm run build 2>&1`);
  console.log(b.o.split('\n').slice(-10).join('\n'));
  if(b.code!==0){for(const r of FILES) await run(c,`cp '${bk}/${r.replace(/[/\\]/g,'_')}' '${REMOTE}/${r}' 2>/dev/null || true`);c.end();process.exit(1);}
  const r2=await run(c,'pm2 restart vntrust --update-env && pm2 save');
  console.log(r2.o.split('\n').filter(l=>l.includes('vntrust')).slice(0,2).join('\n'));
  c.end();console.log(`\n✅ Bundle A done. Backup: ${bk}`);
}
main().catch(e=>{console.error(e);process.exit(1);});
