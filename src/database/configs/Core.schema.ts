/**
 * core.schema.ts
 *
 * Schema cơ sở dữ liệu CORE cho hệ thống 1POS Ecosystem.
 *
 * Phạm vi: Quản lý doanh nghiệp, cửa hàng/chi nhánh, người dùng,
 *           phân quyền, phiên đăng nhập, cấu hình hệ thống và audit log.
 *
 * Đây là tầng NỀN TẢNG – các DB khác (pos, resident, booking)
 * tham chiếu store_id / user_id từ database này.
 *
 * Tuân thủ đầy đủ format DatabaseSchema của @dqcai/sqlite:
 *   version, database_name, description, type_mapping, schemas[]
 *   Mỗi schema có: cols[], indexes[], foreign_keys[]
 */

import {DatabaseSchema} from '@dqcai/sqlite';

// ─── Type mapping dùng chung ──────────────────────────────────────────────────
const SQLITE_TYPE_MAPPING = {
  sqlite: {
    string: 'TEXT',
    varchar: 'TEXT',
    char: 'TEXT',
    email: 'TEXT',
    url: 'TEXT',
    uuid: 'TEXT',
    integer: 'INTEGER',
    bigint: 'INTEGER',
    smallint: 'INTEGER',
    tinyint: 'INTEGER',
    decimal: 'REAL',
    numeric: 'REAL',
    float: 'REAL',
    double: 'REAL',
    boolean: 'INTEGER',
    timestamp: 'TEXT',
    datetime: 'TEXT',
    date: 'TEXT',
    time: 'TEXT',
    json: 'TEXT',
    array: 'TEXT',
    blob: 'BLOB',
    binary: 'BLOB',
  },
};

