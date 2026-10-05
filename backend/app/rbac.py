"""
============================================================================
MODULE PHÂN QUYỀN TRUY CẬP DỰA TRÊN VAI TRÒ (RBAC - Role-Based Access Control)
============================================================================
Ported 1:1 from frontend/src/lib/rbac.ts. Tuân thủ đặc tả SRS §4.
"""

from typing import Literal

Role = Literal["user", "admin"]
ROLES: tuple[Role, ...] = ("user", "admin")

Action = Literal[
    "auth.register",
    "auth.login",
    "auth.reset_password",
    "transactions.create",
    "transactions.view_own",
    "transactions.update_own",
    "transactions.delete_own",
    "transactions.view_others",
    "transactions.import_export",
    "categories.manage_own",
    "categories.manage_default",
    "categories.view_default",
    "budgets.manage_own",
    "dashboard.view_own",
    "reminders.manage_own",
    "users.view_list",
    "users.lock_unlock",
    "users.view_profile",
    "stats.view_system",
    "audit_logs.view",
]

_ROLE_PERMISSIONS: dict[Role, set[Action]] = {
    "user": {
        "auth.register",
        "auth.login",
        "auth.reset_password",
        "transactions.create",
        "transactions.view_own",
        "transactions.update_own",
        "transactions.delete_own",
        "transactions.import_export",
        "categories.manage_own",
        "categories.view_default",
        "budgets.manage_own",
        "dashboard.view_own",
        "reminders.manage_own",
    },
    # LƯU Ý BẢO MẬT (NFR-06): Admin KHÔNG được cấp quyền `transactions.view_others`.
    "admin": {
        "auth.login",
        "auth.reset_password",
        "transactions.create",
        "transactions.view_own",
        "transactions.update_own",
        "transactions.delete_own",
        "transactions.import_export",
        "categories.manage_own",
        "categories.manage_default",
        "categories.view_default",
        "budgets.manage_own",
        "dashboard.view_own",
        "reminders.manage_own",
        "users.view_list",
        "users.lock_unlock",
        "users.view_profile",
        "stats.view_system",
        "audit_logs.view",
    },
}


def can(role: Role, action: Action) -> bool:
    return action in _ROLE_PERMISSIONS[role]
