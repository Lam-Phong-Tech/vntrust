const fs = require('fs');

const CTX = 'D:/Web hang gia/vntrust/src/contexts/LanguageContext.tsx';
const LOGIN = 'D:/Web hang gia/vntrust/src/app/login/page.tsx';
const NAVBAR = 'D:/Web hang gia/vntrust/src/components/Navbar.tsx';
const UID = 'D:/Web hang gia/vntrust/src/app/verify/[uid]/page.tsx';
const VMAP = 'D:/Web hang gia/vntrust/src/components/VietnamMap.tsx';

// ─── 1. Thêm keys mới vào LanguageContext ─────────────────────────────────────
let ctx = fs.readFileSync(CTX, 'utf8');

const NEW_KEYS = `
  // ── Login Page Extended ──
  login_system_desc: { vi: "Hệ thống xác thực thông minh", en: "Smart Verification System", zh: "智能验证系统", ja: "スマート認証システム", ko: "스마트 인증 시스템", fr: "Système de vérification intelligent" },
  login_enter_info:  { vi: "Nhập thông tin tài khoản để truy cập", en: "Enter your credentials to access", zh: "输入您的账户信息以访问", ja: "アクセスするための認証情報を入力してください", ko: "액세스하려면 자격 증명을 입력하세요", fr: "Saisissez vos identifiants pour accéder" },
  login_email_phone: { vi: "Email / Số điện thoại", en: "Email / Phone", zh: "电子邮件 / 手机号", ja: "メール / 電話番号", ko: "이메일 / 전화번호", fr: "Email / Téléphone" },
  login_ph_email:    { vi: "Email hoặc số điện thoại", en: "Email or phone number", zh: "电子邮件或手机号", ja: "メールまたは電話番号", ko: "이메일 또는 전화번호", fr: "Email ou numéro de téléphone" },
  login_ph_pass:     { vi: "Nhập mật khẩu", en: "Enter password", zh: "输入密码", ja: "パスワードを入力", ko: "비밀번호 입력", fr: "Saisir le mot de passe" },
  login_btn_login:   { vi: "ĐĂNG NHẬP", en: "LOGIN", zh: "登录", ja: "ログイン", ko: "로그인", fr: "CONNEXION" },
  login_no_account:  { vi: "Chưa có tài khoản?", en: "Don't have an account?", zh: "还没有账户？", ja: "アカウントをお持ちでないですか？", ko: "계정이 없으신가요?", fr: "Vous n'avez pas de compte?" },
  login_register_now:{ vi: "Đăng ký ngay", en: "Register now", zh: "立即注册", ja: "今すぐ登録", ko: "지금 등록", fr: "S'inscrire maintenant" },
  reg_title:         { vi: "Đăng ký tài khoản", en: "Create Account", zh: "创建账户", ja: "アカウント作成", ko: "계정 만들기", fr: "Créer un compte" },
  reg_sub:           { vi: "Tham gia hệ thống VNTrust", en: "Join the VNTrust system", zh: "加入VNTrust系统", ja: "VNTrustシステムに参加", ko: "VNTrust 시스템에 참여하세요", fr: "Rejoignez le système VNTrust" },
  reg_name:          { vi: "Họ và tên", en: "Full Name", zh: "姓名", ja: "氏名", ko: "성명", fr: "Nom complet" },
  reg_ph_name:       { vi: "Nhập họ và tên", en: "Enter full name", zh: "输入姓名", ja: "氏名を入力", ko: "성명 입력", fr: "Entrez votre nom complet" },
  reg_ph_email:      { vi: "Địa chỉ email", en: "Email address", zh: "电子邮件地址", ja: "メールアドレス", ko: "이메일 주소", fr: "Adresse email" },
  reg_phone:         { vi: "Số điện thoại", en: "Phone Number", zh: "手机号码", ja: "電話番号", ko: "전화번호", fr: "Numéro de téléphone" },
  reg_role:          { vi: "Vai trò đăng ký", en: "Registration Role", zh: "注册角色", ja: "登録役割", ko: "등록 역할", fr: "Rôle d'inscription" },
  reg_role_choose:   { vi: "Chọn vai trò của bạn", en: "Choose your role", zh: "选择您的角色", ja: "役割を選択してください", ko: "역할을 선택하세요", fr: "Choisissez votre rôle" },
  reg_role_mfr:      { vi: "Nhà sản xuất", en: "Manufacturer", zh: "制造商", ja: "製造業者", ko: "제조업체", fr: "Fabricant" },
  reg_role_imp:      { vi: "Nhà nhập khẩu", en: "Importer", zh: "进口商", ja: "輸入業者", ko: "수입업체", fr: "Importateur" },
  reg_role_con:      { vi: "Người tiêu dùng", en: "Consumer", zh: "消费者", ja: "消費者", ko: "소비자", fr: "Consommateur" },
  reg_ph_pass:       { vi: "Tạo mật khẩu (tối thiểu 6 ký tự)", en: "Create password (min 6 chars)", zh: "创建密码（最少6个字符）", ja: "パスワードを作成（最低6文字）", ko: "비밀번호 만들기 (최소 6자)", fr: "Créer un mot de passe (min 6 caractères)" },
  reg_btn:           { vi: "ĐĂNG KÝ", en: "REGISTER", zh: "注册", ja: "登録", ko: "등록", fr: "S'INSCRIRE" },
  forgot_title:      { vi: "Quên mật khẩu", en: "Forgot Password", zh: "忘记密码", ja: "パスワードを忘れた", ko: "비밀번호 찾기", fr: "Mot de passe oublié" },
  forgot_sub:        { vi: "Khôi phục truy cập tài khoản", en: "Recover account access", zh: "恢复账户访问", ja: "アカウントへのアクセスを回復", ko: "계정 접근 복구", fr: "Récupérer l'accès au compte" },
  forgot_desc:       { vi: "Vui lòng nhập địa chỉ email đã đăng ký. Chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.", en: "Please enter your registered email. We will send password reset instructions.", zh: "请输入您注册的电子邮件。我们将发送密码重置说明。", ja: "登録済みメールアドレスを入力してください。パスワードリセット手順を送信します。", ko: "등록된 이메일을 입력하세요. 비밀번호 재설정 안내를 보내드립니다.", fr: "Entrez votre email enregistré. Nous enverrons les instructions de réinitialisation." },
  forgot_label:      { vi: "Email hoặc Số điện thoại", en: "Email or Phone Number", zh: "电子邮件或手机号", ja: "メールまたは電話番号", ko: "이메일 또는 전화번호", fr: "Email ou numéro de téléphone" },
  forgot_ph:         { vi: "Nhập email hoặc số điện thoại", en: "Enter email or phone number", zh: "输入电子邮件或手机号", ja: "メールまたは電話番号を入力", ko: "이메일 또는 전화번호 입력", fr: "Saisir email ou numéro de téléphone" },
  forgot_btn:        { vi: "GỬI YÊU CẦU", en: "SEND REQUEST", zh: "发送请求", ja: "リクエスト送信", ko: "요청 보내기", fr: "ENVOYER LA DEMANDE" },
  demo_label:        { vi: "Tài khoản DEMO", en: "DEMO Accounts", zh: "演示账户", ja: "デモアカウント", ko: "데모 계정", fr: "Comptes DÉMO" },
  demo_mfr:          { vi: "Nhà sản xuất", en: "Manufacturer", zh: "制造商", ja: "製造業者", ko: "제조업체", fr: "Fabricant" },
  demo_imp:          { vi: "Nhà nhập khẩu", en: "Importer", zh: "进口商", ja: "輸入業者", ko: "수입업체", fr: "Importateur" },
  demo_con:          { vi: "Người tiêu dùng", en: "Consumer", zh: "消费者", ja: "消費者", ko: "소비자", fr: "Consommateur" },
  demo_admin:        { vi: "Quản trị hệ thống", en: "System Admin", zh: "系统管理员", ja: "システム管理者", ko: "시스템 관리자", fr: "Admin système" },
  login_back_home:   { vi: "Quay lại Trang chủ", en: "Back to Home", zh: "返回首页", ja: "ホームに戻る", ko: "홈으로 돌아가기", fr: "Retour à l'accueil" },
  login_err_pass:    { vi: "Sai tên đăng nhập hoặc mật khẩu!", en: "Incorrect username or password!", zh: "用户名或密码不正确！", ja: "ユーザー名またはパスワードが正しくありません！", ko: "사용자 이름 또는 비밀번호가 잘못되었습니다!", fr: "Identifiant ou mot de passe incorrect!" },
  login_err_reg:     { vi: "Đăng ký thất bại!", en: "Registration failed!", zh: "注册失败！", ja: "登録に失敗しました！", ko: "등록 실패!", fr: "Échec de l'inscription!" },
  login_phone_dup:   { vi: "Số điện thoại này đã được đăng ký", en: "This phone number is already registered", zh: "此手机号已被注册", ja: "この電話番号はすでに登録されています", ko: "이 전화번호는 이미 등록되어 있습니다", fr: "Ce numéro de téléphone est déjà enregistré" },
  login_phone_invalid:{ vi: "Số điện thoại không hợp lệ (định dạng: 0xxxxxxxxx)", en: "Invalid phone number (format: 0xxxxxxxxx)", zh: "手机号无效（格式：0xxxxxxxxx）", ja: "電話番号が無効です（形式：0xxxxxxxxx）", ko: "전화번호가 잘못되었습니다 (형식: 0xxxxxxxxx)", fr: "Numéro de téléphone invalide (format: 0xxxxxxxxx)" },

  // ── Navbar Chat hardcoded ──
  nav_chat_limit:    { vi: "Vượt quá giới hạn", en: "Exceeds limit", zh: "超出限制", ja: "制限を超えています", ko: "제한 초과", fr: "Dépasse la limite" },
  nav_chat_chars:    { vi: "ký tự", en: "characters", zh: "个字符", ja: "文字", ko: "자", fr: "caractères" },
  nav_chat_connfail: { vi: "Không thể kết nối hệ thống xác thực. Vui lòng thử lại sau.", en: "Cannot connect to verification system. Please try again later.", zh: "无法连接到验证系统，请稍后重试。", ja: "認証システムに接続できません。後でもう一度お試しください。", ko: "인증 시스템에 연결할 수 없습니다. 나중에 다시 시도하세요.", fr: "Impossible de se connecter au système de vérification. Veuillez réessayer." },
  nav_chat_notfound: { vi: "không có trong hệ thống! Có thể là hàng giả!", en: "not found in the system! May be counterfeit!", zh: "系统中未找到！可能是假冒品！", ja: "システムに見つかりません！偽造品の可能性があります！", ko: "시스템에서 찾을 수 없습니다! 위조품일 수 있습니다!", fr: "introuvable dans le système ! Peut être contrefait !" },
  nav_app_platform:  { vi: "Tải trên", en: "Download on", zh: "下载于", ja: "ダウンロード", ko: "다운로드", fr: "Télécharger sur" },
  nav_app_version:   { vi: "Phiên bản 2.4.1 · iOS 14+ · Android 8+", en: "Version 2.4.1 · iOS 14+ · Android 8+", zh: "版本 2.4.1 · iOS 14+ · Android 8+", ja: "バージョン 2.4.1 · iOS 14+ · Android 8+", ko: "버전 2.4.1 · iOS 14+ · Android 8+", fr: "Version 2.4.1 · iOS 14+ · Android 8+" },

  // ── VietnamMap ──
  vmap_scans:        { vi: "lượt quét", en: "scans", zh: "次扫描", ja: "回スキャン", ko: "스캔", fr: "scans" },
  vmap_warnings:     { vi: "cảnh báo giả", en: "fake warnings", zh: "假冒警告", ja: "偽造警告", ko: "위조 경고", fr: "alertes faux" },
  vmap_safe:         { vi: "An toàn", en: "Safe", zh: "安全", ja: "安全", ko: "안전", fr: "Sûr" },
  vmap_province:     { vi: "Tỉnh/Thành phố • Việt Nam", en: "Province/City • Vietnam", zh: "省/市 • 越南", ja: "省/市 • ベトナム", ko: "성/시 • 베트남", fr: "Province/Ville • Vietnam" },

  // ── verify/[uid] ──
  vuid_gps_label:    { vi: "Vị trí GPS", en: "GPS Location", zh: "GPS位置", ja: "GPS位置情報", ko: "GPS 위치", fr: "Position GPS" },
  vuid_fetching:     { vi: "Đang lấy vị trí...", en: "Fetching location...", zh: "正在获取位置...", ja: "位置情報を取得中...", ko: "위치 가져오는 중...", fr: "Récupération de la position..." },
  vuid_location_fail:{ vi: "Không xác định được vị trí", en: "Unable to determine location", zh: "无法确定位置", ja: "位置情報を特定できません", ko: "위치를 확인할 수 없습니다", fr: "Impossible de déterminer la position" },
`;