export const coreSchema: DatabaseSchema = {
  version: 'v1',
  database_name: 'core.db',
  description:
    'Cơ sở dữ liệu nền tảng của hệ thống 1POS Ecosystem. Quản lý doanh nghiệp, ' +
    'cửa hàng/chi nhánh (tenant), người dùng, phân quyền, phiên đăng nhập và audit log. ' +
    'Tất cả database khác (pos, resident, booking) đều tham chiếu store_id từ đây.',
  type_mapping: SQLITE_TYPE_MAPPING,
  schemas: {

    // ══════════════════════════════════════════════════════════════════════════
    //  1. ENTERPRISES – Doanh nghiệp
    // ══════════════════════════════════════════════════════════════════════════
    enterprises: {
      description:
        'Bảng quản lý doanh nghiệp – cấp cao nhất trong hệ thống multi-tenant. ' +
        'Một doanh nghiệp có thể sở hữu nhiều cửa hàng/chi nhánh.',
      cols: [
        {
          name: 'id',
          type: 'uuid',
          constraints: 'NOT NULL UNIQUE PRIMARY KEY',
          description: 'Mã định danh duy nhất của doanh nghiệp (UUID v4).',
        },
        {
          name: 'name',
          type: 'varchar',
          length: 255,
          constraints: 'NOT NULL',
          description: 'Tên chính thức của doanh nghiệp.',
        },
        {
          name: 'enterprise_code',
          type: 'varchar',
          length: 30,
          constraints: 'UNIQUE',
          description: 'Mã doanh nghiệp viết tắt dùng trong hệ thống (VD: CAFE001).',
        },
        {
          name: 'business_type',
          type: 'varchar',
          length: 30,
          description: 'Loại hình kinh doanh pháp lý.',
          enum: ['ltd', 'joint_stock', 'private', 'partnership', 'sole_proprietorship', 'household'],
        },
        {
          name: 'industries',
          type: 'json',
          description:
            'Danh sách ngành nghề kinh doanh (JSON array). ' +
            'VD: ["cafe","hostel","pos"]',
        },
        {
          name: 'tax_code',
          type: 'varchar',
          length: 20,
          description: 'Mã số thuế của doanh nghiệp.',
        },
        {
          name: 'address',
          type: 'string',
          description: 'Địa chỉ trụ sở chính.',
        },
        {
          name: 'phone',
          type: 'varchar',
          length: 20,
          description: 'Số điện thoại liên hệ.',
        },
        {
          name: 'email',
          type: 'email',
          description: 'Email chính của doanh nghiệp.',
        },
        {
          name: 'website',
          type: 'url',
          description: 'Website chính thức.',
        },
        {
          name: 'logo_url',
          type: 'url',
          description: 'Đường dẫn logo doanh nghiệp.',
        },
        {
          name: 'subscription_plan',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'free'",
          description: 'Gói dịch vụ đang sử dụng.',
          enum: ['free', 'basic', 'pro', 'enterprise'],
        },
        {
          name: 'plan_expired_at',
          type: 'timestamp',
          description: 'Ngày hết hạn gói dịch vụ. NULL = không giới hạn.',
        },
        {
          name: 'max_stores',
          type: 'integer',
          constraints: 'DEFAULT 1',
          description: 'Số cửa hàng tối đa theo gói.',
        },
        {
          name: 'settings',
          type: 'json',
          description:
            'Cấu hình toàn doanh nghiệp (JSON). ' +
            'VD: {"default_currency":"VND","fiscal_year_start":"01-01"}',
        },
        {
          name: 'status',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'active'",
          description: 'Trạng thái hoạt động.',
          enum: ['active', 'inactive', 'suspended', 'pending'],
        },
        {
          name: 'sync_status',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'local'",
          description: 'Trạng thái đồng bộ dữ liệu lên cloud.',
          enum: ['local', 'synced', 'conflict', 'pending_sync'],
        },
        {
          name: 'created_at',
          type: 'timestamp',
          constraints: 'DEFAULT CURRENT_TIMESTAMP',
          description: 'Thời gian tạo bản ghi.',
        },
        {
          name: 'updated_at',
          type: 'timestamp',
          constraints: 'DEFAULT CURRENT_TIMESTAMP',
          description: 'Thời gian cập nhật lần cuối.',
        },
        {
          name: 'deleted_at',
          type: 'timestamp',
          description: 'Thời gian xoá mềm. NULL = chưa xoá.',
        },
      ],
      indexes: [
        {
          name: 'idx_enterprises_tax_code',
          columns: ['tax_code'],
          unique: true,
          description: 'Index duy nhất cho mã số thuế.',
        },
        {
          name: 'idx_enterprises_enterprise_code',
          columns: ['enterprise_code'],
          unique: true,
          description: 'Index duy nhất cho mã doanh nghiệp.',
        },
        {
          name: 'idx_enterprises_status_plan',
          columns: ['status', 'subscription_plan'],
          unique: false,
          description: 'Index composite lọc theo trạng thái và gói dịch vụ.',
        },
        {
          name: 'idx_enterprises_sync_status',
          columns: ['sync_status', 'updated_at'],
          unique: false,
          description: 'Index phục vụ hàng đợi đồng bộ offline → cloud.',
        },
      ],
      foreign_keys: [],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  2. STORES – Cửa hàng / Chi nhánh / Điểm POS
    // ══════════════════════════════════════════════════════════════════════════
    stores: {
      description:
        'Bảng quản lý cửa hàng / chi nhánh thuộc doanh nghiệp. ' +
        'store_id là khoá phân tách tenant – xuất hiện ở mọi bảng trong pos.db, resident.db, booking.db.',
      cols: [
        {
          name: 'id',
          type: 'uuid',
          constraints: 'NOT NULL UNIQUE PRIMARY KEY',
          description: 'Mã định danh duy nhất của cửa hàng (UUID). Dùng làm tenant key.',
        },
        {
          name: 'enterprise_id',
          type: 'uuid',
          constraints: 'NOT NULL',
          description: 'Mã doanh nghiệp sở hữu cửa hàng này.',
        },
        {
          name: 'store_code',
          type: 'varchar',
          length: 30,
          constraints: 'NOT NULL',
          description: 'Mã cửa hàng viết tắt (VD: SHOP-DN01, HTL-001).',
        },
        {
          name: 'name',
          type: 'varchar',
          length: 255,
          constraints: 'NOT NULL',
          description: 'Tên cửa hàng / chi nhánh.',
        },
        {
          name: 'store_type',
          type: 'varchar',
          length: 30,
          description: 'Loại hình cửa hàng.',
          enum: ['cafe', 'restaurant', 'bakery', 'grocery', 'hostel', 'hotel', 'spa', 'clinic', 'sport', 'karaoke', 'other'],
        },
        {
          name: 'address',
          type: 'string',
          description: 'Địa chỉ cửa hàng.',
        },
        {
          name: 'phone',
          type: 'varchar',
          length: 20,
          description: 'Số điện thoại cửa hàng.',
        },
        {
          name: 'email',
          type: 'email',
          description: 'Email liên hệ của cửa hàng.',
        },
        {
          name: 'manager_name',
          type: 'varchar',
          length: 100,
          description: 'Tên người quản lý cửa hàng.',
        },
        {
          name: 'logo_url',
          type: 'url',
          description: 'Logo riêng của cửa hàng (nếu khác doanh nghiệp).',
        },
        {
          name: 'timezone',
          type: 'varchar',
          length: 50,
          constraints: "DEFAULT 'Asia/Ho_Chi_Minh'",
          description: 'Múi giờ của cửa hàng (IANA format).',
        },
        {
          name: 'currency',
          type: 'varchar',
          length: 3,
          constraints: "DEFAULT 'VND'",
          description: 'Đơn vị tiền tệ (ISO 4217).',
        },
        {
          name: 'tax_rate',
          type: 'decimal',
          precision: 5,
          scale: 2,
          constraints: 'DEFAULT 0',
          description: 'Tỷ lệ thuế mặc định áp dụng tại cửa hàng (%).',
        },
        {
          name: 'operating_hours',
          type: 'json',
          description:
            'Giờ hoạt động theo ngày trong tuần (JSON). ' +
            'VD: {"mon":"07:00-22:00","sun":"08:00-21:00"}',
        },
        {
          name: 'settings',
          type: 'json',
          description:
            'Cấu hình riêng của cửa hàng (JSON). ' +
            'VD: {"receipt_footer":"Cảm ơn!","print_logo":true}',
        },
        {
          name: 'sync_enabled',
          type: 'boolean',
          constraints: 'DEFAULT TRUE',
          description: 'Cho phép đồng bộ dữ liệu lên cloud.',
        },
        {
          name: 'last_sync_at',
          type: 'timestamp',
          description: 'Thời điểm đồng bộ thành công lần cuối.',
        },
        {
          name: 'status',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'active'",
          description: 'Trạng thái hoạt động.',
          enum: ['active', 'inactive', 'maintenance', 'closed'],
        },
        {
          name: 'sort_order',
          type: 'integer',
          constraints: 'DEFAULT 0',
          description: 'Thứ tự hiển thị trong danh sách.',
        },
        {
          name: 'sync_status',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'local'",
          description: 'Trạng thái đồng bộ.',
          enum: ['local', 'synced', 'conflict', 'pending_sync'],
        },
        {
          name: 'created_at',
          type: 'timestamp',
          constraints: 'DEFAULT CURRENT_TIMESTAMP',
          description: 'Thời gian tạo bản ghi.',
        },
        {
          name: 'updated_at',
          type: 'timestamp',
          constraints: 'DEFAULT CURRENT_TIMESTAMP',
          description: 'Thời gian cập nhật lần cuối.',
        },
        {
          name: 'deleted_at',
          type: 'timestamp',
          description: 'Thời gian xoá mềm. NULL = chưa xoá.',
        },
      ],
      indexes: [
        {
          name: 'idx_stores_enterprise_id',
          columns: ['enterprise_id'],
          unique: false,
          description: 'Index tìm cửa hàng theo doanh nghiệp.',
        },
        {
          name: 'idx_stores_enterprise_code',
          columns: ['enterprise_id', 'store_code'],
          unique: true,
          description: 'Đảm bảo mã cửa hàng duy nhất trong mỗi doanh nghiệp.',
        },
        {
          name: 'idx_stores_status',
          columns: ['status'],
          unique: false,
          description: 'Index lọc theo trạng thái hoạt động.',
        },
        {
          name: 'idx_stores_sync_status',
          columns: ['sync_status', 'updated_at'],
          unique: false,
          description: 'Index phục vụ hàng đợi đồng bộ.',
        },
      ],
      foreign_keys: [
        {
          name: 'fk_stores_enterprise_id',
          columns: ['enterprise_id'],
          references: {table: 'enterprises', columns: ['id']},
          on_delete: 'CASCADE',
          on_update: 'CASCADE',
          description: 'Cửa hàng thuộc doanh nghiệp.',
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  3. ROLES – Vai trò phân quyền
    // ══════════════════════════════════════════════════════════════════════════
    roles: {
      description:
        'Danh mục vai trò người dùng. Hỗ trợ cả role hệ thống (is_system=true) ' +
        'và role tuỳ chỉnh theo từng doanh nghiệp.',
      cols: [
        {
          name: 'id',
          type: 'uuid',
          constraints: 'NOT NULL UNIQUE PRIMARY KEY',
          description: 'Mã vai trò (UUID).',
        },
        {
          name: 'enterprise_id',
          type: 'uuid',
          description: 'Doanh nghiệp sở hữu role này. NULL = role hệ thống dùng chung.',
        },
        {
          name: 'role_code',
          type: 'varchar',
          length: 30,
          constraints: 'NOT NULL',
          description: 'Mã vai trò định danh.',
          enum: ['super_admin', 'admin', 'manager', 'cashier', 'accountant', 'receptionist', 'staff', 'viewer'],
        },
        {
          name: 'role_name',
          type: 'varchar',
          length: 100,
          constraints: 'NOT NULL',
          description: 'Tên hiển thị của vai trò.',
        },
        {
          name: 'permissions',
          type: 'json',
          description:
            'Danh sách quyền chi tiết (JSON array). ' +
            'VD: ["invoice.create","invoice.delete","report.view"]',
        },
        {
          name: 'is_system',
          type: 'boolean',
          constraints: 'DEFAULT FALSE',
          description: 'Role hệ thống – không được phép xoá hoặc chỉnh sửa.',
        },
        {
          name: 'sort_order',
          type: 'integer',
          constraints: 'DEFAULT 0',
          description: 'Thứ tự ưu tiên hiển thị.',
        },
        {
          name: 'status',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'active'",
          description: 'Trạng thái vai trò.',
          enum: ['active', 'inactive'],
        },
        {
          name: 'created_at',
          type: 'timestamp',
          constraints: 'DEFAULT CURRENT_TIMESTAMP',
          description: 'Thời gian tạo.',
        },
        {
          name: 'updated_at',
          type: 'timestamp',
          constraints: 'DEFAULT CURRENT_TIMESTAMP',
          description: 'Thời gian cập nhật.',
        },
      ],
      indexes: [
        {
          name: 'idx_roles_enterprise_code',
          columns: ['enterprise_id', 'role_code'],
          unique: true,
          description: 'Đảm bảo mã role duy nhất trong mỗi doanh nghiệp.',
        },
        {
          name: 'idx_roles_is_system',
          columns: ['is_system'],
          unique: false,
          description: 'Index tìm role hệ thống.',
        },
      ],
      foreign_keys: [
        {
          name: 'fk_roles_enterprise_id',
          columns: ['enterprise_id'],
          references: {table: 'enterprises', columns: ['id']},
          on_delete: 'CASCADE',
          on_update: 'CASCADE',
          description: 'Role thuộc doanh nghiệp. NULL = role toàn hệ thống.',
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  4. USERS – Người dùng hệ thống
    // ══════════════════════════════════════════════════════════════════════════
    users: {
      description:
        'Tài khoản người dùng – dùng chung toàn hệ thống. ' +
        'Một user có thể thuộc nhiều cửa hàng (qua bảng user_stores).',
      cols: [
        {
          name: 'id',
          type: 'uuid',
          constraints: 'NOT NULL UNIQUE PRIMARY KEY',
          description: 'Mã định danh duy nhất của người dùng (UUID).',
        },
        {
          name: 'enterprise_id',
          type: 'uuid',
          constraints: 'NOT NULL',
          description: 'Doanh nghiệp mà người dùng thuộc về.',
        },
        {
          name: 'username',
          type: 'varchar',
          length: 50,
          constraints: 'NOT NULL UNIQUE',
          description: 'Tên đăng nhập duy nhất trong toàn hệ thống.',
        },
        {
          name: 'password_hash',
          type: 'varchar',
          length: 255,
          constraints: 'NOT NULL',
          description: 'Mật khẩu đã mã hoá (Bcrypt/Argon2).',
        },
        {
          name: 'pin_code',
          type: 'varchar',
          length: 10,
          description: 'Mã PIN 4-6 số để đăng nhập nhanh trên màn hình POS.',
        },
        {
          name: 'full_name',
          type: 'varchar',
          length: 100,
          constraints: 'NOT NULL',
          description: 'Họ và tên đầy đủ.',
        },
        {
          name: 'email',
          type: 'email',
          constraints: 'UNIQUE',
          description: 'Email của người dùng.',
        },
        {
          name: 'phone',
          type: 'varchar',
          length: 20,
          description: 'Số điện thoại.',
        },
        {
          name: 'avatar_url',
          type: 'url',
          description: 'Ảnh đại diện.',
        },
        {
          name: 'permissions',
          type: 'json',
          description: 'Quyền bổ sung ngoài role (JSON array). Override role permissions.',
        },
        {
          name: 'last_login_at',
          type: 'timestamp',
          description: 'Thời gian đăng nhập lần cuối.',
        },
        {
          name: 'failed_login_attempts',
          type: 'integer',
          constraints: 'DEFAULT 0',
          description: 'Số lần đăng nhập thất bại liên tiếp.',
        },
        {
          name: 'locked_until',
          type: 'timestamp',
          description: 'Tài khoản bị khoá đến thời điểm này.',
        },
        {
          name: 'is_active',
          type: 'boolean',
          constraints: 'DEFAULT TRUE',
          description: 'Trạng thái tài khoản.',
        },
        {
          name: 'sync_status',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'local'",
          description: 'Trạng thái đồng bộ.',
          enum: ['local', 'synced', 'conflict', 'pending_sync'],
        },
        {
          name: 'created_at',
          type: 'timestamp',
          constraints: 'DEFAULT CURRENT_TIMESTAMP',
          description: 'Thời gian tạo tài khoản.',
        },
        {
          name: 'updated_at',
          type: 'timestamp',
          constraints: 'DEFAULT CURRENT_TIMESTAMP',
          description: 'Thời gian cập nhật lần cuối.',
        },
        {
          name: 'deleted_at',
          type: 'timestamp',
          description: 'Thời gian xoá mềm.',
        },
      ],
      indexes: [
        {
          name: 'idx_users_username',
          columns: ['username'],
          unique: true,
          description: 'Index duy nhất cho tên đăng nhập.',
        },
        {
          name: 'idx_users_email',
          columns: ['email'],
          unique: true,
          description: 'Index duy nhất cho email.',
        },
        {
          name: 'idx_users_enterprise_id',
          columns: ['enterprise_id'],
          unique: false,
          description: 'Index tìm user theo doanh nghiệp.',
        },
        {
          name: 'idx_users_is_active',
          columns: ['is_active'],
          unique: false,
          description: 'Index lọc tài khoản đang hoạt động.',
        },
        {
          name: 'idx_users_sync_status',
          columns: ['sync_status', 'updated_at'],
          unique: false,
          description: 'Index phục vụ hàng đợi đồng bộ.',
        },
      ],
      foreign_keys: [
        {
          name: 'fk_users_enterprise_id',
          columns: ['enterprise_id'],
          references: {table: 'enterprises', columns: ['id']},
          on_delete: 'CASCADE',
          on_update: 'CASCADE',
          description: 'Người dùng thuộc doanh nghiệp.',
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  5. USER_STORES – Phân quyền người dùng theo từng cửa hàng
    // ══════════════════════════════════════════════════════════════════════════
    user_stores: {
      description:
        'Bảng N:N phân quyền user theo từng cửa hàng. ' +
        'Một user có thể làm việc ở nhiều cửa hàng với vai trò khác nhau.',
      cols: [
        {
          name: 'id',
          type: 'uuid',
          constraints: 'NOT NULL UNIQUE PRIMARY KEY',
          description: 'Mã định danh (UUID).',
        },
        {
          name: 'user_id',
          type: 'uuid',
          constraints: 'NOT NULL',
          description: 'Mã người dùng.',
        },
        {
          name: 'store_id',
          type: 'uuid',
          constraints: 'NOT NULL',
          description: 'Mã cửa hàng.',
        },
        {
          name: 'role_id',
          type: 'uuid',
          constraints: 'NOT NULL',
          description: 'Vai trò của user tại cửa hàng này.',
        },
        {
          name: 'is_default_store',
          type: 'boolean',
          constraints: 'DEFAULT FALSE',
          description: 'Cửa hàng mặc định khi user đăng nhập.',
        },
        {
          name: 'extra_permissions',
          type: 'json',
          description: 'Quyền bổ sung đặc biệt tại cửa hàng này (JSON array).',
        },
        {
          name: 'status',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'active'",
          description: 'Trạng thái phân quyền.',
          enum: ['active', 'inactive', 'suspended'],
        },
        {
          name: 'created_at',
          type: 'timestamp',
          constraints: 'DEFAULT CURRENT_TIMESTAMP',
          description: 'Thời gian cấp quyền.',
        },
        {
          name: 'updated_at',
          type: 'timestamp',
          constraints: 'DEFAULT CURRENT_TIMESTAMP',
          description: 'Thời gian cập nhật lần cuối.',
        },
      ],
      indexes: [
        {
          name: 'idx_user_stores_user_store',
          columns: ['user_id', 'store_id'],
          unique: true,
          description: 'Đảm bảo mỗi user chỉ có 1 bản ghi tại 1 cửa hàng.',
        },
        {
          name: 'idx_user_stores_store_id',
          columns: ['store_id'],
          unique: false,
          description: 'Index tìm tất cả user của 1 cửa hàng.',
        },
        {
          name: 'idx_user_stores_role_id',
          columns: ['role_id'],
          unique: false,
          description: 'Index tìm theo vai trò.',
        },
      ],
      foreign_keys: [
        {
          name: 'fk_user_stores_user_id',
          columns: ['user_id'],
          references: {table: 'users', columns: ['id']},
          on_delete: 'CASCADE',
          on_update: 'CASCADE',
          description: 'Liên kết với người dùng.',
        },
        {
          name: 'fk_user_stores_store_id',
          columns: ['store_id'],
          references: {table: 'stores', columns: ['id']},
          on_delete: 'CASCADE',
          on_update: 'CASCADE',
          description: 'Liên kết với cửa hàng.',
        },
        {
          name: 'fk_user_stores_role_id',
          columns: ['role_id'],
          references: {table: 'roles', columns: ['id']},
          on_delete: 'RESTRICT',
          on_update: 'CASCADE',
          description: 'Liên kết với vai trò.',
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  6. USER_SESSIONS – Phiên đăng nhập (Offline-first)
    // ══════════════════════════════════════════════════════════════════════════
    user_sessions: {
      description:
        'Bảng quản lý phiên đăng nhập. Hỗ trợ multi-device và offline mode. ' +
        'Khi offline, session vẫn hợp lệ và thiết bị tiếp tục hoạt động cục bộ.',
      cols: [
        {
          name: 'id',
          type: 'uuid',
          constraints: 'NOT NULL UNIQUE PRIMARY KEY',
          description: 'Mã phiên đăng nhập (UUID).',
        },
        {
          name: 'user_id',
          type: 'uuid',
          constraints: 'NOT NULL',
          description: 'Người dùng sở hữu phiên.',
        },
        {
          name: 'store_id',
          type: 'uuid',
          constraints: 'NOT NULL',
          description: 'Cửa hàng mà user đăng nhập vào.',
        },
        {
          name: 'session_token',
          type: 'varchar',
          length: 512,
          constraints: 'NOT NULL UNIQUE',
          description: 'JWT hoặc opaque token xác thực phiên.',
        },
        {
          name: 'refresh_token',
          type: 'varchar',
          length: 512,
          constraints: 'UNIQUE',
          description: 'Token làm mới phiên đăng nhập.',
        },
        {
          name: 'device_id',
          type: 'varchar',
          length: 100,
          description: 'Fingerprint thiết bị đăng nhập.',
        },
        {
          name: 'device_name',
          type: 'varchar',
          length: 100,
          description: 'Tên thiết bị hiển thị (VD: "iPad POS - Quầy 1").',
        },
        {
          name: 'device_type',
          type: 'varchar',
          length: 20,
          description: 'Loại thiết bị.',
          enum: ['mobile', 'tablet', 'desktop', 'kiosk'],
        },
        {
          name: 'device_info',
          type: 'json',
          description: 'Thông tin chi tiết thiết bị (JSON). OS, app version, v.v.',
        },
        {
          name: 'ip_address',
          type: 'varchar',
          length: 45,
          description: 'Địa chỉ IP (hỗ trợ IPv6).',
        },
        {
          name: 'is_offline_mode',
          type: 'boolean',
          constraints: 'DEFAULT FALSE',
          description: 'Thiết bị đang hoạt động ở chế độ offline.',
        },
        {
          name: 'offline_cache',
          type: 'json',
          description:
            'Dữ liệu cache cho offline (JSON). ' +
            'Chứa danh mục sản phẩm, giá, v.v. để POS hoạt động không cần mạng.',
        },
        {
          name: 'last_sync_at',
          type: 'timestamp',
          description: 'Lần cuối đồng bộ dữ liệu lên server.',
        },
        {
          name: 'last_active_at',
          type: 'timestamp',
          description: 'Lần cuối có hoạt động.',
        },
        {
          name: 'expires_at',
          type: 'timestamp',
          constraints: 'NOT NULL',
          description: 'Thời điểm hết hạn token.',
        },
        {
          name: 'login_at',
          type: 'timestamp',
          constraints: 'DEFAULT CURRENT_TIMESTAMP',
          description: 'Thời điểm bắt đầu phiên đăng nhập.',
        },
        {
          name: 'logout_at',
          type: 'timestamp',
          description: 'Thời điểm đăng xuất. NULL = chưa đăng xuất.',
        },
        {
          name: 'is_active',
          type: 'boolean',
          constraints: 'DEFAULT TRUE',
          description: 'Phiên đang hoạt động. FALSE = đã thu hồi/hết hạn.',
        },
      ],
      indexes: [
        {
          name: 'idx_sessions_user_id',
          columns: ['user_id'],
          unique: false,
          description: 'Index tìm phiên theo user.',
        },
        {
          name: 'idx_sessions_store_id',
          columns: ['store_id'],
          unique: false,
          description: 'Index tìm phiên theo cửa hàng.',
        },
        {
          name: 'idx_sessions_token',
          columns: ['session_token'],
          unique: true,
          description: 'Index duy nhất cho session token – xác thực nhanh.',
        },
        {
          name: 'idx_sessions_device_id',
          columns: ['device_id'],
          unique: false,
          description: 'Index tìm phiên theo thiết bị.',
        },
        {
          name: 'idx_sessions_active',
          columns: ['is_active', 'expires_at'],
          unique: false,
          description: 'Index lọc phiên đang hoạt động và cleanup hết hạn.',
        },
      ],
      foreign_keys: [
        {
          name: 'fk_sessions_user_id',
          columns: ['user_id'],
          references: {table: 'users', columns: ['id']},
          on_delete: 'CASCADE',
          on_update: 'CASCADE',
          description: 'Phiên thuộc người dùng.',
        },
        {
          name: 'fk_sessions_store_id',
          columns: ['store_id'],
          references: {table: 'stores', columns: ['id']},
          on_delete: 'CASCADE',
          on_update: 'CASCADE',
          description: 'Phiên thuộc cửa hàng.',
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  7. SETTINGS – Cấu hình hệ thống
    // ══════════════════════════════════════════════════════════════════════════
    settings: {
      description:
        'Bảng lưu cấu hình hệ thống theo từng cửa hàng. ' +
        'Dùng pattern key-value linh hoạt, phân nhóm theo category.',
      cols: [
        {
          name: 'id',
          type: 'uuid',
          constraints: 'NOT NULL UNIQUE PRIMARY KEY',
          description: 'Mã định danh (UUID).',
        },
        {
          name: 'store_id',
          type: 'uuid',
          constraints: 'NOT NULL',
          description: 'Cửa hàng áp dụng cấu hình này.',
        },
        {
          name: 'category',
          type: 'varchar',
          length: 50,
          constraints: 'NOT NULL',
          description: 'Danh mục cấu hình.',
          enum: ['system', 'payment', 'notification', 'display', 'security', 'integration', 'pos', 'receipt'],
        },
        {
          name: 'key',
          type: 'varchar',
          length: 100,
          constraints: 'NOT NULL',
          description: 'Khóa định danh cấu hình (VD: receipt_footer, tax_rate).',
        },
        {
          name: 'value',
          type: 'string',
          description: 'Giá trị hiện tại.',
        },
        {
          name: 'default_value',
          type: 'string',
          description: 'Giá trị mặc định để reset về.',
        },
        {
          name: 'data_type',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'string'",
          description: 'Kiểu dữ liệu của value.',
          enum: ['string', 'number', 'boolean', 'json', 'array'],
        },
        {
          name: 'description',
          type: 'string',
          description: 'Mô tả ý nghĩa cấu hình.',
        },
        {
          name: 'is_encrypted',
          type: 'boolean',
          constraints: 'DEFAULT FALSE',
          description: 'Giá trị được mã hoá (dành cho API keys, secrets).',
        },
        {
          name: 'is_system',
          type: 'boolean',
          constraints: 'DEFAULT FALSE',
          description: 'Cấu hình hệ thống – không cho phép xoá.',
        },
        {
          name: 'created_at',
          type: 'timestamp',
          constraints: 'DEFAULT CURRENT_TIMESTAMP',
          description: 'Thời gian tạo.',
        },
        {
          name: 'updated_at',
          type: 'timestamp',
          constraints: 'DEFAULT CURRENT_TIMESTAMP',
          description: 'Thời gian cập nhật.',
        },
      ],
      indexes: [
        {
          name: 'idx_settings_store_category_key',
          columns: ['store_id', 'category', 'key'],
          unique: true,
          description: 'Index duy nhất – mỗi store chỉ có 1 giá trị cho mỗi key.',
        },
        {
          name: 'idx_settings_category',
          columns: ['category'],
          unique: false,
          description: 'Index lọc theo danh mục cấu hình.',
        },
      ],
      foreign_keys: [
        {
          name: 'fk_settings_store_id',
          columns: ['store_id'],
          references: {table: 'stores', columns: ['id']},
          on_delete: 'CASCADE',
          on_update: 'CASCADE',
          description: 'Cấu hình thuộc cửa hàng.',
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  8. AUDIT_LOGS – Nhật ký thao tác
    // ══════════════════════════════════════════════════════════════════════════
    audit_logs: {
      description:
        'Nhật ký toàn bộ thao tác quan trọng trong hệ thống. ' +
        'Phục vụ kiểm tra, truy vết và bảo mật.',
      cols: [
        {
          name: 'id',
          type: 'uuid',
          constraints: 'NOT NULL UNIQUE PRIMARY KEY',
          description: 'Mã log (UUID).',
        },
        {
          name: 'store_id',
          type: 'uuid',
          constraints: 'NOT NULL',
          description: 'Cửa hàng xảy ra thao tác.',
        },
        {
          name: 'user_id',
          type: 'uuid',
          description: 'Người dùng thực hiện. NULL = hệ thống tự động.',
        },
        {
          name: 'session_id',
          type: 'uuid',
          description: 'Phiên đăng nhập tại thời điểm thao tác.',
        },
        {
          name: 'action',
          type: 'varchar',
          length: 30,
          constraints: 'NOT NULL',
          description: 'Hành động thực hiện.',
          enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'SYNC', 'EXPORT', 'IMPORT', 'CANCEL'],
        },
        {
          name: 'table_name',
          type: 'varchar',
          length: 100,
          description: 'Tên bảng bị tác động.',
        },
        {
          name: 'record_id',
          type: 'varchar',
          length: 100,
          description: 'ID bản ghi bị tác động.',
        },
        {
          name: 'old_value',
          type: 'json',
          description: 'Giá trị trước khi thay đổi (JSON).',
        },
        {
          name: 'new_value',
          type: 'json',
          description: 'Giá trị sau khi thay đổi (JSON).',
        },
        {
          name: 'ip_address',
          type: 'varchar',
          length: 45,
          description: 'Địa chỉ IP thực hiện thao tác.',
        },
        {
          name: 'note',
          type: 'string',
          description: 'Ghi chú thêm.',
        },
        {
          name: 'created_at',
          type: 'timestamp',
          constraints: 'DEFAULT CURRENT_TIMESTAMP',
          description: 'Thời gian thực hiện thao tác.',
        },
      ],
      indexes: [
        {
          name: 'idx_audit_store_id',
          columns: ['store_id', 'created_at'],
          unique: false,
          description: 'Index tìm log theo cửa hàng và thời gian.',
        },
        {
          name: 'idx_audit_user_id',
          columns: ['user_id'],
          unique: false,
          description: 'Index tìm log theo người dùng.',
        },
        {
          name: 'idx_audit_table_record',
          columns: ['table_name', 'record_id'],
          unique: false,
          description: 'Index truy vết lịch sử thay đổi của 1 bản ghi cụ thể.',
        },
        {
          name: 'idx_audit_action',
          columns: ['action'],
          unique: false,
          description: 'Index lọc theo loại hành động.',
        },
      ],
      foreign_keys: [],
    },
  },
};

// ─── Export ───────────────────────────────────────────────────────────────────
export const onePosSchemas: Record<string, DatabaseSchema> = {
  core: coreSchema,
};