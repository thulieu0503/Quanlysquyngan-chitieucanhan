# Backend — tầng dữ liệu

Dự án dùng **Next.js làm cả frontend lẫn backend** (theo SRS): các API route nằm ở
`frontend/src/app/api`, kết nối MySQL qua `mysql2` (SQL thuần) tại `frontend/src/lib/db.ts`.

Thư mục `backend/` chứa phần **cơ sở dữ liệu** dùng chung cho app và Docker:

```
backend/
└── sql/
    ├── schema.sql   # CREATE TABLE (users, categories, transactions, budgets, reminders, audit_logs, password_resets) + view v_budget_usage
    └── seed.ts      # (sẽ thêm) script sinh >= 2.000 bản ghi dữ liệu mẫu
```

`docker-compose.yml` mount `sql/schema.sql` vào MySQL, nên schema được nạp tự động ở lần khởi tạo container đầu tiên.
