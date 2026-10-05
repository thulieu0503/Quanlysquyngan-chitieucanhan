# Ứng dụng Quản lý Thu Chi Cá Nhân

Ứng dụng web giúp người dùng ghi nhận thu nhập/chi tiêu, quản lý ngân sách theo danh mục, xem báo cáo trực quan và nhận nhắc nhở chi tiêu định kỳ. Hệ thống có 2 vai trò: User (quản lý tài chính cá nhân) và Admin (quản trị người dùng và danh mục hệ thống).

## Tính năng chính

### Tài khoản & phân quyền

- Đăng ký / đăng nhập (JWT), đặt lại mật khẩu
- RBAC cơ bản: phân quyền theo hành động cho Admin / User

### Giao dịch & ngân sách

- Ghi thu nhập / chi tiêu, gắn danh mục (category)
- Danh sách giao dịch: tìm kiếm, lọc, sắp xếp, phân trang
- Quản lý Category (thêm/sửa/xóa)
- Thiết lập Budget theo category & thời gian, tính % đã dùng, cảnh báo khi gần/vượt ngân sách

### Dashboard & báo cáo

- Dashboard tổng quan: thu nhập, chi tiêu, số dư, tình trạng ngân sách
- Biểu đồ chi tiêu theo category và theo thời gian (Recharts)
- Báo cáo tài chính theo tháng
- Xuất dữ liệu CSV/PDF, nhập dữ liệu từ CSV

### Reminder & thông báo

- Nhắc nhở chi tiêu định kỳ qua email và/hoặc thông báo trong app

### Quản trị hệ thống

- Trang Admin: quản lý người dùng (khóa/mở tài khoản), quản lý category mặc định, thống kê tổng quan hệ thống (không truy cập chi tiết giao dịch cá nhân của user)

### Vận hành & bảo mật
- Audit log (ghi lại hành động, ai làm gì, lúc nào), soft-delete cho dữ liệu quan trọng
- Chống SQL injection (parameterized query), chống XSS/CSRF cơ bản, rate limiting, cấu hình CORS
- Structured logging + health check endpoint
- Seed script sinh ≥ 2.000 bản ghi dữ liệu mẫu để kiểm thử

## Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Frontend | Next.js (App Router, TypeScript), Tailwind CSS |
| Backend API | Python FastAPI |
| Cơ sở dữ liệu | MySQL 8 |
| Truy vấn DB | aiomysql (SQL thuần, tham số hóa, không dùng ORM) |
| Xác thực | JWT (PyJWT) lưu trong cookie httponly, mật khẩu băm bcrypt |
| Email | aiosmtplib (dev: Mailpit) |
| Container hóa | Docker, docker-compose |
| CI | GitHub Actions (lint, typecheck, build frontend; kiểm tra import backend) |
| Tài liệu API | Swagger tự sinh của FastAPI (`/docs`) + Postman collection |

## Kiến trúc hệ thống

Next.js chỉ là client hiển thị giao diện. Mọi request `/api/*` từ trình duyệt được
`frontend/next.config.mjs` chuyển tiếp (rewrite) sang FastAPI, nên trình duyệt chỉ thấy một origin
và cookie phiên là first-party.

```
Trình duyệt
    │
    ▼
Next.js (frontend/, cổng 3000)  ── giao diện React, rewrite /api/* ──┐
                                                                     ▼
                                             FastAPI (backend/, cổng 8000)
                                              ├─ auth, me, admin
                                              ├─ transactions, categories
                                              ├─ budgets, reminders
                                              └─ reports, dashboard, health
                                                     │  (aiomysql - SQL thuần)
                                                     ▼
                                               MySQL Database
```

## Cấu trúc thư mục

```
project-root/
├── frontend/                    # Next.js (App Router, TypeScript): chỉ giao diện
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/          # login, register, forgot-password, reset-password
│   │   │   └── (dashboard)/     # dashboard, transactions, categories, budgets, reminders, reports, admin
│   │   ├── components/          # UI components dùng chung
│   │   └── lib/
│   │       ├── api-client.ts    # getJson/postJson/... gọi /api/*
│   │       ├── session.ts       # getCurrentUser: hỏi FastAPI GET /api/me
│   │       └── validators/      # kiểm tra form phía client
│   ├── tests/
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
├── backend/                     # FastAPI: toàn bộ nghiệp vụ, xem backend/README.md
│   ├── app/
│   │   ├── routers/             # endpoint HTTP theo module
│   │   ├── repositories/        # toàn bộ câu SQL theo bảng
│   │   ├── schemas/             # validate request
│   │   └── seed.py              # sinh dữ liệu mẫu (>= 2000 bản ghi)
│   ├── sql/schema.sql           # câu lệnh CREATE TABLE
│   ├── requirements.txt
│   └── Dockerfile
├── .github/workflows/ci.yml     # CI khi push/PR
├── docs/
│   ├── SRS.md
│   ├── report.md
│   ├── ERD.mwb
│   ├── ke_hoach_du_an_4_tuan.xlsx
│   └── postman_collection.json
└── docker-compose.yml
```

## Chạy bằng Docker (đơn giản nhất)

```bash
cp backend/.env.example backend/.env          # điền JWT_SECRET (openssl rand -base64 32)
cp frontend/.env.example frontend/.env.local
docker compose up --build
docker compose exec api python -m app.seed    # (tuỳ chọn) nạp dữ liệu mẫu
```

## Chạy ở máy local (không Docker cho app)

1. Bật Docker Desktop, rồi khởi động MySQL + Adminer + Mailpit (schema được nạp tự động lần đầu):

   ```bash
   docker compose up -d db adminer mailpit
   ```

2. Backend:

   ```bash
   cd backend
   python -m venv .venv
   .venv/Scripts/activate        # Windows; Linux/Mac: source .venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env          # điền JWT_SECRET; SMTP_HOST=localhost, SMTP_PORT=1025 để dùng Mailpit
   python -m app.seed            # (tuỳ chọn) nạp dữ liệu mẫu
   uvicorn app.main:app --reload --port 8000
   ```

3. Frontend (terminal khác):

   ```bash
   cd frontend
   npm install
   cp .env.example .env.local    # BACKEND_URL=http://localhost:8000
   npm run dev
   ```

- Web: http://localhost:3000
- Swagger API: http://localhost:8000/docs
- Adminer (xem DB): http://localhost:8080 — server `db`, user `finance_user`, mật khẩu `finance_password`, DB `finance_app`
- Mailpit (hộp thư dev, xem email đặt lại mật khẩu): http://localhost:8025
- MySQL trên máy host: `localhost:3307` (dùng cổng 3307 để không trùng MySQL cài native ở 3306)

Tài khoản mẫu sau khi chạy seed: `admin@vivang.app` / `Admin@123!`, `user1@vivang.app` / `Password123!`.
