import { Product } from '../../screens/pos/types';

export const PosQueryService = {
  async getProducts(): Promise<(Product & { category_id: string })[]> {
    try {
      const { getMyPosDB } = require('../../database/index');
      const db = getMyPosDB();

      const q = `
        SELECT 
          p.id, 
          p.name, 
          COALESCE(pr.price, 0) as price, 
          p.image_url as image, 
          c.name as category,
          p.category_id,
          p.status
        FROM products p
        LEFT JOIN product_variants pv ON p.id = pv.product_id
        LEFT JOIN prices pr ON pv.id = pr.variant_id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.product_type IN ('product', 'service', 'combo')
      `;
      const result = await db.execute(q, []);
      const rows: any[] = result?.rows || [];

      const uniqueProducts = new Map<string, Product & { category_id: string }>();

      for (const r of rows) {
        if (!uniqueProducts.has(r.id)) {
          uniqueProducts.set(r.id, {
            id: r.id,
            name: r.name,
            price: r.price,
            image: r.image || 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400',
            category: r.category || 'Khác',
            category_id: r.category_id,
            available: r.status === 'active',
          });
        }
      }

      return Array.from(uniqueProducts.values());
    } catch (err) {
      console.error('[PosQueryService] getProducts error:', err);
      return [];
    }
  },

  async getCategories(): Promise<{ id: string, name: string, category_code: string, parent_id: string | null }[]> {
    try {
      const { getMyPosDB } = require('../../database/index');
      const db = getMyPosDB();
      const result = await db.execute('SELECT id, name, category_code, parent_id FROM categories WHERE status = \'active\' ORDER BY sort_order ASC, name ASC', []);
      const rows: any[] = result?.rows || [];
      return rows.map(r => ({
        id: r.id,
        name: r.name,
        category_code: r.category_code,
        parent_id: r.parent_id,
      }));
    } catch (err) {
      console.error('[PosQueryService] getCategories error:', err);
      return [];
    }
  },
};
