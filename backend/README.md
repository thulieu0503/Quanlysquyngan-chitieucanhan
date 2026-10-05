# Backend — FastAPI (Python)

Dịch vụ backend độc lập, viết bằng **Python (FastAPI)**, sở hữu toàn bộ logic nghiệp vụ,
truy cập MySQL (SQL thuần qua `aiomysql`, không dùng ORM — đúng yêu cầu đề bài), phát hành
JWT và gửi email. `frontend/` (Next.js) chỉ còn là client: mọi request `/api/*` được
`frontend/next.config.mjs` rewrite sang service này (biến `BACKEND_URL`), nên trình duyệt
luôn thấy một origin duy nhất và cookie phiên vẫn là first-party.

```
backend/
├── app/
│   ├── main.py            FastAPI app, CORS, exception handler, đăng ký router
│   ├── config.py          Cấu hình đọc từ .env (pydantic-settings)
│   ├── db.py               Connection pool aiomysql, with_transaction()
│   ├── security.py         bcrypt hash/verify, JWT encode/decode
│   ├── rbac.py             Roles/actions/ma trận quyền (SRS §4)
│   ├── deps.py              get_current_user, require_action(action)
│   ├── errors.py            ApiError + exception handler thống nhất
│   ├── otp.py / mail.py     Mã OTP đặt lại mật khẩu, gửi email (SMTP/Mailpit)
│   ├── audit.py             Ghi audit_logs
│   ├── pagination.py        Helper phân trang {data,total,page,limit,totalPages}
│   ├── schemas/              Validate request theo từng module (auth, transaction, ...)
│   ├── repositories/          Toàn bộ câu SQL, theo bảng (transactions, budgets, ...)
│   ├── routers/               Endpoint HTTP, ứng với từng module nghiệp vụ
│   └── seed.py                Sinh dữ liệu mẫu >= 2000 bản ghi (python -m app.seed)
├── sql/schema.sql          Schema MySQL (dùng chung cho app và Docker)
├── requirements.txt
└── Dockerfile
```

## Chạy local (không cần Docker)

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate        # Windows; Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # điền DB_*, JWT_SECRET, SMTP_*
uvicorn app.main:app --reload --port 8000
```

Frontend chạy `npm run dev` ở `frontend/` với `BACKEND_URL=http://localhost:8000` trong
`frontend/.env.local` — xem `frontend/.env.example`.

## Chạy bằng Docker Compose

`docker-compose.yml` ở gốc repo có service `api` (build từ `backend/Dockerfile`), `db`
(MySQL, tự nạp `sql/schema.sql`), `mailpit` (SMTP giả cho dev) và `app` (frontend, rewrite
`/api/*` sang `api:8000` qua mạng nội bộ Docker).

```bash
docker compose up --build
```
