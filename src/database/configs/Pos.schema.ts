/**
 * pos.schema.ts
 *
 * Schema cơ sở dữ liệu POS cho hệ thống 1POS Ecosystem.
 *
 * Phạm vi: Nghiệp vụ bán hàng chung – dùng cho cafe, tiệm bánh, tạp hoá,
 *           nhà trọ, khách sạn. Quản lý danh mục, đơn giá, khách hàng,
 *           hóa đơn và thanh toán.
 *
 * Liên kết:
 *   - store_id          → core.db → stores.id
 *   - (cashier_user_id) → core.db → users.id
 *   - customer_id       → pos.db  → customers.id  (cũng được tham chiếu bởi resident.db)
 *   - bill_id           → pos.db  → bills.id       (cũng được tham chiếu bởi booking.db)
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

export const posSchema: DatabaseSchema = {
  version: 'v1',
  database_name: 'pos.db',
  description:
    'Cơ sở dữ liệu POS chung của hệ thống 1POS. Quản lý danh mục sản phẩm/dịch vụ, ' +
    'đơn giá, khách hàng, chu kỳ thanh toán, hóa đơn và giao dịch. ' +
    'Dùng chung cho mọi loại hình kinh doanh trong hệ sinh thái.',
  type_mapping: SQLITE_TYPE_MAPPING,
  schemas: {

    // ══════════════════════════════════════════════════════════════════════════
    //  1. CATEGORIES – Danh mục sản phẩm / dịch vụ
    // ══════════════════════════════════════════════════════════════════════════
    categories: {
      description:
        'Danh mục sản phẩm và dịch vụ. Hỗ trợ đa cấp (parent_id). ' +
        'Mỗi danh mục có thể gán màu và icon để hiển thị nhanh trên màn hình POS.',
      cols: [
        {name: 'id', type: 'uuid', constraints: 'NOT NULL UNIQUE PRIMARY KEY', description: 'Mã danh mục (UUID).'},
        {name: 'store_id', type: 'uuid', constraints: 'NOT NULL', description: 'Cửa hàng sở hữu danh mục. FK logic → core.stores.'},
        {name: 'parent_id', type: 'uuid', description: 'Danh mục cha. NULL = danh mục gốc (đa cấp).'},
        {name: 'category_code', type: 'varchar', length: 30, description: 'Mã danh mục viết tắt (VD: HOT_DRINK, ROOM_RENT).'},
        {name: 'name', type: 'varchar', length: 100, constraints: 'NOT NULL', description: 'Tên danh mục.'},
        {name: 'icon', type: 'varchar', length: 50, description: 'Tên icon hiển thị trên POS.'},
        {name: 'color_code', type: 'varchar', length: 10, description: 'Mã màu nút POS (VD: #FF5733).'},
        {
          name: 'apply_to',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'all'",
          description: 'Loại hình áp dụng.',
          enum: ['all', 'pos', 'hostel', 'hotel', 'booking'],
        },
        {name: 'sort_order', type: 'integer', constraints: 'DEFAULT 0', description: 'Thứ tự hiển thị.'},
        {name: 'status', type: 'varchar', length: 20, constraints: "DEFAULT 'active'", description: 'Trạng thái.', enum: ['active', 'inactive']},
        {name: 'sync_status', type: 'varchar', length: 20, constraints: "DEFAULT 'local'", description: 'Trạng thái đồng bộ.', enum: ['local', 'synced', 'conflict', 'pending_sync']},
        {name: 'created_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian tạo.'},
        {name: 'updated_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian cập nhật.'},
        {name: 'deleted_at', type: 'timestamp', description: 'Thời gian xoá mềm.'},
      ],
      indexes: [
        {name: 'idx_categories_store_id', columns: ['store_id'], unique: false, description: 'Index tìm danh mục theo cửa hàng.'},
        {name: 'idx_categories_store_code', columns: ['store_id', 'category_code'], unique: true, description: 'Mã danh mục duy nhất trong mỗi cửa hàng.'},
        {name: 'idx_categories_parent_id', columns: ['parent_id'], unique: false, description: 'Index duyệt cây danh mục.'},
        {name: 'idx_categories_sync', columns: ['sync_status', 'updated_at'], unique: false, description: 'Index hàng đợi đồng bộ.'},
      ],
      foreign_keys: [
        {name: 'fk_categories_parent_id', columns: ['parent_id'], references: {table: 'categories', columns: ['id']}, on_delete: 'SET NULL', on_update: 'CASCADE', description: 'Tự tham chiếu – danh mục đa cấp.'},
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  2. UNITS – Đơn vị tính
    // ══════════════════════════════════════════════════════════════════════════
    units: {
      description: 'Danh mục đơn vị tính dùng cho sản phẩm và dịch vụ.',
      cols: [
        {name: 'id', type: 'uuid', constraints: 'NOT NULL UNIQUE PRIMARY KEY', description: 'Mã đơn vị (UUID).'},
        {name: 'store_id', type: 'uuid', constraints: 'NOT NULL', description: 'Cửa hàng sở hữu. FK logic → core.stores.'},
        {name: 'unit_code', type: 'varchar', length: 20, constraints: 'NOT NULL', description: 'Mã đơn vị (pcs/kg/liter/kwh/m3/month/night/hour/times).'},
        {name: 'name', type: 'varchar', length: 50, constraints: 'NOT NULL', description: 'Tên đơn vị hiển thị (Cái/Kg/Lít/kWh/m³/Tháng/Đêm/Giờ/Lần).'},
        {name: 'unit_type', type: 'varchar', length: 20, description: 'Nhóm đơn vị.', enum: ['count', 'weight', 'volume', 'utility', 'time', 'area']},
        {name: 'sort_order', type: 'integer', constraints: 'DEFAULT 0', description: 'Thứ tự hiển thị.'},
        {name: 'status', type: 'varchar', length: 20, constraints: "DEFAULT 'active'", description: 'Trạng thái.', enum: ['active', 'inactive']},
        {name: 'sync_status', type: 'varchar', length: 20, constraints: "DEFAULT 'local'", description: 'Trạng thái đồng bộ.', enum: ['local', 'synced', 'conflict', 'pending_sync']},
        {name: 'created_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian tạo.'},
        {name: 'updated_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian cập nhật.'},
        {name: 'deleted_at', type: 'timestamp', description: 'Thời gian xoá mềm.'},
      ],
      indexes: [
        {name: 'idx_units_store_code', columns: ['store_id', 'unit_code'], unique: true, description: 'Mã đơn vị duy nhất trong mỗi cửa hàng.'},
      ],
      foreign_keys: [],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  3. PRODUCTS – Danh mục sản phẩm / dịch vụ
    // ══════════════════════════════════════════════════════════════════════════
    products: {
      description:
        'Danh mục sản phẩm và dịch vụ của cửa hàng. ' +
        'product_type phân biệt hàng hoá vật lý, dịch vụ, tiện ích (điện/nước), phòng.',
      cols: [
        {name: 'id', type: 'uuid', constraints: 'NOT NULL UNIQUE PRIMARY KEY', description: 'Mã sản phẩm (UUID).'},
        {name: 'store_id', type: 'uuid', constraints: 'NOT NULL', description: 'Cửa hàng sở hữu. FK logic → core.stores.'},
        {name: 'category_id', type: 'uuid', description: 'Danh mục sản phẩm. FK → categories.'},
        {name: 'unit_id', type: 'uuid', description: 'Đơn vị tính mặc định. FK → units.'},
        {name: 'product_code', type: 'varchar', length: 50, description: 'Mã sản phẩm / SKU.'},
        {name: 'barcode', type: 'varchar', length: 50, description: 'Mã vạch.'},
        {name: 'name', type: 'varchar', length: 200, constraints: 'NOT NULL', description: 'Tên đầy đủ sản phẩm.'},
        {name: 'short_name', type: 'varchar', length: 50, description: 'Tên viết tắt hiển thị trên nút POS.'},
        {name: 'description', type: 'string', description: 'Mô tả chi tiết sản phẩm.'},
        {name: 'image_url', type: 'url', description: 'Ảnh đại diện sản phẩm.'},
        {
          name: 'product_type',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'product'",
          description: 'Loại sản phẩm.',
          enum: ['product', 'service', 'utility', 'room', 'deposit', 'combo'],
        },
        {
          name: 'pricing_type',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'fixed'",
          description: 'Cách tính giá.',
          enum: ['fixed', 'per_unit', 'per_person', 'per_night', 'per_hour', 'variable'],
        },
        {name: 'is_active_pos', type: 'boolean', constraints: 'DEFAULT TRUE', description: 'Hiển thị nút trên màn hình POS.'},
        {name: 'is_trackable', type: 'boolean', constraints: 'DEFAULT FALSE', description: 'Có quản lý tồn kho không.'},
        {name: 'tax_rate', type: 'decimal', precision: 5, scale: 2, constraints: 'DEFAULT 0', description: 'Thuế suất riêng (% VAT). 0 = lấy từ store settings.'},
        {name: 'sort_order', type: 'integer', constraints: 'DEFAULT 0', description: 'Thứ tự hiển thị trên POS.'},
        {name: 'metadata', type: 'json', description: 'Thông tin mở rộng theo ngành (JSON).'},
        {name: 'status', type: 'varchar', length: 20, constraints: "DEFAULT 'active'", description: 'Trạng thái sản phẩm.', enum: ['active', 'inactive', 'draft']},
        {name: 'sync_status', type: 'varchar', length: 20, constraints: "DEFAULT 'local'", description: 'Trạng thái đồng bộ.', enum: ['local', 'synced', 'conflict', 'pending_sync']},
        {name: 'created_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian tạo.'},
        {name: 'updated_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian cập nhật.'},
        {name: 'deleted_at', type: 'timestamp', description: 'Thời gian xoá mềm.'},
      ],
      indexes: [
        {name: 'idx_products_store_id', columns: ['store_id'], unique: false, description: 'Index tìm sản phẩm theo cửa hàng.'},
        {name: 'idx_products_store_code', columns: ['store_id', 'product_code'], unique: true, description: 'Mã sản phẩm duy nhất trong cửa hàng.'},
        {name: 'idx_products_category_id', columns: ['category_id'], unique: false, description: 'Index lọc theo danh mục.'},
        {name: 'idx_products_is_active_pos', columns: ['store_id', 'is_active_pos'], unique: false, description: 'Index lọc sản phẩm hiển thị trên POS.'},
        {name: 'idx_products_barcode', columns: ['barcode'], unique: false, description: 'Index tìm kiếm theo mã vạch.'},
        {name: 'idx_products_sync', columns: ['sync_status', 'updated_at'], unique: false, description: 'Index hàng đợi đồng bộ.'},
      ],
      foreign_keys: [
        {name: 'fk_products_category_id', columns: ['category_id'], references: {table: 'categories', columns: ['id']}, on_delete: 'SET NULL', on_update: 'CASCADE', description: 'Sản phẩm thuộc danh mục.'},
        {name: 'fk_products_unit_id', columns: ['unit_id'], references: {table: 'units', columns: ['id']}, on_delete: 'SET NULL', on_update: 'CASCADE', description: 'Đơn vị tính mặc định.'},
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  4. PRODUCT_VARIANTS – Biến thể sản phẩm
    // ══════════════════════════════════════════════════════════════════════════
    product_variants: {
      description:
        'Biến thể của sản phẩm (size, màu sắc, loại phòng, v.v.). ' +
        'Mỗi sản phẩm có ít nhất 1 variant mặc định.',
      cols: [
        {name: 'id', type: 'uuid', constraints: 'NOT NULL UNIQUE PRIMARY KEY', description: 'Mã biến thể (UUID).'},
        {name: 'store_id', type: 'uuid', constraints: 'NOT NULL', description: 'Cửa hàng sở hữu. FK logic → core.stores.'},
        {name: 'product_id', type: 'uuid', constraints: 'NOT NULL', description: 'Sản phẩm cha. FK → products.'},
        {name: 'variant_code', type: 'varchar', length: 50, description: 'Mã biến thể.'},
        {name: 'name', type: 'varchar', length: 100, constraints: 'NOT NULL', description: 'Tên biến thể (VD: Size S, Giường Đôi, Phòng 101).'},
        {name: 'barcode', type: 'varchar', length: 50, description: 'Mã vạch riêng của biến thể.'},
        {name: 'attributes', type: 'json', description: 'Thuộc tính biến thể (JSON). VD: {"size":"L","color":"Red","bed":"double"}.'},
        {name: 'image_url', type: 'url', description: 'Ảnh riêng của biến thể.'},
        {name: 'is_default', type: 'boolean', constraints: 'DEFAULT FALSE', description: 'Biến thể mặc định của sản phẩm.'},
        {name: 'sort_order', type: 'integer', constraints: 'DEFAULT 0', description: 'Thứ tự hiển thị.'},
        {name: 'status', type: 'varchar', length: 20, constraints: "DEFAULT 'active'", description: 'Trạng thái.', enum: ['active', 'inactive']},
        {name: 'sync_status', type: 'varchar', length: 20, constraints: "DEFAULT 'local'", description: 'Trạng thái đồng bộ.', enum: ['local', 'synced', 'conflict', 'pending_sync']},
        {name: 'created_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian tạo.'},
        {name: 'updated_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian cập nhật.'},
        {name: 'deleted_at', type: 'timestamp', description: 'Thời gian xoá mềm.'},
      ],
      indexes: [
        {name: 'idx_variants_product_id', columns: ['product_id'], unique: false, description: 'Index tìm variant theo sản phẩm.'},
        {name: 'idx_variants_store_code', columns: ['store_id', 'variant_code'], unique: true, description: 'Mã variant duy nhất trong cửa hàng.'},
        {name: 'idx_variants_barcode', columns: ['barcode'], unique: false, description: 'Index tìm theo mã vạch.'},
      ],
      foreign_keys: [
        {name: 'fk_variants_product_id', columns: ['product_id'], references: {table: 'products', columns: ['id']}, on_delete: 'CASCADE', on_update: 'CASCADE', description: 'Biến thể thuộc sản phẩm.'},
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  5. PRICES – Bảng giá (lịch sử + nhiều bảng giá)
    // ══════════════════════════════════════════════════════════════════════════
    prices: {
      description:
        'Bảng giá theo variant, hỗ trợ nhiều bảng giá (default/vip/wholesale) ' +
        'và lịch sử giá theo thời gian. Snapshot giá tại thời điểm bán được lưu trong bill_details.',
      cols: [
        {name: 'id', type: 'uuid', constraints: 'NOT NULL UNIQUE PRIMARY KEY', description: 'Mã bản ghi giá (UUID).'},
        {name: 'store_id', type: 'uuid', constraints: 'NOT NULL', description: 'Cửa hàng áp dụng. FK logic → core.stores.'},
        {name: 'variant_id', type: 'uuid', constraints: 'NOT NULL', description: 'Biến thể áp dụng giá. FK → product_variants.'},
        {name: 'unit_id', type: 'uuid', description: 'Đơn vị tính cho giá này. FK → units.'},
        {name: 'price_list_name', type: 'varchar', length: 50, constraints: "DEFAULT 'default'", description: 'Tên bảng giá.', enum: ['default', 'vip', 'wholesale', 'weekend', 'holiday', 'seasonal']},
        {name: 'price', type: 'decimal', precision: 15, scale: 2, constraints: 'NOT NULL', description: 'Giá bán.'},
        {name: 'cost_price', type: 'decimal', precision: 15, scale: 2, constraints: 'DEFAULT 0', description: 'Giá vốn (để tính lợi nhuận).'},
        {name: 'effective_from', type: 'date', constraints: 'NOT NULL', description: 'Ngày bắt đầu áp dụng giá.'},
        {name: 'effective_to', type: 'date', description: 'Ngày kết thúc. NULL = không giới hạn.'},
        {name: 'sort_order', type: 'integer', constraints: 'DEFAULT 0', description: 'Thứ tự ưu tiên trong cùng bảng giá.'},
        {name: 'status', type: 'varchar', length: 20, constraints: "DEFAULT 'active'", description: 'Trạng thái.', enum: ['active', 'inactive']},
        {name: 'sync_status', type: 'varchar', length: 20, constraints: "DEFAULT 'local'", description: 'Trạng thái đồng bộ.', enum: ['local', 'synced', 'conflict', 'pending_sync']},
        {name: 'created_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian tạo.'},
        {name: 'updated_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian cập nhật.'},
        {name: 'deleted_at', type: 'timestamp', description: 'Thời gian xoá mềm.'},
      ],
      indexes: [
        {name: 'idx_prices_variant_id', columns: ['variant_id', 'price_list_name', 'effective_from'], unique: false, description: 'Index tìm giá hiệu lực của variant.'},
        {name: 'idx_prices_store_id', columns: ['store_id'], unique: false, description: 'Index theo cửa hàng.'},
        {name: 'idx_prices_effective', columns: ['effective_from', 'effective_to'], unique: false, description: 'Index lọc giá theo khoảng thời gian.'},
      ],
      foreign_keys: [
        {name: 'fk_prices_variant_id', columns: ['variant_id'], references: {table: 'product_variants', columns: ['id']}, on_delete: 'CASCADE', on_update: 'CASCADE', description: 'Giá thuộc biến thể.'},
        {name: 'fk_prices_unit_id', columns: ['unit_id'], references: {table: 'units', columns: ['id']}, on_delete: 'SET NULL', on_update: 'CASCADE', description: 'Đơn vị tính của giá.'},
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  6. CUSTOMERS – Khách hàng (dùng chung POS + Resident + Booking)
    // ══════════════════════════════════════════════════════════════════════════
    customers: {
      description:
        'Danh sách khách hàng dùng chung toàn hệ thống. ' +
        'resident.db và booking.db tham chiếu customer_id từ bảng này.',
      cols: [
        {name: 'id', type: 'uuid', constraints: 'NOT NULL UNIQUE PRIMARY KEY', description: 'Mã khách hàng (UUID).'},
        {name: 'store_id', type: 'uuid', constraints: 'NOT NULL', description: 'Cửa hàng quản lý. FK logic → core.stores.'},
        {name: 'customer_code', type: 'varchar', length: 30, description: 'Mã khách hàng nội bộ (VD: KH-001).'},
        {name: 'full_name', type: 'varchar', length: 150, constraints: 'NOT NULL', description: 'Họ và tên đầy đủ.'},
        {name: 'id_number', type: 'varchar', length: 20, description: 'Số CCCD/CMND/Hộ chiếu.'},
        {name: 'date_of_birth', type: 'date', description: 'Ngày sinh.'},
        {name: 'gender', type: 'varchar', length: 10, description: 'Giới tính.', enum: ['male', 'female', 'other']},
        {name: 'phone', type: 'varchar', length: 20, description: 'Số điện thoại liên hệ.'},
        {name: 'email', type: 'email', description: 'Email.'},
        {name: 'address', type: 'string', description: 'Địa chỉ thường trú.'},
        {name: 'nationality', type: 'varchar', length: 10, constraints: "DEFAULT 'VN'", description: 'Quốc tịch (ISO 3166-1 alpha-2).'},
        {name: 'customer_group', type: 'varchar', length: 30, constraints: "DEFAULT 'regular'", description: 'Nhóm khách hàng.', enum: ['regular', 'vip', 'wholesale', 'corporate', 'staff']},
        {name: 'loyalty_points', type: 'integer', constraints: 'DEFAULT 0', description: 'Điểm tích luỹ.'},
        {name: 'total_spent', type: 'decimal', precision: 15, scale: 2, constraints: 'DEFAULT 0', description: 'Tổng chi tiêu tích luỹ.'},
        {name: 'notes', type: 'string', description: 'Ghi chú đặc biệt (dị ứng, sở thích, v.v.).'},
        {name: 'metadata', type: 'json', description: 'Thông tin mở rộng (JSON).'},
        {name: 'status', type: 'varchar', length: 20, constraints: "DEFAULT 'active'", description: 'Trạng thái.', enum: ['active', 'inactive', 'blacklisted']},
        {name: 'sync_status', type: 'varchar', length: 20, constraints: "DEFAULT 'local'", description: 'Trạng thái đồng bộ.', enum: ['local', 'synced', 'conflict', 'pending_sync']},
        {name: 'created_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian tạo.'},
        {name: 'updated_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian cập nhật.'},
        {name: 'deleted_at', type: 'timestamp', description: 'Thời gian xoá mềm.'},
      ],
      indexes: [
        {name: 'idx_customers_store_id', columns: ['store_id'], unique: false, description: 'Index tìm khách theo cửa hàng.'},
        {name: 'idx_customers_store_code', columns: ['store_id', 'customer_code'], unique: true, description: 'Mã khách duy nhất trong cửa hàng.'},
        {name: 'idx_customers_phone', columns: ['phone'], unique: false, description: 'Tìm kiếm nhanh theo SĐT.'},
        {name: 'idx_customers_id_number', columns: ['id_number'], unique: false, description: 'Tìm kiếm theo số CCCD.'},
        {name: 'idx_customers_group', columns: ['store_id', 'customer_group'], unique: false, description: 'Lọc theo nhóm khách.'},
        {name: 'idx_customers_sync', columns: ['sync_status', 'updated_at'], unique: false, description: 'Index hàng đợi đồng bộ.'},
      ],
      foreign_keys: [],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  7. BILL_CYCLES – Chu kỳ thanh toán
    // ══════════════════════════════════════════════════════════════════════════
    bill_cycles: {
      description:
        'Chu kỳ thanh toán định kỳ – dùng cho nhà trọ, khách sạn, ' +
        'dịch vụ subscription. POS bán lẻ thường không dùng.',
      cols: [
        {name: 'id', type: 'uuid', constraints: 'NOT NULL UNIQUE PRIMARY KEY', description: 'Mã chu kỳ (UUID).'},
        {name: 'store_id', type: 'uuid', constraints: 'NOT NULL', description: 'Cửa hàng áp dụng. FK logic → core.stores.'},
        {name: 'cycle_code', type: 'varchar', length: 20, constraints: 'NOT NULL', description: 'Mã chu kỳ.', enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']},
        {name: 'name', type: 'varchar', length: 50, constraints: 'NOT NULL', description: 'Tên chu kỳ (Ngày/Tuần/Tháng/Quý/Năm).'},
        {name: 'cycle_days', type: 'integer', description: 'Số ngày tương đương của chu kỳ.'},
        {name: 'billing_day', type: 'tinyint', description: 'Ngày chốt bill trong chu kỳ (1–28).'},
        {name: 'auto_generate', type: 'boolean', constraints: 'DEFAULT FALSE', description: 'Tự động tạo bill khi đến ngày chốt.'},
        {name: 'sort_order', type: 'integer', constraints: 'DEFAULT 0', description: 'Thứ tự hiển thị.'},
        {name: 'status', type: 'varchar', length: 20, constraints: "DEFAULT 'active'", description: 'Trạng thái.', enum: ['active', 'inactive']},
        {name: 'created_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian tạo.'},
        {name: 'updated_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian cập nhật.'},
      ],
      indexes: [
        {name: 'idx_bill_cycles_store_code', columns: ['store_id', 'cycle_code'], unique: true, description: 'Mã chu kỳ duy nhất trong cửa hàng.'},
      ],
      foreign_keys: [],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  8. BILLS – Hóa đơn (Trung tâm của POS)
    // ══════════════════════════════════════════════════════════════════════════
    bills: {
      description:
        'Hóa đơn thanh toán – bảng trung tâm của POS. ' +
        'Hỗ trợ bill POS tức thời, bill định kỳ (nhà trọ), bill lưu trú (khách sạn). ' +
        'booking.db và resident.db tham chiếu bill_id từ bảng này.',
      cols: [
        {name: 'id', type: 'uuid', constraints: 'NOT NULL UNIQUE PRIMARY KEY', description: 'Mã hóa đơn (UUID).'},
        {name: 'store_id', type: 'uuid', constraints: 'NOT NULL', description: 'Cửa hàng phát sinh. FK logic → core.stores.'},
        {name: 'bill_number', type: 'varchar', length: 30, constraints: 'NOT NULL', description: 'Số hóa đơn dạng đọc được (VD: HD-20240615-0032).'},
        {name: 'customer_id', type: 'uuid', description: 'Khách hàng. NULL = khách vãng lai. FK → customers.'},
        {name: 'cashier_user_id', type: 'uuid', description: 'Thu ngân / người tạo bill. FK logic → core.users.'},
        {name: 'session_id', type: 'uuid', description: 'Phiên đăng nhập. FK logic → core.user_sessions.'},
        {
          name: 'bill_type',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'pos'",
          description: 'Loại hóa đơn.',
          enum: ['pos', 'cycle', 'manual', 'deposit', 'refund'],
        },
        {name: 'cycle_id', type: 'uuid', description: 'Chu kỳ thanh toán (cho bill định kỳ). FK → bill_cycles.'},
        {name: 'cycle_period_from', type: 'date', description: 'Kỳ thanh toán từ ngày.'},
        {name: 'cycle_period_to', type: 'date', description: 'Kỳ thanh toán đến ngày.'},
        {name: 'ref_id', type: 'uuid', description: 'ID tham chiếu tới entity liên quan (contract_id, booking_id, v.v.).'},
        {name: 'ref_type', type: 'varchar', length: 30, description: 'Loại entity tham chiếu.'}, // , enum: ['contract', 'booking', 'order', 'room', null]
        {name: 'subtotal', type: 'decimal', precision: 15, scale: 2, constraints: 'DEFAULT 0', description: 'Tổng tiền trước chiết khấu và thuế.'},
        {name: 'discount_amount', type: 'decimal', precision: 15, scale: 2, constraints: 'DEFAULT 0', description: 'Tổng chiết khấu.'},
        {name: 'tax_amount', type: 'decimal', precision: 15, scale: 2, constraints: 'DEFAULT 0', description: 'Tổng thuế VAT.'},
        {name: 'total_amount', type: 'decimal', precision: 15, scale: 2, constraints: 'DEFAULT 0', description: 'Tổng thanh toán = subtotal - discount + tax.'},
        {name: 'paid_amount', type: 'decimal', precision: 15, scale: 2, constraints: 'DEFAULT 0', description: 'Số tiền đã thanh toán.'},
        {name: 'remaining_amount', type: 'decimal', precision: 15, scale: 2, constraints: 'DEFAULT 0', description: 'Số tiền còn lại cần trả.'},
        {name: 'issued_at', type: 'timestamp', description: 'Ngày phát hành hóa đơn.'},
        {name: 'due_at', type: 'timestamp', description: 'Hạn thanh toán.'},
        {
          name: 'bill_status',
          type: 'varchar',
          length: 20,
          constraints: "DEFAULT 'draft'",
          description: 'Trạng thái hóa đơn.',
          enum: ['draft', 'issued', 'partial', 'paid', 'overdue', 'cancelled', 'refunded'],
        },
        {name: 'notes', type: 'string', description: 'Ghi chú cho khách.'},
        {name: 'internal_notes', type: 'string', description: 'Ghi chú nội bộ.'},
        {name: 'metadata', type: 'json', description: 'Thông tin mở rộng (JSON).'},
        {name: 'sync_status', type: 'varchar', length: 20, constraints: "DEFAULT 'local'", description: 'Trạng thái đồng bộ.', enum: ['local', 'synced', 'conflict', 'pending_sync']},
        {name: 'created_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian tạo hóa đơn.'},
        {name: 'updated_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian cập nhật lần cuối.'},
        {name: 'deleted_at', type: 'timestamp', description: 'Thời gian xoá mềm.'},
      ],
      indexes: [
        {name: 'idx_bills_store_number', columns: ['store_id', 'bill_number'], unique: true, description: 'Số bill duy nhất trong cửa hàng.'},
        {name: 'idx_bills_store_status', columns: ['store_id', 'bill_status'], unique: false, description: 'Lọc bill theo trạng thái.'},
        {name: 'idx_bills_customer_id', columns: ['customer_id'], unique: false, description: 'Tìm bill theo khách hàng.'},
        {name: 'idx_bills_ref', columns: ['ref_id', 'ref_type'], unique: false, description: 'Tìm bill theo entity tham chiếu (contract/booking).'},
        {name: 'idx_bills_cycle_period', columns: ['store_id', 'cycle_period_from'], unique: false, description: 'Lọc bill theo kỳ thanh toán.'},
        {name: 'idx_bills_due_at', columns: ['due_at', 'bill_status'], unique: false, description: 'Index phát hiện hóa đơn quá hạn.'},
        {name: 'idx_bills_sync', columns: ['sync_status', 'updated_at'], unique: false, description: 'Index hàng đợi đồng bộ.'},
      ],
      foreign_keys: [
        {name: 'fk_bills_customer_id', columns: ['customer_id'], references: {table: 'customers', columns: ['id']}, on_delete: 'SET NULL', on_update: 'CASCADE', description: 'Hóa đơn thuộc khách hàng.'},
        {name: 'fk_bills_cycle_id', columns: ['cycle_id'], references: {table: 'bill_cycles', columns: ['id']}, on_delete: 'SET NULL', on_update: 'CASCADE', description: 'Chu kỳ thanh toán.'},
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  9. BILL_DETAILS – Chi tiết dòng hóa đơn
    // ══════════════════════════════════════════════════════════════════════════
    bill_details: {
      description:
        'Chi tiết từng dòng sản phẩm/dịch vụ trong hóa đơn. ' +
        'Lưu snapshot giá tại thời điểm bán (unit_price) để đảm bảo hóa đơn không thay đổi khi giá sản phẩm thay đổi sau đó.',
      cols: [
        {name: 'id', type: 'uuid', constraints: 'NOT NULL UNIQUE PRIMARY KEY', description: 'Mã dòng chi tiết (UUID).'},
        {name: 'store_id', type: 'uuid', constraints: 'NOT NULL', description: 'Cửa hàng. FK logic → core.stores.'},
        {name: 'bill_id', type: 'uuid', constraints: 'NOT NULL', description: 'Hóa đơn chứa dòng này. FK → bills.'},
        {name: 'product_id', type: 'uuid', description: 'Sản phẩm. FK → products.'},
        {name: 'variant_id', type: 'uuid', description: 'Biến thể. FK → product_variants.'},
        {name: 'unit_id', type: 'uuid', description: 'Đơn vị tính. FK → units.'},
        {name: 'line_description', type: 'varchar', length: 255, description: 'Mô tả dòng (VD: "Điện tháng 6: 87kWh × 3.500đ").'},
        {name: 'quantity', type: 'decimal', precision: 12, scale: 3, constraints: 'NOT NULL DEFAULT 1', description: 'Số lượng.'},
        {name: 'unit_price', type: 'decimal', precision: 15, scale: 2, constraints: 'NOT NULL', description: 'Đơn giá snapshot tại thời điểm bán.'},
        {name: 'discount_pct', type: 'decimal', precision: 5, scale: 2, constraints: 'DEFAULT 0', description: 'Chiết khấu theo % dòng.'},
        {name: 'discount_amount', type: 'decimal', precision: 15, scale: 2, constraints: 'DEFAULT 0', description: 'Chiết khấu tiền dòng.'},
        {name: 'tax_rate', type: 'decimal', precision: 5, scale: 2, constraints: 'DEFAULT 0', description: 'Thuế suất (%).'},
        {name: 'tax_amount', type: 'decimal', precision: 15, scale: 2, constraints: 'DEFAULT 0', description: 'Tiền thuế dòng.'},
        {name: 'amount', type: 'decimal', precision: 15, scale: 2, constraints: 'NOT NULL', description: 'Thành tiền = (qty × unit_price - discount) + tax.'},
        {name: 'reading_from', type: 'decimal', precision: 12, scale: 3, description: 'Chỉ số đầu kỳ (dành cho điện/nước).'},
        {name: 'reading_to', type: 'decimal', precision: 12, scale: 3, description: 'Chỉ số cuối kỳ.'},
        {name: 'meter_photo_url', type: 'url', description: 'Ảnh đồng hồ đính kèm.'},
        {name: 'sort_order', type: 'integer', constraints: 'DEFAULT 0', description: 'Thứ tự dòng trong hóa đơn.'},
        {name: 'notes', type: 'string', description: 'Ghi chú dòng.'},
        {name: 'sync_status', type: 'varchar', length: 20, constraints: "DEFAULT 'local'", description: 'Trạng thái đồng bộ.', enum: ['local', 'synced', 'conflict', 'pending_sync']},
        {name: 'created_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian tạo.'},
        {name: 'updated_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian cập nhật.'},
        {name: 'deleted_at', type: 'timestamp', description: 'Thời gian xoá mềm.'},
      ],
      indexes: [
        {name: 'idx_bill_details_bill_id', columns: ['bill_id'], unique: false, description: 'Index tìm chi tiết theo hóa đơn.'},
        {name: 'idx_bill_details_product_id', columns: ['product_id'], unique: false, description: 'Index phân tích doanh thu theo sản phẩm.'},
        {name: 'idx_bill_details_sync', columns: ['sync_status', 'updated_at'], unique: false, description: 'Index hàng đợi đồng bộ.'},
      ],
      foreign_keys: [
        {name: 'fk_bill_details_bill_id', columns: ['bill_id'], references: {table: 'bills', columns: ['id']}, on_delete: 'CASCADE', on_update: 'CASCADE', description: 'Chi tiết thuộc hóa đơn.'},
        {name: 'fk_bill_details_product_id', columns: ['product_id'], references: {table: 'products', columns: ['id']}, on_delete: 'SET NULL', on_update: 'CASCADE', description: 'Sản phẩm tham chiếu.'},
        {name: 'fk_bill_details_variant_id', columns: ['variant_id'], references: {table: 'product_variants', columns: ['id']}, on_delete: 'SET NULL', on_update: 'CASCADE', description: 'Biến thể tham chiếu.'},
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  10. PAYMENTS – Giao dịch thanh toán
    // ══════════════════════════════════════════════════════════════════════════
    payments: {
      description:
        'Giao dịch thanh toán. Một hóa đơn có thể có nhiều giao dịch (trả nhiều lần, nhiều phương thức). ' +
        'Hỗ trợ offline mode – giao dịch ghi local trước, sync sau.',
      cols: [
        {name: 'id', type: 'uuid', constraints: 'NOT NULL UNIQUE PRIMARY KEY', description: 'Mã giao dịch (UUID).'},
        {name: 'store_id', type: 'uuid', constraints: 'NOT NULL', description: 'Cửa hàng. FK logic → core.stores.'},
        {name: 'bill_id', type: 'uuid', constraints: 'NOT NULL', description: 'Hóa đơn thanh toán. FK → bills.'},
        {name: 'cashier_user_id', type: 'uuid', description: 'Thu ngân xử lý giao dịch. FK logic → core.users.'},
        {
          name: 'payment_method',
          type: 'varchar',
          length: 20,
          constraints: 'NOT NULL',
          description: 'Phương thức thanh toán.',
          enum: ['cash', 'bank_transfer', 'e_wallet', 'card', 'ota', 'deposit_offset', 'mixed'],
        },
        {name: 'amount', type: 'decimal', precision: 15, scale: 2, constraints: 'NOT NULL', description: 'Số tiền giao dịch. Âm = hoàn tiền / khấu trừ.'},
        {name: 'received_amount', type: 'decimal', precision: 15, scale: 2, description: 'Tiền khách đưa (dùng cho tiền mặt).'},
        {name: 'change_amount', type: 'decimal', precision: 15, scale: 2, description: 'Tiền thối lại.'},
        {name: 'transaction_ref', type: 'varchar', length: 100, description: 'Mã tham chiếu giao dịch ngân hàng/ví.'},
        {name: 'payment_gateway', type: 'varchar', length: 30, description: 'Cổng thanh toán.'}, // , enum: ['momo', 'zalopay', 'vnpay', 'vietqr', 'stripe', 'booking_com', null]
        {name: 'paid_at', type: 'timestamp', constraints: 'NOT NULL DEFAULT CURRENT_TIMESTAMP', description: 'Thời điểm thực hiện giao dịch.'},
        {name: 'is_offline', type: 'boolean', constraints: 'DEFAULT FALSE', description: 'Giao dịch thực hiện khi thiết bị offline.'},
        {name: 'synced_at', type: 'timestamp', description: 'Thời điểm đồng bộ lên server. NULL = chưa sync.'},
        {name: 'notes', type: 'string', description: 'Ghi chú giao dịch.'},
        {name: 'status', type: 'varchar', length: 20, constraints: "DEFAULT 'success'", description: 'Trạng thái giao dịch.', enum: ['success', 'cancelled', 'failed', 'pending']},
        {name: 'sync_status', type: 'varchar', length: 20, constraints: "DEFAULT 'local'", description: 'Trạng thái đồng bộ.', enum: ['local', 'synced', 'conflict', 'pending_sync']},
        {name: 'created_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian tạo bản ghi.'},
        {name: 'updated_at', type: 'timestamp', constraints: 'DEFAULT CURRENT_TIMESTAMP', description: 'Thời gian cập nhật.'},
        {name: 'deleted_at', type: 'timestamp', description: 'Thời gian xoá mềm (huỷ giao dịch).'},
      ],
      indexes: [
        {name: 'idx_payments_bill_id', columns: ['bill_id'], unique: false, description: 'Index tìm giao dịch theo hóa đơn.'},
        {name: 'idx_payments_store_paid_at', columns: ['store_id', 'paid_at'], unique: false, description: 'Index thống kê doanh thu theo ngày.'},
        {name: 'idx_payments_method', columns: ['payment_method'], unique: false, description: 'Index thống kê theo phương thức.'},
        {name: 'idx_payments_offline_unsynced', columns: ['is_offline', 'synced_at'], unique: false, description: 'Index phát hiện giao dịch offline chưa đồng bộ.'},
        {name: 'idx_payments_sync', columns: ['sync_status', 'updated_at'], unique: false, description: 'Index hàng đợi đồng bộ.'},
      ],
      foreign_keys: [
        {name: 'fk_payments_bill_id', columns: ['bill_id'], references: {table: 'bills', columns: ['id']}, on_delete: 'CASCADE', on_update: 'CASCADE', description: 'Giao dịch thuộc hóa đơn.'},
      ],
    },
  },
};

export const posDatabaseSchemas: Record<string, DatabaseSchema> = {
  pos: posSchema,
};