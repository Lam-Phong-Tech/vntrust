"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import "./scan.css";

export default function VerifyScanPage() {
  const [cameraError, setCameraError] = useState("");
  const router = useRouter();
  const { lang } = useLanguage();
  const html5QrCodeRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"qr" | "gallery">("qr");

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
      
      if (text.length > 50 && !text.includes("vntrust") && !text.includes("anticounterfeit")) {
        setCameraError(lang === 'en' ? "Invalid QR code" : "Mã QR không hợp lệ trong hệ thống");
        return;
      }
      const uid = text.includes("/verify/")
        ? text.split("/verify/")[1]
        : text;
      router.push(`/verify/${uid}`);
    } catch (err) {
      setCameraError(lang === 'en' ? "Could not find a QR code in the image" : "Không tìm thấy mã QR trong ảnh");
    }
    e.target.value = '';
  };

  useEffect(() => {
    let isMounted = true;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");

        await new Promise(r => setTimeout(r, 200));
        if (!isMounted) return;

        html5QrCodeRef.current = new Html5Qrcode("qr-reader", {
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        });

        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          throw new Error("Không tìm thấy camera nào trên thiết bị.");
        }

        const backCamera = cameras.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('environment'));
        const cameraIdToUse = backCamera ? backCamera.id : cameras[0].id;

        await html5QrCodeRef.current.start(
          cameraIdToUse,
          {
            fps: 10
          },
          (decodedText: string) => {
            if (html5QrCodeRef.current?.isScanning) {
              html5QrCodeRef.current.stop().then(() => {
                if (decodedText.length > 50 && !decodedText.includes("vntrust") && !decodedText.includes("anticounterfeit")) {
                  setCameraError(lang === 'en' ? "Invalid QR code" : "Mã QR không hợp lệ trong hệ thống");
                  return;
                }
                const uid = decodedText.includes("/verify/")
                  ? decodedText.split("/verify/")[1]
                  : decodedText;
                router.push(`/verify/${uid}`);
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

    if (mode === "qr") {
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
  }, [router, mode]);

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
        </div>

        <div className="s-scan-finder">
          <span className="s-scan-corner tl"></span>
          <span className="s-scan-corner tr"></span>
          <span className="s-scan-corner bl"></span>
          <span className="s-scan-corner br"></span>
          <div className="s-scan-line"></div>
        </div>

        <div className="s-scan-hint">
          <div className="s-scan-hint-text">
            {lang === 'en' ? 'Align QR code within frame' : 'Đưa mã QR vào khung'}
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
              {lang === 'en' ? 'Scan QR' : 'Quét QR'}
            </div>
            <div className="s-scan-option" onClick={() => router.push('/verify/manual')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 11.5a8.38 8.38 0 01-9 8.4 8.5 8.5 0 01-7.6-4.6L3 21l1.9-1.4a8.5 8.5 0 016.1-13" />
                <path d="M21 3h-6v6" />
              </svg>
              {lang === 'en' ? 'Enter Code' : 'Nhập mã'}
            </div>
            <div className="s-scan-option" onClick={() => router.push('/verify/ai-doc')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6" />
                <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6" />
                <line x1="2" y1="12" x2="22" y2="12" />
              </svg>
              {lang === 'en' ? 'AI' : 'AI'}
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
              {lang === 'en' ? 'Gallery' : 'Chọn ảnh'}
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
                      ? 'VNTrust needs camera permission to scan and verify QR codes on products. Please follow the instructions below to enable camera:' 
                      : 'Để quét mã QR xác thực hàng thật/giả, VNTrust cần được cấp quyền truy cập camera. Vui lòng làm theo hướng dẫn sau:'}
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