// Chèn vào trước dòng }; cuối cùng
ctx = ctx.replace(/\n};\s*\n\nexport function t/, '\n' + NEW_KEYS + '\n};\n\nexport function t');
fs.writeFileSync(CTX, ctx, 'utf8');
console.log('✅ LanguageContext updated');

// ─── 2. Patch Login Page ──────────────────────────────────────────────────────
let login = fs.readFileSync(LOGIN, 'utf8');

// Thêm useLanguage import nếu chưa có
if (!login.includes('useLanguage')) {
  login = login.replace(
    `import Link from "next/link";`,
    `import Link from "next/link";\nimport { useLanguage } from "@/contexts/LanguageContext";`
  );
}

// Thêm const { t, lang } = useLanguage(); vào đầu component
if (!login.includes('useLanguage()')) {
  login = login.replace(
    `export default function LoginPage() {`,
    `export default function LoginPage() {\n  const { t, lang } = useLanguage();`
  );
}

// Phone validation error
login = login.replace(
  `return "Số điện thoại không hợp lệ (định dạng: 0xxxxxxxxx, 10 chữ số)";`,
  `return t("login_phone_invalid");`
);

// Toast errors
login = login.replace(
  `showToast(data.error || "Sai tên đăng nhập hoặc mật khẩu!", "error");`,
  `showToast(data.error || t("login_err_pass"), "error");`
);
login = login.replace(
  `setRegPhoneError("Số điện thoại này đã được đăng ký");`,
  `setRegPhoneError(t("login_phone_dup"));`
);
login = login.replace(
  `showToast(data.error || "Đăng ký thất bại!", "error");`,
  `showToast(data.error || t("login_err_reg"), "error");`
);

