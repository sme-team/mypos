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
 *    → giá của từng variant theo unit (DAY/HOUR/HOURFIRST/MONTH)
 *    → price_list_name: 'default'
 */

import {BaseService} from '../../BaseService';
import {generateSequentialId} from '../../../utils';
import { QueryBuilder } from '@dqcai/sqlite';
import DatabaseManager from '../../../database/DBManagers';
import {createModuleLogger, AppModules} from '../../../logger';

const logger = createModuleLogger(AppModules.ROOM_CATEGORY_SERVICE);

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
  unitId: string; // unit_id từ bảng units (DAY / HOUR / HOURFIRST / MONTH)
  price: number;
  priceListName: string;
  effectiveFrom: string;
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
 * unitCode: DAY / HOUR / HOURFIRST / MONTH
 * RoomService sẽ tự map unitCode → unitId từ DB
 */
export interface RoomPriceInput {
  unitCode: string; // unit_code từ bảng units (DAY / HOUR / HOURFIRST / MONTH)
  price: number; // giá bán (VND)
  priceListName?: string; // mặc định 'default'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const now = () => new Date().toISOString();
const todayDate = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

// ─── Service ──────────────────────────────────────────────────────────────────

class RoomServiceClass {
  private productSvc = new ProductBaseService();
  private variantSvc = new VariantBaseService();
  private priceSvc = new PriceBaseService();
  private categorySvc = new CategoryBaseService();

  private genProductId = () => generateSequentialId(this.productSvc, 'room');
  private genVariantId = () => generateSequentialId(this.variantSvc, 'rvnt');
  private genPriceId = () => generateSequentialId(this.priceSvc, 'prc');
  private genCategoryId = () => generateSequentialId(this.categorySvc, 'cat');

  // ─────────────────────────────────────────────────────────────────────────
  // READ
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Load tất cả loại phòng (products có product_type = 'room').
   * → Dùng để render filter chips.
   */
  async loadRoomTypes(storeId: string): Promise<RoomType[]> {
    const products: any[] = await this.productSvc.findAll({
      store_id: storeId,
      product_type: 'room',
    });

    return products
      .filter((p: any) => !p.deleted_at && p.status !== 'draft')
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        code: p.product_code ?? '',
        description: p.description ?? undefined,
      }));
  }

  /**
   * Load tất cả variant của các loại phòng.
   * → Mỗi variant = 1 phòng cụ thể, hiển thị trên card.
   */
  async loadRoomVariants(
    storeId: string,
    productId?: string,
  ): Promise<RoomVariant[]> {
    // 1. Lấy tất cả product type=room để join tên
    const products: any[] = await this.productSvc.findAll({
      store_id: storeId,
      product_type: 'room',
    });
    const productMap = new Map(
      products.filter((p: any) => !p.deleted_at).map((p: any) => [p.id, p]),
    );

    // 2. Lấy variants — filter theo productId nếu có
    const queryConditions: Record<string, any> = {store_id: storeId};
    if (productId) queryConditions.product_id = productId;

    const allVariants: any[] = await this.variantSvc.findAll(queryConditions);

    // 3. Chỉ giữ variant thuộc product type=room, chưa xóa, đang active
    return allVariants
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
  }

  /**
   * Lấy unit_id từ unit_code (map từ DB)
   */
  private async getUnitByCode(unitCode: string): Promise<string | null> {
    const db = DatabaseManager.get('pos');
    if (!db) return null;

    const result = await QueryBuilder.table('units', db)
      .select(['id'])
      .where('unit_code', unitCode.toUpperCase())
      .first();

    return result?.id ?? null;
  }

  /**
   * Load giá của 1 variant theo các unit
   */
  async loadVariantPrices(variantId: string): Promise<RoomPrice[]> {
    const rows: any[] = await this.priceSvc.findAll({
      variant_id: variantId,
      status: 'active',
    });

    return rows
      .filter((r: any) => !r.deleted_at)
      .map((r: any) => ({
        id: r.id,
        variantId: r.variant_id,
        unitId: r.unit_id,
        price: r.price,
        priceListName: r.price_list_name,
        effectiveFrom: r.effective_from,
      }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Tạo loại phòng mới (product)
   * Đồng thời tạo category "Phòng" nếu chưa có (apply_to = 'hostel')
   */
  async createRoomType(input: CreateRoomTypeInput): Promise<RoomType> {
    const t = now();
    const id = await this.genProductId();

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

    return {
      id,
      name: input.name,
      code: `RM-${id.toUpperCase()}`,
      description: input.description,
    };
  }

  /**
   * Tạo phòng cụ thể (variant) cho 1 loại phòng,
   * đồng thời lưu giá nếu có truyền vào.
   */
  async createRoomVariant(
    input: CreateRoomVariantInput,
    prices?: RoomPriceInput[],
  ): Promise<RoomVariant> {
    const t = now();
    const id = await this.genVariantId();

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
      await this.saveVariantPrices(id, input.storeId, prices);
    }

    // Lấy tên product để trả về
    const product = await this.productSvc.findById(input.productId);

    return {
      id,
      productId: input.productId,
      productName: product?.name ?? '',
      name: input.name,
      code: `${input.productId.toUpperCase()}-${id}`,
      attributes: attrs,
      status: 'active',
    };
  }

  /**
   * Lưu / cập nhật giá của 1 variant.
   * Nếu đã tồn tại giá cho (variant_id, unit_id, price_list_name) thì soft-delete cũ rồi insert mới.
   */
  async saveVariantPrices(
    variantId: string,
    storeId: string,
    prices: RoomPriceInput[],
  ): Promise<void> {
    const t = now();
    const today = todayDate();

    for (const p of prices) {
      if (!p.price || p.price <= 0) continue;

      const priceListName = p.priceListName ?? 'default';

      // Map unitCode → unitId từ DB
      const unitId = await this.getUnitByCode(p.unitCode);
      if (!unitId) {
        logger.warn(`[RoomService] Unit not found for code: ${p.unitCode}`);
        continue;
      }

      // Soft-delete bản ghi giá cũ cùng unit + price_list_name
      const existing: any[] = await this.priceSvc.findAll({
        variant_id: variantId,
        unit_id: unitId,
        price_list_name: priceListName,
        status: 'active',
      });
      for (const old of existing) {
        if (!old.deleted_at) {
          await this.priceSvc.update(old.id, {
            deleted_at: t,
            updated_at: t,
            status: 'inactive',
          });
        }
      }

      // Insert bản ghi mới
      const priceId = await this.genPriceId();
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
    }
  }

  /**
   * Cập nhật giá của 1 variant đã tồn tại
   */
  async updateVariantPrices(
    variantId: string,
    storeId: string,
    prices: RoomPriceInput[],
  ): Promise<void> {
    return this.saveVariantPrices(variantId, storeId, prices);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE (soft)
  // ─────────────────────────────────────────────────────────────────────────

  async softDeleteVariant(variantId: string): Promise<void> {
    const t = now();
    await this.variantSvc.update(variantId, {deleted_at: t, updated_at: t});
  }

  async softDeleteRoomType(productId: string): Promise<void> {
    const t = now();
    await this.productSvc.update(productId, {deleted_at: t, updated_at: t});
    // Soft-delete tất cả variants
    const variants = await this.variantSvc.findAll({product_id: productId});
    for (const v of variants) {
      await this.variantSvc.update(v.id, {deleted_at: t, updated_at: t});
    }
  }
}

export const RoomService = new RoomServiceClass();
