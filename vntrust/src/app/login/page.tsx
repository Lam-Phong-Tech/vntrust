// /login — Redirect thẳng tới /login/consumer (form đăng nhập default)
// Người dùng có thể switch role qua URL: /login/admin, /login/manufacturer, /login/importer
// Hoặc bấm nút "Chuyển vai trò" ở header trong form đăng nhập.
import { redirect } from "next/navigation";

export default function LoginEntryPage() {
  redirect("/login/consumer");
}
