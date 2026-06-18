"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

type UserWithPoints = {
  id: string;
  ten: string | null;
  email: string;
  vaiTro: string;
  tongDiem: number;
};

export default function RewardsAdminPage() {
  const [users, setUsers] = useState<UserWithPoints[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithPoints | null>(null);
  
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [type, setType] = useState("bao_cao_chinh_xac");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/rewards");
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !points) return;
    
    setSubmitting(true);
    try {
      const res = await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nguoiDungId: selectedUser.id,
          loai: type,
          diemThuong: parseInt(points),
          moTa: reason,
        })
      });
      
      if (res.ok) {
        setShowModal(false);
        setPoints("");
        setReason("");
        fetchUsers();
      } else {
        alert("Có lỗi xảy ra khi cấp điểm.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Kiểm soát điểm thưởng</h1>
          <p className="text-slate-400 text-sm">Quản lý và cấp điểm thưởng cho người dùng</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs text-slate-400 uppercase bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-bold">Người dùng</th>
                <th className="px-6 py-4 font-bold">Vai trò</th>
                <th className="px-6 py-4 font-bold text-right">Tổng điểm</th>
                <th className="px-6 py-4 font-bold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-8">Đang tải...</td>
                </tr>
              ) : users.map(user => (
                <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white">{user.ten || "Chưa cập nhật"}</div>
                    <div className="text-xs text-slate-400">{user.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs">
                      {user.vaiTro}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-[#C8A557] font-bold text-lg">{user.tongDiem}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => { setSelectedUser(user); setShowModal(true); }}
                      className="px-4 py-2 bg-[#C8A557] hover:bg-[#b09045] text-white rounded-xl text-xs font-bold transition"
                    >
                      Cấp điểm
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0B1623] border border-white/10 p-6 rounded-3xl w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">Cấp điểm thưởng</h2>
            <p className="text-slate-400 text-sm mb-6">Cho người dùng: {selectedUser.email}</p>

            <form onSubmit={handleGrant} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Số điểm (Cộng hoặc trừ)</label>
                <input
                  type="number"
                  required
                  value={points}
                  onChange={e => setPoints(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#C8A557] transition"
                  placeholder="Ví dụ: 100 hoặc -50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Loại hành động</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#C8A557] transition"
                >
                  <option value="bao_cao_chinh_xac">Báo cáo chính xác (Hàng giả)</option>
                  <option value="phat_hien_gia">Phát hiện lỗi giá</option>
                  <option value="dang_ky_san_pham">Đăng ký sản phẩm sớm</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Lý do / Ghi chú</label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#C8A557] transition"
                  placeholder="VD: Thưởng báo cáo hàng giả mã #12345"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 text-slate-300 font-bold hover:bg-white/10 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-[#C8A557] text-white font-bold hover:bg-[#b09045] transition disabled:opacity-50"
                >
                  {submitting ? "Đang xử lý..." : "Xác nhận"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