// UI text
const loginReplacements = [
  [`>Hệ thống xác thực thông minh<`, `>{t("login_system_desc")}<`],
  [`>Đăng nhập<`, `>{t("login_title")}<`],
  [`>Nhập thông tin tài khoản để truy cập<`, `>{t("login_enter_info")}<`],
  [`>Email / Số điện thoại<`, `>{t("login_email_phone")}<`],
  [`placeholder="Email hoặc số điện thoại"`, `placeholder={t("login_ph_email")}`],
  [`>Mật khẩu<`, `>{t("login_pass")}<`],
  [`placeholder="Nhập mật khẩu"`, `placeholder={t("login_ph_pass")}`],
  [`>ĐĂNG NHẬP <span`, `>{t("login_btn_login")} <span`],
  [`Quên mật khẩu?`, `{t("login_forgot")}`],
  [`Chưa có tài khoản? <button onClick={() => setView("register")} className="text-cyan-400 font-medium hover:underline">Đăng ký ngay</button>`, `{t("login_no_account")} <button onClick={() => setView("register")} className="text-cyan-400 font-medium hover:underline">{t("login_register_now")}</button>`],
  [`>Đăng ký tài khoản<`, `>{t("reg_title")}<`],
  [`>Tham gia hệ thống VNTrust<`, `>{t("reg_sub")}<`],
  [`>Họ và tên<`, `>{t("reg_name")}<`],
  [`placeholder="Nhập họ và tên"`, `placeholder={t("reg_ph_name")}`],
  [`placeholder="Địa chỉ email"`, `placeholder={t("reg_ph_email")}`],
  [`>Số điện thoại<`, `>{t("reg_phone")}<`],
  [`>Vai trò đăng ký<`, `>{t("reg_role")}<`],
  [`<option value="">Chọn vai trò của bạn</option>`, `<option value="">{t("reg_role_choose")}</option>`],
  [`<option value="manufacturer">Nhà sản xuất</option>`, `<option value="manufacturer">{t("reg_role_mfr")}</option>`],
  [`<option value="importer">Nhà nhập khẩu</option>`, `<option value="importer">{t("reg_role_imp")}</option>`],
  [`<option value="consumer">Người tiêu dùng</option>`, `<option value="consumer">{t("reg_role_con")}</option>`],
  [`placeholder="Tạo mật khẩu (tối thiểu 6 ký tự)"`, `placeholder={t("reg_ph_pass")}`],
  [`>ĐĂNG KÝ <span`, `>{t("reg_btn")} <span`],
  [`>Quên mật khẩu<`, `>{t("forgot_title")}<`],
  [`>Khôi phục truy cập tài khoản<`, `>{t("forgot_sub")}<`],
  [`Vui lòng nhập địa chỉ email hoặc số điện thoại đã đăng ký. Chúng tôi sẽ gửi cho bạn hướng dẫn để đặt lại mật khẩu.`, `{t("forgot_desc")}`],
  [`>Email hoặc Số điện thoại<`, `>{t("forgot_label")}<`],
  [`placeholder="Nhập email hoặc số điện thoại"`, `placeholder={t("forgot_ph")}`],
  [`>GỬI YÊU CẦU <span`, `>{t("forgot_btn")} <span`],
  [`>Tài khoản DEMO<`, `>{t("demo_label")}<`],
  [`>Nhà sản xuất<`, `>{t("demo_mfr")}<`],
  [`>Nhà nhập khẩu<`, `>{t("demo_imp")}<`],
  [`>Người tiêu dùng<`, `>{t("demo_con")}<`],
  [`>Quản trị hệ thống<`, `>{t("demo_admin")}<`],
  [`Quay lại Trang chủ`, `{t("login_back_home")}`],
];

