// VietMap Phase 3: DN geocoding — schema migration + helper + API + admin UI
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const HOST='45.119.83.233',USER='root',PASS='Tailoc@2026';
const REMOTE='/var/www/vntrust', LOCAL=path.resolve(__dirname,'../vntrust');
const MIGRATION = path.join(__dirname, 'migration_dn_coords.sql');

const FILES = [
  'prisma/schema.prisma',
  'src/lib/geocode.ts',
  'src/app/api/admin/geocode-dn/route.ts',
  'src/app/api/heatmap/route.ts',
  'src/app/api/kyc/route.ts',
  'src/app/dashboard/geocoding/page.tsx',
  'src/middleware.ts',
  'src/components/MobileMenuDrawer.tsx',
];

function run(c,cmd){return new Promise((r,j)=>{c.exec(cmd,(e,s)=>{if(e)return j(e);let o='';s.on('close',code=>r({code,o})).on('data',d=>o+=d.toString());});});}

async function main(){
  for(const r of FILES) if(!fs.existsSync(path.join(LOCAL,r))){console.error('miss',r);process.exit(1);}
  if(!fs.existsSync(MIGRATION)){console.error('miss migration');process.exit(1);}
  const c=new Client();
  await new Promise((r,j)=>c.on('ready',r).on('error',j).connect({host:HOST,port:22,username:USER,password:PASS,readyTimeout:10000}));
  console.log('[ssh] connected');

  const stamp = Date.now();
  const bk=`${REMOTE}/_backups/vietmap_p3.${stamp}`;
  await run(c,`mkdir -p ${bk}`);

  // 1) Backup DB + files
  console.log('[1/5] Backup DB + files…');
  await run(c, `cp ${REMOTE}/dev.db ${bk}/dev.db.backup`);
  for(const r of FILES) await run(c,`cp '${REMOTE}/${r}' '${bk}/${r.replace(/[/\\]/g,'_')}' 2>/dev/null || true`);

  // 2) Apply migration SQL
  console.log('[2/5] Apply migration (add lat, lng to DoanhNghiep)…');
  const sftp = await new Promise((r,j)=>c.sftp((e,s)=>e?j(e):r(s)));
  await new Promise((r,j)=>sftp.fastPut(MIGRATION, `${bk}/migration_dn_coords.sql`, e=>e?j(e):r()));
  const mig = await run(c, `cd ${REMOTE} && sqlite3 dev.db < '${bk}/migration_dn_coords.sql' 2>&1`);
  console.log('   SQL:', mig.o || '(empty)');
  if (mig.code !== 0 && !/duplicate column name/i.test(mig.o)) {
    console.error('[ERR] Migration failed, rollback DB…');
    await run(c, `cp ${bk}/dev.db.backup ${REMOTE}/dev.db`);
    c.end(); process.exit(1);
  }

  // 3) SFTP files
  console.log('[3/5] Upload files…');
  for (const r of FILES) {
    const d = path.posix.dirname(r);
    await run(c, `mkdir -p '${REMOTE}/${d}'`);
  }
  for(const r of FILES){
    await new Promise((rs,j)=>sftp.fastPut(path.join(LOCAL,r),`${REMOTE}/${r}`,e=>e?j(e):rs()));
    console.log('   ✓',r);
  }

  // 4) Prisma generate + build
  console.log('[4/5] Prisma + build…');
  const gen = await run(c, `cd ${REMOTE} && npx prisma generate 2>&1`);
  console.log('   prisma:', gen.o.split('\n').slice(-2).join(' | '));
  const b=await run(c,`cd ${REMOTE} && npm run build 2>&1`);
  console.log(b.o.split('\n').slice(-10).join('\n'));
  if(b.code!==0){
    console.error('[BUILD FAILED] rollback…');
    await run(c, `cp ${bk}/dev.db.backup ${REMOTE}/dev.db`);
    for(const r of FILES) await run(c,`cp '${bk}/${r.replace(/[/\\]/g,'_')}' '${REMOTE}/${r}' 2>/dev/null || true`);
    await run(c, `cd ${REMOTE} && npx prisma generate && npm run build`);
    c.end(); process.exit(1);
  }

  // 5) pm2 restart
  console.log('[5/5] pm2 restart…');
  const r2=await run(c,'pm2 restart vntrust --update-env && pm2 save');
  console.log('   ', r2.o.split('\n').filter(l=>l.includes('vntrust')).slice(0,2).join(' | '));

  // Verify schema
  const v = await run(c, `cd ${REMOTE} && sqlite3 dev.db "PRAGMA table_info(DoanhNghiep);" | grep -E "lat|lng"`);
  console.log('\n[verify] DoanhNghiep lat/lng columns:');
  console.log(v.o || '(not found)');

  c.end();
  console.log(`\n✅ Phase 3 done. Backup: ${bk}`);
  console.log(`→ Vào /dashboard/geocoding (admin) để chạy batch geocode`);
}
main().catch(e=>{console.error(e);process.exit(1);});
