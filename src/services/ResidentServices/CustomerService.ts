import { QueryBuilder } from '@dqcai/sqlite';
import DatabaseManager from '../../database/DBManagers';
import { createModuleLogger, AppModules } from '../../logger';

const logger = createModuleLogger(AppModules.DATABASE);

export const CustomerService = {
  /**
   * Lấy danh sách khách hàng (ORM Style)
   */
  async getCustomers(storeId: string = 'store-001'): Promise<any[]> {
    try {
      const db = DatabaseManager.get('mypos');
      if (!db) return [];

      const rows = await QueryBuilder.table('customers', db.getInternalDAO())
        .select(['id', 'full_name', 'phone', 'id_number'])
        .where('store_id', storeId)
        .whereIn('status', ['active', null])
        .orderBy('full_name', 'ASC')
        .get();

      return rows.map(r => ({
        id: r.id,
        full_name: r.full_name,
        phone: r.phone,
        id_number: r.id_number,
      }));
    } catch (err) {
      logger.error('[CustomerService] getCustomers error:', err);
      return [];
    }
  },
};
