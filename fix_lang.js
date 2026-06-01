const fs = require('fs');

const filePath = 'D:/Web hang gia/vntrust/src/contexts/LanguageContext.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const translations = {
  vuid_0:  ['San pham khong xac dinh','Unknown Product','未知产品','不明な製品','알 수 없는 제품','Produit inconnu'],
  vuid_1:  ['Khong co mo ta','No description','暂无描述','説明なし','설명 없음','Pas de description'],
  vuid_2:  ['Canh bao: Hang gia','Warning: Counterfeit','警告：假冒品','警告：偽造品','경고: 위조품','Avertissement : Contrefacon'],
  vuid_3:  ['Canh bao: Het han','Warning: Expired','警告：已过期','警告：期限切れ','경고: 만료됨','Avertissement : Expire'],
  vuid_4:  ['Bat thuong Bao mat','Security Anomaly','安全异常','セキュリティ異常','보안 이상','Anomalie de securite'],
  vuid_5:  ['Xac thuc Chinh hang','Authentic Verified','正品认证','正規品認証済み','정품 인증됨','Authentique verifie'],
  vuid_6:  ['Ma:','Code:','编码：','コード：','코드:','Code :'],
  vuid_7:  ['Tai san Khong hop le','Invalid Asset','无效资产','無効な資産','유효하지 않은 자산','Actif invalide'],
  vuid_8:  ['Hoat dong Dang ngo','Suspicious Activity','可疑活动','疑わしい活動','의심스러운 활동','Activite suspecte'],
  vuid_9:  ['San pham Het han','Expired Product','已过期产品','期限切れ製品','만료된 제품','Produit expire'],
  vuid_10: ['San pham nay khong ton tai tren so cai blockchain. Day co the la hang gia.','This product does not exist on the blockchain ledger. It may be counterfeit.','该产品不在区块链账本中，可能是假冒品。','この製品はブロックチェーン台帳に存在しません。偽造品の可能性があります。','이 제품은 블록체인 원장에 없습니다. 위조품일 수 있습니다.','Ce produit est absent du registre blockchain. Il peut etre contrefait.'],
  vuid_11: ['San pham nay da bi quet','This product has been scanned','该产品已被扫描','この製品はスキャンされました','이 제품은 스캔되었습니다','Ce produit a ete scanne'],
  vuid_12: ['lan. Hoat dong bat thuong nay da bi gan co.','times. This abnormal activity has been flagged.','次。此异常活动已被标记。','回。この異常な活動にフラグが立てられました。','번. 이 비정상적인 활동이 표시되었습니다.','fois. Cette activite anormale a ete signalee.'],
  vuid_13: ['San pham la chinh hang nhung da qua han su dung.','The product is genuine but has passed its expiry date.','产品为正品，但已超过保质期。','製品は正規品ですが有効期限が切れています。','제품은 정품이지만 유효 기간이 지났습니다.','Le produit est authentique mais perime.'],
  vuid_14: ['San pham da duoc xac thuc thanh cong qua So cai Bat bien VNTrust. Nguon goc 100%.','Product verified via VNTrust Immutable Ledger. Origin confirmed 100%.','产品已通过VNTrust不可变账本验证。来源100%确认。','VNTrust不変台帳で製品が検証されました。原産地100%確認済み。','VNTrust 불변 원장을 통해 제품이 검증되었습니다. 원산지 100% 확인됨.','Produit verifie via le registre VNTrust. Origine confirmee a 100%.'],
  vuid_15: ['Dinh danh San pham','Product Identity','产品身份','製品ID','제품 ID','Identite du produit'],
  vuid_16: ['Nhat ky San xuat','Production Log','生产日志','生産ログ','생산 로그','Journal de production'],
  vuid_17: ['Ma lo hang','Batch Code','批次编码','バッチコード','배치 코드','Code de lot'],
  vuid_18: ['Ngay san xuat','Manufacturing Date','生产日期','製造日','제조일','Date de fabrication'],
  vuid_19: ['XEM HASH BLOCKCHAIN','VIEW BLOCKCHAIN HASH','查看区块链哈希','ブロックチェーンハッシュを表示','블록체인 해시 보기','VOIR LE HASH BLOCKCHAIN'],
  vuid_20: ['Hanh trinh Ban sao Ky thuat so','Digital Twin Journey','数字孪生旅程','デジタルツインジャーニー','디지털 트윈 여정','Parcours du jumeau numerique'],
  vuid_21: ['Trang thai Hien tai','Current Status','当前状态','現在のステータス','현재 상태','Statut actuel'],
  vuid_22: ['Duoc xac thuc boi Nguoi dung','Verified by User','已由用户验证','ユーザーにより認証済み','사용자가 인증함','Verifie par utilisateur'],
  vuid_23: ['Hom nay * Lan quet #','Today * Scan #','今天 * 扫描 #','今日 * スキャン #','오늘 * 스캔 #','Aujourd hui * Scan #'],
  vuid_24: ['Khoi tao So cai Genesis','Genesis Ledger Initialized','创世账本已初始化','Genesis台帳初期化済み','제네시스 원장 초기화됨','Registre Genesis initialise'],
  vuid_25: ['Khoi dong He thong * Nut Bao mat 01','System Boot * Security Node 01','系统启动 * 安全节点01','システム起動 * セキュリティノード01','시스템 부팅 * 보안 노드 01','Demarrage systeme * Noeud securise 01'],
  vuid_26: ['Vi tri Xac thuc Lan cuoi','Last Verification Location','最后验证位置','最終検証場所','마지막 인증 위치','Derniere position de verification'],
  vuid_27: ['IP Khu vuc Hien tai','Current IP Region','当前IP区域','現在のIP地域','현재 IP 지역','Region IP actuelle'],
  vuid_28: ['Dang lay Kinh do/Vi do...','Fetching coordinates...','正在获取坐标...','座標を取得中...','좌표 가져오는 중...','Recuperation des coordonnees...'],
  vuid_29: ['Chung nhan & Tieu chuan Chat luong','Certificates & Quality Standards','证书和质量标准','証明書と品質基準','인증서 및 품질 기준','Certificats et normes de qualite'],
  vuid_30: ['Cac van ban chung nhan ky thuat so duoc dinh kem tren so cai.','Digital certificates attached to the blockchain ledger.','附在区块链账本上的数字证书。','ブロックチェーン台帳に添付されたデジタル証明書。','블록체인 원장에 첨부된 디지털 인증서.','Certificats numeriques attaches au registre blockchain.'],
  vuid_31: ['Co quan Tham quyen','Issuing Authority','颁发机构','発行機関','발급 기관','Autorite emettrice'],
  vuid_32: ['Ngay cap','Issue Date','颁发日期','発行日','발급일','Date emission'],
  vuid_33: ['Het han','Expires','到期','有効期限','만료','Expire'],
  vuid_34: ['Chua co chung nhan ky thuat so nao.','No digital certificates have been issued for this product.','该产品尚未颁发数字证书。','この製品にはデジタル証明書が発行されていません。','이 제품에 대해 발급된 디지털 인증서가 없습니다.','Aucun certificat numerique emis pour ce produit.'],
  vscan_0: ['Khong tim thay camera nao tren thiet bi.','No camera found on this device.','此设备未找到摄像头。','このデバイスにカメラが見つかりません。','이 기기에서 카메라를 찾을 수 없습니다.','Aucune camera trouvee sur cet appareil.'],
  vscan_1: ['Khong the khoi dong camera. Vui long cap quyen thiet bi.','Cannot start camera. Please grant device permissions.','无法启动摄像头，请授予权限。','カメラを起動できません。権限を付与してください。','카메라를 시작할 수 없습니다. 권한을 허용해 주세요.','Impossible de demarrer la camera. Accordez les autorisations.'],
  vscan_2: ['Ve Trung tam Xac thuc','Back to Verification Center','返回认证中心','認証センターに戻る','인증 센터로 돌아가기','Retour au centre de verification'],
  vscan_3: ['Ma QR','QR Code','二维码','QRコード','QR 코드','Code QR'],
  vscan_4: ['Ma Vach','Barcode','条形码','バーコード','바코드','Code-barres'],
  vscan_5: ['Hay dam bao moi truong du sang va tem khong bi nhau nat.','Ensure the environment is well-lit and the stamp is not crumpled.','确保环境光线充足且标签没有褶皱。','環境が明るく、スタンプが折れていないことを確認してください。','환경이 밝고 스탬프가 구겨지지 않았는지 확인하세요.','Assurez-vous que l environnement est eclaire et le tampon non froisse.'],
  vman_0: ['Ve Trung tam Xac thuc','Back to Verification Center','返回认证中心','認証センターに戻る','인증 센터로 돌아가기','Retour au centre de verification'],
  vman_1: ['Tra cuu Ma Serial','Serial Code Lookup','序列号查询','シリアルコード検索','시리얼 코드 조회','Recherche de code serie'],
  vman_2: ['Nhap chuoi dinh danh duy nhat (UUID/Serial) in chim duoi lop phu tem VNTrust chong gia.','Enter the unique identification string (UUID/Serial) on the VNTrust anti-counterfeit stamp.','输入VNTrust防伪标签上的唯一标识字符串（UUID/Serial）。','VNTrust偽造防止スタンプの一意識別文字列を入力してください。','VNTrust 위조 방지 스탬프의 고유 식별 문자열을 입력하세요.','Entrez la chaine d identification unique sur le tampon VNTrust.'],
  vman_3: ['Ma dinh danh (UID)','Identifier Code (UID)','识别码（UID）','識別コード（UID）','식별 코드(UID)','Code d identification (UID)'],
  vman_4: ['Xac thuc Tuc thi','Instant Verify','即时验证','即時検証','즉시 검증','Verification instantanee'],
  vman_5: ['Ma hoa Cap Ngan hang','Bank-Grade Encryption','银行级加密','銀行レベルの暗号化','은행 수준 암호화','Chiffrement niveau bancaire'],
  vman_6: ['Giao dich truy van cua ban duoc ma hoa hoan toan.','Your query transaction is fully encrypted.','您的查询交易已完全加密。','クエリトランザクションは完全に暗号化されています。','귀하의 쿼리 트랜잭션은 완전히 암호화되어 있습니다.','Votre transaction est entierement chiffree.'],
  vai_0:  ['Dinh dang file khong ho tro','Unsupported file format','不支持的文件格式','サポートされていないファイル形式','지원되지 않는 파일 형식','Format de fichier non pris en charge'],
  vai_1:  ['Giay chung nhan (Tu dong)','Certificate (Auto)','证书（自动）','証明書（自動）','인증서 (자동)','Certificat (Auto)'],
  vai_2:  ['Chung nhan VietGAP','VietGAP Certificate','VietGAP证书','VietGAP証明書','VietGAP 인증서','Certificat VietGAP'],
  vai_3:  ['Chung nhan ISO','ISO Certificate','ISO证书','ISO証明書','ISO 인증서','Certificat ISO'],
  vai_4:  ['Khong tim thay','Not found','未找到','見つかりません','찾을 수 없음','Non trouve'],
  vai_5:  ['Khong the nhan dien van ban ro rang.','Cannot clearly recognize text.','无法清晰识别文本。','テキストを明確に認識できません。','텍스트를 명확히 인식할 수 없습니다.','Impossible de reconnaitre clairement le texte.'],
  vai_6:  ['Ve Trung tam Xac thuc','Back to Verification Center','返回认证中心','認証センターに戻る','인증 센터로 돌아가기','Retour au centre de verification'],
  vai_7:  ['Bat dau Xac thuc AI','Start AI Verification','开始AI验证','AI認証を開始','AI 검증 시작','Demarrer la verification IA'],
  vai_8:  ['Ghi nhan Phan tich','Analysis Record','分析记录','分析記録','분석 기록','Enregistrement d analyse'],
  vai_9:  ['Du lieu boc tach (OCR):','Extracted data (OCR):','提取的数据（OCR）：','抽出データ（OCR）：','추출된 데이터 (OCR):','Donnees extraites (OCR) :'],
  vai_10: ['Khong tim thay ky tu nao','No characters found','未找到任何字符','文字が見つかりません','문자를 찾을 수 없음','Aucun caractere trouve'],
};

let changed = 0;
for (const [key, [vi, en, zh, ja, ko, fr]] of Object.entries(translations)) {
  // Match the key line e.g. "  vuid_0: { vi: "...", en: "...", ... },"
  const regex = new RegExp(`([ \\t]+${key}:\\s*\\{)[^}]+(\\}[,\\n])`, 'g');
  const newVal = `$1 vi: ${JSON.stringify(vi)}, en: ${JSON.stringify(en)}, zh: ${JSON.stringify(zh)}, ja: ${JSON.stringify(ja)}, ko: ${JSON.stringify(ko)}, fr: ${JSON.stringify(fr)} $2`;
  const before = content;
  content = content.replace(regex, newVal);
  if (content !== before) { changed++; console.log('Fixed:', key); }
  else { console.log('WARN no match:', key); }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log(`\nDone! Fixed ${changed} keys.`);
