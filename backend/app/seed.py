"""
Seed script: sinh >= 2000 bản ghi mẫu cho finance_app.

Chạy (trong thư mục backend/, DB đã có schema từ sql/schema.sql, .env đã điền DB_*):
    python -m app.seed
Trong Docker:
    docker compose exec api python -m app.seed

Chạy lại nhiều lần được: user/category/budget đã tồn tại thì dùng lại, không nhân bản;
transactions/reminders/audit_logs thì được thêm mới mỗi lần chạy.
"""

import asyncio
import random
import sys
from datetime import date, timedelta

from app.db import close_pool, get_conn, init_pool
from app.security import hash_password

DEFAULT_CATEGORIES = [
    ("Lương", "income"),
    ("Thưởng", "income"),
    ("Đầu tư", "income"),
    ("Freelance", "income"),
    ("Ăn uống", "expense"),
    ("Di chuyển", "expense"),
    ("Mua sắm", "expense"),
    ("Hóa đơn", "expense"),
    ("Giải trí", "expense"),
    ("Y tế", "expense"),
    ("Giáo dục", "expense"),
    ("Tiết kiệm", "expense"),
]

USER_CATEGORIES = [
    ("Thuê nhà", "expense"),
    ("Pet", "expense"),
    ("Game", "expense"),
    ("Bán hàng online", "income"),
]

TRANSACTION_NOTES = [
    "Mua tạp hóa", "Cà phê sáng", "Xăng xe", "Điện thoại", "Netflix",
    "Khám bệnh", "Học phí", "Ăn tối nhà hàng", "Grab Food", "Siêu thị",
    "Tiền điện", "Tiền nước", "Internet", "Gym", "Sách",
    None, None, None,  # một số giao dịch không có note
]

REMINDER_TITLES = [
    "Trả tiền thuê nhà", "Thanh toán hóa đơn điện", "Nhắc tiết kiệm tháng",
    "Trả góp mua xe", "Phí bảo hiểm", "Nộp học phí",
]

USER_COUNT = 10
TX_PER_USER = 220  # 10 users x 220 = 2200 giao dịch
ADMIN_EMAIL = "admin@vivang.app"
ADMIN_PASSWORD = "Admin@123!"
USER_PASSWORD = "Password123!"


def rand_amount(lo: int, hi: int) -> float:
    return round(random.uniform(lo, hi), 2)


def rand_date(start: date, end: date) -> date:
    return start + timedelta(days=random.randint(0, (end - start).days))


def month_period(year: int, month: int) -> tuple[date, date]:
    start = date(year, month, 1)
    next_month = date(year + (month == 12), month % 12 + 1, 1)
    return start, next_month - timedelta(days=1)


async def get_or_create_category(cur, user_id: int | None, name: str, type_: str) -> int:
    # Không dựa vào INSERT IGNORE: UNIQUE(user_id, name, type) không chặn trùng khi user_id IS NULL.
    await cur.execute(
        "SELECT id FROM categories WHERE user_id <=> %s AND name = %s AND type = %s",
        (user_id, name, type_),
    )
    row = await cur.fetchone()
    if row:
        return row["id"]
    await cur.execute(
        "INSERT INTO categories (user_id, name, type) VALUES (%s, %s, %s)",
        (user_id, name, type_),
    )
    return cur.lastrowid


async def get_or_create_user(cur, name: str, email: str, password_hash: str, role: str = "user") -> int:
    await cur.execute("SELECT id FROM users WHERE email = %s", (email,))
    row = await cur.fetchone()
    if row:
        return row["id"]
    await cur.execute(
        "INSERT INTO users (name, email, password_hash, role) VALUES (%s, %s, %s, %s)",
        (name, email, password_hash, role),
    )
    return cur.lastrowid


