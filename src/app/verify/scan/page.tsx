"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "./scan.css";

export default function VerifyScanPage() {
  const [cameraError, setCameraError] = useState("");
  const router = useRouter();
  const html5QrCodeRef = useRef<any>(null);
  const [mode, setMode] = useState<"qr" | "barcode" | "manual" | "voice">("qr");

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
                const uid = decodedText.includes("/verify/")
                  ? decodedText.split("/verify/")[1]
                  : decodedText;
                router.push(`/verify/${uid}`);
              }).catch(() => {});
            }
          },
          (errorMessage: any) => {
            // ignore
          }
        );
      } catch (err: any) {
        if (isMounted) {
          setCameraError(err.message || "Không thể khởi động camera. Vui lòng cấp quyền thiết bị.");
        }
      }
    };

    if (mode === "qr" || mode === "barcode") {
      startScanner();
    } else {
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    }

    return () => {
      isMounted = false;
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, [router, mode]);

  return (
    <div className="s-scan-wrapper">
      <section className="s-scan">
        <div className="s-scan-camera">
        </div>
        
        <div className="s-scan-product"></div>
        
        <div className="status" style={{ color: "var(--cream)", position: "relative", zIndex: 5, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>9:41</span>
          <div className="status-right" style={{ display: "flex", gap: 6 }}>
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16 }}>
              <path d="M2 22h2v-9H2v9zm5 0h2V8H7v14zm5 0h2V3h-2v19zm5 0h2v-5h-2v5z" />
            </svg>
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16 }}>
              <path d="M12 3C7.95 3 4.21 4.34 1.2 6.6c-.41.3-.49.87-.18 1.27l9.6 12.81a2 2 0 003.18 0L23.39 7.86c.31-.4.22-.97-.18-1.27C20.21 4.34 16.46 3 12.42 3H12z" />
            </svg>
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16 }}>
              <rect x="9" y="8" width="6" height="9" fill="currentColor" />
            </svg>
          </div>
        </div>

        <div className="s-scan-top">
          <button className="s-scan-btn" onClick={() => router.back()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <div className="s-scan-title">Quét xác thực</div>
          <button className="s-scan-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8h1a4 4 0 110 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4z" />
              <line x1="6" y1="1" x2="6" y2="4" />
              <line x1="10" y1="1" x2="10" y2="4" />
              <line x1="14" y1="1" x2="14" y2="4" />
            </svg>
          </button>
        </div>

        <div className="s-scan-finder">
          <div id="qr-reader" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, borderRadius: 12, overflow: 'hidden' }} />
          <span className="s-scan-corner tl"></span>
          <span className="s-scan-corner tr"></span>
          <span className="s-scan-corner bl"></span>
          <span className="s-scan-corner br"></span>
          <div className="s-scan-line"></div>
        </div>

        <div className="s-scan-hint">
          {cameraError && (
             <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", padding: "10px", borderRadius: "12px", color: "#ef4444", fontSize: "12px", marginBottom: "16px" }}>
               {cameraError}
             </div>
          )}
          <div className="s-scan-hint-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <div className="s-scan-hint-text">Đưa mã QR vào khung</div>
          <div className="s-scan-hint-sub">Hệ thống sẽ tự động nhận dạng</div>
        </div>

        <div className="s-scan-bottom">
          <div className="s-scan-options">
            <div className={`s-scan-option ${mode === 'qr' ? 'active' : ''}`} onClick={() => setMode('qr')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
              </svg>
              Quét QR
            </div>
            <div className={`s-scan-option ${mode === 'barcode' ? 'active' : ''}`} onClick={() => setMode('barcode')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Mã vạch
            </div>
            <div className={`s-scan-option ${mode === 'manual' ? 'active' : ''}`} onClick={() => setMode('manual')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 11.5a8.38 8.38 0 01-9 8.4 8.5 8.5 0 01-7.6-4.6L3 21l1.9-1.4a8.5 8.5 0 016.1-13" />
                <path d="M21 3h-6v6" />
              </svg>
              Nhập mã
            </div>
            <div className={`s-scan-option ${mode === 'voice' ? 'active' : ''}`} onClick={() => setMode('voice')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                <path d="M19 10v2a7 7 0 01-14 0v-2" />
              </svg>
              Giọng nói
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
