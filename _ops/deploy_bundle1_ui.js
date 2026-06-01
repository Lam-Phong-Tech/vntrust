// Bundle 1: 3 UI pages cho backend đã có sẵn (lifecycle-config, system-config, webhook)
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const HOST='45.119.83.233',USER='root',PASS='Tailoc@2026';
const REMOTE='/var/www/vntrust', LOCAL=path.resolve(__dirname,'../vntrust');
const FILES = [
  'src/app/dashboard/lifecycle-config/page.tsx',
  'src/app/dashboard/system-config/page.tsx',
  'src/app/dashboard/webhook/page.tsx',
  'src/middleware.ts',
  'src/components/MobileMenuDrawer.tsx',
];

function run(c,cmd){return new Promise((r,j)=>{c.exec(cmd,(e,s)=>{if(e)return j(e);let o='';s.on('close',code=>r({code,o})).on('data',d=>o+=d.toString());});});}
async function main(){
  for(const r of FILES) if(!fs.existsSync(path.join(LOCAL,r))){console.error('miss',r);process.exit(1);}
  const c=new Client();
  await new Promise((r,j)=>c.on('ready',r).on('error',j).connect({host:HOST,port:22,username:USER,password:PASS,readyTimeout:10000}));
  console.log('[ssh] connected');
  const bk=`${REMOTE}/_backups/bundle1.${Date.now()}`;
  await run(c,`mkdir -p ${bk}`);
  for(const r of FILES) await run(c,`cp '${REMOTE}/${r}' '${bk}/${r.replace(/[/\\]/g,'_')}' 2>/dev/null || true`);
  const sftp=await new Promise((r,j)=>c.sftp((e,s)=>e?j(e):r(s)));
  for(const r of FILES){
    const d = path.posix.dirname(r);
    await run(c, `mkdir -p '${REMOTE}/${d}'`);
    await new Promise((rs,j)=>sftp.fastPut(path.join(LOCAL,r),`${REMOTE}/${r}`,e=>e?j(e):rs()));
    console.log('✓',r);
  }
  console.log('[build]...');
  const b=await run(c,`cd ${REMOTE} && npm run build 2>&1`);
  console.log(b.o.split('\n').slice(-12).join('\n'));
  if(b.code!==0){for(const r of FILES) await run(c,`cp '${bk}/${r.replace(/[/\\]/g,'_')}' '${REMOTE}/${r}' 2>/dev/null || true`);c.end();process.exit(1);}
  const r2=await run(c,'pm2 restart vntrust --update-env && pm2 save');
  console.log(r2.o.split('\n').filter(l=>l.includes('vntrust')).slice(0,2).join('\n'));
  c.end();console.log(`\n✅ Bundle 1 done. Backup: ${bk}`);
}
main().catch(e=>{console.error(e);process.exit(1);});
