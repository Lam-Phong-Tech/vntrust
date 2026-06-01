# QUY TẮC DỰ ÁN (RULES)

## 1. Clean Architecture & Clean Code
- **Single Responsibility Principle:** Mỗi hàm/component chỉ làm một việc duy nhất. Tránh nhồi nhét logic gọi API, xử lý state và UI vào cùng một component.
- **Tách biệt Logic và UI:** Khuyến khích sử dụng Custom Hooks để quản lý logic trạng thái (State) và gọi API. 
- **Tên biến rõ ràng:** Sử dụng camelCase cho biến, PascalCase cho Components. Tên hàm phải bắt đầu bằng động từ (vd: `fetchProducts`, `handleApproval`).

## 2. TypeScript & Type Safety
- **Strict Mode:** TypeScript `strict: true` phải luôn được bật trong `tsconfig.json`.
- **No `any`:** Hạn chế tối đa việc sử dụng kiểu `any`. Định nghĩa Interface/Type rõ ràng cho dữ liệu trả về từ API và Props của Components.
- **Prisma Client:** Luôn sử dụng Prisma generated types thay vì tự định nghĩa thủ công các Schema types.

## 3. Quản Lý Error & Exceptions
- **API Error Handling:** API luôn phải trả về object có format chuẩn, ví dụ: `{ error: "Nội dung lỗi" }`. Các lỗi server (500) phải được try/catch và log ra màn hình console, không trả nguyên stack trace cho frontend.
- **Client Error Handling:** Sử dụng Toast để báo lỗi cho người dùng cuối (Toast UI).

## 4. Kiểm Soát Quyền Truy Cập (RBAC)
- **Zero Trust:** Đừng bao giờ tin tưởng Client. Mọi hành động làm thay đổi dữ liệu (POST, PUT, DELETE, PATCH) đều phải kiểm tra Cookie/JWT Role tại Server Route.
- Không render các chức năng nhạy cảm trên giao diện nếu người dùng không đủ quyền hạn (Ví dụ: Admin mới thấy nút "Phê duyệt").

## 5. Git & Commit Convention
- Commit messages phải tuân theo cấu trúc: `type(scope): description`.
  - `feat`: Tính năng mới
  - `fix`: Sửa lỗi
  - `docs`: Cập nhật tài liệu
  - `refactor`: Cấu trúc lại code (không thay đổi tính năng)
  - `chore`: Tinh chỉnh config (build, package...)
