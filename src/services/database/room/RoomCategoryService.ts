/**
 * RoomCategoryService.ts
 *
 * Data model đúng theo DB:
 *
 *  products (product_type = 'room')
 *    → mỗi product = 1 LOẠI phòng (VD: "Phòng Luxury", "Phòng VIP")
 *    → dùng làm FILTER CHIPS
 *
 *  product_variants
 *    → mỗi variant = 1 PHÒNG CỤ THỂ (VD: "Phòng 101", "Phòng 102")
 *    → hiển thị trên CARD trong danh sách
 *
 *  prices
 *    → giá của từng variant theo unit (HOURFIRST/HOUR/DAY/MONTH)
 *    → price_list_name: 'default'
 *
 *  Thứ tự giá chuẩn hiển thị trên UI:
 *    1. HOURFIRST  – Giá giờ đầu
 *    2. HOUR       – Giá theo giờ
 *    3. DAY        – Giá qua ngày
 *    4. MONTH      – Giá một tháng
 */

import {createModuleLogger, AppModules} from '../../../logger';
import {BaseService} from '../../BaseService';
import {generateSequentialId} from '../../../utils';
import {QueryBuilder} from '@dqcai/sqlite';
import DatabaseManager from '../../../database/DBManagers';

const logger = createModuleLogger(AppModules.STORE_SERVICE);

// ─── Internal base services ───────────────────────────────────────────────────

class ProductBaseService extends BaseService {
  constructor() {
    super('pos', 'products');
  }
}
class VariantBaseService extends BaseService {
  constructor() {
    super('pos', 'product_variants');
  }
}
class PriceBaseService extends BaseService {
  constructor() {
    super('pos', 'prices');
  }
}
class CategoryBaseService extends BaseService {
  constructor() {
    super('pos', 'categories');
  }
}

// ─── Public types ─────────────────────────────────────────────────────────────

/**
 * RoomType = 1 product có product_type = 'room'
 * Dùng làm filter chip (VD: Phòng Luxury, Phòng VIP, Phòng trọ hạng A...)
 */
export interface RoomType {
  id: string; // product.id
  name: string; // product.name  → label filter chip
  code: string; // product.product_code
  description?: string;
}

/**
 * RoomVariant = 1 phòng cụ thể (product_variants)
 * Hiển thị trên từng card trong danh sách
 */
export interface RoomVariant {
  id: string; // variant.id
  productId: string; // variant.product_id → dùng để filter theo loại
  productName: string;
  name: string; // variant.name
  code: string; // variant.variant_code
  attributes: {
    floor?: string | number | null;
    area?: string | number | null;
    bed?: string | null;
    [key: string]: any;
  };
  status: 'active' | 'inactive';
}

/**
 * Price entry cho 1 variant
 */
export interface RoomPrice {
  id: string;
  variantId: string;
  unitId: string; // unit_id từ bảng units
  unitCode: string; // unit_code (HOURFIRST / HOUR / DAY / MONTH)
  price: number;
  priceListName: string;
  effectiveFrom: string;
}

/**
 * Map giá theo unit_code – tiện dùng cho form
 * key = unit_code, value = giá (string để bind vào TextInput)
 */
export interface RoomPriceMap {
  HOURFIRST: string; // Giá giờ đầu
  HOUR: string; // Giá theo giờ
  DAY: string; // Giá qua ngày
  MONTH: string; // Giá một tháng
}

export const EMPTY_PRICE_MAP: RoomPriceMap = {
  HOURFIRST: '',
  HOUR: '',
  DAY: '',
  MONTH: '',
};

/**
 * RoomVariantWithPrices = RoomVariant kèm map giá theo unit_code.
 * Dùng để render card phòng trên UI — không N+1 query.
 */
export interface RoomVariantWithPrices extends RoomVariant {
  prices: RoomPriceMap;
}

export interface CreateRoomTypeInput {
  storeId: string;
  name: string;
  shortName?: string;
  description?: string;
  categoryId?: string;
}

export interface CreateRoomVariantInput {
  storeId: string;
  productId: string; // ID của loại phòng
  name: string; // tên phòng cụ thể: "Phòng 101"
  floor?: string;
  area?: string;
  bed?: string;
}

