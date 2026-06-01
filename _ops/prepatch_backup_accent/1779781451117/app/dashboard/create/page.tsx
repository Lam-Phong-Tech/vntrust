"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CreateHub() {
  const router = useRouter();

  return (
    <div className="min-h-[calc(100vh-80px)] w-full relative flex flex-col p-4 md:p-8 max-w-lg mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push('/dashboard')} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition">
          <span className="material-symbols-outlined text-white">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold text-white font-display">Tạo mới</h1>
      </div>

      <div className="flex flex-col gap-4">
        {/* Thêm sản phẩm */}
        <Link href="/dashboard/inventory" className="glass-card rounded-3xl p-6 border border-blue-500/20 flex items-center gap-5 group hover:bg-white/5 transition">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center shrink-0 border border-blue-500/30 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-3xl text-blue-400">inventory_2</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-white mb-1">Thêm Sản phẩm</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Đăng ký mới sản phẩm, khai báo thông tin và nhận mã UID.</p>
          </div>
        </Link>

        {/* Tạo Lô hàng */}
        <Link href="/dashboard/warehouse" className="glass-card rounded-3xl p-6 border border-emerald-500/20 flex items-center gap-5 group hover:bg-white/5 transition">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/30 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-3xl text-emerald-400">conveyor_belt</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-white mb-1">Tạo Lô hàng mới</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Đóng gói, tạo mã lô và xuất kho cho hệ thống phân phối.</p>
          </div>
        </Link>

        {/* Báo cáo nội bộ */}
        <button onClick={() => alert('Tính năng đang được phát triển')} className="glass-card rounded-3xl p-6 border border-[#C8A557]/20 flex items-center gap-5 group text-left w-full cursor-pointer hover:bg-white/5 transition">
          <div className="w-14 h-14 rounded-2xl bg-[#C8A557]/20 flex items-center justify-center shrink-0 border border-[#C8A557]/30 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-3xl text-[#C8A557]">campaign</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-white mb-1">Gửi Thông báo</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Gửi thông báo và cảnh báo bảo mật đến toàn bộ chuỗi cung ứng.</p>
          </div>
        </button>
      </div>
    </div>
  );
}
