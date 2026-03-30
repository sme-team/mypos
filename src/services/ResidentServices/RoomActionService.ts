import { QueryBuilder } from '@dqcai/sqlite';
import DatabaseManager from '../../database/DBManagers';
import { createModuleLogger, AppModules } from '../../logger';

const logger = createModuleLogger(AppModules.DATABASE);

export const RoomActionService = {
  /**
   * Tạo hợp đồng dài hạn (ORM Style)
   */
  async createLongTermContract(storeId: string, variantId: string, productId: string, customerId: string, data: any): Promise<void> {
    const db = DatabaseManager.get('mypos');
    if (!db) throw new Error('Database connection not found');

    try {
      const contractId = 'CTR_' + Date.now();
      const insertData = {
        id: contractId,
        store_id: storeId,
        customer_id: customerId,
        product_id: productId,
        variant_id: variantId,
        contract_number: data.contractNumber || `CTR-${Date.now()}`,
        start_date: data.startDate,
        end_date: data.endDate,
        rent_amount: data.price || 0,
        deposit_amount: data.deposit || 0,
        status: 'active',
        created_at: new Date().toISOString()
      };

      const { sql, params } = QueryBuilder.insert('contracts', insertData);
      await db.runSql(sql, params);
    } catch (error) {
      logger.error('[RoomActionService] createLongTermContract Error:', error);
      throw error;
    }
  },

  /**
   * Thêm cư dân mới (ORM Style)
   */
  async addCustomerResident(storeId: string, data: any): Promise<string> {
    const db = DatabaseManager.get('mypos');
    if (!db) throw new Error('Database connection not found');

    try {
      await db.beginTransaction();
      const customerId = 'CUST_' + Date.now();
      
      const { sql: sqlCust, params: paramsCust } = QueryBuilder.insert('customers', {
        id: customerId,
        store_id: storeId,
        full_name: data.fullName,
        phone: data.phone,
        customer_code: data.idCard || `C-${Date.now()}`,
        status: 'active',
        created_at: new Date().toISOString()
      });
      await db.runSql(sqlCust, paramsCust);

      const { sql: sqlRes, params: paramsRes } = QueryBuilder.insert('residents', {
        id: 'RES_' + Date.now(),
        store_id: storeId,
        customer_id: customerId,
        id_card_front_url: data.idCardFront || '',
        id_card_back_url: data.idCardBack || '',
        created_at: new Date().toISOString()
      });
      await db.runSql(sqlRes, paramsRes);

      await db.commitTransaction();
      return customerId;
    } catch (error) {
      await db.rollbackTransaction();
      logger.error('[RoomActionService] addCustomerResident Error:', error);
      throw error;
    }
  },

  /**
   * Thêm phòng mới (ORM Style)
   */
  async addNewRoom(storeId: string, productId: string, data: any): Promise<void> {
    const db = DatabaseManager.get('mypos');
    if (!db) throw new Error('Database connection not found');

    try {
      const { sql, params } = QueryBuilder.insert('products', {
        id: productId,
        store_id: storeId,
        name: data.name,
        product_code: data.roomCode,
        category_id: data.categoryId,
        product_type: 'service',
        is_active_pos: 1,
        status: 'active',
        created_at: new Date().toISOString()
      });
      await db.runSql(sql, params);
    } catch (error) {
      logger.error('[RoomActionService] addNewRoom Error:', error);
      throw error;
    }
  },

  /**
   * Check-in phòng (ORM Style)
   */
  async checkIn(roomId: string, bookingData: any): Promise<boolean> {
    const db = DatabaseManager.get('mypos');
    if (!db) throw new Error('Database connection not found');

    try {
      await db.beginTransaction();

      let customerId = '';
      if (bookingData.tenantTab === 'new') {
        customerId = 'CUST_' + Date.now();
        const { sql, params } = QueryBuilder.insert('customers', {
          id: customerId,
          store_id: '00000000-0000-0000-0000-000000000001',
          full_name: bookingData.fullName,
          phone: bookingData.phone,
          customer_code: bookingData.idCard || `C-${Date.now()}`,
          status: 'active',
          created_at: new Date().toISOString()
        });
        await db.runSql(sql, params);

        const { sql: sqlRes, params: paramsRes } = QueryBuilder.insert('residents', {
          id: 'RES_' + Date.now(),
          store_id: '00000000-0000-0000-0000-000000000001',
          customer_id: customerId,
          created_at: new Date().toISOString()
        });
        await db.runSql(sqlRes, paramsRes);
      } else {
        customerId = bookingData.selectedCustomerId || `CUST_DUMMY_${Date.now()}`;
      }

      // Tính toán ngày kết thúc
      const startDate = bookingData.contractStart || new Date().toISOString().split('T')[0];
      const durationStr = bookingData.contractDuration || '1 tháng';
      const months = parseInt(durationStr.split(' ')[0]) || 1;
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + (durationStr.includes('năm') ? months * 12 : months));
      const endDate = d.toISOString().split('T')[0];

      const { sql: sqlCtr, params: paramsCtr } = QueryBuilder.insert('contracts', {
        id: 'CTR_' + Date.now(),
        customer_id: customerId,
        product_id: roomId,
        store_id: '00000000-0000-0000-0000-000000000001',
        status: 'active',
        rent_amount: bookingData.monthlyPrice || 0,
        deposit_amount: bookingData.deposit || 0,
        start_date: startDate,
        end_date: endDate,
        electric_reading_init: bookingData.electricStart || 0,
        water_reading_init: bookingData.waterStart || 0,
        created_at: new Date().toISOString()
      });
      await db.runSql(sqlCtr, paramsCtr);

      await db.commitTransaction();
      return true;
    } catch (error) {
      await db.rollbackTransaction();
      logger.error('[RoomActionService] checkIn Error:', error);
      throw error;
    }
  },

  /**
   * Check-out phòng (ORM Style)
   */
  async checkOut(roomId: string): Promise<boolean> {
    const db = DatabaseManager.get('mypos');
    if (!db) throw new Error('Database connection not found');

    try {
      const { sql, params } = QueryBuilder.update(
        'contracts',
        { status: 'terminated', updated_at: new Date().toISOString() },
        "product_id = ? AND status = 'active'",
        [roomId]
      );
      await db.runSql(sql, params);
      return true;
    } catch (error) {
      logger.error('[RoomActionService] checkOut Error:', error);
      throw error;
    }
  },

  /**
   * Gia hạn hợp đồng (ORM Style)
   */
  async extendContract(roomId: string, extraMonths: number): Promise<boolean> {
    const db = DatabaseManager.get('mypos');
    if (!db) throw new Error('Database connection not found');

    try {
      const q = `
        UPDATE contracts 
        SET end_date = date(end_date, '+' || ? || ' months'), updated_at = datetime('now')
        WHERE product_id = ? AND status = 'active'
      `;
      await db.runSql(q, [extraMonths.toString(), roomId]);
      return true;
    } catch (error) {
      logger.error('[RoomActionService] extendContract Error:', error);
      throw error;
    }
  },

  /**
   * Đổi phòng (ORM Style)
   */
  async swapRoom(oldRoomId: string, newRoomId: string): Promise<boolean> {
    const db = DatabaseManager.get('mypos');
    if (!db) throw new Error('Database connection not found');

    try {
      const { sql, params } = QueryBuilder.update(
        'contracts', 
        { product_id: newRoomId, updated_at: new Date().toISOString() }, 
        "product_id = ? AND status = 'active'", 
        [oldRoomId]
      );
      await db.runSql(sql, params);
      return true;
    } catch (error) {
      logger.error('[RoomActionService] swapRoom Error:', error);
      throw error;
    }
  },

  /**
   * Cập nhật thông tin phòng & khách thuê (ORM Style)
   */
  async editRoomDetails(roomId: string, data: any): Promise<boolean> {
    const db = DatabaseManager.get('mypos');
    if (!db) throw new Error('Database connection not found');

    try {
      await db.beginTransaction();

      const contract = await QueryBuilder.table('contracts', db.getInternalDAO())
        .select('customer_id')
        .where('product_id', roomId)
        .where('status', 'active')
        .first();

      if (contract?.customer_id) {
        const { sql, params } = QueryBuilder.update(
          'customers',
          { full_name: data.tenant, phone: data.phone, updated_at: new Date().toISOString() },
          'id = ?',
          [contract.customer_id]
        );
        await db.runSql(sql, params);
      }

      const { sql: sqlCtr, params: paramsCtr } = QueryBuilder.update(
        'contracts',
        {
          rent_amount: parseFloat(data.rentPrice) || 0,
          electric_rate: parseFloat(data.electricRate) || 0,
          water_rate: parseFloat(data.waterRate) || 0,
          electric_reading_init: parseFloat(data.electricOld) || 0,
          water_reading_init: parseFloat(data.waterOld) || 0,
          updated_at: new Date().toISOString()
        },
        "product_id = ? AND status = 'active'",
        [roomId]
      );
      await db.runSql(sqlCtr, paramsCtr);

      await db.commitTransaction();
      return true;
    } catch (error) {
      await db.rollbackTransaction();
      logger.error('[RoomActionService] editRoomDetails Error:', error);
      throw error;
    }
  },

  /**
   * Thu tiền tháng (ORM Style)
   */
  async collectMonthlyPayment(roomId: string, electricNew: number, waterNew: number): Promise<{billId: string, total: number}> {
    const db = DatabaseManager.get('mypos');
    if (!db) throw new Error('Database connection not found');

    try {
      await db.beginTransaction();

      const contract = await QueryBuilder.table('contracts', db.getInternalDAO())
        .select(['id as contract_id', 'customer_id', 'rent_amount', 'electric_rate', 'water_rate', 'electric_reading_init', 'water_reading_init'])
        .where('product_id', roomId)
        .where('status', 'active')
        .first();

      if (!contract) throw new Error('Không có hợp đồng đang hoạt động');

      const latestBill = await QueryBuilder.table('bills', db.getInternalDAO())
        .select(['bd.reading_to as e_prev', 'bd2.reading_to as w_prev'])
        .leftJoin('bill_details as bd', "bills.id = bd.bill_id AND bd.line_description LIKE '%điện%'")
        .leftJoin('bill_details as bd2', "bills.id = bd2.bill_id AND bd2.line_description LIKE '%nước%'")
        .where('bills.ref_id', contract.contract_id)
        .where('bills.ref_type', 'contract')
        .orderBy('bills.issued_at', 'DESC')
        .first();

      const prevE = latestBill?.e_prev ?? contract.electric_reading_init;
      const prevW = latestBill?.w_prev ?? contract.water_reading_init;

      const eUsage = Math.max(0, electricNew - prevE);
      const wUsage = Math.max(0, waterNew - prevW);
      const total = (contract.rent_amount || 0) + (eUsage * (contract.electric_rate || 0)) + (wUsage * (contract.water_rate || 0));

      const billId = `BILL_${Date.now()}`;
      const { sql: sqlBill, params: paramsBill } = QueryBuilder.insert('bills', {
        id: billId,
        store_id: '00000000-0000-0000-0000-000000000001',
        customer_id: contract.customer_id,
        bill_type: 'cycle',
        ref_id: contract.contract_id,
        ref_type: 'contract',
        total_amount: total,
        issued_at: new Date().toISOString(),
        status: 'issued'
      });
      await db.runSql(sqlBill, paramsBill);

      await db.commitTransaction();
      return { billId, total };
    } catch (error) {
      await db.rollbackTransaction();
      logger.error('[RoomActionService] collectMonthlyPayment Error:', error);
      throw error;
    }
  }
};