for (const [old, neu] of loginReplacements) {
  if (login.includes(old)) {
    login = login.replace(old, neu);
  } else {
    console.log('WARN login skip:', old.substring(0, 40));
  }
}
fs.writeFileSync(LOGIN, login, 'utf8');
console.log('✅ login/page.tsx updated');

// ─── 3. Patch Navbar Chat hardcodes ──────────────────────────────────────────
let nav = fs.readFileSync(NAVBAR, 'utf8');

nav = nav.replace(
  '`⚠️ Vượt quá giới hạn ${MAX_CHAT_LEN} ký tự.`',
  '`⚠️ ${t("nav_chat_limit")} ${MAX_CHAT_LEN} ${t("nav_chat_chars")}.`'
);
nav = nav.replace(
  '`⚠️ Tin nhắn vượt quá ${MAX_CHAT_LEN} ký tự.`',
  '`⚠️ ${t("nav_chat_limit")} ${MAX_CHAT_LEN} ${t("nav_chat_chars")}.`'
);
nav = nav.replace(
  `"✅ Chính hãng" : data.status === "expired" ? "⏰ Đã hết hạn" : "⚠️ Nghi ngờ làm giả"`,
  `t("vuid_5") : data.status === "expired" ? t("vuid_9") : t("vuid_8")`
);
nav = nav.replace(
  `} catch { reply = "⚠️ Không thể kết nối hệ thống xác thực. Vui lòng thử lại sau."; }`,
  `} catch { reply = "⚠️ " + t("nav_chat_connfail"); }`
);
nav = nav.replace(
  `>Tải trên</p>`,
  `>{t("nav_app_platform")}</p>`
);
nav = nav.replace(
  `Phiên bản 2.4.1 · iOS 14+ · Android 8+`,
  `{t("nav_app_version")}`
);
// Fix "Tiếng Việt" fallback
nav = nav.replace(
  `{LANGS.find(l => l.code === lang)?.name ?? 'Tiếng Việt'}`,
  `{LANGS.find(l => l.code === lang)?.name ?? 'VN'}`
);

