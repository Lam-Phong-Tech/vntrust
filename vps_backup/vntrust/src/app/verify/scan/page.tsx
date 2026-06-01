"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function VerifyScanPage() {
  const [cameraError, setCameraError] = useState("");
  const router = useRouter();
  const scannerRef = useRef<any>(null);
  const [mode, setMode] = useState<"qr" | "barcode">("qr");
  const html5QrCodeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

    startScanner();

    return () => {
      isMounted = false;
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, [router]);

  return (
    <div className="min-h-[calc(100vh-80px)] pb-12 flex flex-col items-center pt-8 px-4 relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="w-[60%] h-[60%] rounded-full bg-primary/10 blur-[150px]"></div>
      </div>

      <div className="w-full max-w-2xl relative z-10 flex flex-col items-center">
        {/* Navigation / Back */}
        <div className="w-full mb-6">
          <Link href="/verify" className="inline-flex items-center gap-2 text-sm font-bold text-on-surface-variant hover:text-primary transition">
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Về Trung tâm Xác thực
          </Link>
        </div>

        <div className="glass-panel border border-outline-variant/15 rounded-3xl p-6 md:p-8 w-full shadow-2xl flex flex-col items-center text-center bg-surface-container-lowest/80 backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
            <span className="material-symbols-outlined text-4xl">qr_code_scanner</span>
          </div>
          
          <h2 className="text-3xl font-black font-headline text-on-surface mb-2">Quét Mã Bảo Mật</h2>
          <p className="text-on-surface-variant mb-6 max-w-md">Hướng camera thiết bị vào mã QR hoặc Mã Vạch trên tem chống giả VNTrust. Hệ thống sẽ tự động nhận diện.</p>

          <div className="flex bg-surface-container rounded-xl p-1 w-full max-w-sm mb-6 border border-outline-variant/10 shadow-inner">
            <button
              onClick={() => setMode("qr")}
              className={`flex-1 py-2.5 flex items-center justify-center gap-2 text-sm font-bold rounded-lg transition-all ${
                mode === "qr" ? "bg-primary text-on-primary shadow-md" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">qr_code_2</span> Mã QR
            </button>
            <button
              onClick={() => setMode("barcode")}
              className={`flex-1 py-2.5 flex items-center justify-center gap-2 text-sm font-bold rounded-lg transition-all ${
                mode === "barcode" ? "bg-primary text-on-primary shadow-md" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">barcode</span> Mã Vạch
            </button>
          </div>

          {cameraError && (
            <div className="w-full mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 flex items-center gap-3 text-left">
              <span className="material-symbols-outlined">error</span>
              <p className="font-bold text-sm tracking-wide">{cameraError}</p>
            </div>
          )}

          <div ref={containerRef} className="w-full max-w-md bg-black rounded-3xl overflow-hidden relative border-4 border-surface-variant/50 shadow-2xl shadow-primary/20">
            <div id="qr-reader" className="w-full [&_video]:w-full [&_video]:object-cover"></div>
            
            {/* Custom Scanning Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Vùng tối xung quanh (mô phỏng) */}
              <div className="absolute inset-0 bg-black/40"></div>
              
              {/* Khung cắt sáng (Cutout) */}
              <div className={`relative transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                mode === "qr" ? "w-64 h-64" : "w-72 h-32"
              }`} style={{ boxShadow: "0 0 0 4000px rgba(0,0,0,0.5)" }}>
                
                {/* 4 Góc định vị */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary"></div>

                {/* Đường quét ngang (Laser line) */}
                <div className="absolute left-0 w-full h-[2px] bg-primary/80 shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)] animate-[scan_2s_linear_infinite]"></div>
              </div>
            </div>
          </div>
          
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes scan {
              0% { top: 5%; opacity: 0; }
              10% { opacity: 1; }
              90% { opacity: 1; }
              100% { top: 95%; opacity: 0; }
            }
          `}} />

          <div className="mt-8 flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 font-medium text-sm">
            <span className="material-symbols-outlined animate-pulse">tips_and_updates</span>
            Hãy đảm bảo môi trường đủ sáng và tem không bị nhàu nát.
          </div>
        </div>
      </div>
    </div>
  );
}
