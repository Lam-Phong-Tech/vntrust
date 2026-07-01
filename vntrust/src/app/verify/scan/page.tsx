"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import EnterpriseSelect, { buildVerifyHref, extractVerifyCode, getStoredVerifyEnterprise } from "@/components/EnterpriseSelect";
import "./scan.css";

export default function VerifyScanPage() {
  const [cameraError, setCameraError] = useState("");
  const router = useRouter();
  const { lang } = useLanguage();
  const html5QrCodeRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // qr = chỉ QR code · barcode = 1D barcode (EAN/UPC/Code128…) · gallery = upload ảnh
  const [mode, setMode] = useState<"qr" | "barcode" | "gallery">("qr");
  const [enterpriseId, setEnterpriseId] = useState("");
  // Camera switching support — danh sách + current index
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [activeCameraIdx, setActiveCameraIdx] = useState(0);

  const handleDecodedText = useCallback((rawText: string) => {
    const code = extractVerifyCode(rawText);
    if (!code) {
      setCameraError(lang === 'en' ? "Invalid QR code" : "Mã QR không hợp lệ trong hệ thống");
      return;
    }
    router.push(buildVerifyHref(code, enterpriseId));
  }, [enterpriseId, lang, router]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (html5QrCodeRef.current?.isScanning) {
        await html5QrCodeRef.current.stop().catch(() => {});
      }
      
      const html5QrCode = new Html5Qrcode("qr-reader");
      const text = await html5QrCode.scanFile(file, true);
      
      handleDecodedText(text);
    } catch (err) {
      setCameraError(lang === 'en' ? "Could not find a QR code in the image" : "Không tìm thấy mã QR trong ảnh");
    }
    e.target.value = '';
  };

  useEffect(() => {
    let isMounted = true;

    const startScanner = async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");

        await new Promise(r => setTimeout(r, 200));
        if (!isMounted) return;

        // Khi mode = "barcode" → chỉ scan 1D barcodes (EAN-13, EAN-8, UPC-A, UPC-E, CODE_128, CODE_39, ITF…)
        // Khi mode = "qr" → chỉ scan QR code (nhanh hơn, ít false-positive)
        const barcodeFormats = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODABAR,
        ];
        const formatsToSupport = mode === "barcode" ? barcodeFormats : [Html5QrcodeSupportedFormats.QR_CODE];

        html5QrCodeRef.current = new Html5Qrcode("qr-reader", {
          verbose: false,
          formatsToSupport,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        });

        const camList = await Html5Qrcode.getCameras();
        if (!camList || camList.length === 0) {
          throw new Error("Không tìm thấy camera nào trên thiết bị.");
        }
        // Lưu danh sách camera để cho phép user xoay cam (mobile có 2 cam thường)
        setCameras(camList.map(c => ({ id: c.id, label: c.label })));

        // Auto-pick cam sau (back/environment) cho lần đầu, hoặc dùng activeCameraIdx nếu user đã chọn
        let cameraIdToUse: string;
        if (activeCameraIdx > 0 && activeCameraIdx < camList.length) {
          cameraIdToUse = camList[activeCameraIdx].id;
        } else {
          const backCamera = camList.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('environment') || c.label.toLowerCase().includes('rear'));
          if (backCamera) {
            cameraIdToUse = backCamera.id;
            // Sync state với index camera back được pick
            const backIdx = camList.findIndex(c => c.id === backCamera.id);
            if (backIdx >= 0 && backIdx !== activeCameraIdx) {
              // Defer state update to avoid re-trigger
              setTimeout(() => setActiveCameraIdx(backIdx), 0);
            }
          } else {
            cameraIdToUse = camList[0].id;
          }
        }

        // Barcode dài hơn QR → khung quét ngang rộng hơn cho dễ scan
        // QR box phải lớn hơn để bắt QR nhỏ từ xa
        const qrbox = mode === "barcode"
          ? { width: 280, height: 100 }
          : { width: 280, height: 280 };

        await html5QrCodeRef.current.start(
          cameraIdToUse,
          {
            fps: 15, // nâng từ 10 → 15 để bắt QR nhanh hơn khi di chuyển camera
            qrbox,
            aspectRatio: 1.0,
            // Yêu cầu trình duyệt continuous autofocus + cao độ phân giải
            videoConstraints: {
              facingMode: { ideal: "environment" },
              focusMode: "continuous",
              advanced: [{ focusMode: "continuous" } as any],
              width:  { ideal: 1920 },
              height: { ideal: 1080 },
            } as any,
            // Cho phép flip ngang (mirror) — camera trước cần flip
            disableFlip: false,
          },
          (decodedText: string) => {
            if (html5QrCodeRef.current?.isScanning) {
              html5QrCodeRef.current.stop().then(() => {
                handleDecodedText(decodedText);
              }).catch(() => { });
            }
          },
          (errorMessage: any) => {
            // ignore
          }
        );
      } catch (err: any) {
        if (isMounted) {
          setCameraError(lang === 'en' ? "Camera permission denied" : "Không có quyền truy cập camera");
        }
      }
    };

    if (mode === "qr" || mode === "barcode") {
      startScanner();
    } else {
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(() => { });
      }
    }

    return () => {
      isMounted = false;
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(() => { });
      }
    };
  }, [router, mode, activeCameraIdx, enterpriseId, handleDecodedText]);

  useEffect(() => {
    setEnterpriseId(getStoredVerifyEnterprise());
  }, []);

  // Xoay cam — chuyển sang camera tiếp theo trong danh sách
  const switchCamera = () => {
    if (cameras.length < 2) return;
    setActiveCameraIdx(i => (i + 1) % cameras.length);
  };

  const isPermissionError = cameraError === "Camera permission denied" || cameraError === "Không có quyền truy cập camera";

  return (
    <div className="s-scan-wrapper">
      <section className="s-scan">
        <div className="s-scan-camera">
        </div>
        
        <div id="qr-reader" />
        
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*" 
          onChange={handleFileUpload} 
        />




        <div className="s-scan-top">
          <button className="s-scan-btn" onClick={() => router.back()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          {/* Xoay camera — chỉ hiện khi có >= 2 cam */}
          {cameras.length >= 2 && (mode === 'qr' || mode === 'barcode') && (
            <button className="s-scan-btn" onClick={switchCamera}
              title={lang === 'en' ? `Switch camera (${activeCameraIdx + 1}/${cameras.length})` : `Xoay camera (${activeCameraIdx + 1}/${cameras.length})`}
              style={{ marginLeft: 'auto' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 4h-3.17L15 2H9L7.17 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z" />
                <path d="M16 13a4 4 0 11-8 0 4 4 0 018 0z" />
                <path d="M14 9l2-2M10 15l-2 2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        <div className={`s-scan-finder ${mode === 'barcode' ? 'barcode' : ''}`}>
          <span className="s-scan-corner tl"></span>
          <span className="s-scan-corner tr"></span>
          <span className="s-scan-corner bl"></span>
          <span className="s-scan-corner br"></span>
          <div className="s-scan-line"></div>
        </div>

        <div className="s-scan-hint">
          <div className="s-scan-enterprise">
            <EnterpriseSelect
              lang={lang}
              value={enterpriseId}
              onChange={setEnterpriseId}
              compact
            />
          </div>
          <div className="s-scan-hint-text">
            {mode === 'barcode'
              ? (lang === 'en' ? 'Align barcode within frame' : 'Đưa mã vạch vào khung')
              : (lang === 'en' ? 'Align QR code within frame' : 'Đưa mã QR vào khung')}
          </div>
        </div>

        <div className="s-scan-bottom">
          <div className="s-scan-options">
            <div className={`s-scan-option ${mode === 'qr' ? 'active' : ''}`} onClick={() => setMode('qr')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
              </svg>
              {lang === 'en' ? 'QR' : 'QR'}
            </div>
            <div className={`s-scan-option ${mode === 'barcode' ? 'active' : ''}`} onClick={() => setMode('barcode')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 5v14M7 5v14M10 5v14M14 5v14M17 5v14M20 5v14" strokeLinecap="round" />
              </svg>
              {lang === 'en' ? 'Barcode' : 'Mã vạch'}
            </div>
            <div className="s-scan-option" onClick={() => router.push('/verify/manual')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="6" width="18" height="12" rx="2" />
                <path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" strokeLinecap="round" />
              </svg>
              {lang === 'en' ? 'Enter' : 'Nhập mã'}
            </div>
            <div className="s-scan-option" onClick={() => router.push('/verify/wizard')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6" />
                <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {lang === 'en' ? 'Report' : 'Báo cáo'}
            </div>
            <div className="s-scan-option" onClick={() => router.push('/verify/history')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {lang === 'en' ? 'History' : 'Lịch sử'}
            </div>
            <div className="s-scan-option" onClick={() => router.push('/verify/rewards')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 12 20 22 12 17 4 22 4 12" />
                <rect x="4" y="2" width="16" height="10" rx="2" />
              </svg>
              {lang === 'en' ? 'Rewards' : 'Đổi quà'}
            </div>
            <div className={`s-scan-option ${mode === 'gallery' ? 'active' : ''}`} onClick={() => {
              setMode('gallery');
              fileInputRef.current?.click();
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              {lang === 'en' ? 'Gallery' : 'Ảnh'}
            </div>
          </div>
        </div>
      </section>

      {cameraError && (
        <div className="s-scan-modal-overlay">
          <div className="s-scan-modal-card">
            {isPermissionError ? (
              <>
                <div className="s-scan-modal-header" style={{ color: '#ef4444' }}>
                  <div className="s-scan-modal-icon-wrapper" style={{ backgroundColor: '#fee2e2' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '32px', height: '32px', color: '#ef4444' }}>
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  </div>
                  <h3 className="s-scan-modal-title">
                    {lang === 'en' ? 'Camera Access Denied' : 'Yêu Cầu Quyền Camera'}
                  </h3>
                </div>
                
                <div className="s-scan-modal-body">
                  <p className="s-scan-modal-desc">
                    {lang === 'en' 
                      ? 'AI VeriGoods needs camera permission to scan and verify QR codes on products. Please follow the instructions below to enable camera:' 
                      : 'Để quét mã QR xác thực hàng thật/giả, AI VeriGoods cần được cấp quyền truy cập camera. Vui lòng làm theo hướng dẫn sau:'}
                  </p>
                  
                  <div className="s-scan-instruction-tabs">
                    <div className="s-scan-instruction-item">
                      <div className="s-scan-instruction-icon">1</div>
                      <div className="s-scan-instruction-text">
                        <strong>Android / Chrome / PC:</strong><br />
                        {lang === 'en' 
                          ? 'Click the padlock or settings icon (🔒) on the left of the address bar -> toggle Camera to "Allow" -> reload.'
                          : 'Bấm vào biểu tượng ổ khóa/cài đặt (🔒) bên trái thanh địa chỉ trình duyệt -> Chọn "Quyền" hoặc bật "Máy ảnh" -> Tải lại trang.'}
                      </div>
                    </div>
                    
                    <div className="s-scan-instruction-item">
                      <div className="s-scan-instruction-icon">2</div>
                      <div className="s-scan-instruction-text">
                        <strong>iPhone / Safari:</strong><br />
                        {lang === 'en'
                          ? 'Go to device Settings -> Safari -> Camera -> select "Allow". Then return to browser and reload.'
                          : 'Vào Cài đặt của iPhone -> Safari -> Camera -> Chọn "Cho phép" (Allow). Sau đó quay lại và tải lại trang.'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="s-scan-modal-footer">
                  <button className="s-scan-modal-btn secondary" onClick={() => setCameraError('')}>
                    {lang === 'en' ? 'Close' : 'Đóng'}
                  </button>
                  <button className="s-scan-modal-btn primary" onClick={() => window.location.reload()}>
                    {lang === 'en' ? 'Reload Page' : 'Tải lại trang'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="s-scan-modal-header" style={{ color: '#f59e0b' }}>
                  <div className="s-scan-modal-icon-wrapper" style={{ backgroundColor: '#fef3c7' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '32px', height: '32px', color: '#f59e0b' }}>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                  </div>
                  <h3 className="s-scan-modal-title">
                    {lang === 'en' ? 'Notification' : 'Thông báo'}
                  </h3>
                </div>
                
                <div className="s-scan-modal-body">
                  <p className="s-scan-modal-desc" style={{ fontSize: '15px', textAlign: 'center', margin: 0 }}>
                    {cameraError}
                  </p>
                </div>

                <div className="s-scan-modal-footer solo">
                  <button className="s-scan-modal-btn primary" onClick={() => setCameraError('')}>
                    OK
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
