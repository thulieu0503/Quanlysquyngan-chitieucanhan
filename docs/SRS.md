# Tài liệu Yêu cầu Phần mềm (SRS) — Ứng dụng Quản lý Thu Chi Cá Nhân

*Phiên bản rút gọn — dùng cho đồ án học phần.*

## 1. Giới thiệu

### 1.1 Mục đích
Tài liệu mô tả yêu cầu chức năng, phi chức năng và phân quyền của hệ thống Quản lý Thu Chi Cá Nhân, làm cơ sở cho thiết kế, cài đặt và kiểm thử.

### 1.2 Phạm vi
Ứng dụng web cho phép người dùng ghi nhận thu nhập/chi tiêu, quản lý ngân sách theo danh mục, xem báo cáo/biểu đồ, nhận nhắc nhở chi tiêu định kỳ. Hệ thống có vai trò Admin để quản trị người dùng và danh mục mặc định, không truy cập dữ liệu tài chính cá nhân của user.

### 1.3 Đối tượng sử dụng tài liệu
Người phát triển, giảng viên hướng dẫn/phản biện, người kiểm thử.

### 1.4 Từ viết tắt
- **FR**: Functional Requirement (yêu cầu chức năng)
- **NFR**: Non-Functional Requirement (yêu cầu phi chức năng)
- **RBAC**: Role-Based Access Control (kiểm soát truy cập theo vai trò)

## 2. Mô tả tổng quan

### 2.1 Vai trò người dùng (Actor)

| Actor | Mô tả |
|---|---|
| User | Người dùng cuối, quản lý thu chi cá nhân |
| Admin | Quản trị viên, quản lý người dùng và danh mục mặc định của hệ thống |

### 2.2 Ràng buộc chung
- Nền tảng: Web — frontend Next.js (TypeScript), backend FastAPI (Python); frontend chỉ đóng vai trò client, mọi API do backend phục vụ qua rewrite proxy
- Cơ sở dữ liệu: MySQL, truy vấn bằng SQL thuần (không dùng ORM)
- Thời gian triển khai: 4 tuần, 1 người thực hiện
- Admin **không** được xem chi tiết giao dịch cá nhân của User (ràng buộc thiết kế có chủ đích, vì lý do riêng tư dữ liệu tài chính)

## 3. Yêu cầu chức năng (Functional Requirements)

| Mã | Chức năng | Mô tả | Actor |
|---|---|---|---|
| FR-01 | Đăng ký / Đăng nhập | Tạo tài khoản, xác thực bằng JWT | User, Admin |
| FR-02 | Đặt lại mật khẩu | Quên mật khẩu: gửi mã xác nhận 6 số qua email (hiệu lực 15 phút, tối đa 5 lần nhập sai); nhập mã + mật khẩu mới rồi đăng nhập lại | User, Admin |
| FR-03 | Ghi thu nhập | Nhập khoản thu, gắn category, ngày, ghi chú | User |
| FR-04 | Ghi chi tiêu | Nhập khoản chi, gắn category, ngày, ghi chú | User |
| FR-05 | Danh sách giao dịch | Tìm kiếm, lọc, sắp xếp, phân trang | User |
| FR-06 | Sửa/Xóa giao dịch | Sửa hoặc xóa mềm (soft-delete) giao dịch của mình | User |
| FR-07 | Nhập/Xuất giao dịch | Nhập từ CSV; xuất CSV/PDF | User |
| FR-08 | Quản lý Category cá nhân | Thêm/sửa/xóa danh mục thu/chi của riêng mình | User |
| FR-09 | Thiết lập Budget | Đặt ngân sách theo category & khoảng thời gian | User |
| FR-10 | Cảnh báo ngân sách | Tính % đã dùng, cảnh báo khi gần/vượt mức | Hệ thống → User |
| FR-11 | Dashboard | Tổng quan thu/chi/số dư, tình trạng budget | User |
| FR-12 | Biểu đồ | Biểu đồ theo category, theo thời gian | User |
| FR-13 | Báo cáo tháng | Tổng hợp tài chính theo tháng | User |
| FR-14 | Reminder | Nhắc chi tiêu định kỳ qua email/in-app | Hệ thống → User |
| FR-15 | Quản lý người dùng | Xem danh sách, khóa/mở tài khoản | Admin |
| FR-16 | Quản lý category mặc định | Tạo danh mục chuẩn cho user mới | Admin |
| FR-17 | Thống kê hệ thống | Tổng số user, tổng số giao dịch (số liệu tổng hợp) | Admin |
| FR-18 | Audit log | Ghi lại hành động quan trọng: ai, làm gì, lúc nào | Hệ thống |

## 4. Ma trận phân quyền theo hành động

