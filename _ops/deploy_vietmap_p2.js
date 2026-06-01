// VietMap Phase 2: heatmap API + 4 layers + fix markers + fix toggle position
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const HOST='45.119.83.233',USER='root',PASS='Tailoc@2026';
const REMOTE_ROOT='/var/www/vntrust', LOCAL=path.resolve(__dirname,'../vntrust');

const FILES = [
  'src/components/VietMapView.tsx',
  'src/app/api/heatmap/route.ts',
];

function run(conn, cmd) {
  return new Promise((res, rej) => {
    conn.exec(cmd, (err, st) => {
      if (err) return rej(err);
      let out = '';
      st.on('close', code => res({ code, out }))
        .on('data', d => out += d.toString());
    });
  });
}

async function main() {
  for (const r of FILES) if (!fs.existsSync(path.join(LOCAL,r))) {console.error('miss',r);process.exit(1);}
  const conn = new Client();
  await new Promise((res,rej)=>conn.on('ready',res).on('error',rej).connect({host:HOST,port:22,username:USER,password:PASS,readyTimeout:10000}));
  console.log('[ssh] connected');

  const stamp = Date.now();
  const bk = `${REMOTE_ROOT}/_backups/vietmap_p2.${stamp}`;
  await run(conn, `mkdir -p ${bk}`);
  for (const r of FILES) await run(conn, `cp '${REMOTE_ROOT}/${r}' '${bk}/${r.replace(/[/\\]/g,'_')}' 2>/dev/null || true`);

  const sftp = await new Promise((res,rej)=>conn.sftp((e,s)=>e?rej(e):res(s)));
  for (const r of FILES) {
    const dir = path.posix.dirname(r);
    await run(conn, `mkdir -p '${REMOTE_ROOT}/${dir}'`);
  }
  for (const r of FILES) {
    await new Promise((res,rej)=>sftp.fastPut(path.join(LOCAL,r),`${REMOTE_ROOT}/${r}`,e=>e?rej(e):res()));
    console.log('✓', r);
  }

  console.log('[build]...');
  const b = await run(conn, `cd ${REMOTE_ROOT} && npm run build 2>&1`);
  console.log(b.out.split('\n').slice(-10).join('\n'));
  if (b.code !== 0) {
    console.error('[BUILD FAILED] rollback…');
    for (const r of FILES) await run(conn, `cp '${bk}/${r.replace(/[/\\]/g,'_')}' '${REMOTE_ROOT}/${r}' 2>/dev/null || true`);
    conn.end(); process.exit(1);
  }
  const r2 = await run(conn, 'pm2 restart vntrust --update-env && pm2 save');
  console.log(r2.out.split('\n').filter(l=>l.includes('vntrust')).slice(0,2).join('\n'));
  conn.end();
  console.log(`\n✅ Phase 2 done. Backup: ${bk}`);
}
main().catch(e=>{console.error(e);process.exit(1);});