fs.writeFileSync(NAVBAR, nav, 'utf8');
console.log('✅ Navbar.tsx updated');

// ─── 4. Patch VietnamMap ─────────────────────────────────────────────────────
let vmap = fs.readFileSync(VMAP, 'utf8');
if (!vmap.includes('useLanguage')) {
  vmap = vmap.replace(
    `"use client";`,
    `"use client";\nimport { useLanguage } from "@/contexts/LanguageContext";`
  );
}
// Add hook inside component function - find first function/export
if (!vmap.includes('useLanguage()')) {
  vmap = vmap.replace(
    /export default function (\w+)\(\) \{/,
    `export default function $1() {\n  const { t } = useLanguage();`
  );
}
vmap = vmap.replace(
  `>Tỉnh/Thành phố • Việt Nam</text>`,
  `>{t("vmap_province")}</text>`
);
vmap = vmap.replace(
  '`} lượt quét`',
  '`} ${t("vmap_scans")}`'
);
vmap = vmap.replace(
  '{m.scans.toLocaleString()} lượt quét',
  `{m.scans.toLocaleString()} {t("vmap_scans")}`
);
vmap = vmap.replace(
  '`⚠ ${m.fake} cảnh báo giả`',
  '`⚠ ${m.fake} ${t("vmap_warnings")}`'
);
vmap = vmap.replace(
  `"✓ An toàn"`,
  `"✓ " + t("vmap_safe")`
);

fs.writeFileSync(VMAP, vmap, 'utf8');
console.log('✅ VietnamMap.tsx updated');

// ─── 5. Patch verify/[uid] ───────────────────────────────────────────────────
let uid = fs.readFileSync(UID, 'utf8');

uid = uid.replace(`let city = 'Vị trí GPS';`, `let city = t("vuid_gps_label");`);
uid = uid.replace(`>Đang lấy vị trí...<`, `>{t("vuid_fetching")}<`);
uid = uid.replace(`>Không xác định được vị trí<`, `>{t("vuid_location_fail")}<`);

fs.writeFileSync(UID, uid, 'utf8');
console.log('✅ verify/[uid]/page.tsx updated');

console.log('\n🎉 Tất cả file đã được patch!');
