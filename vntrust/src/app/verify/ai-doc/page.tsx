"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

export default function VerifyAiDocPage() {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "analyzing" | "success" | "fake">("idle");
  const [extracted, setExtracted] = useState<{type: string, issuer: string, date: string, rawText: string} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFileSignature = async (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = (e) => {
        if (!e.target || !e.target.result) {
           resolve(false);
           return;
        }
        const arr = new Uint8Array(e.target.result as ArrayBuffer).subarray(0, 4);
        const header = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
        
        if (header.startsWith("89504E47")) resolve(true); // PNG
        else if (header.startsWith("FFD8FF")) resolve(true); // JPEG
        else if (header.startsWith("52494646")) resolve(true); // WEBP/RIFF
        else resolve(false); 
      };
      reader.onerror = () => resolve(false);
      reader.readAsArrayBuffer(file.slice(0, 4));
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selected = e.target.files?.[0];
    if (selected) {
      const isValid = await validateFileSignature(selected);
      if (!isValid) {
        setError(t("aidoc_format_error") || t("vai_0"));
        setFile(null);
        setPreview(null);
        return;
      }
      setFile(selected);
      const url = URL.createObjectURL(selected);
      setPreview(url);
      setStatus("idle");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setError(null);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      const isValid = await validateFileSignature(dropped);
      if (!isValid) {
        setError(t("aidoc_format_error") || t("vai_0"));
        setFile(null);
        setPreview(null);
        return;
      }
      if (dropped.type.startsWith("image/")) {
        setFile(dropped);
        setPreview(URL.createObjectURL(dropped));
        setStatus("idle");
      } else {
        setError(t("aidoc_format_error") || t("vai_0"));
      }
    }
  };

  const triggerAnalysis = async () => {
    if (!preview) return;
    setStatus("analyzing");
    setExtracted(null);
    
    try {
      const Tesseract = await import('tesseract.js').then(m => m.default || m);
      const { data: { text } } = await Tesseract.recognize(preview, 'vie+eng', {
        logger: m => console.log(m)
      });
      
      const lowerText = text.toLowerCase();
      const isValid = ['chứng nhận', 'giấy chứng nhận', 'certificate', 'vietgap', 'iso', 'tiêu chuẩn', 'kiểm định', 'công nhận', 'giấy phép'].some(kw => lowerText.includes(kw));

      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);
      
      let type = t("vai_1");
      if (lowerText.includes("vietgap")) type = t("vai_2");
      else if (lowerText.includes("iso")) type = t("vai_3");
      else if (lowerText.includes("atvstp")) type = "ATVSTP";
      else if (lowerText.includes("certificate")) type = "Certificate";

      const issuer = lines.length > 0 ? lines[0].replace(/[|\\_>~=]/g, '') : t("vai_4");
      const dateMatch = text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/);
      const date = dateMatch ? dateMatch[0] : t("vai_4");

      // Lọc các dòng rác và ký tự lạ
      const cleanLines = text.split('\n')
        .map(l => l.trim().replace(/[|\\_>~={}\[\]]/g, ''))
        .filter(l => l.length > 5 && /[a-zA-Z]/.test(l));
        
      const cleanText = cleanLines.slice(0, 4).join('\n') + (cleanLines.length > 4 ? '\n...' : '');

      setExtracted({
        type,
        issuer: issuer.length > 40 ? issuer.substring(0, 40) + "..." : issuer,
        date,
        rawText: cleanText || t("vai_5")
      });

      setStatus(isValid ? "success" : "fake");
    } catch (err) {
      console.error(err);
      setStatus("fake"); 
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] pb-12 flex flex-col items-center pt-8 px-4 relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="w-[60%] h-[60%] rounded-full bg-[#C8A557]/10 blur-[150px]"></div>
      </div>

      <div className="w-full max-w-4xl relative z-10 flex flex-col items-center">
        {/* Navigation / Back */}
        <div className="w-full mb-6">
          <Link href="/verify" className="inline-flex items-center gap-2 text-sm font-bold text-on-surface-variant hover:text-[#C8A557] transition">
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            {t("vai_6")}
          </Link>
        </div>

        <div className="glass-panel border border-outline-variant/15 rounded-3xl p-8 w-full shadow-2xl bg-surface-container-lowest/80 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row items-center gap-6 mb-10 pb-8 border-b border-outline-variant/20">
            <div className="w-16 h-16 rounded-2xl bg-[#C8A557]/10 flex items-center justify-center text-[#C8A557] shrink-0">
              <span className="material-symbols-outlined text-4xl">document_scanner</span>
            </div>
            <div>
              <h2 className="text-3xl font-black font-display text-on-surface mb-2">{t("aidoc_title")}</h2>
              <p className="text-on-surface-variant">{t("aidoc_desc")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Upload Area */}
            <div className="flex flex-col h-full">
              <div 
                className={`flex-1 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-8 transition-all min-h-[350px] relative overflow-hidden group ${
                  preview ? 'border-[#C8A557]/30 bg-[#C8A557]/5' : 'border-outline-variant/30 hover:border-[#C8A557]/40 hover:bg-surface-container'
                }`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => !preview && fileInputRef.current?.click()}
              >
                {preview ? (
                  <>
                    <img src={preview} alt="Document preview" className="absolute inset-0 w-full h-full object-contain p-4 opacity-70 group-hover:opacity-40 transition-opacity" />
                    
                    {status === "analyzing" && (
                      <>
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                          <span className="material-symbols-outlined text-[#C8A557] animate-spin text-5xl mb-4">progress_activity</span>
                          <p className="text-[#C8A557] font-bold tracking-widest uppercase">{t("aidoc_analyzing")}</p>
                        </div>
                        {/* Scanning Laser */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-[#C8A557] shadow-[0_0_15px_#22d3ee] z-20 animate-[scan_2s_ease-in-out_infinite]" style={{ animationDirection: 'alternate' }}></div>
                      </>
                    )}

                    {status === "idle" && (
                      <div className="relative z-10 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center">
                        <button onClick={(e) => { e.stopPropagation(); setPreview(null); setFile(null); }} className="bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition px-4 py-2 rounded-xl mb-4 font-bold flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">delete</span> {t("aidoc_cancel")}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-6xl text-outline-variant mb-4">cloud_upload</span>
                    <h3 className="font-bold text-on-surface mb-2 font-display">{t("aidoc_drag")}</h3>
                    <p className="text-sm text-outline-variant text-center max-w-[200px]">{t("aidoc_format")}</p>
                    {error && (
                      <p className="mt-4 text-red-500 font-bold bg-red-500/10 px-4 py-2 rounded-lg">{error}</p>
                    )}
                  </>
                )}
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/jpeg, image/png, image/webp" 
                  className="hidden" 
                />
              </div>

              {preview && status === "idle" && (
                <button onClick={triggerAnalysis} className="mt-4 w-full bg-[#C8A557] hover:bg-[#C8A557] text-white shadow-lg shadow-cyan-500/20 rounded-2xl py-4 font-bold tracking-wide uppercase transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">auto_awesome</span>
                  {t("vai_7")}
                </button>
              )}
            </div>

            {/* Results Area */}
            <div className="flex flex-col bg-surface-container-low rounded-3xl p-6 border border-outline-variant/10">
              <h3 className="font-black font-display text-lg mb-6 flex items-center gap-2 text-on-surface">
                <span className="material-symbols-outlined text-outline">analytics</span> {t("vai_8")}
              </h3>

              {status === "idle" && !preview && (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                  <span className="material-symbols-outlined text-5xl mb-3 text-outline">fact_check</span>
                  <p className="text-sm text-outline" dangerouslySetInnerHTML={{__html: t("aidoc_empty_res").replace(/\\n/g, "<br/>")}}></p>
                </div>
              )}

              {status === "idle" && preview && (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-[#C8A557] animate-pulse">{t("aidoc_ready")}</p>
                </div>
              )}

              {status === "analyzing" && (
                <div className="flex-1 space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-surface-container p-4 rounded-xl flex items-center gap-4 animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-outline-variant/20"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-2 bg-outline-variant/20 rounded w-1/2"></div>
                        <div className="h-2 bg-outline-variant/20 rounded w-full"></div>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-outline text-center mt-4">{t("aidoc_wait")}</p>
                </div>
              )}

              {status === "success" && extracted && (
                <div className="flex-1 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-[#4A7C5C]/10 border border-[#4A7C5C]/30 p-4 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#4A7C5C] rounded-full flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-white text-2xl">verified</span>
                    </div>
                    <div>
                      <h4 className="text-[#6FB585] font-bold uppercase tracking-wide text-sm font-display">{t("aidoc_valid")}</h4>
                      <p className="text-xs text-on-surface-variant">{t("aidoc_valid_sub")}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-surface-container rounded-xl p-3 flex justify-between items-center text-sm">
                      <span className="text-outline">{t("aidoc_type")}</span>
                      <span className="font-bold text-on-surface">{extracted.type}</span>
                    </div>
                    <div className="bg-surface-container rounded-xl p-3 flex justify-between items-center text-sm">
                      <span className="text-outline">{t("aidoc_issuer")}</span>
                      <span className="font-bold text-on-surface">{extracted.issuer}</span>
                    </div>
                    <div className="bg-surface-container rounded-xl p-3 flex justify-between items-center text-sm">
                      <span className="text-outline">{t("aidoc_date")}</span>
                      <span className="font-bold text-on-surface">{extracted.date}</span>
                    </div>
                    <div className="bg-surface-container rounded-xl p-3 flex flex-col gap-2 text-sm">
                      <span className="text-outline flex items-center gap-2"><span className="material-symbols-outlined text-[14px]">terminal</span> {t("vai_9")}</span>
                      <div className="bg-black/40 rounded-lg p-3 font-mono text-xs text-[#C8A557] whitespace-pre-line leading-relaxed border border-[#C8A557]/20">
                        {extracted.rawText}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {status === "fake" && (
                <div className="flex-1 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-white text-2xl">warning</span>
                    </div>
                    <div>
                      <h4 className="text-red-400 font-bold uppercase tracking-wide text-sm font-display">{t("aidoc_fake")}</h4>
                      <p className="text-xs text-on-surface-variant">{t("aidoc_fake_sub")}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-surface-container rounded-xl p-3 flex justify-between items-center text-sm border border-red-500/20">
                      <span className="text-outline">{t("aidoc_warn")}</span>
                      <span className="font-bold text-red-400">{t("aidoc_dev")}</span>
                    </div>
                    
                    {extracted && (
                      <div className="bg-surface-container rounded-xl p-3 flex flex-col gap-2 text-sm border border-red-500/20">
                        <span className="text-outline flex items-center gap-2"><span className="material-symbols-outlined text-[14px]">terminal</span> {t("vai_9")}</span>
                        <div className="bg-black/40 rounded-lg p-3 font-mono text-xs text-red-400 whitespace-pre-line leading-relaxed border border-red-500/20">
                          {extracted.rawText || t("vai_10")}
                        </div>
                      </div>
                    )}
                    
                    <div className="p-2 text-center">
                      <p className="text-[11px] text-red-400 underline cursor-pointer">{t("aidoc_report")}</p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
      `}} />
    </div>
  );
}
