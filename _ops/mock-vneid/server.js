// Mock VNeID OAuth2-like Authorization Server
// Mô phỏng luồng VNeID thật: /authorize → user chọn danh tính → /token → /userinfo
//
// Endpoints:
//   GET  /authorize?client_id=...&redirect_uri=...&state=...&response_type=code
//   POST /authorize/select   (form submit từ trang authorize)
//   POST /token              (exchange code → access_token JWT HS256)
//   GET  /userinfo           (Bearer token → trả thông tin định danh)
//   GET  /healthz
//   GET  /.well-known/openid-configuration
//
// LƯU Ý: đây là MOCK cho dev/test, KHÔNG dùng cho production thật.

const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const PORT = parseInt(process.env.PORT || '3011', 10);
const SECRET = process.env.MOCK_VNEID_SECRET || 'mock-vneid-shared-secret-CHANGE-ME';
const ISSUER = process.env.MOCK_VNEID_ISSUER || 'https://anticounterfeit.test9.io.vn/_vneid';
const PUBLIC_PREFIX = process.env.MOCK_VNEID_PREFIX || '/_vneid';

// Whitelist các client (mock)
const CLIENTS = {
  vntrust: {
    secret: 'vntrust-client-secret-mock',
    redirect_uris: [
      'https://anticounterfeit.test9.io.vn/api/auth/vneid/callback',
      'http://localhost:3001/api/auth/vneid/callback',
      'http://localhost:3000/api/auth/vneid/callback',
    ],
  },
};

// 5 danh tính mẫu — CCCD 12 chữ số theo chuẩn VN
// (3 chữ tỉnh + 1 giới tính/thế kỷ + 2 năm sinh + 6 số ngẫu nhiên)
const USERS = [
  {
    soDinhDanh: '079092001234',
    hoTen:      'Nguyễn Văn An',
    ngaySinh:   '1992-03-15',
    gioiTinh:   'Nam',
    queQuan:    'Quận 1, TP. Hồ Chí Minh',
    diaChiThuongTru: '123 Lê Lợi, P. Bến Nghé, Q.1, TP.HCM',
    quocTich:   'Việt Nam',
    ngayCap:    '2021-08-10',
    noiCap:     'Cục Cảnh sát QLHC về TTXH',
  },
  {
    soDinhDanh: '001098023456',
    hoTen:      'Trần Thị Hương',
    ngaySinh:   '1998-07-22',
    gioiTinh:   'Nữ',
    queQuan:    'Quận Ba Đình, Hà Nội',
    diaChiThuongTru: '45 Phan Đình Phùng, P. Quán Thánh, Ba Đình, Hà Nội',
    quocTich:   'Việt Nam',
    ngayCap:    '2022-03-12',
    noiCap:     'Cục Cảnh sát QLHC về TTXH',
  },
  {
    soDinhDanh: '048085034567',
    hoTen:      'Lê Minh Hoàng',
    ngaySinh:   '1985-11-03',
    gioiTinh:   'Nam',
    queQuan:    'Quận Hải Châu, Đà Nẵng',
    diaChiThuongTru: '88 Bạch Đằng, P. Hải Châu 1, Q. Hải Châu, Đà Nẵng',
    quocTich:   'Việt Nam',
    ngayCap:    '2020-11-25',
    noiCap:     'Cục Cảnh sát QLHC về TTXH',
  },
  {
    soDinhDanh: '092095045678',
    hoTen:      'Phạm Thu Trang',
    ngaySinh:   '1995-05-19',
    gioiTinh:   'Nữ',
    queQuan:    'Quận Ninh Kiều, Cần Thơ',
    diaChiThuongTru: '27 Trần Phú, P. Cái Khế, Q. Ninh Kiều, Cần Thơ',
    quocTich:   'Việt Nam',
    ngayCap:    '2022-01-08',
    noiCap:     'Cục Cảnh sát QLHC về TTXH',
  },
  {
    soDinhDanh: '031090056789',
    hoTen:      'Hoàng Đức Mạnh',
    ngaySinh:   '1990-12-08',
    gioiTinh:   'Nam',
    queQuan:    'Quận Hồng Bàng, Hải Phòng',
    diaChiThuongTru: '12 Điện Biên Phủ, P. Minh Khai, Q. Hồng Bàng, Hải Phòng',
    quocTich:   'Việt Nam',
    ngayCap:    '2021-06-30',
    noiCap:     'Cục Cảnh sát QLHC về TTXH',
  },
];

