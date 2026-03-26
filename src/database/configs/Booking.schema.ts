/**
 * booking.schema.ts
 *
 * Schema cơ sở dữ liệu BOOKING cho hệ thống 1POS Ecosystem.
 *
 * Phạm vi: Nền tảng đặt lịch / đặt phòng dùng chung, không phụ thuộc ngành.
 *   Áp dụng cho: lưu trú, spa, karaoke, phòng khám, sân thể thao,
 *                tư vấn, thuê tài sản, lớp học, F&B đặt bàn, v.v.
 *
 * Triết lý thiết kế:
 *   - Resource-centric: mọi thứ đều xoay quanh "tài nguyên có thể đặt"
 *   - Industry-agnostic: không hardcode ngành – dùng resource_type + booking_mode
 *   - Multi-resource: 1 booking có thể dùng nhiều resource (phòng + nhân viên)
 *   - Offline-first: ghi local trước, sync sau (sync_status trên mọi bảng)
 *   - POS bridge: booking_payments nối sang pos.db → bills / payments
 *
 * Liên kết:
 *   - store_id         → core.db → stores.id
 *   - user_id          → core.db → users.id
 *   - pos_customer_id  → pos.db  → customers.id
 *   - pos_product_id   → pos.db  → products.id
 *   - pos_bill_id      → pos.db  → bills.id
 *   - pos_payment_id   → pos.db  → payments.id
 *   - resident_contract_id → resident.db → contracts.id
 */

import {DatabaseSchema} from '@dqcai/sqlite';

const SQLITE_TYPE_MAPPING = {
  sqlite: {
    string: 'TEXT', varchar: 'TEXT', char: 'TEXT', email: 'TEXT',
    url: 'TEXT', uuid: 'TEXT', integer: 'INTEGER', bigint: 'INTEGER',
    smallint: 'INTEGER', tinyint: 'INTEGER', decimal: 'REAL', numeric: 'REAL',
    float: 'REAL', double: 'REAL', boolean: 'INTEGER', timestamp: 'TEXT',
    datetime: 'TEXT', date: 'TEXT', time: 'TEXT', json: 'TEXT',
    array: 'TEXT', blob: 'BLOB', binary: 'BLOB',
  },
};

