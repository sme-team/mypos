// === PHIÊN BẢN TỐI ƯU (Khuyến nghị dùng) ===
import DatabaseManager from '../DBManagers';
import { googleSheetService } from '../../services/GooglesheetServices/GoogleSheetToJson';
import { createModuleLogger, AppModules } from '../../logger';
import SQLiteDAO from '../SQLiteDAO';

const logger = createModuleLogger(AppModules.DATABASE);

export interface SeedResult {
  success: boolean;
  totalImported: number;
  totalFailed: number;
  errors: Array<{ table: string; rowId: string | number; message: string; skippedColumns?: string[] }>;
  summary: string;
  importedTables: Record<string, number>;
}

export class DatabaseSeeder {
  // All available table names from schema
  private readonly AVAILABLE_TABLES = [
    'categories', 'units', 'products', 'product_variants', 'prices',
    'customers', 'bill_cycles', 'bills', 'bill_details', 'payments',
    'receivables', 'contracts', 'contract_members', 'residents', 'import_logs',
  ];

  // Track rows that were rejected due to validation errors to explain subsequent FK failures
  private rejectedRowIds: Set<string> = new Set();

  /**
   * PHÂN LOẠI: Bản đồ để ghi nhớ sản phẩm nào là 'room' để xử lý variants tương ứng
   */
  private productIsRoomMap: Map<string, boolean> = new Map();

  private readonly SHEET_TO_TABLE_MAP: Record<string, string> = {
    'pos_categories': 'categories',
    'pos_units': 'units',
    'pos_products': 'products',
    'pos_product_variants': 'product_variants',
    'pos_prices': 'prices',
    'pos_customers': 'customers',
    'pos_bill_cycles': 'bill_cycles',
    'pos_bills': 'bills',
    'pos_bill_details': 'bill_details',
    'pos_payments': 'payments',
    'pos_receivables': 'receivables',
    'res_contracts': 'contracts',
    'res_contract_members': 'contract_members',
    'res_residents': 'residents',
  };

  private readonly TABLE_SCHEMA_MAP: Record<string, string[]> = {
    categories: ['id', 'store_id', 'parent_id', 'category_code', 'name', 'icon', 'color_code', 'apply_to', 'sort_order', 'status', 'sync_status', 'created_at', 'updated_at'],
    units: ['id', 'store_id', 'unit_code', 'name', 'unit_type', 'sort_order', 'status', 'sync_status', 'created_at', 'updated_at'],
    products: [
      'id', 'store_id', 'category_id', 'unit_id', 'product_code', 'barcode',
      'name', 'short_name', 'description', 'image_url',
      'product_type', 'pricing_type', 'is_active_pos',
      'is_trackable', 'tax_rate', 'sort_order',
      'status', 'sync_status', 'created_at', 'updated_at',
    ],
    product_variants: ['id', 'store_id', 'product_id', 'variant_code', 'name', 'attributes', 'image_url', 'is_default', 'sort_order', 'status', 'sync_status'],
    prices: ['id', 'store_id', 'variant_id', 'unit_id', 'price_list_name', 'price', 'cost_price', 'effective_from', 'effective_to', 'sort_order'],
    customers: ['id', 'store_id', 'customer_code', 'full_name', 'id_number', 'date_of_birth', 'gender', 'phone', 'email', 'address', 'customer_group', 'status'],
    bill_cycles: ['id', 'store_id', 'cycle_code', 'name', 'cycle_days', 'billing_day', 'auto_generate', 'sort_order'],
    bills: ['id', 'store_id', 'bill_number', 'customer_id', 'cashier_user_id', 'bill_type', 'cycle_id', 'total_amount', 'bill_status'],
    bill_details: ['id', 'store_id', 'bill_id', 'product_id', 'variant_id', 'unit_id', 'line_description', 'quantity', 'unit_price', 'amount'],
    payments: ['id', 'store_id', 'bill_id', 'payment_method', 'amount', 'paid_at'],
    receivables: ['id', 'store_id', 'customer_id', 'contract_id', 'bill_id', 'receivable_code', 'receivable_type', 'description', 'amount'],
    contracts: [
      'id', 'store_id', 'contract_number', 'customer_id', 'product_id', 'variant_id',
      'start_date', 'end_date', 'signed_date',                  // ← thêm signed_date
      'rent_amount', 'deposit_amount',
      'electric_rate', 'water_rate', 'billing_day', 'cycle_id',  // ← thêm cả block này
      'electric_reading_init', 'water_reading_init',
      'status', 'notes', 'created_at', 'updated_at',
    ],
    contract_members: ['id', 'store_id', 'contract_id', 'customer_id', 'is_primary', 'joined_date', 'left_date'],
    residents: [
      'id', 'store_id', 'customer_id', 'hometown', 'occupation', 'workplace',
      'id_card_front_url', 'id_card_back_url', 'portrait_url',  // ← thêm portrait_url
      'temp_residence_from', 'temp_residence_to',              // ← thêm block tạm trú
      'temp_residence_status', 'police_ref_number',
      'approved_by', 'approved_date', 'note', 'status', 'created_at', 'updated_at',
    ],
  };

