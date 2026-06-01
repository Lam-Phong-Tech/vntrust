// Test broader VietMap endpoints — verify if key works at all
const { Client } = require('ssh2');
const HOST='45.119.83.233',USER='root',PASS='Tailoc@2026';
const KEY='9fddd6cdd439433d034c55b26d07d9fbe5915a7ebfabd946';
const REF='https://anticounterfeit.test9.io.vn/';

const URLS = [
  // Search/Geocoding (đã enable theo screenshot)
  `https://maps.vietmap.vn/api/search/v3?apikey=${KEY}&text=Hanoi&size=5`,
  `https://maps.vietmap.vn/api/autocomplete/v3?apikey=${KEY}&text=Ha`,
  `https://maps.vietmap.vn/api/reverse/v3?apikey=${KEY}&lat=21.03&lng=105.85`,
  // Static map (có sẵn theo Limits screenshot)
  `https://maps.vietmap.vn/api/static/v2?apikey=${KEY}&center=21.03,105.85&zoom=10&width=400&height=300`,
  // Map style — try different variants
  `https://maps.vietmap.vn/mt/style.json?apikey=${KEY}`,
  `https://maps.vietmap.vn/api/maps/styles/light?apikey=${KEY}`,
  `https://maps.vietmap.vn/style.json?apikey=${KEY}`,
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
  const conn = new Client();
  await new Promise((res, rej) => conn.on('ready',res).on('error',rej).connect({host:HOST,port:22,username:USER,password:PASS,readyTimeout:10000}));
  console.log('[ssh] connected\n');
  for (const url of URLS) {
    const cmd = `curl -s -w "\n>>HTTP %{http_code} %{size_download}b" -H "Referer: ${REF}" "${url}"`;
    const r = await run(conn, cmd);
    const short = url.replace(KEY, '<KEY>');
    console.log('URL:', short.substring(0, 100));
    console.log('   ', r.out.replace(/\n/g, ' ').substring(0, 200));
    console.log();
  }
  conn.end();
}
main().catch(e => console.error(e));