Phân quyền được kiểm tra ở **từng hành động cụ thể**, không chỉ theo role chung chung.

| Hành động (action) | Mô tả | User | Admin |
|---|---|:---:|:---:|
| `auth.register` | Đăng ký tài khoản mới | ✅ | — |
| `auth.login` | Đăng nhập | ✅ | ✅ |
| `auth.reset_password` | Đặt lại mật khẩu | ✅ | ✅ |
| `transactions.create` | Tạo giao dịch (thu/chi) của chính mình | ✅ | ❌ |
| `transactions.view_own` | Xem giao dịch của chính mình | ✅ | ❌ |
| `transactions.update_own` | Sửa giao dịch của chính mình | ✅ | ❌ |
| `transactions.delete_own` | Xóa mềm giao dịch của chính mình | ✅ | ❌ |
| `transactions.view_others` | Xem giao dịch của người khác | ❌ | ❌ *(chủ đích khóa với mọi vai trò)* |
| `transactions.import_export` | Nhập CSV, xuất CSV/PDF | ✅ | ❌ |
| `categories.manage_own` | Thêm/sửa/xóa category cá nhân | ✅ | ❌ |
| `categories.manage_default` | Thêm/sửa/xóa category mặc định hệ thống | ❌ | ✅ |
| `categories.view_default` | Xem danh mục mặc định | ✅ | ✅ |
| `budgets.manage_own` | Thêm/sửa/xóa budget cá nhân | ✅ | ❌ |
| `dashboard.view_own` | Xem dashboard, biểu đồ, báo cáo cá nhân | ✅ | ❌ |
| `reminders.manage_own` | Quản lý reminder cá nhân | ✅ | ❌ |
| `users.view_list` | Xem danh sách người dùng | ❌ | ✅ |
| `users.lock_unlock` | Khóa/mở tài khoản người dùng | ❌ | ✅ |
| `users.view_profile` | Xem thông tin hồ sơ (tên, email, trạng thái) | — | ✅ |
| `stats.view_system` | Xem thống kê tổng hợp toàn hệ thống | ❌ | ✅ |
| `audit_logs.view` | Xem nhật ký hành động hệ thống | ❌ | ✅ |

**Nguyên tắc thiết kế:** mỗi request đến API đều được kiểm tra theo cặp `(role, action)` thông qua bảng ánh xạ cố định trong code (`role_permissions`), thay vì kiểm tra rải rác `if (role === 'admin')` ở nhiều nơi — giúp dễ audit và mở rộng sau này.

## 5. Yêu cầu phi chức năng (NFR)

| Mã | Yêu cầu | Mô tả |
|---|---|---|
| NFR-01 | Bảo mật mật khẩu | Hash bằng bcrypt, không lưu plaintext |
| NFR-02 | Chống SQL Injection | Toàn bộ truy vấn dùng parameterized query (mysql2) |
| NFR-03 | Chống XSS/CSRF | Escape output, kiểm tra CSRF token cho các request thay đổi dữ liệu |
| NFR-04 | Rate limiting | Giới hạn số request/phút cho các endpoint nhạy cảm (login, reset password) |
| NFR-05 | CORS | Chỉ cho phép origin của chính ứng dụng |
| NFR-06 | Riêng tư dữ liệu | Admin không truy vấn được bảng transactions của user khác dưới bất kỳ hình thức nào |
| NFR-07 | Audit & truy vết | Mọi hành động ghi/sửa/xóa dữ liệu quan trọng đều có audit log |
| NFR-08 | Khôi phục dữ liệu | Soft-delete cho transactions/categories, không xóa cứng |
| NFR-09 | Giám sát | Structured logging + endpoint `/health` kiểm tra tình trạng hệ thống |
| NFR-10 | Hiệu năng | Danh sách giao dịch phân trang, không tải toàn bộ dữ liệu một lần |

## 6. Phạm vi không thực hiện (Out of scope)

Các mục sau được xác định rõ là **không** triển khai trong phạm vi 4 tuần, nêu trong báo cáo ở mục "Hạn chế & hướng phát triển":

- Đăng nhập qua OAuth2 (Google/Facebook)
- Xác thực 2 bước (2FA)
- Hàng đợi job riêng (BullMQ/Redis) cho tác vụ nền — thay bằng xử lý đồng bộ
- Cache Redis cho danh mục/báo cáo
- Versioning/rollback đầy đủ cho bản ghi — chỉ có audit log ghi hành động
- Giao diện quản lý permission động (role/permission hiện cố định trong code)

## 7. Giả định & phụ thuộc

- Người dùng có kết nối Internet ổn định khi sử dụng
- Dịch vụ gửi email (cho reset password, reminder) hoạt động bình thường
- MySQL server đã được cài đặt và cấu hình đúng trước khi chạy ứng dụng