  private readonly TABLE_ORDER = [
    'categories', 'units', 'products', 'product_variants', 'prices',
    'customers', 'bill_cycles',
    'contracts', 'contract_members', 'residents',
    'bills', 'bill_details', 'receivables', 'payments',
    'import_logs',
  ];

  private async generateUUID(): Promise<string> {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Fuzzy match sheet name to database table using multiple strategies:
   * 1. Exact match (with normalization)
   * 2. Prefix match (pos_categories → categories)
   * 3. Levenshtein distance (fuzzy match)
   */
  private fuzzyMatchSheetToTable(sheetName: string): string | null {
    const normalized = sheetName.toLowerCase().trim();

    // 1. Strip common prefixes (pos_, res_) for comparison
    const stripped = normalized.replace(/^(pos_|res_)/, '');

    console.log(`[MAPPING] Analyzing sheet: "${sheetName}" (normalized: "${normalized}", stripped: "${stripped}")`);

    // Strategy 1: Explicit mapping check (use normalized name first)
    if (this.SHEET_TO_TABLE_MAP[normalized]) {
      console.log(`[MAPPING] Found explicit map: "${normalized}" -> "${this.SHEET_TO_TABLE_MAP[normalized]}"`);
      return this.SHEET_TO_TABLE_MAP[normalized];
    }

    // Strategy 2: Exact match against AVAILABLE_TABLES after stripping prefix
    const exactMatch = this.AVAILABLE_TABLES.find(table =>
      table === normalized || table === stripped
    );
    if (exactMatch) {
      console.log(`[MAPPING] Found exact match: "${sheetName}" -> "${exactMatch}"`);
      return exactMatch;
    }

    // Strategy 3: Vietnamese common names mapping (Exact-ish match)
    const vietnameseMap: Record<string, string> = {
      'khachhang': 'customers',
      'khách hàng': 'customers',
      'customer': 'customers',
      'hopdong': 'contracts',
      'hợp đồng': 'contracts',
      'contract': 'contracts',
      'thanhtoan': 'payments',
      'thanh toán': 'payments',
      'payment': 'payments',
      'hoadon': 'bills',
      'hóa đơn': 'bills',
      'bill': 'bills',
      'chitiet': 'bill_details',
      'chi tiết': 'bill_details',
      'ky': 'bill_cycles',
      'kỳ': 'bill_cycles',
      'cycle': 'bill_cycles',
      'congno': 'receivables',
      'công nợ': 'receivables',
      'receivable': 'receivables',
      'cuutru': 'residents',
      'cư trú': 'residents',
      'resident': 'residents',
      'gia': 'prices',
      'giá': 'prices',
      'price': 'prices',
    };

    if (vietnameseMap[stripped]) {
      console.log(`[MAPPING] Found Vietnamese match: "${sheetName}" -> "${vietnameseMap[stripped]}"`);
      return vietnameseMap[stripped];
    }

    // Final strategy: Substring match only for very specific cases if needed,
    // but here we restrict it to avoid the "contract" matching "categories" error.
    // We only check if the stripped name IS A FULL WORD within the table name or vice-versa
    const tableMatch = this.AVAILABLE_TABLES.find(table => {
      // If sheet name is "prices" and table is "product_prices", we might want it,
      // but for now, exact/stripped is safer.
      return false;
    });


    // Strategy 3: Levenshtein distance (fuzzy matching)
    const scores = this.AVAILABLE_TABLES.map(table => ({
      table,
      score: this.levenshteinDistance(normalized, table),
    }));

    // Sort by score (lower is better)
    scores.sort((a, b) => a.score - b.score);

    // Return match if score is below threshold (max 3 character differences)
    const bestMatch = scores[0];
    if (bestMatch && bestMatch.score <= 3) {
      console.log(`[MAPPING] Found fuzzy match: "${sheetName}" -> "${bestMatch.table}" (distance: ${bestMatch.score})`);
      return bestMatch.table;
    }

    console.log(`[MAPPING] No match found for sheet: "${sheetName}"`);
    return null;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const track = Array(str2.length + 1).fill(null).map(() =>
      Array(str1.length + 1).fill(null)
    );

    for (let i = 0; i <= str1.length; i += 1) {
      track[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j += 1) {
      track[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1,
          track[j - 1][i] + 1,
          track[j - 1][i - 1] + indicator
        );
      }
    }

    return track[str2.length][str1.length];
  }

  private async mapToSchema(
    tableName: string,
    sheetName: string,
    rawRow: any
  ): Promise<any> {
    const schema = this.TABLE_SCHEMA_MAP[tableName];
    if (!schema) {
      console.warn(`No schema defined for table: ${tableName}`);
      return null;
    }

    // ─── Defaults ───────────────────────────────────────────────────────────
    const mappedRow: any = {
      id: await this.generateUUID(),
      store_id: 'store1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'active',
      sync_status: 'local',
    };

    // ✨ CẢI TIẾN: Thêm default cho Products nếu đang import bảng products
    // ──────── QUY TẮC CỬA HÀNG ────────
    // ──────── QUY TẮC PHÂN LOẠI & DỮ LIỆU ────────
    if (tableName === 'products') {
      mappedRow.is_active_pos = 1;

      const rawType = String(rawRow.product_type || '').toLowerCase().trim();

      // Danh sách các loại được coi là "room"
      const roomTypes = ['room', 'room_service'];

      if (roomTypes.includes(rawType)) {
        this.productIsRoomMap.set(mappedRow.id, true);
        mappedRow.product_type = rawType;   // giữ nguyên giá trị từ sheet

        console.log(`[ROOM-TYPE] Product ${mappedRow.id} được nhận diện là room-type: ${rawType}`);
      }
      else if (rawType) {
        mappedRow.product_type = rawType;   // các loại khác vẫn giữ nguyên
      }
    }

    if (tableName === 'product_variants') {
      // Tra cứu xem parent product có phải là room không
      const isRoom = this.productIsRoomMap.get(mappedRow.product_id);

      if (isRoom && rawRow.attributes) {
        try {
          const attr = JSON.parse(rawRow.attributes);
          const normalizedAttr: any = { ...attr };

          // Chuẩn hóa keys: area -> area_m2, bed -> beds
          if (attr.area) {
            normalizedAttr.area_m2 = attr.area;
            delete normalizedAttr.area;
          }
          if (attr.bed) {
            normalizedAttr.beds = attr.bed;
            delete normalizedAttr.bed;
          }

          mappedRow.attributes = JSON.stringify(normalizedAttr);
        } catch (e) { /* skip invalid JSON */ }
      }
    }

    if (tableName === 'categories') {
      mappedRow.status = 'active';

      //  ƯU TIÊN PHÂN LOẠI THEO apply_to TỪ SHEET
      const rawApplyTo = String(rawRow.apply_to || '').toLowerCase().trim();
      if (rawApplyTo) {
        mappedRow.apply_to = rawApplyTo;
      }
    }


    // ─── Bỏ qua sheet kế toán (S1a / S2a) ──────────────────────────────────
    const isAccountingSheet = ['s1a', 's2a'].some(s =>
      sheetName.toLowerCase().includes(s)
    );
    if (isAccountingSheet) {return null;}

    const rowKeys = Object.keys(rawRow);

    // ─── Name-based mapping (ưu tiên): key = tên cột DB ────────────────────
    const hasNamedKeys = schema.some(col => col in rawRow);

    if (hasNamedKeys) {
      for (const dbCol of schema) {
        const rawValue = rawRow[dbCol];
        if (rawValue == null || String(rawValue).trim() === '') {continue;}
        mappedRow[dbCol] = this.convertValue(dbCol, rawValue);
      }

      // THÊM: Ghi đè default nếu sheet có giá trị thực (từ version 1)
      if (rawRow.id) {mappedRow.id = String(rawRow.id).trim();}
      if (rawRow.store_id) {mappedRow.store_id = String(rawRow.store_id).trim();}
      if (rawRow.status) {mappedRow.status = String(rawRow.status).trim();}
      if (rawRow.sync_status) {mappedRow.sync_status = String(rawRow.sync_status).trim();}
      if (rawRow.created_at) {mappedRow.created_at = String(rawRow.created_at).trim();}
      if (rawRow.updated_at) {mappedRow.updated_at = String(rawRow.updated_at).trim();}

      return mappedRow;
    }

    // ─── Fallback: Fuzzy header mapping (tiếng Việt) ───────────────────────
    const FUZZY_HEADER_MAP: Record<string, string> = {
      // customers / residents
      'họ và tên': 'full_name',
      'họ và tên chủ hộ': 'full_name',
      'số điện thoại': 'phone',
      'điện thoại': 'phone',
      'địa chỉ thường trú': 'address',
      'địa chỉ': 'address',
      'cccd số': 'id_number',
      'căn cước công dân': 'id_number',
      'ngày tháng năm sinh': 'date_of_birth',
      'giới tính': 'gender',
      'quê quán': 'hometown',
      'nghề nghiệp': 'occupation',
      'nơi làm việc / trường': 'workplace',
      // contracts
      'số hợp đồng': 'contract_number',
      'ngày bắt đầu': 'start_date',
      'ngày kết thúc': 'end_date',
      'đơn giá phòng / tháng': 'rent_amount',
      'tiền cọc': 'deposit_amount',
      'đã cọc số tiền': 'deposit_amount',
      'chỉ số điện ban đầu': 'electric_reading_init',
      // products / prices
      'tên': 'name',
      'tên sản phẩm': 'name',
      'mã': 'product_code',
      'mã sp': 'product_code',
      'tên ngắn': 'short_name',
      'giá': 'price',
      'đơn giá': 'unit_price',
    };

    for (const excelCol of rowKeys) {
      const normalizedKey = excelCol.toLowerCase().trim();
      const dbCol = FUZZY_HEADER_MAP[normalizedKey];

      if (dbCol && schema.includes(dbCol)) {
        const rawValue = rawRow[excelCol];
        if (rawValue == null || String(rawValue).trim() === '') {continue;}
        mappedRow[dbCol] = this.convertValue(dbCol, rawValue);
      }
    }

    return mappedRow;
  }
  // ─── Helper: convert giá trị theo tên cột ─────────────────────────────────
  private convertValue(dbCol: string, value: any): any {
    if (value == null) {return null;}

    const str = String(value).trim();

    // ===================================================================
    // 1. CÁC CỘT CODE / ID / NUMBER → LUÔN GIỮ NGUYÊN KIỂU STRING
    //    Cập nhật: Loại bỏ số 0 ở đầu nếu giá trị hoàn toàn là số (để 001 thành 1)
    // ===================================================================
    if (/^(id|parent_id|category_id|product_id|variant_id|unit_id|customer_id|bill_id|contract_id|cycle_id|receivable_id|category_code|product_code|unit_code|variant_code|customer_code|bill_number|contract_number|cycle_code|receivable_code|barcode)$/i.test(dbCol)) {
      //  GIỮ NGUYÊN CHUỖI (không xóa số 0 ở đầu cho mã/ID)
      return str;
    }

    // ===================================================================
    // 2. Số tiền / số lượng
    // ===================================================================
    if (/^(price|amount|rent_amount|deposit_amount|unit_price|quantity|cost_price|electric_rate|water_rate|tax_rate|electric_reading_init|water_reading_init)$/i.test(dbCol)) {
      const num = parseFloat(str.replace(/[^\d.-]/g, ''));
      return isNaN(num) ? 0 : num;
    }

    // ===================================================================
    // 3. Số nguyên thông thường (không phải code)
    // ===================================================================
    if (/^(sort_order|cycle_days|billing_day|loyalty_points)$/i.test(dbCol)) {
      const num = parseInt(str, 10);
      return isNaN(num) ? 0 : num;
    }

    // ===================================================================
    // 4. Boolean
    // ===================================================================
    if (/^(is_default|is_primary|is_active_pos|is_trackable|auto_generate|is_offline)$/i.test(dbCol)) {
      if (typeof value === 'boolean') {return value ? 1 : 0;}
      return ['1', 'true', 'yes', 'có'].includes(str.toLowerCase()) ? 1 : 0;
    }

    // ===================================================================
    // 5. Ngày (date only)
    // ===================================================================
    if (/^(effective_from|effective_to|start_date|end_date|date_of_birth|signed_date|joined_date|left_date|due_date|billing_date)$/i.test(dbCol)) {
      if (value instanceof Date) {return value.toISOString().split('T')[0];}
      const parsed = new Date(str);
      return isNaN(parsed.getTime()) ? str : parsed.toISOString().split('T')[0];
    }

    // ===================================================================
    // 6. Timestamp
    // ===================================================================
    if (/^(created_at|updated_at|paid_at|issued_at|due_at)$/i.test(dbCol)) {
      if (value instanceof Date) {return value.toISOString();}
      const parsed = new Date(str);
      return isNaN(parsed.getTime()) ? str : parsed.toISOString();
    }

    // Mặc định trả về string
    return str;
  }

  private async cleanData(tableName: string, sheetName: string, rawRows: any[]): Promise<any[]> {
    if (!rawRows || rawRows.length === 0) {return [];}

    // CẢI TIẾN: Filter out metadata/empty rows + JUNK ID PATTERNS
    const dataRows = rawRows.filter(row => {
      if (!row || Object.values(row).every(v => v == null || String(v).trim() === '')) {return false;}

      // CẢI TIẾN: Filter residents linh hoạt hơn (không case-sensitive, không bắt buộc key tiếng Việt)
      if (tableName === 'residents') {
        const rowKeys = Object.keys(row).map(k => k.toLowerCase());
        const hasCustomerRef = rowKeys.some(k => k.includes('customer') || k.includes('khách') || k.includes('họ và tên'));
        if (!hasCustomerRef) {
          console.log(`[SKIP] ${tableName}: No customer reference found in row: ${Object.keys(row).slice(0, 3).join(', ')}`);
          return false;
        }
      }
      //  Fix: id của data thực luôn có pattern cụ thể (cat-001, prod-001, v.v.)
      // Còn row rác thì id = "Mã danh mục", "varchar", "Khóa chính"
      const idVal = String(row.id ?? '').trim().toLowerCase();

      const JUNK_ID_PATTERNS = [
        /^mã /,           // "Mã danh mục", "Mã sản phẩm"
        /^varchar/,       // "varchar", "varchar(30)"
        /^khóa/,          // "Khóa chính"
        /^fk/,            // "FK → stores.id"
        /^null/,          // "NULL = gốc"
        /^integer/,
        /^decimal/,
        /^boolean/,
        /^timestamp/,
        /^text/,
        /^primary/,
      ];

      if (JUNK_ID_PATTERNS.some(p => p.test(idVal))) {
        console.log(`[SKIP-JUNK] ${tableName}: id="${idVal.slice(0, 30)}"`);
        return false;
      }

      // Legacy: Skip metadata rows (column descriptions) - giữ lại cho an toàn
      const firstVal = String(row[Object.keys(row)[0]] || '').toLowerCase();
      const metadataKeywords = ['varchar', 'text', 'int', 'float', 'integer', 'decimal', 'uuid', 'primary key', 'khóa chính'];
      return !metadataKeywords.some(k => firstVal.includes(k));
    });

    const mappedRows = [];
    let validCount = 0;
    let invalidCount = 0;

    for (const rawRow of dataRows) {
      try {
        const mapped = await this.mapToSchema(tableName, sheetName, rawRow);

        // Enhanced validation: Check for required fields and data quality
        if (mapped && this.validateMappedRow(tableName, mapped)) {
          mappedRows.push(mapped);
          validCount++;
        } else {
          invalidCount++;
          if (mapped) {
            console.warn(`[INVALID] ${tableName}: Row validation failed -`, {
              id: mapped.id,
              hasData: Object.values(mapped).some(v => v != null && String(v).trim() !== ''),
              keys: Object.keys(mapped).filter(k => mapped[k] != null && String(mapped[k]).trim() !== ''),
            });
          }
        }
      } catch (error) {
        invalidCount++;
        console.error(`[ERROR] ${tableName}: Failed to map row -`, error);
      }
    }

    console.log(`[CLEAN] ${tableName}: ${validCount} valid, ${invalidCount} invalid from ${dataRows.length} total rows`);
    return mappedRows;
  }

  /**
   * Validate mapped row against table requirements
   */
  private validateMappedRow(tableName: string, mapped: any): boolean {
    // Check if row has any meaningful data
    const hasData = Object.values(mapped).some(v => v != null && String(v).trim() !== '');
    if (!hasData) {return false;}

    // Table-specific validation rules
    const requiredFields: Record<string, string[]> = {
      categories: ['name'], // Gỡ category_code vì par1/par2 không có và schema ko bắt buộc

      products: ['name', 'product_code'],
      customers: ['full_name', 'customer_code'],
      contracts: ['contract_number', 'customer_id'],
      units: ['name', 'unit_code'],
      prices: ['variant_id', 'price'],
      bill_cycles: ['name', 'cycle_days'],
      bills: ['bill_number'],
      bill_details: ['bill_id', 'product_id'],
      payments: ['bill_id', 'payment_method', 'amount'],
      receivables: ['customer_id', 'amount'],
      residents: ['customer_id'],
      contract_members: ['contract_id', 'customer_id'],
    };

    const tableRequired = requiredFields[tableName];
    if (tableRequired) {
      const hasRequired = tableRequired.every(field =>
        mapped[field] && String(mapped[field]).trim() !== ''
      );
      if (!hasRequired) {
        console.warn(`[VALIDATION] ${tableName}: Missing required fields`, {
          required: tableRequired,
          present: Object.keys(mapped).filter(k => mapped[k] != null && String(mapped[k]).trim() !== ''),
        });
        return false;
      }
    }

    return true;
  }

  private async seedTable(tableName: string, sheetName: string, rawData: any[], errors: SeedResult['errors'], dryRun: boolean = false): Promise<{ success: number, failed: number, tableErrors: number }> {
    let tableErrors = 0;
    const cleanedData = await this.cleanData(tableName, sheetName, rawData);

    if (cleanedData.length === 0) {
      console.log(`[SKIP] ${tableName}: No valid data after cleaning`);
      return { success: 0, failed: 0, tableErrors: 0 };
    }

    const schema = this.TABLE_SCHEMA_MAP[tableName];
    if (!schema) {
      console.error(`[ERROR] ${tableName}: No schema defined, skipping`);
      return { success: 0, failed: cleanedData.length, tableErrors: cleanedData.length };
    }

    let success = 0, failed = 0, tableErrCount = 0;

    if (dryRun) {
      console.log(`[DRY-RUN] ${tableName}: Would import ${cleanedData.length} rows`);
      return { success: cleanedData.length, failed: 0, tableErrors: 0 };
    }

    const db: SQLiteDAO = DatabaseManager.get('pos');
    if (!db) {
      console.error(`[ERROR] ${tableName}: No database connection`);
      return { success: 0, failed: cleanedData.length, tableErrors: cleanedData.length };
    }

    console.log(`[IMPORT] ${tableName}: Starting import of ${cleanedData.length} rows`);

    const BATCH_SIZE = 50;

    for (let batchStart = 0; batchStart < cleanedData.length; batchStart += BATCH_SIZE) {
      const batch = cleanedData.slice(batchStart, batchStart + BATCH_SIZE);
      const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(cleanedData.length / BATCH_SIZE);

      await db.beginTransaction();
      try {
        for (let i = 0; i < batch.length; i++) {
          const row = batch[i];
          const globalIndex = batchStart + i;

          const columns = schema.filter(col => {
            const value = row[col];
            return value !== undefined && value !== null && String(value).trim() !== '';
          });

          if (columns.length === 0) {
            failed++;
            console.warn(`[SKIP-ROW] ${tableName}[${row.id || globalIndex + 1}]: No valid columns`);
            continue;
          }

          const validationResult = this.validateRowData(tableName, row, columns);
          if (!validationResult.valid) {
            failed++;
            tableErrCount++;
            const rowId = row.id || `row_${globalIndex + 1}`;
            this.rejectedRowIds.add(String(rowId)); // ✨ Track rejected row

            errors.push({
              table: tableName,
              rowId,
              message: validationResult.error || 'Data validation failed',
              skippedColumns: validationResult.skippedColumns,
            });
            console.warn(`[VALIDATION-ERROR] ${tableName}[${rowId}]: ${validationResult.error}`);
            continue;
          }

          try {
            const placeholders = columns.map(() => '?');
            const sql = `INSERT OR REPLACE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
            const values = columns.map(col => row[col]);
            await db.runSql(sql, values);
            success++;

            if (success <= 3 || success % 10 === 0) {
              console.log(`[SUCCESS] ${tableName}[${row.id || globalIndex + 1}]: Inserted (${success}/${cleanedData.length})`);
            }
          } catch (err: any) {
            failed++;
            tableErrCount++;
            const rowId = row.id || `row_${globalIndex + 1}`;
            this.rejectedRowIds.add(String(rowId)); // ✨ Track DB failure as well

            errors.push({
              table: tableName,
              rowId,
              message: await this.formatDatabaseError(err, row, columns),
            });
            console.error(`[DB-ERROR] ${tableName}[${rowId}]:`, err.message);
          }
        }

        await db.commitTransaction();
        console.log(`[BATCH] ${tableName}: batch ${batchNum}/${totalBatches} committed (${batch.length} rows)`);

      } catch (e: any) {
        // Chỉ rollback batch hiện tại, không ảnh hưởng batch đã commit trước đó
        await db.rollbackTransaction();
        console.error(`[BATCH-FAILED] ${tableName} batch ${batchNum}/${totalBatches}:`, e.message);
        failed += batch.length;
      }
    }
    return { success, failed, tableErrors: tableErrCount };
  }
  private validateRowData(tableName: string, row: any, columns: string[]): { valid: boolean; error?: string; skippedColumns?: string[] } {
    // Check for required fields
    const requiredFields: Record<string, string[]> = {
      categories: ['name'],
      products: ['name'],
      customers: ['full_name'],
      contracts: ['contract_number'],
      units: ['name'],
      prices: ['variant_id', 'price'],
    };

    const tableRequired = requiredFields[tableName];
    if (tableRequired) {
      const missingRequired = tableRequired.filter(field => !columns.includes(field) || !row[field]);
      if (missingRequired.length > 0) {
        return {
          valid: false,
          error: `Missing required fields: ${missingRequired.join(', ')}`,
          skippedColumns: missingRequired,
        };
      }
    }

    // Data type validation
    if (tableName === 'prices' && row.price) {
      const price = parseFloat(String(row.price).replace(/[^\d.-]/g, ''));
      if (isNaN(price) || price < 0) {
        return { valid: false, error: 'Invalid price value' };
      }
    }

    return { valid: true };
  }

  /**
   * Format database error messages for better user understanding
   */
  private async formatDatabaseError(err: any, row: any, columns: string[]): Promise<string> {
    const errorMsg = err.message || err.toString();

    // Common SQLite errors
    if (errorMsg.includes('UNIQUE constraint failed')) {
      return `Duplicate data: ${columns.join(', ')} already exists`;
    }
    if (errorMsg.includes('NOT NULL constraint failed')) {
      const nullField = errorMsg.match(/NOT NULL constraint failed: (\w+)/);
      return `Missing required field: ${nullField ? nullField[1] : 'unknown'}`;
    }
    if (errorMsg.includes('FOREIGN KEY constraint failed')) {
      return await this.diagnoseForeignKeyError(row, columns);
    }
    if (errorMsg.includes('datatype mismatch')) {
      return `Data type mismatch for one of the fields: ${columns.join(', ')}`;
    }

    return errorMsg;
  }

  /**
   * Diagnostic helper to find out which specific foreign key is missing
   */
  private async diagnoseForeignKeyError(row: any, columns: string[]): Promise<string> {
    const db = DatabaseManager.get('pos');
    if (!db) {return 'Invalid reference: Related record not found';}

    // Map of foreign key columns to their parent tables
    const fkMap: Record<string, string> = {
      'category_id': 'categories',
      'product_id': 'products',
      'variant_id': 'product_variants',
      'unit_id': 'units',
      'customer_id': 'customers',
      'bill_id': 'bills',
      'receivable_id': 'receivables',
      'contract_id': 'contracts',
      'cycle_id': 'bill_cycles',
      'parent_id': 'categories',
    };

    for (const col of columns) {
      if (fkMap[col] && row[col]) {
        const parentTable = fkMap[col];
        const val = row[col];

        try {
          // ✨ NEW: Kiểm tra xem ID này có bị từ chối trước đó không (ROOT CAUSE)
          if (this.rejectedRowIds.has(String(val))) {
            return `Invalid reference: ${col} '${val}' was REJECTED earlier due to validation errors. Please fix the parent [${parentTable}] record first.`;
          }

          const exists = await db.getRst(`SELECT 1 FROM ${parentTable} WHERE id = ?`, [val]);
          if (!exists) {
            return `Invalid reference: ${col} '${val}' not found in [${parentTable}] table. Please fix your Google Sheet.`;
          }
        } catch (e) {
          // If table doesn't exist yet or other query error
          continue;
        }
      }
    }

    return 'Invalid reference: A related record (e.g., bill_id or customer_id) is missing in the database.';
  }
  public async seedRunner(sheetLink: string, strategy: 'overwrite' | 'merge' | 'dry-run' = 'merge', dryRun: boolean = false): Promise<SeedResult> {
    const errors: SeedResult['errors'] = [];
    const importedTables: Record<string, number> = {};
    let totalImported = 0, totalFailed = 0;

    // Clear tracking at start of run
    this.rejectedRowIds.clear();

    try {
      //  FIXED LOG - không còn duplicate
      logger.info(`\n Starting import from: ${sheetLink}`);
      logger.info(`    Strategy: ${strategy} | Dry-run: ${dryRun}`);

      // Get available sheets first
      const availableSheets = await googleSheetService.getAvailableSheets(sheetLink);
      logger.info(`    Sheets found: ${availableSheets.length} (${availableSheets.slice(0, 3).join(', ')}${availableSheets.length > 3 ? '...' : ''})\n`);

      console.log('Available sheets:', availableSheets);

      // DEBUG: Log all sheet mappings
      console.log('\n=== SHEET MAPPING DEBUG ===');
      for (const sheet of availableSheets) {
        const mappedTable = this.fuzzyMatchSheetToTable(sheet);
        console.log(`Sheet: "${sheet}" -> Table: ${mappedTable || 'NULL (no match)'}`);
      }
      console.log('=== END SHEET MAPPING DEBUG ===\n');

      const jsonData = await googleSheetService.getDataDirect({
        googleSheetLink: sheetLink,
        sheets: availableSheets.join(','),
        startFromRow: 1,
      });

      if (strategy === 'overwrite') {
        if (!dryRun) {
          const db = DatabaseManager.get('pos');
          if (db) {
            logger.info('🗑️ Overwrite mode: Clearing existing data');
            for (const table of [...this.TABLE_ORDER].reverse()) {
              await db.runSql(`DELETE FROM ${table}`);
              logger.info(`Cleared table: ${table}`);
            }
          }
        } else {
          logger.info(' [DRY-RUN] Would clear all tables in overwrite mode');
        }
      }

      // ✨ NEW: Auto-detect and process all matching sheets
      const processedTables = new Set<string>();

      for (const sheetName of Object.keys(jsonData)) {
        const tableName = this.fuzzyMatchSheetToTable(sheetName);

        if (!tableName) {
          logger.warn(` Sheet không khớp database: "${sheetName}" - bỏ qua`);
          continue;
        }

        if (processedTables.has(tableName)) {
          logger.info(`  Gộp thêm dữ liệu từ sheet "${sheetName}" vào bảng "${tableName}" đã được import trước đó`);
        }

        logger.info(` [${sheetName}] → [${tableName}]`);
        const result = await this.seedTable(tableName, sheetName, jsonData[sheetName], errors, dryRun);
        importedTables[tableName] = (importedTables[tableName] || 0) + result.success;
        totalImported += result.success;
        totalFailed += result.failed;
        processedTables.add(tableName);

        if (result.tableErrors > 0) {
          console.log(`    ${tableName}: ${result.tableErrors} errors`);
        } else if (result.success > 0) {
          console.log(`   ${tableName}: ${result.success} rows imported`);
        }
      }

      // ✨ NEW: Check for missing tables that weren't in the sheet
      const missingTables = this.AVAILABLE_TABLES.filter(t => !processedTables.has(t));
      if (missingTables.length > 0) {
        logger.info(`  Tables không có sheet tương ứng: ${missingTables.join(', ')}`);
      }

      // Log to import_logs
      const db = DatabaseManager.get('pos');
      if (db) {
        const logId = await this.generateUUID();
        await db.runSql(`
          INSERT INTO import_logs (id, store_id, source_url, record_count, strategy_used, status, error_message, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [logId, '00000000-0000-0000-0000-000000000001', sheetLink, totalImported, strategy, totalFailed === 0 ? 'success' : 'failed', JSON.stringify(errors.slice(0, 10)), new Date().toISOString()]);
      }

      const summary = ` Import hoàn tất: ${totalImported} thành công, ${totalFailed} lỗi.\nTables: ${JSON.stringify(importedTables)}`;
      logger.info(summary);

      return {
        success: totalFailed === 0,
        totalImported,
        totalFailed,
        errors,
        summary,
        importedTables,
      };
    } catch (error: any) {
      logger.error(` Import failed: ${error.message}`);
      return {
        success: false,
        totalImported: 0,
        totalFailed: 0,
        errors: [{ table: 'global', rowId: 'N/A', message: error.message }],
        summary: `Global error: ${error.message}`,
        importedTables: {},
      };
    }
  }
}

export const databaseSeeder = new DatabaseSeeder();
