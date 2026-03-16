/**
 * resident.schema.ts
 *
 * Schema cơ sở dữ liệu RESIDENT cho hệ thống 1POS Ecosystem.
 *
 * Phạm vi: Nghiệp vụ lưu trú – nhà trọ, khách sạn, homestay.
 *   - Quản lý phòng, tài sản phòng
 *   - Hợp đồng thuê (ngắn hạn / dài hạn)
 *   - Dịch vụ kèm theo hợp đồng (điện, nước, xe, giặt)
 *   - Người ở trọ và đăng ký tạm trú
 *   - Báo cáo tạm trú gửi công an
 *
 * Liên kết:
 *   - store_id           → core.db  → stores.id
 *   - customer_id        → pos.db   → customers.id  (người đại diện ký HĐ)
 *   - product_id         → pos.db   → products.id   (dịch vụ đăng ký)
 *   - variant_id         → pos.db   → product_variants.id
 *   - unit_id            → pos.db   → units.id
 *   - cycle_id           → pos.db   → bill_cycles.id
 *   - bill_id (ref_id)   → pos.db   → bills.id      (hóa đơn tháng)
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

export const residentSchema: DatabaseSchema = {
  version: 'v1',
  database_name: 'resident.db',
  description:
    'Cơ sở dữ liệu lưu trú của hệ thống 1POS. Quản lý phòng, hợp đồng thuê ' +
    '(ngắn hạn và dài hạn), dịch vụ kèm theo, người ở trọ và đăng ký tạm trú. ' +
    'Tham chiếu customers và bills từ pos.db để tránh lưu trùng thông tin.',
  type_mapping: SQLITE_TYPE_MAPPING,
  schemas: {

    // ══════════════════════════════════════════════════════════════════════════
    //  1. ROOMS – Danh mục phòng
    // ══════════════════════════════════════════════════════════════════════════
    rooms: {
      description:
        'Danh mục phòng / căn hộ / phòng khách sạn. ' +
        'Ánh xạ sang booking.db qua metadata.booking_resource_id.',
      cols: [
        {name: 'id', type: 'uuid', constraints: 'NOT NULL UNIQUE PRIMARY KEY', description: 'Mã phòng (UUID).'},
        {name: 'store_id', type: 'uuid', constraints: 'NOT NULL', description: 'Cửa hàng sở hữu. FK logic → core.stores.'},
        {name: 'room_code', type: 'varchar', length: 20, constraints: 'NOT NULL', description: 'Mã số phòng (VD: P101, R301, STD-01).'},
        {name: 'name', type: 'varchar', length: 100, description: 'Tên hiển thị của phòng.'},
        {
          name: 'room_type',
          type: 'varchar',
          length: 30,
          constraints: "DEFAULT 'standard'",
          description: 'Loại phòng.',
          enum: ['standard', 'superior', 'deluxe', 'suite', 'apartment', 'dormitory', 'studio', 'family'],
        },
        {name: 'floor', type: 'tinyint', description: 'Số tầng của phòng.'},
        {name: 'area_m2', type: 'decimal', precision: 6, scale: 1, description: 'Diện tích phòng (m²).'},
        {name: 'max_occupants', type: 'tinyint', constraints: 'DEFAULT 2', description: 'Số người tối đa.'},
        {name: 'base_price', type: 'decimal', precision: 15, scale: 2, description: 'Giá tham chiếu. Bị override bởi contracts.agreed_price.'},
        {name: 'amenities', type: 'json', description: 'Tiện nghi phòng (JSON array). VD: ["ac","tv","wifi","wc_private"].'},
        {name: 'thumbnail_url', type: 'url', description: 'Ảnh đại diện phòng.'},
        {name: 'images', type: 'json', description: 'Album ảnh phòng (JSON array of URLs).'},
        {name: 'working_hours', type: 'json', description: 'Giờ hoạt động (cho khách sạn). JSON: {"checkin":"14:00","checkout":"12:00"}.'},
        {
          name: 'room_status',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'available'",
          description: 'Trạng thái phòng hiện tại.',
          enum: ['available', 'occupied', 'maintenance', 'reserved', 'cleaning'],
        },
        {name: 'notes', type: 'string', description: 'Ghi chú về phòng.'},
        {name: 'sort_order', type: 'integer', constraints: 'DEFAULT 0', description: 'Thứ tự hiển thị.'},
        {name: 'metadata', type: 'json', description: 'Thông tin mở rộng. VD: {"booking_resource_id":"res-r101"}.'},
        {name: 'status', type: 'varchar', length: 20, constraints: "DEFAULT 'active'", description: 'Trạng thái bản ghi.', enum: ['active', 'inactive']},
        {name: 'sync_status', type: 'varchar', length: 20, constraints: "DEFAULT 'local'", description: 'Trạng thái đồng bộ.', enum: ['local', 'synced', 'conflict', 'pending_sync']},
        {name: 'created_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian tạo.'},
        {name: 'updated_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian cập nhật.'},
        {name: 'deleted_at', type: 'timestamp', description: 'Thời gian xoá mềm.'},
      ],
      indexes: [
        {name: 'idx_rooms_store_code', columns: ['store_id', 'room_code'], unique: true, description: 'Mã phòng duy nhất trong cửa hàng.'},
        {name: 'idx_rooms_store_status', columns: ['store_id', 'room_status'], unique: false, description: 'Lọc phòng theo trạng thái.'},
        {name: 'idx_rooms_room_type', columns: ['room_type'], unique: false, description: 'Lọc theo loại phòng.'},
        {name: 'idx_rooms_sync', columns: ['sync_status', 'updated_at'], unique: false, description: 'Index hàng đợi đồng bộ.'},
      ],
      foreign_keys: [],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  2. ROOM_ASSETS – Tài sản trong phòng
    // ══════════════════════════════════════════════════════════════════════════
    room_assets: {
      description:
        'Danh sách tài sản bàn giao trong phòng. ' +
        'Ghi nhận khi ký hợp đồng và đối chiếu khi kết thúc.',
      cols: [
        {name: 'id', type: 'uuid', constraints: 'NOT NULL UNIQUE PRIMARY KEY', description: 'Mã tài sản (UUID).'},
        {name: 'store_id', type: 'uuid', constraints: 'NOT NULL', description: 'Cửa hàng. FK logic → core.stores.'},
        {name: 'room_id', type: 'uuid', constraints: 'NOT NULL', description: 'Phòng chứa tài sản. FK → rooms.'},
        {name: 'asset_code', type: 'varchar', length: 30, description: 'Mã tài sản nội bộ.'},
        {name: 'name', type: 'varchar', length: 100, constraints: 'NOT NULL', description: 'Tên tài sản (VD: Máy lạnh, Tủ lạnh).'},
        {name: 'quantity', type: 'integer', constraints: 'DEFAULT 1', description: 'Số lượng.'},
        {name: 'condition_note', type: 'string', description: 'Tình trạng khi bàn giao.'},
        {name: 'purchase_date', type: 'date', description: 'Ngày mua / nhập.'},
        {name: 'purchase_price', type: 'decimal', precision: 15, scale: 2, description: 'Giá mua.'},
        {name: 'image_url', type: 'url', description: 'Ảnh tài sản.'},
        {name: 'status', type: 'varchar', length: 20, constraints: "DEFAULT 'active'", description: 'Trạng thái.', enum: ['active', 'damaged', 'lost', 'disposed']},
        {name: 'sync_status', type: 'varchar', length: 20, constraints: "DEFAULT 'local'", description: 'Trạng thái đồng bộ.', enum: ['local', 'synced', 'conflict', 'pending_sync']},
        {name: 'created_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian tạo.'},
        {name: 'updated_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian cập nhật.'},
        {name: 'deleted_at', type: 'timestamp', description: 'Thời gian xoá mềm.'},
      ],
      indexes: [
        {name: 'idx_room_assets_room_id', columns: ['room_id'], unique: false, description: 'Index tìm tài sản theo phòng.'},
        {name: 'idx_room_assets_status', columns: ['status'], unique: false, description: 'Lọc tài sản theo tình trạng.'},
      ],
      foreign_keys: [
        {name: 'fk_room_assets_room_id', columns: ['room_id'], references: {table: 'rooms', columns: ['id']}, on_delete: 'CASCADE', on_update: 'CASCADE', description: 'Tài sản thuộc phòng.'},
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  3. CONTRACTS – Hợp đồng thuê phòng
    // ══════════════════════════════════════════════════════════════════════════
    contracts: {
      description:
        'Hợp đồng thuê phòng – hỗ trợ cả lưu trú ngắn hạn (daily/hourly) ' +
        'và dài hạn (monthly). Hóa đơn thanh toán được tạo trong pos.db với ref_id = contract.id.',
      cols: [
        {name: 'id', type: 'uuid', constraints: 'NOT NULL UNIQUE PRIMARY KEY', description: 'Mã hợp đồng (UUID).'},
        {name: 'store_id', type: 'uuid', constraints: 'NOT NULL', description: 'Cửa hàng. FK logic → core.stores.'},
        {name: 'room_id', type: 'uuid', constraints: 'NOT NULL', description: 'Phòng thuê. FK → rooms.'},
        {name: 'customer_id', type: 'uuid', constraints: 'NOT NULL', description: 'Khách đại diện ký HĐ. FK logic → pos.customers.'},
        {name: 'contract_number', type: 'varchar', length: 30, description: 'Số hợp đồng (VD: HD-2024-001, CKI-20240710-R101).'},
        {
          name: 'contract_type',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'monthly'",
          description: 'Loại hợp đồng.',
          enum: ['monthly', 'daily', 'hourly', 'fixed_term'],
        },
        {name: 'cycle_id', type: 'uuid', description: 'Chu kỳ thanh toán định kỳ. FK logic → pos.bill_cycles.'},
        {name: 'start_date', type: 'date', constraints: 'NOT NULL', description: 'Ngày bắt đầu / Check-in.'},
        {name: 'end_date', type: 'date', description: 'Ngày kết thúc dự kiến / Check-out. NULL = không thời hạn.'},
        {name: 'actual_checkin_at', type: 'timestamp', description: 'Thời điểm thực tế check-in (lưu cả giờ phút).'},
        {name: 'actual_checkout_at', type: 'timestamp', description: 'Thời điểm thực tế check-out.'},
        {name: 'agreed_price', type: 'decimal', precision: 15, scale: 2, constraints: 'NOT NULL', description: 'Giá thuê thoả thuận (đơn giá theo chu kỳ/đêm/giờ).'},
        {name: 'deposit_amount', type: 'decimal', precision: 15, scale: 2, constraints: 'DEFAULT 0', description: 'Tiền cọc phải nộp.'},
        {name: 'deposit_paid', type: 'decimal', precision: 15, scale: 2, constraints: 'DEFAULT 0', description: 'Tiền cọc đã nhận.'},
        {name: 'deposit_returned', type: 'decimal', precision: 15, scale: 2, constraints: 'DEFAULT 0', description: 'Tiền cọc đã hoàn trả.'},
        {name: 'billing_day', type: 'tinyint', description: 'Ngày chốt bill trong tháng (1–28). Cho hợp đồng monthly.'},
        {name: 'auto_bill', type: 'boolean', constraints: 'DEFAULT FALSE', description: 'Tự động tạo hóa đơn định kỳ.'},
        {name: 'electricity_meter_init', type: 'decimal', precision: 10, scale: 2, description: 'Chỉ số điện ban đầu khi nhận phòng.'},
        {name: 'water_meter_init', type: 'decimal', precision: 10, scale: 2, description: 'Chỉ số nước ban đầu.'},
        {name: 'guest_count', type: 'tinyint', constraints: 'DEFAULT 1', description: 'Số khách khi check-in.'},
        {name: 'signed_date', type: 'date', description: 'Ngày ký hợp đồng.'},
        {name: 'terminated_date', type: 'date', description: 'Ngày thanh lý / kết thúc thực tế.'},
        {name: 'termination_reason', type: 'string', description: 'Lý do kết thúc hợp đồng.'},
        {name: 'scanned_contract_url', type: 'url', description: 'File hợp đồng đã scan.'},
        {
          name: 'contract_status',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'active'",
          description: 'Trạng thái hợp đồng.',
          enum: ['draft', 'active', 'ended', 'terminated', 'expired'],
        },
        {name: 'notes', type: 'string', description: 'Ghi chú hợp đồng.'},
        {name: 'internal_notes', type: 'string', description: 'Ghi chú nội bộ.'},
        {name: 'booking_id', type: 'uuid', description: 'Mã booking tạo ra HĐ này. FK logic → booking.bookings.'},
        {name: 'metadata', type: 'json', description: 'Thông tin mở rộng (JSON).'},
        {name: 'sync_status', type: 'varchar', length: 20, constraints: "DEFAULT 'local'", description: 'Trạng thái đồng bộ.', enum: ['local', 'synced', 'conflict', 'pending_sync']},
        {name: 'created_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian tạo.'},
        {name: 'updated_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian cập nhật.'},
        {name: 'deleted_at', type: 'timestamp', description: 'Thời gian xoá mềm.'},
      ],
      indexes: [
        {name: 'idx_contracts_store_number', columns: ['store_id', 'contract_number'], unique: true, description: 'Số hợp đồng duy nhất trong cửa hàng.'},
        {name: 'idx_contracts_room_id', columns: ['room_id', 'contract_status'], unique: false, description: 'Tìm HĐ đang active của 1 phòng.'},
        {name: 'idx_contracts_customer_id', columns: ['customer_id'], unique: false, description: 'Tìm HĐ theo khách hàng.'},
        {name: 'idx_contracts_status', columns: ['store_id', 'contract_status'], unique: false, description: 'Lọc HĐ theo trạng thái.'},
        {name: 'idx_contracts_checkin', columns: ['actual_checkin_at'], unique: false, description: 'Sắp xếp theo thời gian check-in.'},
        {name: 'idx_contracts_sync', columns: ['sync_status', 'updated_at'], unique: false, description: 'Index hàng đợi đồng bộ.'},
      ],
      foreign_keys: [
        {name: 'fk_contracts_room_id', columns: ['room_id'], references: {table: 'rooms', columns: ['id']}, on_delete: 'RESTRICT', on_update: 'CASCADE', description: 'Hợp đồng gắn với phòng.'},
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  4. CONTRACT_SERVICES – Dịch vụ đăng ký theo hợp đồng
    // ══════════════════════════════════════════════════════════════════════════
    contract_services: {
      description:
        'Dịch vụ kèm theo đăng ký trong hợp đồng (điện, nước, gửi xe, giặt, v.v.). ' +
        'pricing_type quyết định cách tính tiền mỗi kỳ chốt sổ.',
      cols: [
        {name: 'id', type: 'uuid', constraints: 'NOT NULL UNIQUE PRIMARY KEY', description: 'Mã bản ghi (UUID).'},
        {name: 'store_id', type: 'uuid', constraints: 'NOT NULL', description: 'Cửa hàng. FK logic → core.stores.'},
        {name: 'contract_id', type: 'uuid', constraints: 'NOT NULL', description: 'Hợp đồng áp dụng. FK → contracts.'},
        {name: 'product_id', type: 'uuid', constraints: 'NOT NULL', description: 'Dịch vụ/sản phẩm. FK logic → pos.products.'},
        {name: 'variant_id', type: 'uuid', description: 'Biến thể dịch vụ. FK logic → pos.product_variants.'},
        {name: 'unit_id', type: 'uuid', description: 'Đơn vị tính. FK logic → pos.units.'},
        {
          name: 'pricing_type',
          type: 'varchar',
          length: 20,
          description: 'Cách tính giá (override từ product).',
          enum: ['fixed', 'per_unit', 'per_person', 'per_night', 'per_hour'],
        },
        {name: 'agreed_price', type: 'decimal', precision: 15, scale: 2, constraints: 'NOT NULL', description: 'Đơn giá thoả thuận (đồng/đơn vị).'},
        {name: 'quantity', type: 'decimal', precision: 6, scale: 2, constraints: 'DEFAULT 1', description: 'Số lượng mặc định (cho dịch vụ tính theo số lượng: xe, máy giặt).'},
        {name: 'is_included_rent', type: 'boolean', constraints: 'DEFAULT FALSE', description: 'Đã gộp vào tiền phòng chưa.'},
        {name: 'effective_from', type: 'date', description: 'Ngày bắt đầu áp dụng giá dịch vụ này.'},
        {name: 'effective_to', type: 'date', description: 'Ngày kết thúc. NULL = áp dụng đến hết HĐ.'},
        {name: 'notes', type: 'string', description: 'Ghi chú.'},
        {name: 'sort_order', type: 'integer', constraints: 'DEFAULT 0', description: 'Thứ tự hiển thị khi chốt sổ.'},
        {name: 'status', type: 'varchar', length: 20, constraints: "DEFAULT 'active'", description: 'Trạng thái.', enum: ['active', 'inactive']},
        {name: 'sync_status', type: 'varchar', length: 20, constraints: "DEFAULT 'local'", description: 'Trạng thái đồng bộ.', enum: ['local', 'synced', 'conflict', 'pending_sync']},
        {name: 'created_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian tạo.'},
        {name: 'updated_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian cập nhật.'},
        {name: 'deleted_at', type: 'timestamp', description: 'Thời gian xoá mềm.'},
      ],
      indexes: [
        {name: 'idx_contract_services_contract_id', columns: ['contract_id'], unique: false, description: 'Index tìm dịch vụ theo hợp đồng.'},
        {name: 'idx_contract_services_product_id', columns: ['product_id'], unique: false, description: 'Index thống kê theo dịch vụ.'},
        {name: 'idx_contract_services_active', columns: ['contract_id', 'status'], unique: false, description: 'Lọc dịch vụ đang active của HĐ.'},
      ],
      foreign_keys: [
        {name: 'fk_contract_services_contract_id', columns: ['contract_id'], references: {table: 'contracts', columns: ['id']}, on_delete: 'CASCADE', on_update: 'CASCADE', description: 'Dịch vụ thuộc hợp đồng.'},
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  5. RESIDENTS – Người ở trọ (tạm trú)
    // ══════════════════════════════════════════════════════════════════════════
    residents: {
      description:
        'Người ở trọ / cư trú trong phòng – phục vụ đăng ký và quản lý tạm trú với công an. ' +
        'Không lưu lại thông tin cơ bản (tên, SĐT, CCCD) – lấy từ pos.customers qua customer_id. ' +
        'Bảng này chỉ bổ sung thông tin tạm trú và ảnh giấy tờ.',
      cols: [
        {name: 'id', type: 'uuid', constraints: 'NOT NULL UNIQUE PRIMARY KEY', description: 'Mã cư dân (UUID).'},
        {name: 'store_id', type: 'uuid', constraints: 'NOT NULL', description: 'Cửa hàng. FK logic → core.stores.'},
        {name: 'customer_id', type: 'uuid', constraints: 'NOT NULL', description: 'Thông tin cơ bản lấy từ đây. FK logic → pos.customers.'},
        {name: 'hometown', type: 'string', description: 'Quê quán / địa chỉ thường trú.'},
        {name: 'occupation', type: 'varchar', length: 100, description: 'Nghề nghiệp.'},
        {name: 'workplace', type: 'varchar', length: 200, description: 'Nơi làm việc.'},
        {name: 'id_card_front_url', type: 'url', description: 'Ảnh CCCD/CMND mặt trước.'},
        {name: 'id_card_back_url', type: 'url', description: 'Ảnh CCCD/CMND mặt sau.'},
        {name: 'portrait_url', type: 'url', description: 'Ảnh chân dung.'},
        {name: 'temp_residence_from', type: 'date', description: 'Ngày đăng ký tạm trú.'},
        {name: 'temp_residence_to', type: 'date', description: 'Ngày hết hạn tạm trú.'},
        {
          name: 'temp_residence_status',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'pending'",
          description: 'Trạng thái duyệt tạm trú.',
          enum: ['pending', 'approved', 'expired', 'cancelled'],
        },
        {name: 'police_ref_number', type: 'varchar', length: 50, description: 'Số phiếu tạm trú do công an cấp.'},
        {name: 'approved_by', type: 'varchar', length: 100, description: 'Cán bộ công an duyệt.'},
        {name: 'approved_at', type: 'date', description: 'Ngày được duyệt.'},
        {name: 'notes', type: 'string', description: 'Ghi chú tạm trú.'},
        {name: 'status', type: 'varchar', length: 20, constraints: "DEFAULT 'active'", description: 'Trạng thái bản ghi.', enum: ['active', 'inactive']},
        {name: 'sync_status', type: 'varchar', length: 20, constraints: "DEFAULT 'local'", description: 'Trạng thái đồng bộ.', enum: ['local', 'synced', 'conflict', 'pending_sync']},
        {name: 'created_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian tạo.'},
        {name: 'updated_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian cập nhật.'},
        {name: 'deleted_at', type: 'timestamp', description: 'Thời gian xoá mềm.'},
      ],
      indexes: [
        {name: 'idx_residents_store_customer', columns: ['store_id', 'customer_id'], unique: true, description: 'Mỗi khách chỉ có 1 bản ghi resident trong 1 cửa hàng.'},
        {name: 'idx_residents_temp_status', columns: ['temp_residence_status'], unique: false, description: 'Lọc theo trạng thái tạm trú.'},
        {name: 'idx_residents_sync', columns: ['sync_status', 'updated_at'], unique: false, description: 'Index hàng đợi đồng bộ.'},
      ],
      foreign_keys: [],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  6. CONTRACT_RESIDENTS – Danh sách người ở theo hợp đồng (N:N)
    // ══════════════════════════════════════════════════════════════════════════
    contract_residents: {
      description:
        'Bảng N:N – người ở trọ theo từng hợp đồng. ' +
        '1 hợp đồng có nhiều người ở; 1 người có thể xuất hiện ở nhiều hợp đồng khác nhau.',
      cols: [
        {name: 'id', type: 'uuid', constraints: 'NOT NULL UNIQUE PRIMARY KEY', description: 'Mã bản ghi (UUID).'},
        {name: 'store_id', type: 'uuid', constraints: 'NOT NULL', description: 'Cửa hàng. FK logic → core.stores.'},
        {name: 'contract_id', type: 'uuid', constraints: 'NOT NULL', description: 'Hợp đồng. FK → contracts.'},
        {name: 'resident_id', type: 'uuid', constraints: 'NOT NULL', description: 'Người ở trọ. FK → residents.'},
        {name: 'move_in_date', type: 'date', constraints: 'NOT NULL', description: 'Ngày vào ở.'},
        {name: 'move_out_date', type: 'date', description: 'Ngày rời đi. NULL = đang sinh sống.'},
        {name: 'is_representative', type: 'boolean', constraints: 'DEFAULT FALSE', description: 'TRUE = người đại diện hợp đồng.'},
        {name: 'relationship_to_rep', type: 'varchar', length: 50, description: 'Quan hệ với người đại diện (vợ/chồng/con/bạn bè).'},
        {name: 'notes', type: 'string', description: 'Ghi chú.'},
        {name: 'status', type: 'varchar', length: 20, constraints: "DEFAULT 'active'", description: 'Trạng thái.', enum: ['active', 'moved_out']},
        {name: 'sync_status', type: 'varchar', length: 20, constraints: "DEFAULT 'local'", description: 'Trạng thái đồng bộ.', enum: ['local', 'synced', 'conflict', 'pending_sync']},
        {name: 'created_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian tạo.'},
        {name: 'updated_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian cập nhật.'},
        {name: 'deleted_at', type: 'timestamp', description: 'Thời gian xoá mềm.'},
      ],
      indexes: [
        {name: 'idx_contract_residents_contract', columns: ['contract_id'], unique: false, description: 'Index tìm người ở theo hợp đồng.'},
        {name: 'idx_contract_residents_resident', columns: ['resident_id'], unique: false, description: 'Index tìm HĐ theo người.'},
        {name: 'idx_contract_residents_unique', columns: ['contract_id', 'resident_id'], unique: true, description: 'Đảm bảo không trùng người trong HĐ.'},
        {name: 'idx_contract_residents_status', columns: ['status'], unique: false, description: 'Lọc người đang còn ở.'},
      ],
      foreign_keys: [
        {name: 'fk_cr_contract_id', columns: ['contract_id'], references: {table: 'contracts', columns: ['id']}, on_delete: 'CASCADE', on_update: 'CASCADE', description: 'Liên kết hợp đồng.'},
        {name: 'fk_cr_resident_id', columns: ['resident_id'], references: {table: 'residents', columns: ['id']}, on_delete: 'CASCADE', on_update: 'CASCADE', description: 'Liên kết người ở.'},
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  7. METER_READINGS – Chỉ số điện/nước hàng tháng
    // ══════════════════════════════════════════════════════════════════════════
    meter_readings: {
      description:
        'Ghi chỉ số đồng hồ điện/nước hàng tháng. ' +
        'Chỉ áp dụng cho dịch vụ pricing_type=per_unit. ' +
        'Kết quả tiêu thụ được đẩy vào pos.bill_details khi chốt sổ.',
      cols: [
        {name: 'id', type: 'uuid', constraints: 'NOT NULL UNIQUE PRIMARY KEY', description: 'Mã bản ghi (UUID).'},
        {name: 'store_id', type: 'uuid', constraints: 'NOT NULL', description: 'Cửa hàng. FK logic → core.stores.'},
        {name: 'contract_id', type: 'uuid', constraints: 'NOT NULL', description: 'Hợp đồng áp dụng. FK → contracts.'},
        {name: 'product_id', type: 'uuid', constraints: 'NOT NULL', description: 'Dịch vụ điện/nước. FK logic → pos.products.'},
        {name: 'reading_month', type: 'varchar', length: 7, constraints: 'NOT NULL', description: 'Tháng ghi chỉ số (YYYY-MM).'},
        {name: 'previous_reading', type: 'decimal', precision: 10, scale: 2, constraints: 'DEFAULT 0', description: 'Chỉ số tháng trước (kỳ đầu).'},
        {name: 'current_reading', type: 'decimal', precision: 10, scale: 2, constraints: 'NOT NULL', description: 'Chỉ số tháng này (kỳ cuối).'},
        {name: 'consumption', type: 'decimal', precision: 10, scale: 2, constraints: 'DEFAULT 0', description: 'Lượng tiêu thụ = current - previous.'},
        {name: 'meter_photo_url', type: 'url', description: 'Ảnh đồng hồ điện/nước.'},
        {name: 'recorded_at', type: 'date', description: 'Ngày ghi chỉ số.'},
        {name: 'recorded_by', type: 'uuid', description: 'Nhân viên đi ghi. FK logic → core.users.'},
        {name: 'notes', type: 'string', description: 'Ghi chú bất thường.'},
        {name: 'sync_status', type: 'varchar', length: 20, constraints: "DEFAULT 'local'", description: 'Trạng thái đồng bộ.', enum: ['local', 'synced', 'conflict', 'pending_sync']},
        {name: 'created_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian tạo.'},
        {name: 'updated_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian cập nhật.'},
      ],
      indexes: [
        {name: 'idx_meter_contract_product_month', columns: ['contract_id', 'product_id', 'reading_month'], unique: true, description: 'Mỗi HĐ chỉ có 1 bản ghi chỉ số/dịch vụ/tháng.'},
        {name: 'idx_meter_reading_month', columns: ['reading_month'], unique: false, description: 'Lọc chỉ số theo tháng.'},
        {name: 'idx_meter_sync', columns: ['sync_status', 'updated_at'], unique: false, description: 'Index hàng đợi đồng bộ.'},
      ],
      foreign_keys: [
        {name: 'fk_meter_contract_id', columns: ['contract_id'], references: {table: 'contracts', columns: ['id']}, on_delete: 'CASCADE', on_update: 'CASCADE', description: 'Chỉ số thuộc hợp đồng.'},
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  8. TEMP_RESIDENCE_REPORTS – Báo cáo tạm trú công an
    // ══════════════════════════════════════════════════════════════════════════
    temp_residence_reports: {
      description:
        'Lịch sử báo cáo tạm trú định kỳ gửi công an phường/xã. ' +
        'Lưu toàn bộ lần nộp để tra cứu khi được yêu cầu.',
      cols: [
        {name: 'id', type: 'uuid', constraints: 'NOT NULL UNIQUE PRIMARY KEY', description: 'Mã báo cáo (UUID).'},
        {name: 'store_id', type: 'uuid', constraints: 'NOT NULL', description: 'Cơ sở lưu trú. FK logic → core.stores.'},
        {name: 'report_period', type: 'varchar', length: 20, description: 'Kỳ báo cáo (VD: 2024-06 / 2024-Q2).'},
        {name: 'report_type', type: 'varchar', length: 20, description: 'Loại báo cáo.', enum: ['monthly', 'quarterly', 'ondemand']},
        {name: 'total_residents', type: 'integer', description: 'Tổng số cư dân trong kỳ.'},
        {name: 'new_residents', type: 'integer', description: 'Số cư dân mới trong kỳ.'},
        {name: 'left_residents', type: 'integer', description: 'Số cư dân rời đi trong kỳ.'},
        {name: 'submitted_at', type: 'date', description: 'Ngày nộp báo cáo.'},
        {name: 'submitted_by', type: 'varchar', length: 100, description: 'Người nộp.'},
        {name: 'police_station', type: 'varchar', length: 200, description: 'Công an phường/xã nhận báo cáo.'},
        {name: 'receipt_number', type: 'varchar', length: 50, description: 'Số biên nhận của công an.'},
        {name: 'report_file_url', type: 'url', description: 'File báo cáo đính kèm.'},
        {name: 'notes', type: 'string', description: 'Ghi chú.'},
        {name: 'report_status', type: 'varchar', length: 20, constraints: "DEFAULT 'draft'", description: 'Trạng thái báo cáo.', enum: ['draft', 'submitted', 'confirmed']},
        {name: 'sync_status', type: 'varchar', length: 20, constraints: "DEFAULT 'local'", description: 'Trạng thái đồng bộ.', enum: ['local', 'synced', 'conflict', 'pending_sync']},
        {name: 'created_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian tạo.'},
        {name: 'updated_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian cập nhật.'},
        {name: 'deleted_at', type: 'timestamp', description: 'Thời gian xoá mềm.'},
      ],
      indexes: [
        {name: 'idx_reports_store_period', columns: ['store_id', 'report_period'], unique: false, description: 'Index tìm báo cáo theo cơ sở và kỳ.'},
        {name: 'idx_reports_status', columns: ['report_status'], unique: false, description: 'Lọc theo trạng thái báo cáo.'},
      ],
      foreign_keys: [],
    },
  },
};

export const residentDatabaseSchemas: Record<string, DatabaseSchema> = {
  resident: residentSchema,
};