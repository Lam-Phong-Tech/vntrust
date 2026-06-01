const fs = require('fs');
const path = require('path');

const NEW_KEYS = `
  // ── Navbar Modals ──
  nav_chat_title:    { vi: "VNTrust AI Assistant", en: "VNTrust AI Assistant", zh: "VNTrust AI 助手", ja: "VNTrust AI アシスタント", ko: "VNTrust AI 어시스턴트", fr: "Assistant IA VNTrust" },
  nav_chat_placeholder: { vi: "Hỏi VNTrust AI...", en: "Ask VNTrust AI...", zh: "询问 VNTrust AI...", ja: "VNTrust AI に質問...", ko: "VNTrust AI에게 질문하세요...", fr: "Demandez à l'IA VNTrust..." },
  nav_lang_title:    { vi: "Ngôn Ngữ Hệ Thống", en: "System Language", zh: "系统语言", ja: "システム言語", ko: "시스템 언어", fr: "Langue du système" },
  nav_app_title:     { vi: "Tải App VNTrust", en: "Download VNTrust App", zh: "下载 VNTrust 应用", ja: "VNTrust アプリをダウンロード", ko: "VNTrust 앱 다운로드", fr: "Télécharger l'application VNTrust" },
  nav_app_desc:      { vi: "Quét mã QR để cài đặt ứng dụng VNTrust trên thiết bị di động. Hỗ trợ iOS và Android.", en: "Scan the QR code to install the VNTrust app on your mobile device. Supports iOS and Android.", zh: "扫描二维码在移动设备上安装 VNTrust 应用程序。支持 iOS 和 Android。", ja: "QRコードをスキャンしてモバイルデバイスに VNTrust アプリをインストールします。iOSとAndroidをサポート。", ko: "QR 코드를 스캔하여 모바일 기기에 VNTrust 앱을 설치하세요. iOS 및 Android 지원.", fr: "Scannez le code QR pour installer l'application VNTrust sur votre appareil mobile. Prend en charge iOS et Android." },
  nav_profile_logout:{ vi: "Đăng xuất", en: "Logout", zh: "登出", ja: "ログアウト", ko: "로그아웃", fr: "Déconnexion" },

  // ── Inventory Page ──
  inv_title:         { vi: "Quản lý Kho hàng", en: "Inventory Management", zh: "库存管理", ja: "在庫管理", ko: "재고 관리", fr: "Gestion des stocks" },
  inv_sub:           { vi: "Sản phẩm & Lô hàng", en: "Products & Batches", zh: "产品和批次", ja: "製品とバッチ", ko: "제품 및 배치", fr: "Produits et lots" },
  inv_seed:          { vi: "Khởi tạo dữ liệu mẫu", en: "Initialize Sample Data", zh: "初始化样本数据", ja: "サンプルデータの初期化", ko: "샘플 데이터 초기화", fr: "Initialiser les données d'échantillon" },
  inv_sync:          { vi: "Đồng bộ Tem QR", en: "Sync QR Stamps", zh: "同步QR码", ja: "QRスタンプを同期", ko: "QR 스탬프 동기화", fr: "Synchroniser les timbres QR" },
  inv_add_product:   { vi: "Sản phẩm mới", en: "New Product", zh: "新产品", ja: "新製品", ko: "새 제품", fr: "Nouveau produit" },
  inv_add_batch:     { vi: "Tạo Lô Hàng", en: "Create Batch", zh: "创建批次", ja: "バッチを作成", ko: "배치 생성", fr: "Créer un lot" },
  inv_col_sp:        { vi: "Sản phẩm", en: "Product", zh: "产品", ja: "製品", ko: "제품", fr: "Produit" },
  inv_col_lohang:    { vi: "Thông tin Lô", en: "Batch Info", zh: "批次信息", ja: "バッチ情報", ko: "배치 정보", fr: "Infos du lot" },
  inv_col_qty:       { vi: "Số lượng", en: "Quantity", zh: "数量", ja: "数量", ko: "수량", fr: "Quantité" },
  inv_col_qr:        { vi: "Tem QR", en: "QR Stamps", zh: "QR码", ja: "QRスタンプ", ko: "QR 스탬프", fr: "Timbres QR" },
  inv_col_status:    { vi: "Trạng thái", en: "Status", zh: "状态", ja: "ステータス", ko: "상태", fr: "Statut" },
  inv_col_actions:   { vi: "Thao tác", en: "Actions", zh: "操作", ja: "アクション", ko: "작업", fr: "Actions" },
  inv_status_valid:  { vi: "Hợp lệ", en: "Valid", zh: "有效", ja: "有効", ko: "유효함", fr: "Valide" },
  inv_status_exp:    { vi: "Hết hạn", en: "Expired", zh: "已过期", ja: "期限切れ", ko: "만료됨", fr: "Expiré" },
  inv_empty:         { vi: "Chưa có lô hàng nào", en: "No batches yet", zh: "暂无批次", ja: "まだバッチがありません", ko: "아직 배치가 없습니다", fr: "Aucun lot pour le moment" },
  inv_view_qr:       { vi: "Xem danh sách mã QR", en: "View QR list", zh: "查看QR码列表", ja: "QRコードリストを表示", ko: "QR 목록 보기", fr: "Voir la liste des QR" },
  
  // ── Login Page ──
  login_title:       { vi: "Đăng nhập", en: "Login", zh: "登录", ja: "ログイン", ko: "로그인", fr: "Connexion" },
  login_sub:         { vi: "Đăng nhập để vào bảng điều khiển", en: "Login to access the dashboard", zh: "登录以访问仪表板", ja: "ダッシュボードにアクセスするにはログインしてください", ko: "대시보드에 액세스하려면 로그인하세요", fr: "Connectez-vous pour accéder au tableau de bord" },
  login_user:        { vi: "Email hoặc Tên đăng nhập", en: "Email or Username", zh: "电子邮件或用户名", ja: "メールまたはユーザー名", ko: "이메일 또는 사용자 이름", fr: "Email ou nom d'utilisateur" },
  login_pass:        { vi: "Mật khẩu", en: "Password", zh: "密码", ja: "パスワード", ko: "비밀번호", fr: "Mot de passe" },
  login_btn:         { vi: "Đăng nhập Hệ thống", en: "Login to System", zh: "登录系统", ja: "システムにログイン", ko: "시스템에 로그인", fr: "Connexion au système" },
  login_register:    { vi: "Tạo tài khoản mới", en: "Create a new account", zh: "创建新账户", ja: "新しいアカウントを作成", ko: "새 계정 만들기", fr: "Créer un nouveau compte" },
  login_forgot:      { vi: "Quên mật khẩu?", en: "Forgot password?", zh: "忘记密码？", ja: "パスワードをお忘れですか？", ko: "비밀번호를 잊으셨나요?", fr: "Mot de passe oublié ?" },
`;

const ctxPath = path.join(__dirname, 'src/contexts/LanguageContext.tsx');
let ctxContent = fs.readFileSync(ctxPath, 'utf8');

// Chỉ thêm nếu chưa tồn tại
if (!ctxContent.includes('nav_chat_title')) {
  const insertIndex = ctxContent.lastIndexOf('\n};');
  if (insertIndex !== -1) {
    ctxContent = ctxContent.slice(0, insertIndex) + NEW_KEYS + ctxContent.slice(insertIndex);
    fs.writeFileSync(ctxPath, ctxContent);
    console.log("Added new translation keys successfully.");
  }
} else {
  console.log("Keys already exist.");
}
