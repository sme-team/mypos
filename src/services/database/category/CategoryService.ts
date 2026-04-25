import {BaseService} from '../../BaseService';
import {generateSequentialId} from '../../../utils';
import {QueryBuilder} from '@dqcai/sqlite';
import DatabaseManager from '../../../database/DBManagers';
import {createModuleLogger, AppModules} from '../../../logger';
import type {
  TabType,
  CategoryGroup,
  CategoryItem,
  Variant,
  UnitOption,
} from '../../../screens/category/types';

const logger = createModuleLogger(AppModules.DATABASE);

// ─── Base Services ────────────────────────────────────────────────────────────

class CategoryBaseService extends BaseService {
  constructor() {
    super('pos', 'categories');
  }
}

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

class UnitBaseService extends BaseService {
  constructor() {
    super('pos', 'units');
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function applyToToTabs(applyTo: string | null): TabType[] {
  if (!applyTo || applyTo === 'all') {return ['selling', 'storage'];}
  if (applyTo === 'pos') {return ['selling'];}
  return ['storage'];
}

function tabsToApplyTo(tabs: TabType[]): string {
  const hasSelling = tabs.includes('selling');
  const hasStorage = tabs.includes('storage');
  if (hasSelling && hasStorage) {return 'all';}
  if (hasSelling) {return 'pos';}
  return 'hostel';
}

// ─── Service Class ────────────────────────────────────────────────────────────

class CategoryServiceClass {
  private categorySvc = new CategoryBaseService();
  private productSvc = new ProductBaseService();
  private variantSvc = new VariantBaseService();
  private priceSvc = new PriceBaseService();
  private unitSvc = new UnitBaseService();

  private generateCategoryId = () =>
    generateSequentialId(this.categorySvc, 'cat');
  private generateProductId = () =>
    generateSequentialId(this.productSvc, 'prod');
  private generateVariantId = () =>
    generateSequentialId(this.variantSvc, 'var');
  private generatePriceId = () => generateSequentialId(this.priceSvc, 'price');

  // ─── READ ──────────────────────────────────────────────────────────────────

  /**
   * Load toàn bộ categories + products + variants cho một store
   */
  async loadAllGroups(storeId: string): Promise<CategoryGroup[]> {
    try {
      const db = DatabaseManager.get('pos');
      if (!db) {
        logger.error('[CategoryService] DB not initialized');
        return [];
      }

      // 1. Categories (root — parent_id IS NULL)
      let groupRows: any[] = [];
      try {
        groupRows = await QueryBuilder.table('categories', db.getInternalDAO())
          .select(['id', 'name', 'apply_to', 'sort_order', 'store_id'])
          .where('store_id', storeId)
          .where('status', 'active')
          .whereNull('parent_id')
          .whereNull('deleted_at')
          .orderBy('sort_order', 'ASC')
          .orderBy('name', 'ASC')
          .get();
      } catch (err) {
        logger.error('[CategoryService] Error fetching categories:', err);
      }

      if (!groupRows || groupRows.length === 0) {return [];}

      // 2. Products
      let productRows: any[] = [];
      try {
        productRows = await QueryBuilder.table('products', db.getInternalDAO())
          .select(['id', 'name', 'category_id', 'store_id', 'status'])
          .where('store_id', storeId)
          .where('status', 'active')
          .whereNull('deleted_at')
          .orderBy('sort_order', 'ASC')
          .get();
      } catch (err) {
        logger.error('[CategoryService] Error fetching products:', err);
      }

      // 3. Variants join prices + units
      let variantRows: any[] = [];
      try {
        variantRows = await QueryBuilder.table(
          'product_variants',
          db.getInternalDAO(),
        )
          .select([
            'product_variants.id',
            'product_variants.product_id',
            'product_variants.name',
            'product_variants.image_url',
            'product_variants.status',
            'prices.price',
            'units.name AS unit_name',
          ])
          .leftJoin('prices', 'product_variants.id = prices.variant_id')
          .leftJoin('units', 'prices.unit_id = units.id')
          .where('product_variants.status', 'active')
          .whereNull('product_variants.deleted_at')
          .orderBy('product_variants.sort_order', 'ASC')
          .get();
      } catch (err) {
        logger.error('[CategoryService] Error fetching variants:', err);
      }

      // 4. Assemble
      const variantsByProduct = new Map<string, Variant[]>();
      for (const v of variantRows) {
        if (!variantsByProduct.has(v.product_id)) {
          variantsByProduct.set(v.product_id, []);
        }
        variantsByProduct.get(v.product_id)!.push({
          id: v.id,
          name: v.name ?? 'Chưa có tên',
          price: v.price ?? 0,
          unit: v.unit_name ?? '',
          imageUri: v.image_url ?? undefined,
        });
      }

      const productsByCategory = new Map<string, typeof productRows>();
      for (const p of productRows) {
        if (!productsByCategory.has(p.category_id)) {
          productsByCategory.set(p.category_id, []);
        }
        productsByCategory.get(p.category_id)!.push(p);
      }

      return groupRows.map(
        (group): CategoryGroup => ({
          id: group.id,
          label: group.name ?? 'Chưa có tên',
          tab: applyToToTabs(group.apply_to),
          items: (productsByCategory.get(group.id) ?? []).map(
            (prod): CategoryItem => ({
              id: prod.id,
              name: prod.name ?? 'Chưa có tên',
              variants: variantsByProduct.get(prod.id) ?? [],
            }),
          ),
        }),
      );
    } catch (err) {
      logger.error('[CategoryService] loadAllGroups error:', err);
      return [];
    }
  }

  /**
   * Lọc danh sách CategoryGroup theo từ khóa tìm kiếm.
   *
   * - Nếu query khớp tên group → giữ toàn bộ items của group đó.
   * - Nếu query khớp tên item  → chỉ giữ items khớp (group được giữ lại).
   * - Nếu query khớp tên variant → giữ item chứa variant đó.
   * - Trả về mảng rỗng nếu query là chuỗi rỗng sau khi trim (caller nên hiển thị data gốc).
   *
   * @param groups  Kết quả từ loadAllGroups (đã được memoize ở UI layer)
   * @param query   Từ khóa tìm kiếm (không phân biệt hoa thường)
   */
  searchGroups(groups: CategoryGroup[], query: string): CategoryGroup[] {
    const q = query.trim().toLowerCase();
    if (!q) {return groups;}

    const result: CategoryGroup[] = [];

    for (const group of groups) {
      const groupMatch = group.label.toLowerCase().includes(q);

      if (groupMatch) {
        // Giữ nguyên toàn bộ group
        result.push(group);
        continue;
      }

      // Lọc items
      const matchedItems = group.items.filter(item => {
        if (item.name.toLowerCase().includes(q)) {return true;}
        // Kiểm tra variant names
        return item.variants.some(v => v.name.toLowerCase().includes(q));
      });

      if (matchedItems.length > 0) {
        result.push({...group, items: matchedItems});
      }
    }

    return result;
  }

  /**
   * Load danh sách đơn vị tính từ bảng units, chỉ lấy unit_type = 'count' hoặc 'weight'
   */
  async loadUnits(storeId: string): Promise<UnitOption[]> {
    try {
      const db = DatabaseManager.get('pos');
      if (!db) {return [];}

      const rows = await QueryBuilder.table('units', db.getInternalDAO())
        .select(['id', 'name', 'unit_type'])
        .where('store_id', storeId)
        .where('status', 'active')
        .whereNull('deleted_at')
        .whereIn('unit_type', ['count', 'weight'])
        .orderBy('sort_order', 'ASC')
        .get();

      return rows
        .filter((r: any) => r.id && r.name)
        .map((r: any) => ({id: r.id as string, name: r.name as string}));
    } catch (err) {
      logger.error('[CategoryService] loadUnits error:', err);
      return [];
    }
  }

  // ─── CATEGORY CRUD ─────────────────────────────────────────────────────────

  async createGroup(
    storeId: string,
    name: string,
    tabs: TabType[],
  ): Promise<void> {
    const now = new Date().toISOString();
    const id = await this.generateCategoryId();

    await this.categorySvc.create({
      id,
      store_id: storeId,
      parent_id: null,
      category_code: null,
      name: name.trim().toUpperCase(),
      icon: null,
      color_code: null,
      apply_to: tabsToApplyTo(tabs),
      sort_order: 999,
      status: 'active',
      sync_status: 'local',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });
  }

  async updateGroup(
    groupId: string,
    name: string,
    tabs: TabType[],
  ): Promise<void> {
    const now = new Date().toISOString();

    await this.categorySvc.update(groupId, {
      name: name.trim().toUpperCase(),
      apply_to: tabsToApplyTo(tabs),
      sync_status: 'local',
      updated_at: now,
    });
  }

  async softDeleteGroup(groupId: string): Promise<void> {
    const now = new Date().toISOString();

    // Cascade soft delete products thuộc group
    const products = await this.productSvc.findAll({category_id: groupId});
    for (const p of products) {
      await this.softDeleteProduct(p.id);
    }

    await this.categorySvc.update(groupId, {
      status: 'inactive',
      sync_status: 'local',
      deleted_at: now,
      updated_at: now,
    });
  }

  // ─── PRODUCT CRUD ───────────────────────────────────────────────────────────

  async createProduct(
    storeId: string,
    categoryId: string,
    name: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    const id = await this.generateProductId();

    await this.productSvc.create({
      id,
      store_id: storeId,
      category_id: categoryId,
      unit_id: null,
      product_code: null,
      barcode: null,
      name: name.trim(),
      short_name: null,
      description: null,
      image_url: null,
      product_type: 'product',
      pricing_type: 'fixed',
      is_active_pos: true,
      is_trackable: false,
      tax_rate: 0,
      sort_order: 999,
      metadata: null,
      status: 'active',
      sync_status: 'local',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });
  }

  async softDeleteProduct(productId: string): Promise<void> {
    const now = new Date().toISOString();

    // Cascade soft delete variants thuộc product
    const variants = await this.variantSvc.findAll({product_id: productId});
    for (const v of variants) {
      await this.softDeleteVariant(v.id);
    }

    await this.productSvc.update(productId, {
      status: 'inactive',
      sync_status: 'local',
      deleted_at: now,
      updated_at: now,
    });
  }

  // ─── VARIANT CRUD ───────────────────────────────────────────────────────────

  /**
   * Tìm unit_id từ tên đơn vị trong DB
   */
  private async resolveUnitId(
    storeId: string,
    unitName: string,
  ): Promise<string | null> {
    try {
      const row = await this.unitSvc.findFirst({
        store_id: storeId,
        name: unitName,
        status: 'active',
      });
      return row?.id ?? null;
    } catch {
      return null;
    }
  }

  async createVariant(
    storeId: string,
    productId: string,
    name: string,
    price: number,
    unitName: string,
    imageUrl?: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    const today = now.split('T')[0]; // YYYY-MM-DD

    const [variantId, priceId, unitId] = await Promise.all([
      this.generateVariantId(),
      this.generatePriceId(),
      this.resolveUnitId(storeId, unitName),
    ]);

    // 1. Insert variant
    await this.variantSvc.create({
      id: variantId,
      store_id: storeId,
      product_id: productId,
      variant_code: null,
      name: name.trim(),
      barcode: null,
      attributes: null,
      image_url: imageUrl ?? null,
      is_default: false,
      sort_order: 999,
      status: 'active',
      sync_status: 'local',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });

    // 2. Insert price
    await this.priceSvc.create({
      id: priceId,
      store_id: storeId,
      variant_id: variantId,
      unit_id: unitId,
      price_list_name: 'default',
      price,
      cost_price: 0,
      effective_from: today,
      effective_to: null,
      sort_order: 0,
      status: 'active',
      sync_status: 'local',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });
  }

  async updateVariant(
    storeId: string,
    variantId: string,
    name: string,
    price: number,
    unitName: string,
    imageUrl?: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    const unitId = await this.resolveUnitId(storeId, unitName);

    // 1. Update variant
    await this.variantSvc.update(variantId, {
      name: name.trim(),
      image_url: imageUrl ?? null,
      sync_status: 'local',
      updated_at: now,
    });

    // 2. Tìm price record hiện tại, update hoặc tạo mới
    const existingPrice = await this.priceSvc.findFirst({
      variant_id: variantId,
      price_list_name: 'default',
      status: 'active',
    });

    if (existingPrice) {
      await this.priceSvc.update(existingPrice.id, {
        price,
        unit_id: unitId,
        effective_from: today,
        sync_status: 'local',
        updated_at: now,
      });
    } else {
      const priceId = await this.generatePriceId();
      await this.priceSvc.create({
        id: priceId,
        store_id: storeId,
        variant_id: variantId,
        unit_id: unitId,
        price_list_name: 'default',
        price,
        cost_price: 0,
        effective_from: today,
        effective_to: null,
        sort_order: 0,
        status: 'active',
        sync_status: 'local',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
    }
  }

  async softDeleteVariant(variantId: string): Promise<void> {
    const now = new Date().toISOString();

    // Soft delete prices liên quan
    const prices = await this.priceSvc.findAll({variant_id: variantId});
    for (const p of prices) {
      await this.priceSvc.update(p.id, {
        status: 'inactive',
        sync_status: 'local',
        deleted_at: now,
        updated_at: now,
      });
    }

    // Soft delete variant
    await this.variantSvc.update(variantId, {
      status: 'inactive',
      sync_status: 'local',
      deleted_at: now,
      updated_at: now,
    });
  }
}

export const CategoryService = new CategoryServiceClass();