// In-memory authorization code store (5 phút TTL)
const codeStore = new Map(); // code → { userIndex, redirect_uri, client_id, expiresAt }
function cleanupCodes() {
  const now = Date.now();
  for (const [k, v] of codeStore.entries()) if (v.expiresAt < now) codeStore.delete(k);
}
setInterval(cleanupCodes, 60_000).unref();

function htmlEscape(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderAuthorize({ clientId, redirectUri, state, error }) {
  const errorHtml = error ? `<div style="background:rgba(218,37,29,0.15);border:1px solid rgba(218,37,29,0.4);color:#ffb4b4;padding:10px 14px;border-radius:8px;margin-bottom:16px;font-size:13px">${htmlEscape(error)}</div>` : '';
  const userCards = USERS.map((u, i) => `
    <label style="display:block;cursor:pointer;margin-bottom:10px">
      <input type="radio" name="user_index" value="${i}" ${i === 0 ? 'checked' : ''} style="display:none" />
      <div class="user-card" data-i="${i}" style="border:2px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.04);border-radius:14px;padding:14px 16px;display:flex;gap:14px;align-items:center;transition:all 0.18s">
        <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#FFCD00,#DA251D);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:20px;font-family:'Outfit',sans-serif;flex-shrink:0">
          ${htmlEscape(u.hoTen.split(' ').slice(-1)[0][0])}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:15px;color:#fff;margin-bottom:2px">${htmlEscape(u.hoTen)}</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.6);font-family:'JetBrains Mono',monospace;letter-spacing:0.04em">CCCD ${htmlEscape(u.soDinhDanh)}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:2px">${htmlEscape(u.gioiTinh)} · ${htmlEscape(u.ngaySinh)} · ${htmlEscape(u.queQuan)}</div>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2" class="chev">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </label>`).join('');

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>VNeID — Đăng nhập</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Outfit', -apple-system, sans-serif; min-height: 100vh; background: #0F1620; color: #fff; line-height: 1.5; }
  .mock-banner { background: linear-gradient(90deg, #C8893A, #DA251D); color: #fff; text-align: center; padding: 8px 12px; font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
  .container { max-width: 440px; margin: 0 auto; padding: 24px; }
  .header { display: flex; align-items: center; gap: 12px; padding: 8px 0 20px; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 24px; }
  .vneid-logo { width: 44px; height: 44px; border-radius: 10px; background: #DA251D; display: flex; align-items: center; justify-content: center; }
  .vneid-logo svg { width: 28px; height: 28px; }
  .brand-name { font-weight: 700; font-size: 18px; letter-spacing: -0.01em; }
  .brand-sub { font-size: 11px; color: rgba(255,255,255,0.5); letter-spacing: 0.06em; text-transform: uppercase; }
  h1 { font-size: 18px; font-weight: 600; margin-bottom: 6px; }
  .desc { font-size: 13px; color: rgba(255,255,255,0.55); margin-bottom: 20px; }
  .client-info { background: rgba(255,205,0,0.08); border: 1px solid rgba(255,205,0,0.25); border-radius: 12px; padding: 12px 14px; margin-bottom: 20px; }
  .client-info .label { font-size: 10px; color: rgba(255,205,0,0.7); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px; }
  .client-info .value { font-size: 14px; font-weight: 600; color: #FFCD00; }
  .submit-btn { width: 100%; padding: 14px; margin-top: 18px; background: linear-gradient(135deg, #DA251D, #B71C12); color: #fff; border: none; border-radius: 14px; font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.18s; letter-spacing: 0.02em; }
  .submit-btn:hover { background: linear-gradient(135deg, #E63329, #C81D14); transform: translateY(-1px); }
  .cancel-link { display: block; text-align: center; margin-top: 14px; font-size: 12px; color: rgba(255,255,255,0.5); text-decoration: none; }
  .cancel-link:hover { color: rgba(255,255,255,0.8); }
  .user-card:hover { border-color: rgba(255,205,0,0.4); background: rgba(255,255,255,0.06); }
  input[type=radio]:checked + .user-card { border-color: #FFCD00; background: rgba(255,205,0,0.08); }
  input[type=radio]:checked + .user-card .chev { stroke: #FFCD00; }
  .footer { margin-top: 26px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center; font-size: 11px; color: rgba(255,255,255,0.35); }
</style>
</head>
<body>
  <div class="mock-banner">⚠ Phiên bản mô phỏng VNeID — chỉ dùng cho dev/test</div>
  <div class="container">
    <div class="header">
      <div class="vneid-logo">
        <svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="0" fill="#DA251D"/><polygon points="24,8 27.5,18.5 38.5,18.5 29.5,25 33,35.5 24,29 15,35.5 18.5,25 9.5,18.5 20.5,18.5" fill="#FFCD00"/></svg>
      </div>
      <div>
        <div class="brand-name">VNeID</div>
        <div class="brand-sub">Định danh điện tử quốc gia</div>
      </div>
    </div>

    ${errorHtml}

    <h1>Xác nhận đăng nhập</h1>
    <p class="desc">Ứng dụng dưới đây yêu cầu truy cập thông tin định danh cá nhân của bạn.</p>

    <div class="client-info">
      <div class="label">Ứng dụng yêu cầu</div>
      <div class="value">${htmlEscape(clientId)}</div>
    </div>

    <form method="POST" action="${PUBLIC_PREFIX}/authorize/select">
      <input type="hidden" name="client_id" value="${htmlEscape(clientId)}" />
      <input type="hidden" name="redirect_uri" value="${htmlEscape(redirectUri)}" />
      <input type="hidden" name="state" value="${htmlEscape(state || '')}" />

      <div style="font-size:11px;color:rgba(255,255,255,0.45);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:10px">Chọn danh tính để xác thực</div>
      ${userCards}

      <button type="submit" class="submit-btn">
        Đồng ý chia sẻ thông tin
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
      </button>
      <a href="${htmlEscape(redirectUri)}?error=access_denied&state=${encodeURIComponent(state || '')}" class="cancel-link">Hủy bỏ</a>
    </form>

    <div class="footer">
      Thông tin chia sẻ: Số định danh, Họ tên, Ngày sinh, Giới tính, Quê quán.
    </div>
  </div>
</body>
</html>`;
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS for /token, /userinfo (allow VNTrust origin)
app.use((req, res, next) => {
  res.setHeader('X-Mock-VNeID', '1');
  if (req.path === '/token' || req.path === '/userinfo') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
  }
  next();
});

app.get('/healthz', (req, res) => res.json({ ok: true, ts: Date.now() }));

app.get('/.well-known/openid-configuration', (req, res) => {
  res.json({
    issuer: ISSUER,
    authorization_endpoint: `${ISSUER}/authorize`,
    token_endpoint: `${ISSUER}/token`,
    userinfo_endpoint: `${ISSUER}/userinfo`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
    id_token_signing_alg_values_supported: ['HS256'],
    scopes_supported: ['openid', 'profile'],
    claims_supported: ['sub', 'name', 'birthdate', 'gender', 'address'],
  });
});

app.get('/authorize', (req, res) => {
  const { client_id, redirect_uri, state, response_type } = req.query;
  if (!client_id || !redirect_uri) {
    return res.status(400).send('Thiếu client_id hoặc redirect_uri');
  }
  const client = CLIENTS[client_id];
  if (!client) {
    return res.status(400).send('Client không hợp lệ');
  }
  if (!client.redirect_uris.includes(redirect_uri)) {
    return res.status(400).send('redirect_uri không nằm trong whitelist của client');
  }
  if (response_type && response_type !== 'code') {
    return res.status(400).send('Chỉ hỗ trợ response_type=code');
  }
  res.set('Cache-Control', 'no-store');
  res.send(renderAuthorize({ clientId: client_id, redirectUri: redirect_uri, state }));
});

app.post('/authorize/select', (req, res) => {
  const { user_index, client_id, redirect_uri, state } = req.body;
  const idx = parseInt(user_index, 10);
  if (isNaN(idx) || !USERS[idx]) {
    return res.status(400).send('Người dùng không hợp lệ');
  }
  const client = CLIENTS[client_id];
  if (!client || !client.redirect_uris.includes(redirect_uri)) {
    return res.status(400).send('Client hoặc redirect_uri không hợp lệ');
  }
  const code = crypto.randomBytes(24).toString('hex');
  codeStore.set(code, {
    userIndex: idx,
    redirect_uri,
    client_id,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });
  const url = new URL(redirect_uri);
  url.searchParams.set('code', code);
  if (state) url.searchParams.set('state', state);
  res.redirect(url.toString());
});

app.post('/token', (req, res) => {
  const { grant_type, code, client_id, client_secret, redirect_uri } = req.body;
  if (grant_type !== 'authorization_code') {
    return res.status(400).json({ error: 'unsupported_grant_type' });
  }
  if (!code || !client_id) {
    return res.status(400).json({ error: 'invalid_request' });
  }
  const client = CLIENTS[client_id];
  if (!client) {
    return res.status(401).json({ error: 'invalid_client' });
  }
  // Client_secret optional cho mock (nhưng verify nếu gửi)
  if (client_secret && client_secret !== client.secret) {
    return res.status(401).json({ error: 'invalid_client', error_description: 'wrong client_secret' });
  }
  const entry = codeStore.get(code);
  if (!entry) return res.status(400).json({ error: 'invalid_grant', error_description: 'code không tồn tại hoặc đã dùng' });
  if (entry.expiresAt < Date.now()) {
    codeStore.delete(code);
    return res.status(400).json({ error: 'invalid_grant', error_description: 'code đã hết hạn' });
  }
  if (entry.client_id !== client_id || entry.redirect_uri !== redirect_uri) {
    return res.status(400).json({ error: 'invalid_grant', error_description: 'code không khớp client/redirect_uri' });
  }
  codeStore.delete(code); // single-use

  const user = USERS[entry.userIndex];
  const access_token = jwt.sign({
    sub: user.soDinhDanh,
    name: user.hoTen,
    birthdate: user.ngaySinh,
    gender: user.gioiTinh,
    address: { locality: user.queQuan, formatted: user.diaChiThuongTru },
    iss: ISSUER,
    aud: client_id,
  }, SECRET, { algorithm: 'HS256', expiresIn: '1h' });

  res.json({
    access_token,
    token_type: 'Bearer',
    expires_in: 3600,
    scope: 'openid profile',
  });
});

app.get('/userinfo', (req, res) => {
  const auth = req.headers.authorization || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return res.status(401).json({ error: 'invalid_token', error_description: 'missing Bearer' });
  try {
    const payload = jwt.verify(m[1], SECRET, { issuer: ISSUER });
    res.json({
      soDinhDanh: payload.sub,
      hoTen: payload.name,
      ngaySinh: payload.birthdate,
      gioiTinh: payload.gender,
      queQuan: payload.address && payload.address.locality,
      diaChiThuongTru: payload.address && payload.address.formatted,
      quocTich: 'Việt Nam',
    });
  } catch (e) {
    res.status(401).json({ error: 'invalid_token', error_description: e.message });
  }
});

app.get('/', (req, res) => {
  res.type('text/plain').send([
    'Mock VNeID OAuth2 server',
    '',
    `Issuer:       ${ISSUER}`,
    `Public prefix: ${PUBLIC_PREFIX}`,
    `Port:         ${PORT}`,
    '',
    'Endpoints:',
    `  GET  ${PUBLIC_PREFIX}/authorize`,
    `  POST ${PUBLIC_PREFIX}/authorize/select`,
    `  POST ${PUBLIC_PREFIX}/token`,
    `  GET  ${PUBLIC_PREFIX}/userinfo`,
    `  GET  ${PUBLIC_PREFIX}/healthz`,
    `  GET  ${PUBLIC_PREFIX}/.well-known/openid-configuration`,
  ].join('\n'));
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[mock-vneid] listening on 127.0.0.1:${PORT}`);
  console.log(`[mock-vneid] issuer: ${ISSUER}`);
  console.log(`[mock-vneid] users: ${USERS.length}`);
});
