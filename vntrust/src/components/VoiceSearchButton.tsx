"use client";
// Voice search button — Web Speech API client-side only.
// Mic button → record → callback với text transcript.
// Hỗ trợ tiếng Việt mặc định (vi-VN). Trình duyệt cần hỗ trợ SpeechRecognition.

import { useState, useRef, useEffect } from "react";

interface Props {
  onResult: (transcript: string) => void;
  lang?: string;
  className?: string;
  size?: number;
  title?: string;
}

export default function VoiceSearchButton({
  onResult,
  lang = "vi-VN",
  className,
  size = 40,
  title = "Tìm bằng giọng nói",
}: Props) {
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  const start = () => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Trình duyệt của bạn không hỗ trợ nhận diện giọng nói. Hãy dùng Chrome/Safari mới.");
      return;
    }
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      onResult(transcript);
    };
    rec.onerror = (e: any) => {
      console.warn("[VoiceSearch] error:", e.error);
      setRecording(false);
    };
    rec.onend = () => setRecording(false);
    rec.onstart = () => setRecording(true);
    try {
      rec.start();
      recognitionRef.current = rec;
    } catch (e) {
      console.warn("[VoiceSearch] start failed:", e);
      setRecording(false);
    }
  };

  const stop = () => {
    try { recognitionRef.current?.stop(); } catch {}
    setRecording(false);
  };

  if (supported === false) return null; // hide if not supported

  return (
    <button
      type="button"
      onClick={recording ? stop : start}
      title={title}
      aria-label={title}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: recording ? "rgba(218,37,29,0.20)" : "rgba(200,165,87,0.12)",
        border: `1px solid ${recording ? "rgba(218,37,29,0.5)" : "rgba(200,165,87,0.3)"}`,
        color: recording ? "#ff6b6b" : "#C8A557",
        cursor: "pointer",
        transition: "all 0.2s",
        position: "relative",
        flexShrink: 0,
      }}
    >
      {recording && (
        <span style={{
          position: "absolute", inset: -4,
          borderRadius: "50%",
          border: "2px solid rgba(218,37,29,0.4)",
          animation: "vntrust-mic-pulse 1.2s ease-out infinite",
        }} />
      )}
      <span className="material-symbols-outlined" style={{ fontSize: Math.floor(size * 0.5), fontVariationSettings: recording ? "'FILL' 1" : "'FILL' 0" }}>
        {recording ? "mic" : "mic_none"}
      </span>
      <style>{`
        @keyframes vntrust-mic-pulse {
          0%   { transform: scale(1);   opacity: 0.8; }
          70%  { transform: scale(1.3); opacity: 0;   }
          100% { transform: scale(1.3); opacity: 0;   }
        }
      `}</style>
    </button>
  );
}