export const bookingSchema: DatabaseSchema = {
  version: 'v1',
  database_name: 'booking.db',
  description:
    'Nền tảng đặt lịch dùng chung của hệ thống 1POS – Industry-agnostic, Offline-first, Multi-resource. ' +
    'Áp dụng cho mọi loại hình: lưu trú, spa, karaoke, phòng khám, sân thể thao, ' +
    'tư vấn, thuê tài sản, lớp học, F&B đặt bàn. ' +
    'Kết nối POS qua booking_payments → pos.bills / payments.',
  type_mapping: SQLITE_TYPE_MAPPING,
  schemas: {

    // ══════════════════════════════════════════════════════════════════════════
    //  1. RESOURCE_TYPES – Loại tài nguyên có thể đặt
    // ══════════════════════════════════════════════════════════════════════════
    resource_types: {
      description:
        'Danh mục loại tài nguyên có thể đặt lịch. ' +
        'Dùng chung cho toàn hệ thống – không phụ thuộc ngành nghề. ' +
        'VD: room (phòng), field (sân), doctor (bác sĩ), staff (nhân viên), table (bàn), asset (tài sản).',
      cols: [
        {
          name: 'id',
          type: 'uuid',
          constraints: 'NOT NULL UNIQUE PRIMARY KEY',
          description: 'Mã loại tài nguyên (UUID).',
        },
        {
          name: 'store_id',
          type: 'uuid',
          constraints: 'NOT NULL',
          description: 'Cửa hàng sở hữu. FK logic → core.stores.',
        },
        {
          name: 'code',
          type: 'varchar',
          length: 30,
          constraints: 'NOT NULL',
          description: 'Mã định danh loại tài nguyên.',
          enum: ['room', 'field', 'doctor', 'staff', 'table', 'asset', 'studio', 'slot', 'vehicle', 'equipment'],
        },
        {
          name: 'name',
          type: 'varchar',
          length: 100,
          constraints: 'NOT NULL',
          description: 'Tên hiển thị (VD: Phòng, Sân, Bác sĩ, Nhân viên, Bàn).',
        },
        {
          name: 'description',
          type: 'string',
          description: 'Mô tả chi tiết về loại tài nguyên này.',
        },
        {
          name: 'icon',
          type: 'varchar',
          length: 50,
          description: 'Tên icon hiển thị trên UI lịch.',
        },
        {
          name: 'color_code',
          type: 'varchar',
          length: 10,
          description: 'Mã màu hiển thị trên calendar (VD: #8E44AD).',
        },
        {
          name: 'is_schedulable',
          type: 'boolean',
          constraints: 'DEFAULT TRUE',
          description: 'Hiển thị trên calendar view.',
        },
        {
          name: 'sort_order',
          type: 'integer',
          constraints: 'DEFAULT 0',
          description: 'Thứ tự hiển thị.',
        },
        {
          name: 'status',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'active'",
          description: 'Trạng thái.',
          enum: ['active', 'inactive'],
        },
        {
          name: 'metadata',
          type: 'json',
          description: 'Thông tin mở rộng theo ngành (JSON).',
        },
        {
          name: 'sync_status',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'local'",
          description: 'Trạng thái đồng bộ offline → cloud.',
          enum: ['local', 'synced', 'conflict', 'pending_sync'],
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
        {
          name: 'deleted_at',
          type: 'timestamp',
          description: 'Thời gian xoá mềm.',
        },
      ],
      indexes: [
        {
          name: 'idx_resource_types_store_code',
          columns: ['store_id', 'code'],
          unique: true,
          description: 'Mã loại tài nguyên duy nhất trong mỗi cửa hàng.',
        },
        {
          name: 'idx_resource_types_store_active',
          columns: ['store_id', 'status'],
          unique: false,
          description: 'Lọc loại tài nguyên đang hoạt động.',
        },
        {
          name: 'idx_resource_types_sync',
          columns: ['sync_status', 'updated_at'],
          unique: false,
          description: 'Index hàng đợi đồng bộ.',
        },
      ],
      foreign_keys: [],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  2. RESOURCES – Tài nguyên cụ thể có thể đặt lịch
    // ══════════════════════════════════════════════════════════════════════════
    resources: {
      description:
        'Tài nguyên cụ thể có thể đặt lịch. ' +
        'VD: Phòng 101, Sân A, BS. Lan, NV Massage Hoa, Bàn 05. ' +
        'Ánh xạ sang resident.rooms qua metadata.resident_room_id.',
      cols: [
        {
          name: 'id',
          type: 'uuid',
          constraints: 'NOT NULL UNIQUE PRIMARY KEY',
          description: 'Mã tài nguyên (UUID).',
        },
        {
          name: 'store_id',
          type: 'uuid',
          constraints: 'NOT NULL',
          description: 'Cửa hàng sở hữu. FK logic → core.stores.',
        },
        {
          name: 'resource_type_id',
          type: 'uuid',
          constraints: 'NOT NULL',
          description: 'Loại tài nguyên. FK → resource_types.',
        },
        {
          name: 'code',
          type: 'varchar',
          length: 30,
          description: 'Mã tài nguyên nội bộ (VD: R101, SAN-A, DOC-001).',
        },
        {
          name: 'name',
          type: 'varchar',
          length: 150,
          constraints: 'NOT NULL',
          description: 'Tên hiển thị tài nguyên.',
        },
        {
          name: 'capacity',
          type: 'integer',
          constraints: 'DEFAULT 1',
          description: 'Sức chứa tối đa (số người).',
        },
        {
          name: 'floor',
          type: 'varchar',
          length: 10,
          description: 'Tầng (cho tài nguyên dạng phòng).',
        },
        {
          name: 'area_m2',
          type: 'decimal',
          precision: 6,
          scale: 1,
          description: 'Diện tích (m²).',
        },
        {
          name: 'base_price',
          type: 'decimal',
          precision: 15,
          scale: 2,
          description: 'Giá tham chiếu – bị override bởi service_prices.',
        },
        {
          name: 'amenities',
          type: 'json',
          description: 'Tiện nghi (JSON array). VD: ["wifi","ac","tv","projector"].',
        },
        {
          name: 'thumbnail_url',
          type: 'url',
          description: 'Ảnh đại diện.',
        },
        {
          name: 'images',
          type: 'json',
          description: 'Album ảnh (JSON array of URLs).',
        },
        {
          name: 'working_hours',
          type: 'json',
          description:
            'Giờ hoạt động theo thứ (JSON). ' +
            'VD: {"mon":"08:00-22:00","sun":"09:00-18:00"}. ' +
            'NULL = theo giờ cửa hàng.',
        },
        {
          name: 'buffer_minutes',
          type: 'integer',
          constraints: 'DEFAULT 0',
          description:
            'Thời gian đệm giữa 2 booking liên tiếp (phút). ' +
            'VD: 15 phút dọn phòng sau checkout.',
        },
        {
          name: 'status',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'active'",
          description: 'Trạng thái tài nguyên.',
          enum: ['active', 'inactive', 'maintenance', 'reserved'],
        },
        {
          name: 'sort_order',
          type: 'integer',
          constraints: 'DEFAULT 0',
          description: 'Thứ tự hiển thị trên calendar.',
        },
        {
          name: 'metadata',
          type: 'json',
          description:
            'Thông tin mở rộng (JSON). ' +
            'VD: {"resident_room_id":"uuid-r101","doctor_specialty":"cardiology"}.',
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
          description: 'Thời gian tạo.',
        },
        {
          name: 'updated_at',
          type: 'timestamp',
          constraints: 'DEFAULT CURRENT_TIMESTAMP',
          description: 'Thời gian cập nhật.',
        },
        {
          name: 'deleted_at',
          type: 'timestamp',
          description: 'Thời gian xoá mềm.',
        },
      ],
      indexes: [
        {
          name: 'idx_resources_store_code',
          columns: ['store_id', 'code'],
          unique: true,
          description: 'Mã tài nguyên duy nhất trong cửa hàng.',
        },
        {
          name: 'idx_resources_store_type',
          columns: ['store_id', 'resource_type_id'],
          unique: false,
          description: 'Lọc tài nguyên theo loại.',
        },
        {
          name: 'idx_resources_store_status',
          columns: ['store_id', 'status'],
          unique: false,
          description: 'Lọc tài nguyên đang hoạt động.',
        },
        {
          name: 'idx_resources_sync',
          columns: ['sync_status', 'updated_at'],
          unique: false,
          description: 'Index hàng đợi đồng bộ.',
        },
      ],
      foreign_keys: [
        {
          name: 'fk_resources_resource_type_id',
          columns: ['resource_type_id'],
          references: {table: 'resource_types', columns: ['id']},
          on_delete: 'RESTRICT',
          on_update: 'CASCADE',
          description: 'Tài nguyên thuộc loại tài nguyên.',
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  3. SERVICES – Dịch vụ có thể đặt lịch
    // ══════════════════════════════════════════════════════════════════════════
    services: {
      description:
        'Dịch vụ có thể đặt lịch – định nghĩa thời lượng, cách tính giá và quy tắc đặt. ' +
        'booking_mode quyết định cách tính thời gian: slot (cố định), daily (theo đêm), hourly (theo giờ), overnight (đêm + giờ lẻ), open (linh hoạt).',
      cols: [
        {
          name: 'id',
          type: 'uuid',
          constraints: 'NOT NULL UNIQUE PRIMARY KEY',
          description: 'Mã dịch vụ (UUID).',
        },
        {
          name: 'store_id',
          type: 'uuid',
          constraints: 'NOT NULL',
          description: 'Cửa hàng sở hữu. FK logic → core.stores.',
        },
        {
          name: 'name',
          type: 'varchar',
          length: 200,
          constraints: 'NOT NULL',
          description: 'Tên dịch vụ (VD: Thuê phòng theo đêm, Massage 60 phút, Khám tổng quát).',
        },
        {
          name: 'short_name',
          type: 'varchar',
          length: 50,
          description: 'Tên ngắn hiển thị trên lịch.',
        },
        {
          name: 'category_id',
          type: 'uuid',
          description: 'Danh mục. FK logic → pos.categories (tuỳ chọn).',
        },
        {
          name: 'pos_product_id',
          type: 'uuid',
          description: 'Sản phẩm POS tương ứng. FK logic → pos.products.',
        },
        {
          name: 'duration_minutes',
          type: 'integer',
          description:
            'Thời lượng mặc định (phút). NULL = linh hoạt (dùng cho daily/open).',
        },
        {
          name: 'booking_mode',
          type: 'varchar',
          length: 20,
          constraints: 'NOT NULL',
          description: 'Cách tính thời gian booking.',
          enum: ['slot', 'open', 'daily', 'hourly', 'overnight'],
        },
        {
          name: 'min_duration_minutes',
          type: 'integer',
          description: 'Thời lượng tối thiểu (phút) – cho hourly/open.',
        },
        {
          name: 'max_duration_minutes',
          type: 'integer',
          description: 'Thời lượng tối đa (phút). NULL = không giới hạn.',
        },
        {
          name: 'buffer_minutes',
          type: 'integer',
          constraints: 'DEFAULT 0',
          description: 'Thời gian đệm sau mỗi booking (phút) – override resource.buffer_minutes.',
        },
        {
          name: 'advance_booking_hours',
          type: 'integer',
          constraints: 'DEFAULT 0',
          description: 'Đặt lịch trước tối thiểu bao nhiêu giờ.',
        },
        {
          name: 'cancel_hours',
          type: 'integer',
          constraints: 'DEFAULT 24',
          description: 'Huỷ trước bao nhiêu giờ được miễn phí.',
        },
        {
          name: 'max_capacity',
          type: 'integer',
          constraints: 'DEFAULT 1',
          description: 'Số khách tối đa trong 1 booking.',
        },
        {
          name: 'checkout_grace_minutes',
          type: 'integer',
          constraints: 'DEFAULT 0',
          description:
            'Thời gian ân hạn trả phòng (phút). ' +
            'VD: 30 → checkout trễ dưới 30 phút không bị phụ thu.',
        },
        {
          name: 'late_checkout_per_hour',
          type: 'decimal',
          precision: 15,
          scale: 2,
          description: 'Phụ thu checkout trễ mỗi giờ (VND). 0 = không phụ thu.',
        },
        {
          name: 'is_online_bookable',
          type: 'boolean',
          constraints: 'DEFAULT FALSE',
          description: 'Cho phép đặt lịch qua kênh online (website, app).',
        },
        {
          name: 'description',
          type: 'string',
          description: 'Mô tả dịch vụ cho khách.',
        },
        {
          name: 'thumbnail_url',
          type: 'url',
          description: 'Ảnh đại diện dịch vụ.',
        },
        {
          name: 'sort_order',
          type: 'integer',
          constraints: 'DEFAULT 0',
          description: 'Thứ tự hiển thị.',
        },
        {
          name: 'status',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'active'",
          description: 'Trạng thái.',
          enum: ['active', 'inactive', 'draft'],
        },
        {
          name: 'metadata',
          type: 'json',
          description: 'Thông tin mở rộng theo ngành (JSON).',
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
          description: 'Thời gian tạo.',
        },
        {
          name: 'updated_at',
          type: 'timestamp',
          constraints: 'DEFAULT CURRENT_TIMESTAMP',
          description: 'Thời gian cập nhật.',
        },
        {
          name: 'deleted_at',
          type: 'timestamp',
          description: 'Thời gian xoá mềm.',
        },
      ],
      indexes: [
        {
          name: 'idx_services_store_id',
          columns: ['store_id', 'status'],
          unique: false,
          description: 'Lọc dịch vụ theo cửa hàng và trạng thái.',
        },
        {
          name: 'idx_services_booking_mode',
          columns: ['booking_mode'],
          unique: false,
          description: 'Lọc dịch vụ theo cách tính thời gian.',
        },
        {
          name: 'idx_services_online',
          columns: ['is_online_bookable', 'status'],
          unique: false,
          description: 'Lọc dịch vụ cho phép đặt online.',
        },
        {
          name: 'idx_services_sync',
          columns: ['sync_status', 'updated_at'],
          unique: false,
          description: 'Index hàng đợi đồng bộ.',
        },
      ],
      foreign_keys: [],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  4. SERVICE_RESOURCES – Mapping dịch vụ cần loại tài nguyên nào
    // ══════════════════════════════════════════════════════════════════════════
    service_resources: {
      description:
        'Mapping N:N – dịch vụ cần loại tài nguyên nào, bao nhiêu, vai trò gì. ' +
        'VD: Massage 60p → staff (main, 1) + room (support, 1). ' +
        'Cho phép multi-resource booking trong cùng 1 lần đặt lịch.',
      cols: [
        {
          name: 'id',
          type: 'uuid',
          constraints: 'NOT NULL UNIQUE PRIMARY KEY',
          description: 'Mã bản ghi (UUID).',
        },
        {
          name: 'service_id',
          type: 'uuid',
          constraints: 'NOT NULL',
          description: 'Dịch vụ. FK → services.',
        },
        {
          name: 'resource_type_id',
          type: 'uuid',
          constraints: 'NOT NULL',
          description: 'Loại tài nguyên cần dùng. FK → resource_types.',
        },
        {
          name: 'role',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'main'",
          description: 'Vai trò tài nguyên trong dịch vụ.',
          enum: ['main', 'support', 'optional', 'equipment'],
        },
        {
          name: 'required_count',
          type: 'integer',
          constraints: 'DEFAULT 1',
          description: 'Số lượng tài nguyên loại này cần có.',
        },
        {
          name: 'is_customer_choice',
          type: 'boolean',
          constraints: 'DEFAULT TRUE',
          description: 'TRUE = khách tự chọn resource. FALSE = hệ thống tự assign.',
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
          name: 'idx_service_resources_service_id',
          columns: ['service_id'],
          unique: false,
          description: 'Tìm resource requirements của 1 dịch vụ.',
        },
        {
          name: 'idx_service_resources_unique',
          columns: ['service_id', 'resource_type_id', 'role'],
          unique: true,
          description: 'Mỗi dịch vụ chỉ có 1 mapping/loại/vai trò.',
        },
      ],
      foreign_keys: [
        {
          name: 'fk_sr_service_id',
          columns: ['service_id'],
          references: {table: 'services', columns: ['id']},
          on_delete: 'CASCADE',
          on_update: 'CASCADE',
          description: 'Mapping thuộc dịch vụ.',
        },
        {
          name: 'fk_sr_resource_type_id',
          columns: ['resource_type_id'],
          references: {table: 'resource_types', columns: ['id']},
          on_delete: 'RESTRICT',
          on_update: 'CASCADE',
          description: 'Loại tài nguyên yêu cầu.',
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  5. SERVICE_PRICES – Bảng giá dịch vụ
    // ══════════════════════════════════════════════════════════════════════════
    service_prices: {
      description:
        'Bảng giá cho dịch vụ booking. Hỗ trợ: nhiều bảng giá (default/vip/weekend), ' +
        'giá riêng theo resource cụ thể, phụ thu cuối tuần/ngày lễ, lịch sử giá.',
      cols: [
        {
          name: 'id',
          type: 'uuid',
          constraints: 'NOT NULL UNIQUE PRIMARY KEY',
          description: 'Mã bản ghi giá (UUID).',
        },
        {
          name: 'store_id',
          type: 'uuid',
          constraints: 'NOT NULL',
          description: 'Cửa hàng. FK logic → core.stores.',
        },
        {
          name: 'service_id',
          type: 'uuid',
          constraints: 'NOT NULL',
          description: 'Dịch vụ áp dụng giá. FK → services.',
        },
        {
          name: 'resource_id',
          type: 'uuid',
          description:
            'Resource cụ thể. NULL = áp dụng cho mọi resource. ' +
            'VD: Phòng Suite có giá riêng khác Phòng Standard.',
        },
        {
          name: 'price_list_name',
          type: 'varchar',
          length: 50,
          constraints: "DEFAULT 'default'",
          description: 'Tên bảng giá.',
          enum: ['default', 'vip', 'weekend', 'holiday', 'seasonal', 'corporate'],
        },
        {
          name: 'price_per_unit',
          type: 'decimal',
          precision: 15,
          scale: 2,
          constraints: 'NOT NULL',
          description: 'Giá theo đơn vị (đêm/giờ/slot/người/buổi).',
        },
        {
          name: 'price_unit',
          type: 'varchar',
          length: 20,
          description: 'Đơn vị tính giá.',
          enum: ['night', 'hour', 'slot', 'person', 'session', 'day', 'month'],
        },
        {
          name: 'weekend_surcharge_pct',
          type: 'decimal',
          precision: 5,
          scale: 2,
          constraints: 'DEFAULT 0',
          description: 'Phụ thu cuối tuần (%). 0 = không phụ thu.',
        },
        {
          name: 'holiday_surcharge_pct',
          type: 'decimal',
          precision: 5,
          scale: 2,
          constraints: 'DEFAULT 0',
          description: 'Phụ thu ngày lễ (%).',
        },
        {
          name: 'late_checkout_per_hour',
          type: 'decimal',
          precision: 15,
          scale: 2,
          constraints: 'DEFAULT 0',
          description: 'Phụ thu checkout trễ mỗi giờ (override service.late_checkout_per_hour).',
        },
        {
          name: 'flat_min_rate',
          type: 'decimal',
          precision: 15,
          scale: 2,
          description:
            'Giá gói tối thiểu (flat rate). ' +
            'VD: thuê giờ tối thiểu 2 giờ = 150.000đ flat (không tính đơn giá/giờ).',
        },
        {
          name: 'flat_min_duration_minutes',
          type: 'integer',
          description: 'Thời lượng tối thiểu để áp dụng flat_min_rate (phút).',
        },
        {
          name: 'effective_from',
          type: 'date',
          constraints: 'NOT NULL',
          description: 'Ngày bắt đầu áp dụng giá.',
        },
        {
          name: 'effective_to',
          type: 'date',
          description: 'Ngày kết thúc. NULL = không hết hạn.',
        },
        {
          name: 'status',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'active'",
          description: 'Trạng thái.',
          enum: ['active', 'inactive'],
        },
        {
          name: 'sort_order',
          type: 'integer',
          constraints: 'DEFAULT 0',
          description: 'Độ ưu tiên (cao hơn = được chọn trước khi có nhiều bảng giá khớp).',
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
          description: 'Thời gian tạo.',
        },
        {
          name: 'updated_at',
          type: 'timestamp',
          constraints: 'DEFAULT CURRENT_TIMESTAMP',
          description: 'Thời gian cập nhật.',
        },
        {
          name: 'deleted_at',
          type: 'timestamp',
          description: 'Thời gian xoá mềm.',
        },
      ],
      indexes: [
        {
          name: 'idx_service_prices_service_resource',
          columns: ['service_id', 'resource_id', 'price_list_name', 'effective_from'],
          unique: false,
          description: 'Index tìm giá hiệu lực của service + resource.',
        },
        {
          name: 'idx_service_prices_effective',
          columns: ['effective_from', 'effective_to'],
          unique: false,
          description: 'Lọc giá theo khoảng thời gian hiệu lực.',
        },
        {
          name: 'idx_service_prices_sync',
          columns: ['sync_status', 'updated_at'],
          unique: false,
          description: 'Index hàng đợi đồng bộ.',
        },
      ],
      foreign_keys: [
        {
          name: 'fk_service_prices_service_id',
          columns: ['service_id'],
          references: {table: 'services', columns: ['id']},
          on_delete: 'CASCADE',
          on_update: 'CASCADE',
          description: 'Giá thuộc dịch vụ.',
        },
        {
          name: 'fk_service_prices_resource_id',
          columns: ['resource_id'],
          references: {table: 'resources', columns: ['id']},
          on_delete: 'SET NULL',
          on_update: 'CASCADE',
          description: 'Giá riêng của resource cụ thể.',
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  6. BOOKING_CUSTOMERS – Khách hàng trong hệ thống booking
    // ══════════════════════════════════════════════════════════════════════════
    booking_customers: {
      description:
        'Thông tin khách hàng đặt lịch. ' +
        'Đồng bộ 2 chiều với pos.customers qua pos_customer_id. ' +
        'Khi khách đặt lịch online trước khi có trong POS: tạo ở đây, sync sau check-in.',
      cols: [
        {
          name: 'id',
          type: 'uuid',
          constraints: 'NOT NULL UNIQUE PRIMARY KEY',
          description: 'Mã khách hàng booking (UUID).',
        },
        {
          name: 'store_id',
          type: 'uuid',
          constraints: 'NOT NULL',
          description: 'Cửa hàng. FK logic → core.stores.',
        },
        {
          name: 'pos_customer_id',
          type: 'uuid',
          description: 'Khách hàng tương ứng trong POS. FK logic → pos.customers. NULL = chưa sync.',
        },
        {
          name: 'full_name',
          type: 'varchar',
          length: 150,
          constraints: 'NOT NULL',
          description: 'Họ và tên.',
        },
        {
          name: 'phone',
          type: 'varchar',
          length: 20,
          description: 'Số điện thoại.',
        },
        {
          name: 'email',
          type: 'email',
          description: 'Email.',
        },
        {
          name: 'id_number',
          type: 'varchar',
          length: 20,
          description: 'CCCD/CMND/Hộ chiếu (yêu cầu cho lưu trú).',
        },
        {
          name: 'date_of_birth',
          type: 'date',
          description: 'Ngày sinh.',
        },
        {
          name: 'gender',
          type: 'varchar',
          length: 10,
          description: 'Giới tính.',
          enum: ['male', 'female', 'other'],
        },
        {
          name: 'nationality',
          type: 'varchar',
          length: 10,
          constraints: "DEFAULT 'VN'",
          description: 'Quốc tịch (ISO 3166-1 alpha-2).',
        },
        {
          name: 'address',
          type: 'string',
          description: 'Địa chỉ.',
        },
        {
          name: 'customer_group',
          type: 'varchar',
          length: 30,
          constraints: "DEFAULT 'regular'",
          description: 'Nhóm khách.',
          enum: ['regular', 'vip', 'corporate', 'loyalty'],
        },
        {
          name: 'loyalty_points',
          type: 'integer',
          constraints: 'DEFAULT 0',
          description: 'Điểm tích luỹ.',
        },
        {
          name: 'special_requests',
          type: 'string',
          description: 'Yêu cầu đặc biệt (không hút thuốc, phòng yên tĩnh, dị ứng thực phẩm).',
        },
        {
          name: 'language',
          type: 'varchar',
          length: 10,
          constraints: "DEFAULT 'vi'",
          description: 'Ngôn ngữ giao tiếp ưa thích.',
        },
        {
          name: 'source',
          type: 'varchar',
          length: 30,
          description: 'Kênh khách biết đến dịch vụ.',
          enum: ['walk_in', 'phone', 'website', 'app', 'ota', 'referral', 'social'],
        },
        {
          name: 'status',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'active'",
          description: 'Trạng thái.',
          enum: ['active', 'inactive', 'blacklisted'],
        },
        {
          name: 'metadata',
          type: 'json',
          description: 'Thông tin mở rộng (JSON).',
        },
        {
          name: 'sync_status',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'local'",
          description: 'Trạng thái đồng bộ với pos.customers.',
          enum: ['local', 'synced', 'conflict', 'pending_sync'],
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
        {
          name: 'deleted_at',
          type: 'timestamp',
          description: 'Thời gian xoá mềm.',
        },
      ],
      indexes: [
        {
          name: 'idx_bcust_store_phone',
          columns: ['store_id', 'phone'],
          unique: false,
          description: 'Tìm kiếm nhanh theo SĐT.',
        },
        {
          name: 'idx_bcust_pos_customer_id',
          columns: ['pos_customer_id'],
          unique: false,
          description: 'Index đồng bộ với pos.customers.',
        },
        {
          name: 'idx_bcust_sync',
          columns: ['sync_status', 'updated_at'],
          unique: false,
          description: 'Index hàng đợi đồng bộ.',
        },
      ],
      foreign_keys: [],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  7. BOOKINGS – Bảng trung tâm (Central booking record)
    // ══════════════════════════════════════════════════════════════════════════
    bookings: {
      description:
        'Bảng trung tâm của hệ thống booking – mọi lần đặt lịch đều đi qua đây. ' +
        'Hỗ trợ: đặt online/trực tiếp, walk-in, đặt qua OTA (Booking.com, Agoda). ' +
        'Kết nối sang pos.bills khi checkout để xuất hóa đơn chính thức.',
      cols: [
        {
          name: 'id',
          type: 'uuid',
          constraints: 'NOT NULL UNIQUE PRIMARY KEY',
          description: 'Mã booking (UUID).',
        },
        {
          name: 'store_id',
          type: 'uuid',
          constraints: 'NOT NULL',
          description: 'Cửa hàng. FK logic → core.stores.',
        },
        {
          name: 'booking_number',
          type: 'varchar',
          length: 30,
          constraints: 'NOT NULL',
          description: 'Số booking dạng đọc được (VD: BK-20240710-0001).',
        },
        {
          name: 'service_id',
          type: 'uuid',
          constraints: 'NOT NULL',
          description: 'Dịch vụ đặt. FK → services.',
        },
        {
          name: 'customer_id',
          type: 'uuid',
          description: 'Khách hàng. FK → booking_customers. NULL = walk-in vãng lai.',
        },
        {
          name: 'start_time',
          type: 'timestamp',
          constraints: 'NOT NULL',
          description: 'Thời điểm bắt đầu / check-in dự kiến (ISO 8601).',
        },
        {
          name: 'end_time',
          type: 'timestamp',
          description: 'Thời điểm kết thúc / check-out dự kiến. NULL = open-ended.',
        },
        {
          name: 'actual_start_time',
          type: 'timestamp',
          description: 'Thời điểm check-in thực tế.',
        },
        {
          name: 'actual_end_time',
          type: 'timestamp',
          description: 'Thời điểm check-out thực tế.',
        },
        {
          name: 'duration_minutes',
          type: 'integer',
          description: 'Tổng thời gian thực tế (tính sau khi checkout).',
        },
        {
          name: 'guest_count',
          type: 'integer',
          constraints: 'DEFAULT 1',
          description: 'Số khách.',
        },
        {
          name: 'agreed_price',
          type: 'decimal',
          precision: 15,
          scale: 2,
          description: 'Giá thoả thuận tại thời điểm đặt (override service_prices).',
        },
        {
          name: 'deposit_amount',
          type: 'decimal',
          precision: 15,
          scale: 2,
          constraints: 'DEFAULT 0',
          description: 'Tiền cọc cần nộp.',
        },
        {
          name: 'deposit_paid',
          type: 'decimal',
          precision: 15,
          scale: 2,
          constraints: 'DEFAULT 0',
          description: 'Tiền cọc đã thu.',
        },
        {
          name: 'status',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'pending'",
          description: 'Trạng thái booking.',
          enum: ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show', 'waitlist'],
        },
        {
          name: 'booking_channel',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'direct'",
          description: 'Kênh đặt lịch.',
          enum: ['direct', 'walk_in', 'phone', 'website', 'app', 'ota', 'partner'],
        },
        {
          name: 'ota_source',
          type: 'varchar',
          length: 50,
          description: 'Nguồn OTA (booking_com, agoda, airbnb, expedia).',
        },
        {
          name: 'ota_booking_ref',
          type: 'varchar',
          length: 100,
          description: 'Mã đặt phòng từ OTA.',
        },
        {
          name: 'pos_bill_id',
          type: 'uuid',
          description: 'Hóa đơn POS chính thức. FK logic → pos.bills. NULL = chưa checkout.',
        },
        {
          name: 'resident_contract_id',
          type: 'uuid',
          description: 'Hợp đồng lưu trú tạo ra từ booking này. FK logic → resident.contracts.',
        },
        {
          name: 'note',
          type: 'string',
          description: 'Yêu cầu / ghi chú của khách.',
        },
        {
          name: 'internal_note',
          type: 'string',
          description: 'Ghi chú nội bộ (khách không thấy).',
        },
        {
          name: 'cancellation_reason',
          type: 'string',
          description: 'Lý do huỷ booking.',
        },
        {
          name: 'confirmed_by',
          type: 'uuid',
          description: 'Nhân viên xác nhận booking. FK logic → core.users.',
        },
        {
          name: 'checked_in_by',
          type: 'uuid',
          description: 'Nhân viên làm thủ tục check-in. FK logic → core.users.',
        },
        {
          name: 'checked_out_by',
          type: 'uuid',
          description: 'Nhân viên làm thủ tục check-out. FK logic → core.users.',
        },
        {
          name: 'cancelled_by',
          type: 'uuid',
          description: 'Người huỷ booking. FK logic → core.users.',
        },
        {
          name: 'metadata',
          type: 'json',
          description: 'Thông tin mở rộng (JSON). Dữ liệu đặc thù ngành.',
        },
        {
          name: 'sort_order',
          type: 'integer',
          constraints: 'DEFAULT 0',
          description: 'Thứ tự sắp xếp.',
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
          description: 'Thời gian tạo.',
        },
        {
          name: 'updated_at',
          type: 'timestamp',
          constraints: 'DEFAULT CURRENT_TIMESTAMP',
          description: 'Thời gian cập nhật.',
        },
        {
          name: 'deleted_at',
          type: 'timestamp',
          description: 'Thời gian xoá mềm.',
        },
      ],
      indexes: [
        {
          name: 'idx_bookings_store_number',
          columns: ['store_id', 'booking_number'],
          unique: true,
          description: 'Số booking duy nhất trong cửa hàng.',
        },
        {
          name: 'idx_bookings_start_end_time',
          columns: ['start_time', 'end_time'],
          unique: false,
          description: 'Index thời gian – dùng cho calendar view và conflict check.',
        },
        {
          name: 'idx_bookings_store_status',
          columns: ['store_id', 'status'],
          unique: false,
          description: 'Lọc booking theo trạng thái.',
        },
        {
          name: 'idx_bookings_customer_id',
          columns: ['customer_id'],
          unique: false,
          description: 'Tìm booking theo khách hàng.',
        },
        {
          name: 'idx_bookings_service_id',
          columns: ['service_id'],
          unique: false,
          description: 'Tìm booking theo dịch vụ.',
        },
        {
          name: 'idx_bookings_channel',
          columns: ['booking_channel', 'ota_source'],
          unique: false,
          description: 'Thống kê theo kênh và nguồn OTA.',
        },
        {
          name: 'idx_bookings_sync',
          columns: ['sync_status', 'updated_at'],
          unique: false,
          description: 'Index hàng đợi đồng bộ.',
        },
      ],
      foreign_keys: [
        {
          name: 'fk_bookings_service_id',
          columns: ['service_id'],
          references: {table: 'services', columns: ['id']},
          on_delete: 'RESTRICT',
          on_update: 'CASCADE',
          description: 'Booking áp dụng dịch vụ.',
        },
        {
          name: 'fk_bookings_customer_id',
          columns: ['customer_id'],
          references: {table: 'booking_customers', columns: ['id']},
          on_delete: 'SET NULL',
          on_update: 'CASCADE',
          description: 'Booking thuộc khách hàng.',
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  8. BOOKING_RESOURCES – Tài nguyên tham gia booking (N:N)
    // ══════════════════════════════════════════════════════════════════════════
    booking_resources: {
      description:
        'Bảng N:N – tài nguyên tham gia vào 1 booking. ' +
        '1 booking có thể dùng nhiều resource (phòng + nhân viên + thiết bị). ' +
        'Đây là nơi kiểm tra xung đột lịch (conflict check).',
      cols: [
        {
          name: 'id',
          type: 'uuid',
          constraints: 'NOT NULL UNIQUE PRIMARY KEY',
          description: 'Mã bản ghi (UUID).',
        },
        {
          name: 'booking_id',
          type: 'uuid',
          constraints: 'NOT NULL',
          description: 'Booking. FK → bookings.',
        },
        {
          name: 'resource_id',
          type: 'uuid',
          constraints: 'NOT NULL',
          description: 'Tài nguyên được gán. FK → resources.',
        },
        {
          name: 'role',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'main'",
          description: 'Vai trò tài nguyên trong booking cụ thể này.',
          enum: ['main', 'staff', 'equipment', 'support'],
        },
        {
          name: 'status',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'assigned'",
          description: 'Trạng thái gán.',
          enum: ['assigned', 'released', 'swapped', 'unavailable'],
        },
        {
          name: 'assigned_at',
          type: 'timestamp',
          description: 'Thời điểm gán tài nguyên.',
        },
        {
          name: 'released_at',
          type: 'timestamp',
          description: 'Thời điểm giải phóng tài nguyên.',
        },
        {
          name: 'note',
          type: 'string',
          description: 'Ghi chú về việc gán tài nguyên này.',
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
          name: 'idx_booking_resources_booking_id',
          columns: ['booking_id'],
          unique: false,
          description: 'Tìm resource của 1 booking.',
        },
        {
          name: 'idx_booking_resources_resource_id',
          columns: ['resource_id'],
          unique: false,
          description:
            'Tìm tất cả booking của 1 resource – dùng cho conflict check và calendar.',
        },
        {
          name: 'idx_booking_resources_unique',
          columns: ['booking_id', 'resource_id', 'role'],
          unique: true,
          description: 'Mỗi booking chỉ gán 1 resource với 1 vai trò.',
        },
        {
          name: 'idx_booking_resources_sync',
          columns: ['sync_status', 'updated_at'],
          unique: false,
          description: 'Index hàng đợi đồng bộ.',
        },
      ],
      foreign_keys: [
        {
          name: 'fk_br_booking_id',
          columns: ['booking_id'],
          references: {table: 'bookings', columns: ['id']},
          on_delete: 'CASCADE',
          on_update: 'CASCADE',
          description: 'Gán resource thuộc booking.',
        },
        {
          name: 'fk_br_resource_id',
          columns: ['resource_id'],
          references: {table: 'resources', columns: ['id']},
          on_delete: 'RESTRICT',
          on_update: 'CASCADE',
          description: 'Resource được gán.',
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  9. BOOKING_ADDONS – Dịch vụ phát sinh trong booking
    // ══════════════════════════════════════════════════════════════════════════
    booking_addons: {
      description:
        'Dịch vụ / hàng hoá phát sinh trong thời gian booking. ' +
        'VD: minibar, bữa sáng, giặt ủi, taxi. ' +
        'Khi checkout, toàn bộ addons được đẩy sang pos.bill_details.',
      cols: [
        {
          name: 'id',
          type: 'uuid',
          constraints: 'NOT NULL UNIQUE PRIMARY KEY',
          description: 'Mã add-on (UUID).',
        },
        {
          name: 'store_id',
          type: 'uuid',
          constraints: 'NOT NULL',
          description: 'Cửa hàng. FK logic → core.stores.',
        },
        {
          name: 'booking_id',
          type: 'uuid',
          constraints: 'NOT NULL',
          description: 'Booking phát sinh. FK → bookings.',
        },
        {
          name: 'pos_product_id',
          type: 'uuid',
          description: 'Sản phẩm POS. FK logic → pos.products.',
        },
        {
          name: 'pos_variant_id',
          type: 'uuid',
          description: 'Biến thể POS. FK logic → pos.product_variants.',
        },
        {
          name: 'name',
          type: 'varchar',
          length: 200,
          constraints: 'NOT NULL',
          description: 'Tên snapshot tại thời điểm ghi nhận.',
        },
        {
          name: 'quantity',
          type: 'decimal',
          precision: 12,
          scale: 3,
          constraints: 'NOT NULL DEFAULT 1',
          description: 'Số lượng.',
        },
        {
          name: 'unit_price',
          type: 'decimal',
          precision: 15,
          scale: 2,
          constraints: 'NOT NULL',
          description: 'Đơn giá snapshot.',
        },
        {
          name: 'tax_rate',
          type: 'decimal',
          precision: 5,
          scale: 2,
          constraints: 'DEFAULT 0',
          description: 'Thuế suất (%).',
        },
        {
          name: 'tax_amount',
          type: 'decimal',
          precision: 15,
          scale: 2,
          constraints: 'DEFAULT 0',
          description: 'Tiền thuế.',
        },
        {
          name: 'amount',
          type: 'decimal',
          precision: 15,
          scale: 2,
          constraints: 'NOT NULL',
          description: 'Thành tiền = quantity × unit_price + tax.',
        },
        {
          name: 'added_at',
          type: 'timestamp',
          constraints: 'DEFAULT CURRENT_TIMESTAMP',
          description: 'Thời điểm ghi nhận phát sinh.',
        },
        {
          name: 'added_by',
          type: 'uuid',
          description: 'Nhân viên ghi nhận. FK logic → core.users.',
        },
        {
          name: 'note',
          type: 'string',
          description: 'Ghi chú.',
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
          description: 'Thời gian tạo.',
        },
        {
          name: 'updated_at',
          type: 'timestamp',
          constraints: 'DEFAULT CURRENT_TIMESTAMP',
          description: 'Thời gian cập nhật.',
        },
        {
          name: 'deleted_at',
          type: 'timestamp',
          description: 'Thời gian xoá mềm.',
        },
      ],
      indexes: [
        {
          name: 'idx_booking_addons_booking_id',
          columns: ['booking_id'],
          unique: false,
          description: 'Tìm addons theo booking.',
        },
        {
          name: 'idx_booking_addons_product_id',
          columns: ['pos_product_id'],
          unique: false,
          description: 'Thống kê sản phẩm bán qua booking.',
        },
        {
          name: 'idx_booking_addons_sync',
          columns: ['sync_status', 'updated_at'],
          unique: false,
          description: 'Index hàng đợi đồng bộ.',
        },
      ],
      foreign_keys: [
        {
          name: 'fk_ba_booking_id',
          columns: ['booking_id'],
          references: {table: 'bookings', columns: ['id']},
          on_delete: 'CASCADE',
          on_update: 'CASCADE',
          description: 'Add-on thuộc booking.',
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  10. BOOKING_PAYMENTS – Thanh toán (Bridge sang POS)
    // ══════════════════════════════════════════════════════════════════════════
    booking_payments: {
      description:
        'Giao dịch thanh toán cho booking – bridge kết nối booking.db → pos.db. ' +
        'Mỗi booking có thể có nhiều lần thanh toán: cọc, thanh toán cuối, hoàn tiền. ' +
        'Các giao dịch chính thức được đồng bộ sang pos.payments.',
      cols: [
        {
          name: 'id',
          type: 'uuid',
          constraints: 'NOT NULL UNIQUE PRIMARY KEY',
          description: 'Mã giao dịch (UUID).',
        },
        {
          name: 'store_id',
          type: 'uuid',
          constraints: 'NOT NULL',
          description: 'Cửa hàng. FK logic → core.stores.',
        },
        {
          name: 'booking_id',
          type: 'uuid',
          constraints: 'NOT NULL',
          description: 'Booking thanh toán. FK → bookings.',
        },
        {
          name: 'pos_bill_id',
          type: 'uuid',
          description: 'Hóa đơn POS tương ứng. FK logic → pos.bills.',
        },
        {
          name: 'pos_payment_id',
          type: 'uuid',
          description: 'Giao dịch POS tương ứng. FK logic → pos.payments.',
        },
        {
          name: 'payment_type',
          type: 'varchar',
          length: 20,
          constraints: 'NOT NULL',
          description: 'Loại thanh toán.',
          enum: ['deposit', 'settlement', 'refund', 'addon', 'penalty'],
        },
        {
          name: 'amount',
          type: 'decimal',
          precision: 15,
          scale: 2,
          constraints: 'NOT NULL',
          description: 'Số tiền giao dịch. Âm = hoàn tiền.',
        },
        {
          name: 'payment_method',
          type: 'varchar',
          length: 20,
          description: 'Phương thức thanh toán.',
          enum: ['cash', 'bank_transfer', 'e_wallet', 'card', 'ota', 'deposit_offset'],
        },
        {
          name: 'payment_status',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'pending'",
          description: 'Trạng thái giao dịch.',
          enum: ['pending', 'paid', 'failed', 'refunded', 'cancelled'],
        },
        {
          name: 'transaction_ref',
          type: 'varchar',
          length: 100,
          description: 'Mã tham chiếu giao dịch ngân hàng/ví.',
        },
        {
          name: 'payment_gateway',
          type: 'varchar',
          length: 30,
          description: 'Cổng thanh toán.',
        //   enum: ['momo', 'zalopay', 'vnpay', 'vietqr', 'stripe', 'booking_com', null],
        },
        {
          name: 'paid_at',
          type: 'timestamp',
          description: 'Thời điểm thanh toán thành công.',
        },
        {
          name: 'note',
          type: 'string',
          description: 'Ghi chú giao dịch.',
        },
        {
          name: 'is_offline',
          type: 'boolean',
          constraints: 'DEFAULT FALSE',
          description: 'Giao dịch thực hiện khi offline.',
        },
        {
          name: 'synced_at',
          type: 'timestamp',
          description: 'Thời điểm đồng bộ lên server. NULL = chưa sync.',
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
          description: 'Thời gian tạo.',
        },
        {
          name: 'updated_at',
          type: 'timestamp',
          constraints: 'DEFAULT CURRENT_TIMESTAMP',
          description: 'Thời gian cập nhật.',
        },
        {
          name: 'deleted_at',
          type: 'timestamp',
          description: 'Thời gian xoá mềm.',
        },
      ],
      indexes: [
        {
          name: 'idx_booking_payments_booking_id',
          columns: ['booking_id'],
          unique: false,
          description: 'Tìm thanh toán theo booking.',
        },
        {
          name: 'idx_booking_payments_status',
          columns: ['payment_status'],
          unique: false,
          description: 'Lọc theo trạng thái.',
        },
        {
          name: 'idx_booking_payments_offline',
          columns: ['is_offline', 'synced_at'],
          unique: false,
          description: 'Phát hiện giao dịch offline chưa đồng bộ.',
        },
        {
          name: 'idx_booking_payments_sync',
          columns: ['sync_status', 'updated_at'],
          unique: false,
          description: 'Index hàng đợi đồng bộ.',
        },
      ],
      foreign_keys: [
        {
          name: 'fk_bp_booking_id',
          columns: ['booking_id'],
          references: {table: 'bookings', columns: ['id']},
          on_delete: 'CASCADE',
          on_update: 'CASCADE',
          description: 'Thanh toán thuộc booking.',
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  11. BOOKING_STATUS_LOGS – Lịch sử trạng thái booking
    // ══════════════════════════════════════════════════════════════════════════
    booking_status_logs: {
      description:
        'Audit trail – lịch sử toàn bộ thay đổi trạng thái booking. ' +
        'Dùng để truy vết, giải quyết khiếu nại và phân tích vận hành.',
      cols: [
        {
          name: 'id',
          type: 'uuid',
          constraints: 'NOT NULL UNIQUE PRIMARY KEY',
          description: 'Mã log (UUID).',
        },
        {
          name: 'booking_id',
          type: 'uuid',
          constraints: 'NOT NULL',
          description: 'Booking thay đổi trạng thái. FK → bookings.',
        },
        {
          name: 'from_status',
          type: 'varchar',
          length: 20,
          description: 'Trạng thái trước khi thay đổi. NULL = lần đầu tạo.',
        },
        {
          name: 'to_status',
          type: 'varchar',
          length: 20,
          constraints: 'NOT NULL',
          description: 'Trạng thái sau khi thay đổi.',
        },
        {
          name: 'changed_by',
          type: 'uuid',
          description: 'Người thực hiện. FK logic → core.users. NULL = hệ thống tự động.',
        },
        {
          name: 'changed_at',
          type: 'timestamp',
          constraints: 'NOT NULL DEFAULT CURRENT_TIMESTAMP',
          description: 'Thời điểm thay đổi.',
        },
        {
          name: 'reason',
          type: 'string',
          description: 'Lý do thay đổi (ví dụ: khách huỷ, quá giờ, nâng cấp phòng).',
        },
        {
          name: 'note',
          type: 'string',
          description: 'Ghi chú thêm.',
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
      ],
      indexes: [
        {
          name: 'idx_bsl_booking_id',
          columns: ['booking_id', 'changed_at'],
          unique: false,
          description: 'Timeline trạng thái của 1 booking.',
        },
        {
          name: 'idx_bsl_sync',
          columns: ['sync_status', 'created_at'],
          unique: false,
          description: 'Index hàng đợi đồng bộ.',
        },
      ],
      foreign_keys: [
        {
          name: 'fk_bsl_booking_id',
          columns: ['booking_id'],
          references: {table: 'bookings', columns: ['id']},
          on_delete: 'CASCADE',
          on_update: 'CASCADE',
          description: 'Log thuộc booking.',
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  12. TIME_BLOCKS – Khoá thời gian tài nguyên
    // ══════════════════════════════════════════════════════════════════════════
    time_blocks: {
      description:
        'Khoá thời gian tài nguyên – bảo trì, nghỉ lễ, sự kiện riêng, dọn phòng. ' +
        'Ngăn booking vào những khung giờ này. ' +
        'Hỗ trợ lặp lại định kỳ (is_recurring = true + recurrence_rule).',
      cols: [
        {
          name: 'id',
          type: 'uuid',
          constraints: 'NOT NULL UNIQUE PRIMARY KEY',
          description: 'Mã time block (UUID).',
        },
        {
          name: 'store_id',
          type: 'uuid',
          constraints: 'NOT NULL',
          description: 'Cửa hàng. FK logic → core.stores.',
        },
        {
          name: 'resource_id',
          type: 'uuid',
          constraints: 'NOT NULL',
          description: 'Tài nguyên bị khoá. FK → resources.',
        },
        {
          name: 'title',
          type: 'varchar',
          length: 200,
          description: 'Tên/mô tả lý do khoá (VD: Bảo trì định kỳ, Nghỉ lễ 2/9).',
        },
        {
          name: 'block_type',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'maintenance'",
          description: 'Loại khoá.',
          enum: ['maintenance', 'holiday', 'event', 'staff_off', 'cleaning', 'reserved', 'other'],
        },
        {
          name: 'start_time',
          type: 'timestamp',
          constraints: 'NOT NULL',
          description: 'Thời điểm bắt đầu khoá.',
        },
        {
          name: 'end_time',
          type: 'timestamp',
          constraints: 'NOT NULL',
          description: 'Thời điểm kết thúc khoá.',
        },
        {
          name: 'is_recurring',
          type: 'boolean',
          constraints: 'DEFAULT FALSE',
          description: 'TRUE = khoá lặp lại định kỳ.',
        },
        {
          name: 'recurrence_rule',
          type: 'varchar',
          length: 255,
          description:
            'Quy tắc lặp lại (iCal RRULE format). ' +
            'VD: "FREQ=WEEKLY;BYDAY=SU" = mỗi Chủ nhật.',
        },
        {
          name: 'note',
          type: 'string',
          description: 'Ghi chú thêm.',
        },
        {
          name: 'created_by',
          type: 'uuid',
          description: 'Người tạo. FK logic → core.users.',
        },
        {
          name: 'status',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'active'",
          description: 'Trạng thái.',
          enum: ['active', 'cancelled'],
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
          description: 'Thời gian tạo.',
        },
        {
          name: 'updated_at',
          type: 'timestamp',
          constraints: 'DEFAULT CURRENT_TIMESTAMP',
          description: 'Thời gian cập nhật.',
        },
        {
          name: 'deleted_at',
          type: 'timestamp',
          description: 'Thời gian xoá mềm.',
        },
      ],
      indexes: [
        {
          name: 'idx_time_blocks_resource_time',
          columns: ['resource_id', 'start_time', 'end_time'],
          unique: false,
          description: 'Index conflict check – kiểm tra khoá thời gian của resource.',
        },
        {
          name: 'idx_time_blocks_store_time',
          columns: ['store_id', 'start_time'],
          unique: false,
          description: 'Lọc time block theo cửa hàng và thời gian.',
        },
        {
          name: 'idx_time_blocks_block_type',
          columns: ['block_type'],
          unique: false,
          description: 'Lọc theo loại khoá.',
        },
        {
          name: 'idx_time_blocks_sync',
          columns: ['sync_status', 'updated_at'],
          unique: false,
          description: 'Index hàng đợi đồng bộ.',
        },
      ],
      foreign_keys: [
        {
          name: 'fk_tb_resource_id',
          columns: ['resource_id'],
          references: {table: 'resources', columns: ['id']},
          on_delete: 'CASCADE',
          on_update: 'CASCADE',
          description: 'Time block thuộc resource.',
        },
      ],
    },
  },
};

// ─── Export ───────────────────────────────────────────────────────────────────
export const bookingDatabaseSchemas: Record<string, DatabaseSchema> = {
  booking: bookingSchema,
};