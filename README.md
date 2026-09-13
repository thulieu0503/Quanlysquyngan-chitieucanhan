# Quanlysquyngan-chitieucanhan
Ứng dụng Quản lý Thu Chi Cá Nhân

Ứng dụng web giúp người dùng ghi nhận thu nhập/chi tiêu, quản lý ngân sách theo danh mục, xem báo cáo trực quan và nhận nhắc nhở chi tiêu định kỳ. Hệ thống có 2 vai trò: User (quản lý tài chính cá nhân) và Admin (quản trị người dùng và danh mục hệ thống).

Đồ án học phần — phát triển bởi Liễu.

Tính năng chính

Tài khoản & phân quyền

Đăng ký / đăng nhập (JWT), đặt lại mật khẩu
RBAC cơ bản: phân quyền theo hành động cho Admin / User

Giao dịch & ngân sách

Ghi thu nhập / chi tiêu, gắn danh mục (category)
Danh sách giao dịch: tìm kiếm, lọc, sắp xếp, phân trang
Quản lý Category (thêm/sửa/xóa)
Thiết lập Budget theo category & thời gian, tính % đã dùng, cảnh báo khi gần/vượt ngân sách

Dashboard & báo cáo

Dashboard tổng quan: thu nhập, chi tiêu, số dư, tình trạng ngân sách
Biểu đồ chi tiêu theo category và theo thời gian (Recharts)
Báo cáo tài chính theo tháng
Xuất dữ liệu CSV/PDF, nhập dữ liệu từ CSV

Reminder & thông báo

Nhắc nhở chi tiêu định kỳ qua email và/hoặc thông báo trong app

Quản trị hệ thống

Trang Admin: quản lý người dùng (khóa/mở tài khoản), quản lý category mặc định, thống kê tổng quan hệ thống (không truy cập chi tiết giao dịch cá nhân của user)

Vận hành & bảo mật

Audit log (ghi lại hành động, ai làm gì, lúc nào), soft-delete cho dữ liệu quan trọng
Chống SQL injection (parameterized query), chống XSS/CSRF cơ bản, rate limiting, cấu hình CORS
Structured logging + health check endpoint
Seed script sinh ≥ 2.000 bản ghi dữ liệu mẫu để kiểm thử
Công nghệ sử dụng
Thành phần	Công nghệ
Frontend + Backend	Next.js (App Router, TypeScript)
Cơ sở dữ liệu	MySQL
Truy vấn DB	mysql2 (SQL thuần, không dùng ORM)
Xác thực	NextAuth.js (Credentials provider, JWT strategy)
Giao diện	Tailwind CSS
Biểu đồ	Recharts
Xuất CSV	papaparse
Xuất PDF	react-pdf (@react-pdf/renderer)
Container hóa	Docker, docker-compose
CI	GitHub Actions (build & test khi push)
Kiểm thử	Jest (unit test) + Supertest (integration test API)
Tài liệu API	OpenAPI/Swagger + Postman collection
Kiến trúc hệ thống

Kiến trúc 3 tầng:

Trình duyệt (Next.js + Tailwind CSS)
        │
        ▼
Next.js Application (App Router)
 ├─ Tài khoản & Admin      → Đăng nhập, phân quyền
 ├─ Giao dịch / Category   → Thu, chi, danh mục
 └─ Budget & Dashboard     → Ngân sách, biểu đồ
        │  (mysql2 - SQL thuần)
        ▼
MySQL Database
Cấu trúc thư mục
project-root/
├── src/
│   ├── app/
│   │   ├── (auth)/          # login, register, forgot-password
│   │   ├── (dashboard)/     # dashboard, transactions, categories, budgets, reports
│   │   ├── admin/           # trang quản trị
│   │   └── api/             # API routes
│   ├── components/          # UI components dùng chung
│   ├── lib/
│   │   ├── db.ts            # connection pool mysql2
│   │   ├── auth.ts          # cấu hình NextAuth
│   │   └── validators/      # kiểm tra dữ liệu đầu vào
│   ├── styles/
│   └── types/
├── sql/
│   ├── schema.sql           # câu lệnh CREATE TABLE
│   └── seed.ts              # script sinh dữ liệu mẫu (>= 2000 bản ghi)
├── tests/
│   ├── unit/
│   └── integration/
├── docs/
│   ├── SRS.md
│   ├── ERD.png
│   └── postman_collection.json
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── package.json
Yêu cầu hệ thống
Node.js ≥ 18
MySQL ≥ 8.0
Docker & Docker Compose (tùy
