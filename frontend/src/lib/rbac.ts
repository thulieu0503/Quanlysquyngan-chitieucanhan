/**
 * ============================================================================
 * MODULE PHÂN QUYỀN TRUY CẬP DỰA TRÊN VAI TRÒ (RBAC - Role-Based Access Control)
 * ============================================================================
 * File này định nghĩa các vai trò (Role), danh sách hành động (Action) trong hệ thống
 * và bảng ma trận quyền hạn (Permissions Matrix) để kiểm soát quyền truy cập API.
 * Tuân thủ đặc tả yêu cầu phần mềm ở tài liệu SRS §4.
 */

/** Danh sách các vai trò trong hệ thống: người dùng thường ('user') và quản trị viên ('admin') */
export const ROLES = ["user", "admin"] as const;
export type Role = (typeof ROLES)[number];

/**
 * Danh sách tất cả các hành động / quyền hạn (Actions) trong hệ thống.
 * Tên action được đặt theo quy ước: `tên_module.hành_động`
 */
export const ACTIONS = [
  // --- Module Xác thực & Tài khoản ---
  "auth.register",        // Đăng ký tài khoản mới
  "auth.login",           // Đăng nhập hệ thống
  "auth.reset_password",  // Quên & đặt lại mật khẩu

  // --- Module Giao dịch Thu/Chi ---
  "transactions.create",        // Tạo giao dịch mới
  "transactions.view_own",      // Xem danh sách và chi tiết giao dịch của chính mình
  "transactions.update_own",    // Cập nhật giao dịch của chính mình
  "transactions.delete_own",    // Xóa giao dịch của chính mình
  "transactions.view_others",   // [CẤM] Xem giao dịch của người khác (không role nào có quyền này - NFR-06)
  "transactions.import_export", // Import file CSV / Export dữ liệu giao dịch

  // --- Module Danh mục Thu/Chi ---
  "categories.manage_own",      // Tạo, sửa, xóa danh mục cá nhân của chính mình
  "categories.manage_default",  // Quản trị viên thêm/sửa danh mục hệ thống mặc định
  "categories.view_default",    // Xem danh mục mặc định của hệ thống

  // --- Module Ngân sách & Hạn mức ---
  "budgets.manage_own",         // Thiết lập và quản lý ngân sách cá nhân

  // --- Module Báo cáo & Thống kê cá nhân ---
  "dashboard.view_own",         // Xem biểu đồ dashboard tổng quan tài chính cá nhân

  // --- Module Nhắc nhở định kỳ ---
  "reminders.manage_own",       // Tạo và quản lý lịch nhắc nhở thanh toán hóa đơn

  // --- Module Quản trị Hệ thống (Dành cho Admin) ---
  "users.view_list",            // Admin xem danh sách tất cả tài khoản người dùng
  "users.lock_unlock",          // Admin khóa hoặc mở khóa tài khoản người dùng
  "users.view_profile",         // Admin xem thông tin chi tiết một người dùng
  "stats.view_system",          // Admin xem thống kê tổng quan toàn hệ thống
  "audit_logs.view",            // Admin xem nhật ký hoạt động (audit logs)
] as const;
export type Action = (typeof ACTIONS)[number];

/**
 * Ma trận phân quyền (Role Permissions Map):
 * - User: Toàn quyền với dữ liệu tài chính cá nhân của chính họ.
 * - Admin: Quản trị tài khoản, danh mục mặc định, thống kê, audit log.
 *   LƯU Ý BẢO MẬT (NFR-06): Admin KHÔNG được cấp quyền `transactions.view_others` để bảo mật tài chính cá nhân.
 */
const rolePermissions: Record<Role, ReadonlySet<Action>> = {
  user: new Set<Action>([
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
  ]),
  admin: new Set<Action>([
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
  ]),
};

/**
 * Hàm kiểm tra quyền hạn của một Role đối với một Action cụ thể.
 * @param role - Vai trò của người dùng ('user' hoặc 'admin')
 * @param action - Hành động muốn thực hiện (ví dụ: 'users.lock_unlock')
 * @returns true nếu có quyền, false nếu không được phép
 */
export function can(role: Role, action: Action): boolean {
  return rolePermissions[role].has(action);
}
