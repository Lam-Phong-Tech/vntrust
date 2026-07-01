"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import VoiceSearchButton from "@/components/VoiceSearchButton";
import EnterpriseSelect, { buildVerifyHref, getStoredVerifyEnterprise } from "@/components/EnterpriseSelect";
import { useLanguage } from "@/contexts/LanguageContext";

export default function VerifyManualPage() {
  const [serial, setSerial] = useState("");
  const [enterpriseId, setEnterpriseId] = useState("");
  const router = useRouter();
  const { lang } = useLanguage();

  const tr = (vi: string, en: string, zh?: string) => {
    if (lang === "en") return en;
    if (lang === "zh") return zh || en;
    return vi;
  };

  useEffect(() => {
    setEnterpriseId(getStoredVerifyEnterprise());
  }, []);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (serial.trim()) {
      router.push(buildVerifyHref(serial.trim(), enterpriseId));
    }
  };

  return (
    <div className="verify-consumer-page verify-page-manual min-h-[calc(100vh-80px)] pb-12 flex flex-col items-center pt-8 px-4 relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="w-[60%] h-[60%] rounded-full bg-tertiary/10 blur-[150px]" />
      </div>

      <div className="w-full max-w-2xl relative z-10 flex flex-col items-center">
        <div className="w-full mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm font-bold text-on-surface-variant hover:text-tertiary transition"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            {tr("Quay lại", "Back", "返回")}
          </button>
        </div>

        <div className="glass-panel border border-outline-variant/15 rounded-3xl p-6 sm:p-8 md:p-12 w-full shadow-2xl flex flex-col text-center bg-surface-container-lowest/80 backdrop-blur-xl">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-tertiary/10 flex items-center justify-center text-tertiary mb-6">
            <span className="material-symbols-outlined text-4xl">pin</span>
          </div>

          <h2 className="text-3xl font-black font-display text-on-surface mb-4">
            {tr("Tra cứu Mã Serial", "Serial Code Lookup", "序列号查询")}
          </h2>
          <p className="text-on-surface-variant mb-10 mx-auto max-w-sm">
            {tr(
              "Nhập chuỗi định danh duy nhất (UUID/Serial) in chìm dưới lớp phủ tem AI VeriGoods chống giả.",
              "Enter the unique UUID or serial printed under the AI VeriGoods anti-counterfeit stamp layer.",
              "请输入 AI VeriGoods 防伪标签涂层下的唯一 UUID 或序列号。"
            )}
          </p>

          <form onSubmit={handleVerify} className="space-y-8 w-full max-w-md mx-auto">
            <EnterpriseSelect value={enterpriseId} onChange={setEnterpriseId} />

            <div className="relative text-left">
              <label className="block text-[11px] font-black text-outline uppercase tracking-[0.2em] mb-3 ml-2">
                {tr("Mã định danh (UID)", "Identifier code (UID)", "识别码 (UID)")}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <span className="material-symbols-outlined text-[#C8A557]">tag</span>
                </div>
                <input
                  value={serial}
                  onChange={(e) => setSerial(e.target.value)}
                  className="verify-manual-serial-input w-full bg-[#0F1B2C] border-2 border-[#C8A557]/35 outline-none rounded-2xl pl-12 pr-16 py-5 font-medium text-base text-[#F6F1E8] focus:border-[#C8A557] focus:ring-4 focus:ring-[#C8A557]/15 focus:bg-[#142235] transition-all placeholder:text-[#F6F1E8]/35 placeholder:font-normal shadow-inner"
                  placeholder={tr("VD: b8c4e09f-... hoặc bấm mic để nói", "e.g. b8c4e09f-... or tap the mic", "例如 b8c4e09f-... 或点击麦克风")}
                  type="text"
                  autoComplete="off"
                />
                <div className="absolute inset-y-0 right-3 flex items-center">
                  <VoiceSearchButton
                    size={36}
                    title={tr("Đọc mã bằng giọng nói", "Read code by voice", "语音输入代码")}
                    onResult={(text) => {
                      const cleaned = text.replace(/\s+/g, "").toLowerCase();
                      setSerial(cleaned);
                    }}
                  />
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={!serial.trim()}
              style={{ background: "linear-gradient(135deg,#E4D2A1,#C8A557)" }}
              className="w-full text-[#0B1623] border-2 border-[#C8A557]/40 py-5 rounded-2xl font-bold font-display tracking-wide uppercase shadow-lg shadow-[#C8A557]/25 hover:brightness-105 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex justify-center items-center gap-2"
            >
              {tr("Xác thực tức thì", "Instant verify", "立即验证")}
              <span className="material-symbols-outlined">arrow_right_alt</span>
            </button>

            <div className="flex items-center gap-4 py-2 w-full max-w-md mx-auto">
              <div className="h-px bg-outline-variant/30 flex-1" />
              <span className="text-[10px] font-bold text-outline-variant uppercase tracking-widest">
                {tr("Hoặc", "Or", "或者")}
              </span>
              <div className="h-px bg-outline-variant/30 flex-1" />
            </div>

            <Link
              href="/verify/scan"
              className="w-full max-w-md mx-auto bg-surface-container-high text-on-surface border border-outline-variant/30 py-4 rounded-2xl font-bold font-display tracking-wide uppercase hover:bg-surface-container-highest active:scale-[0.98] transition-all flex justify-center items-center gap-2"
            >
              <span className="material-symbols-outlined text-xl">qr_code_scanner</span>
              {tr("Quét mã QR bằng camera", "Scan QR with camera", "用摄像头扫码")}
            </Link>
          </form>

          <div className="mt-10 flex items-start gap-4 p-5 rounded-2xl bg-surface-container-low text-left border border-outline-variant/20">
            <span className="material-symbols-outlined text-tertiary text-2xl">shield_lock</span>
            <div className="text-xs leading-relaxed text-on-surface-variant">
              <strong className="text-on-surface block mb-1">
                {tr("Mã hóa cấp ngân hàng", "Bank-grade encryption", "银行级加密")}
              </strong>
              {tr(
                "Giao dịch truy vấn của bạn được mã hóa hoàn toàn. AI VeriGoods ẩn danh địa chỉ mạng để đảm bảo tính riêng tư trong đối soát.",
                "Your lookup request is fully encrypted. AI VeriGoods anonymizes network addresses to protect your privacy during verification.",
                "您的查询请求会被完整加密。AI VeriGoods 会匿名化网络地址，以保护验证过程中的隐私。"
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