/**
 * Giá khởi tạo khi tạo phòng mới
 * unitCode: HOURFIRST / HOUR / DAY / MONTH
 * RoomService sẽ tự map unitCode → unitId từ DB
 */
export interface RoomPriceInput {
  unitCode: string; // unit_code từ bảng units
  price: number; // giá bán (VND)
  priceListName?: string; // mặc định 'default'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const now = () => new Date().toISOString();
const todayDate = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

const normalizeDateString = (
  value: string | null | undefined,
): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const dmy = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  }
  return null;
};

const normalizeDateForSort = (value: string | null | undefined): string => {
  return normalizeDateString(value) ?? value?.trim() ?? '';
};

// ─── Service ──────────────────────────────────────────────────────────────────

class RoomServiceClass {
  private productSvc = new ProductBaseService();
  private variantSvc = new VariantBaseService();
  private priceSvc = new PriceBaseService();

  private genProductId = () => generateSequentialId(this.productSvc, 'room');
  private genVariantId = () => generateSequentialId(this.variantSvc, 'rvnt');
  private genPriceId = () => generateSequentialId(this.priceSvc, 'price');

  // ─────────────────────────────────────────────────────────────────────────
  // READ
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Load tất cả loại phòng (products có product_type = 'room').
   * → Dùng để render filter chips.
   */
  async loadRoomTypes(storeId: string): Promise<RoomType[]> {
    logger.debug(`[RoomService] loadRoomTypes called, storeId: ${storeId}`);
    const products: any[] = await this.productSvc.findAll({
      store_id: storeId,
      product_type: 'room',
    });

    const result = products
      .filter((p: any) => !p.deleted_at && p.status !== 'draft')
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        code: p.product_code ?? '',
        description: p.description ?? undefined,
      }));

    logger.info(
      `[RoomService] loadRoomTypes complete: ${result.length} types loaded`,
    );
    return result;
  }

  /**
   * Load tất cả variant của các loại phòng.
   * → Mỗi variant = 1 phòng cụ thể, hiển thị trên card.
   */
  async loadRoomVariants(
    storeId: string,
    productId?: string,
  ): Promise<RoomVariant[]> {
    logger.debug(
      `[RoomService] loadRoomVariants called, storeId: ${storeId}, productId: ${
        productId ?? 'all'
      }`,
    );

    // 1. Lấy tất cả product type=room để join tên
    const products: any[] = await this.productSvc.findAll({
      store_id: storeId,
      product_type: 'room',
    });
    const productMap = new Map(
      products.filter((p: any) => !p.deleted_at).map((p: any) => [p.id, p]),
    );
    logger.trace(
      `[RoomService] productMap built with ${productMap.size} entries`,
    );

    // 2. Lấy variants — filter theo productId nếu có
    const queryConditions: Record<string, any> = {store_id: storeId};
    if (productId) queryConditions.product_id = productId;

    const allVariants: any[] = await this.variantSvc.findAll(queryConditions);
    logger.trace(`[RoomService] raw variants fetched: ${allVariants.length}`);

    // 3. Chỉ giữ variant thuộc product type=room, chưa xóa, đang active
    const result = allVariants
      .filter((v: any) => {
        if (v.deleted_at || v.status !== 'active') return false;
        return productMap.has(v.product_id);
      })
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((v: any) => {
        const product = productMap.get(v.product_id);
        const attrs = v.attributes
          ? typeof v.attributes === 'string'
            ? JSON.parse(v.attributes)
            : v.attributes
          : {};

        return {
          id: v.id,
          productId: v.product_id,
          productName: product?.name ?? '',
          name: v.name,
          code: v.variant_code ?? '',
          attributes: attrs,
          status: v.status,
        };
      });

    logger.info(
      `[RoomService] loadRoomVariants complete: ${result.length} variants loaded`,
    );
    return result;
  }

  /**
   * Load tất cả phòng + giá — CHỈ 2 QUERY, không N+1.
   *
   *  Query 1: product_variants JOIN products  → danh sách phòng
   *  Query 2: prices JOIN units (filter variant_id IN [...]) → toàn bộ giá
   *  Group: gộp giá vào từng variant trong JS
   */
  async loadRoomVariantsWithPrices(
    storeId: string,
    productId?: string,
  ): Promise<RoomVariantWithPrices[]> {
    logger.debug(
      `[RoomService] loadRoomVariantsWithPrices called, storeId=${storeId}, productId=${
        productId ?? 'all'
      }`,
    );
    const db = DatabaseManager.get('pos');
    if (!db) {
      logger.warn('[RoomService] loadRoomVariantsWithPrices: DB not available');
      return [];
    }

    const ROOM_UNIT_CODES = ['HOURFIRST', 'HOUR', 'DAY', 'MONTH'];
    const today = todayDate();

    // ── Query 1: variants JOIN products ──────────────────────────────────
    const variantQuery = QueryBuilder.table(
      'product_variants',
      db.getInternalDAO(),
    )
      .select([
        'product_variants.id',
        'product_variants.product_id',
        'product_variants.name',
        'product_variants.variant_code',
        'product_variants.attributes',
        'product_variants.status',
        'product_variants.sort_order',
        'products.name AS product_name',
      ])
      .join('products', 'product_variants.product_id = products.id')
      .where('product_variants.store_id', storeId)
      .where('product_variants.status', 'active')
      .whereNull('product_variants.deleted_at')
      .where('products.product_type', 'room')
      .whereNull('products.deleted_at')
      .orderBy('product_variants.sort_order', 'ASC');

    if (productId) {
      variantQuery.where('product_variants.product_id', productId);
    }

    const variantRows: any[] = (await variantQuery.get()) ?? [];
    logger.debug(
      `[RoomService] loadRoomVariantsWithPrices: ${variantRows.length} variants`,
    );
    if (variantRows.length === 0) return [];

    const variantIds = variantRows.map((v: any) => v.id);

    // ── Query 2: prices JOIN units, chỉ filter những gì ORM chắc hỗ trợ ──
    // Filter unit_code + effective_date làm trong JS để tránh bug ORM
    const allPriceRows: any[] =
      (await QueryBuilder.table('prices', db.getInternalDAO())
        .select([
          'prices.variant_id',
          'prices.price',
          'prices.effective_from',
          'prices.effective_to',
          'units.unit_code',
        ])
        .join('units', 'prices.unit_id = units.id')
        .whereIn('prices.variant_id', variantIds)
        .where('prices.status', 'active')
        .whereNull('prices.deleted_at')
        .where('prices.price_list_name', 'default')
        .get()) ?? [];

    logger.debug(
      `[RoomService] loadRoomVariantsWithPrices: ${allPriceRows.length} raw price rows for ${variantIds.length} variants`,
    );

    // ── Filter trong JS ───────────────────────────────────────────────────
    const validPriceRows = allPriceRows.filter((r: any) => {
      const code = (r.unit_code ?? '').toUpperCase();
      if (!ROOM_UNIT_CODES.includes(code)) return false;

      const effectiveFrom = normalizeDateString(r.effective_from);
      const effectiveTo = normalizeDateString(r.effective_to);

      if (effectiveFrom && effectiveFrom > today) return false;
      if (effectiveTo && effectiveTo < today) return false;

      if (effectiveFrom) r.effective_from = effectiveFrom;
      if (effectiveTo) r.effective_to = effectiveTo;

      return true;
    });

    // ── Group: Map<variantId, RoomPriceMap> ──────────────────────────────
    // Sort mới nhất trước → chỉ set lần đầu gặp mỗi unit_code = lấy giá mới nhất
    const sortedPrices = validPriceRows.sort((a: any, b: any) =>
      normalizeDateForSort(b.effective_from).localeCompare(
        normalizeDateForSort(a.effective_from),
      ),
    );

    const priceMapByVariant = new Map<string, RoomPriceMap>();
    for (const row of sortedPrices) {
      const vid: string = row.variant_id;
      const code: string = (row.unit_code ?? '').toUpperCase();
      if (!priceMapByVariant.has(vid)) {
        priceMapByVariant.set(vid, {...EMPTY_PRICE_MAP});
      }
      const pm = priceMapByVariant.get(vid)!;
      if (code === 'HOURFIRST' && !pm.HOURFIRST)
        pm.HOURFIRST = String(row.price);
      else if (code === 'HOUR' && !pm.HOUR) pm.HOUR = String(row.price);
      else if (code === 'DAY' && !pm.DAY) pm.DAY = String(row.price);
      else if (code === 'MONTH' && !pm.MONTH) pm.MONTH = String(row.price);
    }

    // ── Assemble kết quả ─────────────────────────────────────────────────
    const result: RoomVariantWithPrices[] = variantRows.map((v: any) => {
      let attrs: any = {};
      try {
        attrs = v.attributes
          ? typeof v.attributes === 'string'
            ? JSON.parse(v.attributes)
            : v.attributes
          : {};
      } catch {
        attrs = {};
      }

      return {
        id: v.id,
        productId: v.product_id,
        productName: v.product_name ?? '',
        name: v.name,
        code: v.variant_code ?? '',
        attributes: attrs,
        status: v.status,
        prices: priceMapByVariant.get(v.id) ?? {...EMPTY_PRICE_MAP},
      };
    });

    logger.info(
      `[RoomService] loadRoomVariantsWithPrices complete: ${result.length} variants`,
    );
    return result;
  }

  /**
   * Lấy unit record (id + unit_code) từ unit_code
   */
  private async getUnitByCode(
    unitCode: string,
  ): Promise<{id: string; unit_code: string} | null> {
    logger.trace(`[RoomService] getUnitByCode: ${unitCode}`);
    const db = DatabaseManager.get('pos');
    if (!db) {
      logger.warn('[RoomService] getUnitByCode: DB connection not available');
      return null;
    }

    const result = await QueryBuilder.table('units', db.getInternalDAO())
      .select(['id', 'unit_code'])
      .where('unit_code', unitCode.toUpperCase())
      .first();
    return result as {id: string; unit_code: string} | null;
  }

  /**
   * Lấy tất cả unit records liên quan đến giá phòng (HOURFIRST/HOUR/DAY/MONTH)
   * Trả về map: unit_code → unit_id
   */
  private async getRoomUnitMap(): Promise<Map<string, string>> {
    logger.trace('[RoomService] getRoomUnitMap called');
    const db = DatabaseManager.get('pos');
    if (!db) {
      logger.warn('[RoomService] getRoomUnitMap: DB connection not available');
      return new Map();
    }

    const ROOM_UNIT_CODES = ['HOURFIRST', 'HOUR', 'DAY', 'MONTH'];

    const rows = await QueryBuilder.table('units', db.getInternalDAO())
      .select(['id', 'unit_code'])
      .whereIn('unit_code', ROOM_UNIT_CODES)
      .get();

    const map = new Map<string, string>();
    for (const row of rows ?? []) {
      map.set(row.unit_code, row.id);
    }
    logger.debug(`[RoomService] getRoomUnitMap: ${map.size} units mapped`);
    logger.debug(
      `[RoomService] getRoomUnitMap mapped units: ${JSON.stringify(
        Array.from(map.entries()),
      )}`,
    );

    // Check for missing units
    const missingUnits = ROOM_UNIT_CODES.filter(code => !map.has(code));
    if (missingUnits.length > 0) {
      logger.error(
        `[RoomService] ❌ CRITICAL: Missing units in DB - prices cannot be saved for: ${missingUnits.join(
          ', ',
        )}. Expected units: ${ROOM_UNIT_CODES.join(', ')}`,
      );
    }

    return map;
  }

  /**
   * DEBUG ONLY — gọi 1 lần để kiểm tra dữ liệu thực tế trong DB.
   * Xóa sau khi tìm ra nguyên nhân.
   */
  async debugVariantPrices(variantId: string): Promise<void> {
    logger.warn(
      `[RoomService] ===== DEBUG DUMP prices for variantId="${variantId}" =====`,
    );
    const db = DatabaseManager.get('pos');
    if (!db) {
      logger.warn('[RoomService] debugVariantPrices: DB not available');
      return;
    }

    // 1. Toàn bộ rows trong prices (không filter)
    const allRows: any[] =
      (await QueryBuilder.table('prices', db.getInternalDAO())
        .select([
          'id',
          'variant_id',
          'unit_id',
          'price',
          'status',
          'effective_from',
          'effective_to',
          'deleted_at',
          'price_list_name',
        ])
        .get()) ?? [];

    logger.warn(
      `[RoomService] DEBUG: Total rows in prices table: ${allRows.length}`,
    );
    const allVariantIds = [...new Set(allRows.map((r: any) => r.variant_id))];
    logger.warn(
      `[RoomService] DEBUG: All variant_ids in prices: ${JSON.stringify(
        allVariantIds,
      )}`,
    );

    // 2. Rows khớp variantId (case-insensitive để bắt lỗi casing)
    const matched = allRows.filter(
      (r: any) =>
        String(r.variant_id).toLowerCase() === String(variantId).toLowerCase(),
    );
    logger.warn(
      `[RoomService] DEBUG: Rows matching variantId case-insensitive: ${matched.length}`,
    );
    matched.forEach((r: any) =>
      logger.warn(`[RoomService] DEBUG row: ${JSON.stringify(r)}`),
    );

    // 3. Toàn bộ units
    const unitRows: any[] =
      (await QueryBuilder.table('units', db.getInternalDAO())
        .select(['id', 'unit_code'])
        .get()) ?? [];
    logger.warn(
      `[RoomService] DEBUG: All units in DB: ${JSON.stringify(unitRows)}`,
    );

    logger.warn(`[RoomService] ===== END DEBUG =====`);
  }

  /**
   * Load giá của 1 variant – trả về đầy đủ thông tin kèm unit_code.
   */
  async loadVariantPrices(variantId: string): Promise<RoomPrice[]> {
    logger.debug(
      `[RoomService] loadVariantPrices called, variantId: ${variantId}`,
    );
    const db = DatabaseManager.get('pos');
    if (!db) {
      logger.warn(
        '[RoomService] loadVariantPrices: DB connection not available',
      );
      return [];
    }

    const ROOM_UNIT_CODES = ['HOURFIRST', 'HOUR', 'DAY', 'MONTH'];
    const today = todayDate();

    // Bước 1: Lấy tất cả price rows của variant này (chỉ filter những thứ ORM chắc chắn hỗ trợ)
    let allPriceRows: any[] =
      (await QueryBuilder.table('prices', db.getInternalDAO())
        .select([
          'prices.id',
          'prices.variant_id',
          'prices.unit_id',
          'prices.price',
          'prices.price_list_name',
          'prices.effective_from',
          'prices.effective_to',
          'units.unit_code',
        ])
        .join('units', 'prices.unit_id = units.id')
        .where('prices.variant_id', variantId)
        .where('prices.status', 'active')
        .whereNull('prices.deleted_at')
        .get()) ?? [];

    logger.debug(
      `[RoomService] loadVariantPrices raw rows before filter: ${allPriceRows.length}, today=${today}`,
    );

    if (allPriceRows.length === 0) {
      logger.warn(
        `[RoomService] loadVariantPrices joined query returned 0 rows; trying fallback query without units join for variantId=${variantId}`,
      );
      // Fallback không filter status/deleted_at — bắt mọi dữ liệu để debug
      const fallbackPriceRows: any[] =
        (await QueryBuilder.table('prices', db.getInternalDAO())
          .select([
            'prices.id',
            'prices.variant_id',
            'prices.unit_id',
            'prices.price',
            'prices.price_list_name',
            'prices.effective_from',
            'prices.effective_to',
            'prices.status',
            'prices.deleted_at',
          ])
          .where('prices.variant_id', variantId)
          .get()) ?? [];
      logger.debug(
        `[RoomService] loadVariantPrices fallback rows (no status filter): ${fallbackPriceRows.length}`,
      );

      // Ưu tiên rows active+chưa xóa; nếu không có thì dùng tất cả để debug
      const activeFallback = fallbackPriceRows.filter(
        (r: any) => r.status === 'active' && !r.deleted_at,
      );
      logger.debug(
        `[RoomService] loadVariantPrices active fallback: ${activeFallback.length}/${fallbackPriceRows.length}`,
      );
      const sourceRows =
        activeFallback.length > 0 ? activeFallback : fallbackPriceRows;

      if (sourceRows.length > 0) {
        const unitIds = Array.from(
          new Set(
            sourceRows
              .map((r: any) => r.unit_id)
              .filter((id: any) => id != null),
          ),
        );
        logger.debug(
          `[RoomService] loadVariantPrices fallback unit_ids: ${JSON.stringify(
            unitIds,
          )}`,
        );
        if (unitIds.length > 0) {
          const unitRows: any[] =
            (await QueryBuilder.table('units', db.getInternalDAO())
              .select(['id', 'unit_code'])
              .whereIn('id', unitIds)
              .get()) ?? [];
          logger.debug(
            `[RoomService] loadVariantPrices units matched: ${JSON.stringify(
              unitRows,
            )}`,
          );
          const unitCodeMap = new Map<string, string>();
          for (const row of unitRows) {
            unitCodeMap.set(row.id, row.unit_code);
          }
          allPriceRows = sourceRows.map((r: any) => ({
            ...r,
            unit_code: unitCodeMap.get(r.unit_id) ?? '',
          }));
          logger.debug(
            `[RoomService] loadVariantPrices mapped ${allPriceRows.length} fallback rows`,
          );
        } else {
          allPriceRows = sourceRows.map((r: any) => ({...r, unit_code: ''}));
          logger.warn(
            `[RoomService] loadVariantPrices: fallback rows have no unit_id — prices.unit_id is NULL in DB for variantId=${variantId}`,
          );
        }
      } else {
        logger.warn(
          `[RoomService] loadVariantPrices: NO price rows found at all for variantId=${variantId}. ` +
            `Run debugVariantPrices() to see actual DB contents.`,
        );
      }
    }

    // Log chi tiết từng row trước filter
    allPriceRows.forEach((r: any) => {
      logger.debug(
        `[RoomService]   price row: unit_code="${r.unit_code}", price=${r.price}, ` +
          `effective_from="${r.effective_from}", effective_to="${r.effective_to}", status="${r.status}"`,
      );
    });

    // Bước 2: Filter trong JS
    const rows = allPriceRows.filter((r: any) => {
      const code = (r.unit_code ?? '').toUpperCase();
      if (!ROOM_UNIT_CODES.includes(code)) return false;

      const effectiveFrom = normalizeDateString(r.effective_from);
      const effectiveTo = normalizeDateString(r.effective_to);

      // Chỉ loại nếu effective_from là TƯƠNG LAI (chưa có hiệu lực)
      // KHÔNG loại nếu là quá khứ (vd: "31-12-2024") — đó là giá đang dùng
      if (effectiveFrom && effectiveFrom > today) return false;
      // Loại nếu đã hết hạn
      if (effectiveTo && effectiveTo < today) return false;

      if (effectiveFrom) r.effective_from = effectiveFrom;
      if (effectiveTo) r.effective_to = effectiveTo;

      return true;
    });

    logger.debug(
      `[RoomService] loadVariantPrices after JS filter: ${rows.length} rows`,
    );

    const result = (rows ?? []).map((r: any) => ({
      id: r.id,
      variantId: r.variant_id,
      unitId: r.unit_id,
      unitCode: r.unit_code ?? '',
      price: r.price,
      priceListName: r.price_list_name,
      effectiveFrom: r.effective_from,
    }));

    logger.info(
      `[RoomService] loadVariantPrices: ${result.length} price records found for variantId: ${variantId}`,
    );
    return result;
  }

  /**
   * Load giá của 1 variant và trả về dạng RoomPriceMap { HOURFIRST, HOUR, DAY, MONTH }.
   * Dùng để điền sẵn vào form khi mở màn hình edit.
   */
  async loadVariantPriceMap(variantId: string): Promise<RoomPriceMap> {
    logger.debug(
      `[RoomService] loadVariantPriceMap called, variantId: ${variantId}`,
    );
    // DEBUG: dump DB state trước khi load — xóa sau khi tìm ra nguyên nhân
    await this.debugVariantPrices(variantId);
    const prices = await this.loadVariantPrices(variantId);
    const map: RoomPriceMap = {...EMPTY_PRICE_MAP};

    // Sort mới nhất trước (effective_from DESC) rồi chỉ set lần đầu gặp mỗi code
    const sorted = [...prices].sort((a, b) =>
      normalizeDateForSort(b.effectiveFrom).localeCompare(
        normalizeDateForSort(a.effectiveFrom),
      ),
    );
    for (const p of sorted) {
      const code = p.unitCode?.toUpperCase() as keyof RoomPriceMap;
      if (!code || !(code in map)) continue;
      if (!map[code]) map[code] = String(p.price); // chỉ set nếu chưa có
    }

    logger.trace(
      `[RoomService] loadVariantPriceMap result: ${JSON.stringify(map)}`,
    );
    return map;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Tạo loại phòng mới (product)
   */
  async createRoomType(input: CreateRoomTypeInput): Promise<RoomType> {
    logger.info(
      `[RoomService] createRoomType called, storeId: ${input.storeId}, name: "${input.name}"`,
    );
    const t = now();
    const id = await this.genProductId();
    logger.debug(`[RoomService] createRoomType generated id: ${id}`);

    await this.productSvc.create({
      id,
      store_id: input.storeId,
      category_id: input.categoryId ?? null,
      unit_id: null,
      product_code: `RM-${id.toUpperCase()}`,
      barcode: null,
      name: input.name,
      short_name: input.shortName ?? null,
      description: input.description ?? null,
      image_url: null,
      product_type: 'room',
      pricing_type: 'per_night',
      is_active_pos: true,
      is_trackable: false,
      tax_rate: 0,
      sort_order: 0,
      metadata: null,
      status: 'active',
      sync_status: 'local',
      created_at: t,
      updated_at: t,
      deleted_at: null,
    });

    const result: RoomType = {
      id,
      name: input.name,
      code: `RM-${id.toUpperCase()}`,
      description: input.description,
    };
    logger.info(
      `[RoomService] createRoomType success: id=${id}, name="${input.name}"`,
    );
    return result;
  }

  /**
   * Tạo phòng cụ thể (variant) cho 1 loại phòng,
   * đồng thời lưu giá nếu có truyền vào.
   */
  async createRoomVariant(
    input: CreateRoomVariantInput,
    prices?: RoomPriceInput[],
  ): Promise<RoomVariant> {
    logger.info(
      `[RoomService] createRoomVariant called, productId: ${input.productId}, name: "${input.name}"`,
    );
    const t = now();
    const id = await this.genVariantId();
    logger.debug(`[RoomService] createRoomVariant generated id: ${id}`);

    const attrs = {
      floor: input.floor ?? null,
      area: input.area ?? null,
      bed: input.bed ?? null,
    };

    await this.variantSvc.create({
      id,
      store_id: input.storeId,
      product_id: input.productId,
      variant_code: `${input.productId.toUpperCase()}-${id}`,
      name: input.name,
      barcode: null,
      attributes: JSON.stringify(attrs),
      image_url: null,
      is_default: false,
      sort_order: 0,
      status: 'active',
      sync_status: 'local',
      created_at: t,
      updated_at: t,
      deleted_at: null,
    });

    // Lưu giá nếu có
    if (prices && prices.length > 0) {
      logger.debug(
        `[RoomService] createRoomVariant saving ${prices.length} price entries for variantId: ${id}`,
      );
      await this.saveVariantPrices(id, input.storeId, prices);
    } else {
      logger.warn(
        `⚠️ [RoomService] createRoomVariant: No prices provided for variant "${input.name}" (variantId: ${id}). User will need to add prices later by editing the room.`,
      );
    }

    // Lấy tên product để trả về
    const product = await this.productSvc.findById(input.productId);

    const result: RoomVariant = {
      id,
      productId: input.productId,
      productName: product?.name ?? '',
      name: input.name,
      code: `${input.productId.toUpperCase()}-${id}`,
      attributes: attrs,
      status: 'active',
    };
    logger.info(
      `[RoomService] createRoomVariant success: id=${id}, name="${input.name}"`,
    );
    return result;
  }

  /**
   * Lưu / cập nhật giá của 1 variant.
   * Nếu đã tồn tại giá cho (variant_id, unit_id, price_list_name) thì update trực tiếp bản ghi đó.
   * Nếu chưa có thì insert bản ghi mới.
   */
  async saveVariantPrices(
    variantId: string,
    storeId: string,
    prices: RoomPriceInput[],
  ): Promise<void> {
    logger.info(
      `[RoomService] saveVariantPrices called, variantId: ${variantId}, ${prices.length} price entries`,
    );
    const t = now();
    const today = todayDate();

    const unitMap = await this.getRoomUnitMap();
    const db = DatabaseManager.get('pos'); // dùng chung 1 lần

    let savedCount = 0;
    let skippedCount = 0;

    for (const p of prices) {
      if (!p.price || p.price <= 0) {
        logger.trace(
          `[RoomService] saveVariantPrices skipping zero/invalid price for unitCode: ${p.unitCode}`,
        );
        skippedCount++;
        continue;
      }

      const priceListName = p.priceListName ?? 'default';
      const unitId = unitMap.get(p.unitCode.toUpperCase());

      if (!unitId) {
        logger.error(
          `❌ [RoomService] Unit not found for code "${p.unitCode}" — skip`,
        );
        skippedCount++;
        continue;
      }

      const existing: any[] =
        (await QueryBuilder.table('prices', db.getInternalDAO())
          .select(['id', 'price', 'effective_from'])
          .where('variant_id', variantId)
          .where('unit_id', unitId)
          .where('price_list_name', priceListName)
          .where('status', 'active')
          .whereNull('deleted_at')
          .get()) ?? [];

      if (existing.length > 0) {
        const existingPrice = existing[0];
        logger.debug(
          `[RoomService] Updating price: id=${existingPrice.id}, old=${existingPrice.price}, new=${p.price}`,
        );

        await this.priceSvc.update(existingPrice.id, {
          price: p.price,
          effective_from: today,
          updated_at: t,
        });
        savedCount++;
      } else {
        const priceId = await this.genPriceId();
        logger.debug(
          `[RoomService] Inserting new price: id=${priceId}, unitCode=${p.unitCode}, price=${p.price}`,
        );
        await this.priceSvc.create({
          id: priceId,
          store_id: storeId,
          variant_id: variantId,
          unit_id: unitId,
          price_list_name: priceListName,
          price: p.price,
          cost_price: null,
          effective_from: today,
          effective_to: null,
          sort_order: 0,
          status: 'active',
          sync_status: 'local',
          created_at: t,
          updated_at: t,
          deleted_at: null,
        });
        savedCount++;
      }
    }

    logger.info(
      `[RoomService] saveVariantPrices complete: ${savedCount} saved, ${skippedCount} skipped`,
    );
  }

  /**
   * Cập nhật giá của 1 variant đã tồn tại (alias saveVariantPrices)
   */
  async updateVariantPrices(
    variantId: string,
    storeId: string,
    prices: RoomPriceInput[],
  ): Promise<void> {
    logger.debug(
      `[RoomService] updateVariantPrices called (alias), variantId: ${variantId}`,
    );
    return this.saveVariantPrices(variantId, storeId, prices);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE (soft)
  // ─────────────────────────────────────────────────────────────────────────

  async softDeleteVariant(variantId: string): Promise<void> {
    logger.info(
      `[RoomService] softDeleteVariant called, variantId: ${variantId}`,
    );
    const t = now();
    await this.variantSvc.update(variantId, {deleted_at: t, updated_at: t});
    logger.debug(
      `[RoomService] softDeleteVariant success, variantId: ${variantId}`,
    );
  }

  async softDeleteRoomType(productId: string): Promise<void> {
    logger.info(
      `[RoomService] softDeleteRoomType called, productId: ${productId}`,
    );
    const t = now();
    await this.productSvc.update(productId, {deleted_at: t, updated_at: t});
    const variants = await this.variantSvc.findAll({product_id: productId});
    logger.debug(
      `[RoomService] softDeleteRoomType soft-deleting ${variants.length} variants for productId: ${productId}`,
    );
    for (const v of variants) {
      await this.variantSvc.update(v.id, {deleted_at: t, updated_at: t});
    }
    logger.info(
      `[RoomService] softDeleteRoomType complete, productId: ${productId}`,
    );
  }
}

export const RoomService = new RoomServiceClass();