async def seed() -> None:
    await init_pool()
    try:
        async with get_conn() as conn, conn.cursor() as cur:
            print("Bắt đầu seed dữ liệu...\n")

            # 1. Categories mặc định (user_id = NULL)
            default_cats: dict[str, list[int]] = {"income": [], "expense": []}
            for name, type_ in DEFAULT_CATEGORIES:
                default_cats[type_].append(await get_or_create_category(cur, None, name, type_))
            print(f"  - {len(DEFAULT_CATEGORIES)} categories mặc định")

            # 2. Users: 1 admin + USER_COUNT user thường, user cuối bị khóa
            admin_id = await get_or_create_user(cur, "Admin", ADMIN_EMAIL, hash_password(ADMIN_PASSWORD), "admin")
            user_hash = hash_password(USER_PASSWORD)
            user_ids = [
                await get_or_create_user(cur, f"Người dùng {i}", f"user{i}@vivang.app", user_hash)
                for i in range(1, USER_COUNT + 1)
            ]
            await cur.execute(
                "UPDATE users SET status = 'locked' WHERE email = %s", (f"user{USER_COUNT}@vivang.app",)
            )
            print(f"  - 1 admin + {len(user_ids)} users (user{USER_COUNT} bị khóa)")

            # 3. Categories riêng của từng user, tách theo loại để giao dịch luôn khớp type
            user_cats: dict[int, dict[str, list[int]]] = {}
            for uid in user_ids:
                user_cats[uid] = {"income": [], "expense": []}
                for name, type_ in USER_CATEGORIES:
                    user_cats[uid][type_].append(await get_or_create_category(cur, uid, name, type_))
            print(f"  - {len(USER_CATEGORIES)} categories riêng x {len(user_ids)} users")

            # 4. Transactions: từ 01/01/2024 đến hôm nay, 25% thu / 75% chi
            today = date.today()
            tx_start = date(2024, 1, 1)
            total_tx = 0
            for uid in user_ids:
                rows = []
                for _ in range(TX_PER_USER):
                    type_ = "income" if random.random() < 0.25 else "expense"
                    amount = rand_amount(1_000_000, 30_000_000) if type_ == "income" else rand_amount(10_000, 5_000_000)
                    category_id = random.choice(default_cats[type_] + user_cats[uid][type_])
                    rows.append((uid, category_id, type_, amount, rand_date(tx_start, today), random.choice(TRANSACTION_NOTES)))
                await cur.executemany(
                    "INSERT INTO transactions (user_id, category_id, type, amount, transaction_date, note) "
                    "VALUES (%s, %s, %s, %s, %s, %s)",
                    rows,
                )
                total_tx += len(rows)
            print(f"  - {total_tx} transactions")

            # 5. Budgets: tháng hiện tại và 2 tháng trước, mỗi tháng 3 category chi tiêu
            periods = []
            y, m = today.year, today.month
            for _ in range(3):
                periods.append(month_period(y, m))
                y, m = (y - 1, 12) if m == 1 else (y, m - 1)
            total_budgets = 0
            for uid in user_ids:
                for start, end in periods:
                    for cat_id in random.sample(default_cats["expense"], 3):
                        total_budgets += await cur.execute(
                            "INSERT IGNORE INTO budgets (user_id, category_id, amount_limit, period_start, period_end) "
                            "VALUES (%s, %s, %s, %s, %s)",
                            (uid, cat_id, rand_amount(500_000, 10_000_000), start, end),
                        )
            print(f"  - {total_budgets} budgets mới")

            # 6. Reminders: 2-4 nhắc nhở / user, ngày chạy kế tiếp trong vòng ~15 tháng tới
            total_reminders = 0
            for uid in user_ids:
                for _ in range(random.randint(2, 4)):
                    await cur.execute(
                        "INSERT INTO reminders (user_id, title, recurrence, next_run_date, channel, is_active) "
                        "VALUES (%s, %s, %s, %s, %s, 1)",
                        (
                            uid,
                            random.choice(REMINDER_TITLES),
                            random.choice(["monthly", "weekly", "monthly", "yearly"]),
                            rand_date(today + timedelta(days=1), today + timedelta(days=450)),
                            random.choice(["email", "in_app", "both"]),
                        ),
                    )
                    total_reminders += 1
            print(f"  - {total_reminders} reminders")

            # 7. Audit logs
            actions = [
                "transactions.create", "transactions.update", "transactions.delete",
                "categories.create", "budgets.create", "reminders.create",
                "users.change_password",
            ]
            log_rows = []
            for uid in user_ids:
                for _ in range(random.randint(15, 30)):
                    action = random.choice(actions)
                    log_rows.append((uid, action, action.split(".")[0], "127.0.0.1"))
            log_rows += [(admin_id, "users.lock_unlock", "users", "127.0.0.1")] * 20
            await cur.executemany(
                "INSERT INTO audit_logs (user_id, action, target_table, ip_address) VALUES (%s, %s, %s, %s)",
                log_rows,
            )
            print(f"  - {len(log_rows)} audit logs")

            print("\nSeed hoàn tất. Tài khoản test:")
            print(f"  Admin : {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
            print(f"  User  : user1@vivang.app -> user{USER_COUNT - 1}@vivang.app / {USER_PASSWORD}")
            print(f"  Locked: user{USER_COUNT}@vivang.app (bị khóa)")
    finally:
        await close_pool()


if __name__ == "__main__":
    # Như app/main.py: console Windows không mặc định UTF-8, in tiếng Việt có dấu sẽ lỗi.
    for _stream in (sys.stdout, sys.stderr):
        if hasattr(_stream, "reconfigure"):
            _stream.reconfigure(encoding="utf-8", errors="replace")
    asyncio.run(seed())
