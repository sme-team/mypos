import { QueryBuilder } from '@dqcai/sqlite';
import DatabaseManager from '../../database/DBManagers';
import { Product } from '../../screens/pos/types';
import { createModuleLogger, AppModules } from '../../logger';

const logger = createModuleLogger(AppModules.DATABASE);

export interface Category {
  id: string;
  name: string;
  category_code: string;
  parent_id: string | null;
  apply_to: string;
}

export const PosQueryService = {
  /**
   * Lấy danh sách sản phẩm hiển thị trên màn hình POS (ORM Style)
   */
  async getProducts(): Promise<(Product & { category_id: string })[]> {
    try {
      const db = DatabaseManager.get('pos');
      if (!db) return [];

      // Sử dụng QueryBuilder thay vì raw SQL
      const rows = await QueryBuilder.table('products', db.getInternalDAO())
        .select([
          'products.id',
          'products.name',
          'products.image_url as image',
          'products.category_id',
          'products.status',
          'categories.name as category',
          'prices.price'
        ])
        .leftJoin('product_variants', 'products.id = product_variants.product_id')
        .leftJoin('prices', 'product_variants.id = prices.variant_id')
        .leftJoin('categories', 'products.category_id = categories.id')
        .where('products.status', 'active')
        .whereIn('products.is_active_pos', [1, null])
        .whereIn('products.product_type', ['product', 'service', 'combo'])
        .get();

      const uniqueProducts = new Map<string, Product & { category_id: string }>();

      for (const r of rows) {
        if (!uniqueProducts.has(r.id)) {
          uniqueProducts.set(r.id, {
            id: r.id,
            name: r.name,
            price: r.price || 0,
            image: r.image || 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400',
            category: r.category || 'Khác',
            category_id: r.category_id,
            available: r.status === 'active',
          });
        }
      }

      return Array.from(uniqueProducts.values());
    } catch (err) {
      logger.error('[PosQueryService] getProducts error:', err);
      return [];
    }
  },

  /**
   * Lấy danh sách danh mục sản phẩm (ORM Style)
   */
  async getCategories(): Promise<Category[]> {
    try {
      const db = DatabaseManager.get('pos');
      if (!db) return [];

      const rows = await QueryBuilder.table('categories', db.getInternalDAO())
        .select(['id', 'name', 'category_code', 'parent_id', 'apply_to'])
        .where('status', 'active')
        .orderBy('sort_order', 'ASC')
        .orderBy('name', 'ASC')
        .get();

      return rows.map(r => ({
        id: r.id,
        name: r.name,
        category_code: r.category_code,
        parent_id: r.parent_id,
        apply_to: r.apply_to,
      }));
    } catch (err) {
      logger.error('[PosQueryService] getCategories error:', err);
      return [];
    }
  },

  /**
   * Lấy danh sách dịch vụ (để đặt phòng)
   * Lọc theo product_type = 'room_service'
   */
  async getServices(storeId: string = 'store-001'): Promise<any[]> {
    try {
      const db = DatabaseManager.get('pos');
      if (!db) return [];

      const rows = await QueryBuilder.table('products', db.getInternalDAO())
        .select([
          'products.id',
          'products.name',
          'products.short_name',
          'products.pricing_type',
          'products.category_id',
          'product_variants.id as variant_id',
          'prices.price as unit_price',
          'units.name as unit',
          'units.id as unit_id'
        ])
        .leftJoin('product_variants', 'products.id = product_variants.product_id')
        .leftJoin('prices', 'product_variants.id = prices.variant_id')
        .leftJoin('units', 'products.unit_id = units.id')
        .where('products.product_type', 'room_service')
        .where('products.store_id', storeId)
        .where('products.status', 'active')
        .where('product_variants.is_default', 1)
        .where('prices.price_list_name', 'default')
        .get();

      return rows.map(r => ({
        id: r.id,
        variantId: r.variant_id,
        name: r.name,
        shortName: r.short_name,
        pricingType: r.pricing_type,
        categoryId: r.category_id,
        unitPrice: r.unit_price || 0,
        unit: r.unit || 'dịch vụ',
        unitId: r.unit_id,
        qty: 1,
        selected: false,
      }));
    } catch (err) {
      logger.error('[PosQueryService] getServices error:', err);
      return [];
    }
  }
};
