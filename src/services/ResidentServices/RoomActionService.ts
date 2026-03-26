import { DatabaseManager } from '@dqcai/sqlite';

/**
 * Service to handle SQLite transactions for Room Management (Offline-first)
 */
export const RoomActionService = {

  /**
   * 2.1 Tạo hợp đồng phòng trọ dài hạn
   */
  async createLongTermContract(storeId: string, variantId: string, productId: string, customerId: string, data: any): Promise<void> {
    const db = DatabaseManager.get('mypos');
    if (!db) {throw new Error('Database connection not found');}
    try {
      await db.execute('BEGIN TRANSACTION');
      const contractId = 'CTR_' + Date.now();
      
      const insertContract = `
        INSERT INTO contracts (
          id, store_id, product_id, variant_id, customer_id, status, rent_amount, deposit_amount,
          start_date, end_date, billing_day, electric_rate, water_rate,
          electric_reading_init, water_reading_init, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `;
      const startDate = data.startDate || new Date().toISOString().split('T')[0];
      const duration = parseInt(data.durationMonths) || 1;
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + duration);
      const endDate = d.toISOString().split('T')[0];

      await db.execute(insertContract, [
        contractId, storeId, productId, variantId, customerId,
        data.rentAmount || 0, data.depositAmount || 0,
        startDate, endDate, data.billingDay || 1,
        data.electricRate || 0, data.waterRate || 0,
        data.electricInit || 0, data.waterInit || 0
      ]);

      const memberId = 'MEM_' + Date.now();
      const insertMember = `
        INSERT INTO contract_members (id, store_id, contract_id, customer_id, is_primary, joined_date, created_at)
        VALUES (?, ?, ?, ?, 1, ?, datetime('now'))
      `;
      await db.execute(insertMember, [memberId, storeId, contractId, customerId, startDate]);

      if (data.depositAmount > 0) {
        const billId = 'BILL_' + Date.now();
        const insertBill = `
          INSERT INTO bills (id, store_id, bill_number, customer_id, bill_type, ref_id, ref_type, total_amount, remaining_amount, bill_status, issued_at, created_at)
          VALUES (?, ?, ?, ?, 'deposit', ?, 'contract', ?, ?, 'draft', datetime('now'), datetime('now'))
        `;
        const billNum = 'DEP-' + Date.now();
        await db.execute(insertBill, [billId, storeId, billNum, customerId, contractId, data.depositAmount, data.depositAmount]);

        const detailId = 'BD_' + Date.now();
        const insertDetail = `
          INSERT INTO bill_details (id, store_id, bill_id, line_description, quantity, unit_price, amount, created_at)
          VALUES (?, ?, ?, 'Tiền cọc phòng', 1, ?, ?, datetime('now'))
        `;
        await db.execute(insertDetail, [detailId, storeId, billId, data.depositAmount, data.depositAmount]);

        const recId = 'REC_' + Date.now();
        const insertRec = `
          INSERT INTO receivables (id, store_id, customer_id, contract_id, bill_id, receivable_type, description, amount, status, created_at)
          VALUES (?, ?, ?, ?, ?, 'deposit', 'Thu tiền cọc', ?, 'pending', datetime('now'))
        `;
        await db.execute(insertRec, [recId, storeId, customerId, contractId, billId, data.depositAmount]);
      }

      await db.execute('COMMIT');
    } catch(e) {
      await db.execute('ROLLBACK');
      throw e;
    }
  },

  /**
   * 2.2 Tạo hợp đồng ngắn hạn
   */
  async createShortTermCheckIn(storeId: string, variantId: string, productId: string, customerId: string, data: any): Promise<void> {
    const db = DatabaseManager.get('mypos');
    if (!db) {throw new Error('Database connection not found');}
    try {
      await db.execute('BEGIN TRANSACTION');
      const contractId = 'CTR_ST_' + Date.now();
      
      const insertContract = `
        INSERT INTO contracts (
          id, store_id, product_id, variant_id, customer_id, status, rent_amount, deposit_amount,
          start_date, end_date, metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `;
      const metadata = JSON.stringify({ adults: data.adults || 1, children: data.children || 0, extra_services: data.extraServices });
      await db.execute(insertContract, [
        contractId, storeId, productId, variantId, customerId, 
        data.rentAmount, data.depositAmount || 0, 
        data.startDate, data.endDate, metadata
      ]);

      const memberId = 'MEM_ST_' + Date.now();
      const insertMember = `
        INSERT INTO contract_members (id, store_id, contract_id, customer_id, is_primary, joined_date, created_at)
        VALUES (?, ?, ?, ?, 1, ?, datetime('now'))
      `;
      await db.execute(insertMember, [memberId, storeId, contractId, customerId, data.startDate]);

      const billId = 'BILL_ST_' + Date.now();
      const insertBill = `
        INSERT INTO bills (id, store_id, bill_number, customer_id, bill_type, ref_id, ref_type, subtotal, total_amount, remaining_amount, bill_status, issued_at, created_at)
        VALUES (?, ?, ?, ?, 'pos', ?, 'contract', ?, ?, ?, 'issued', datetime('now'), datetime('now'))
      `;
      const totalAmount = data.rentAmount + (data.extraServicesAmount || 0);
      const remainingAmount = totalAmount - (data.paidAmount || 0);
      const billStatus = remainingAmount <= 0 ? 'paid' : (data.paidAmount > 0 ? 'partial' : 'issued');
      
      await db.execute(insertBill, [billId, storeId, 'POS-' + Date.now(), customerId, contractId, totalAmount, totalAmount, remainingAmount]);

      const detailId = 'BD_ST_' + Date.now();
      const insertDetail = `
        INSERT INTO bill_details (id, store_id, bill_id, product_id, variant_id, line_description, quantity, unit_price, amount, created_at)
        VALUES (?, ?, ?, ?, ?, 'Tiền phòng', 1, ?, ?, datetime('now'))
      `;
      await db.execute(insertDetail, [detailId, storeId, billId, productId, variantId, data.rentAmount, data.rentAmount]);

      const recId = 'REC_ST_' + Date.now();
      const insertRec = `
        INSERT INTO receivables (id, store_id, customer_id, contract_id, bill_id, receivable_type, description, amount, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'rent', 'Tiền thuê phòng ngắn hạn', ?, ?, datetime('now'))
      `;
      const recStatus = remainingAmount <= 0 ? 'paid' : 'pending';
      await db.execute(insertRec, [recId, storeId, customerId, contractId, billId, totalAmount, recStatus]);

      if (data.paidAmount > 0) {
        const paymentId = 'PAY_' + Date.now();
        const insertPayment = `
          INSERT INTO payments (id, store_id, bill_id, receivable_id, payment_method, amount, paid_at, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'), 'success', datetime('now'))
        `;
        await db.execute(insertPayment, [paymentId, storeId, billId, recId, data.paymentMethod || 'cash', data.paidAmount]);
      }

      await db.execute('COMMIT');
    } catch(e) {
      await db.execute('ROLLBACK');
      throw e;
    }
  },

  /**
   * 2.3 Thêm khách hàng mới (cư dân)
   */
  async addCustomerResident(storeId: string, data: any): Promise<string> {
    const db = DatabaseManager.get('mypos');
    if (!db) {throw new Error('Database connection not found');}
    try {
      await db.execute('BEGIN TRANSACTION');
      const customerId = 'CUST_' + Date.now();
      const insertCust = `
        INSERT INTO customers (id, store_id, full_name, phone, id_number, date_of_birth, gender, address, nationality, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `;
      await db.execute(insertCust, [customerId, storeId, data.fullName, data.phone, data.idNumber, data.dob, data.gender || 'other', data.address, data.nationality || 'VN']);

      const residentId = 'RES_' + Date.now();
      const insertRes = `
        INSERT INTO residents (id, store_id, customer_id, hometown, occupation, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `;
      await db.execute(insertRes, [residentId, storeId, customerId, data.hometown, data.occupation]);
      
      await db.execute('COMMIT');
      return customerId;
    } catch(e) {
      await db.execute('ROLLBACK');
      throw e;
    }
  },

  /**
   * 2.4 Thêm phòng mới
   */
  async addNewRoom(storeId: string, productId: string, data: any): Promise<void> {
    const db = DatabaseManager.get('mypos');
    if (!db) {throw new Error('Database connection not found');}
    try {
      await db.execute('BEGIN TRANSACTION');
      const variantId = 'VAR_' + Date.now();
      const attr = JSON.stringify({
        floor: data.floor,
        area: data.area,
        wc: data.wc,
        roomType: data.roomType
      });
      const insertVar = `
        INSERT INTO product_variants (id, store_id, product_id, variant_code, name, attributes, is_default, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, 'active', datetime('now'), datetime('now'))
      `;
      await db.execute(insertVar, [variantId, storeId, productId, data.roomCode, data.roomName, attr]);

      const priceId = 'PRC_' + Date.now();
      const insertPrice = `
        INSERT INTO prices (id, store_id, variant_id, price_list_name, price, effective_from, status, created_at)
        VALUES (?, ?, ?, 'default', ?, ?, 'active', datetime('now'))
      `;
      await db.execute(insertPrice, [priceId, storeId, variantId, data.price, data.effectiveFrom || new Date().toISOString().split('T')[0]]);

      await db.execute('COMMIT');
    } catch(e) {
      await db.execute('ROLLBACK');
      throw e;
    }
  },

  /**
   * CHECK-IN (Legacy)
   */
  async checkIn(roomId: string, bookingData: any): Promise<boolean> {
    const db = DatabaseManager.get('mypos');
    if (!db) {throw new Error('Database connection not found');}

    try {
      await db.execute('BEGIN TRANSACTION');

      let customerId = '';
      if (bookingData.tenantTab === 'new') {
        customerId = 'CUST_' + Date.now();
        const insertCust = `
          INSERT INTO customers (id, name, phone, customer_type, created_at, updated_at)
          VALUES (?, ?, ?, 'resident', datetime('now'), datetime('now'))
        `;
        await db.execute(insertCust, [customerId, bookingData.fullName, bookingData.phone]);

        // Save ID Card info into residents table
        const resId = 'RES_' + Date.now();
        const insertRes = `
          INSERT INTO residents (id, customer_id, id_card_number, created_at)
          VALUES (?, ?, ?, datetime('now'))
        `;
        await db.execute(insertRes, [resId, customerId, bookingData.idCard]);
      } else {
        // Implement logic to use existing customer ID when tenantTab === 'existing'
        // For now, if no customer is selected from existing, fallback to a dummy or error
        customerId = 'CUST_DUMMY_' + Date.now();
      }

      const contractId = 'CTR_' + Date.now();
      const insertContract = `
        INSERT INTO contracts (
          id, customer_id, product_id, status, rent_amount, deposit_amount, 
          start_date, end_date, electric_reading_init, water_reading_init, created_at, updated_at
        ) VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `;

      // Calculate end date based on duration (e.g., '1 tháng', '6 tháng')
      const startDate = bookingData.contractStart || new Date().toISOString().split('T')[0];
      const durationStr = bookingData.contractDuration || '1 tháng';
      const months = parseInt(durationStr.split(' ')[0]) || 1;
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + (durationStr.includes('năm') ? months * 12 : months));
      const endDate = d.toISOString().split('T')[0];

      await db.execute(insertContract, [
        contractId,
        customerId,
        roomId,
        bookingData.monthlyPrice || 0,
        bookingData.deposit || 0,
        startDate,
        endDate,
        bookingData.electricStart || 0,
        bookingData.waterStart || 0,
      ]);

      await db.execute('COMMIT');
      return true;
    } catch (error) {
      await db.execute('ROLLBACK');
      console.error('[RoomActionService] checkIn Error:', error);
      throw error;
    }
  },

  /**
   * Trả phòng (Check-out)
   */
  async checkOut(roomId: string): Promise<boolean> {
    const db = DatabaseManager.get('mypos');
    if (!db) {throw new Error('Database connection not found');}

    try {
      const q = 'UPDATE contracts SET status = \'terminated\', updated_at = datetime(\'now\') WHERE product_id = ? AND status = \'active\'';
      await db.execute(q, [roomId]);
      return true;
    } catch (error) {
      console.error('[RoomActionService] checkOut Error:', error);
      throw error;
    }
  },

  /**
   * Gia hạn phòng (Extend contract)
   */
  async extendContract(roomId: string, extraMonths: number): Promise<boolean> {
    const db = DatabaseManager.get('mypos');
    if (!db) {throw new Error('Database connection not found');}

    try {
      // Simplistic approach: just add time to end_date
      const q = `
        UPDATE contracts 
        SET end_date = date(end_date, '+' || ? || ' months'), updated_at = datetime('now')
        WHERE product_id = ? AND status = 'active'
      `;
      await db.execute(q, [extraMonths.toString(), roomId]);
      return true;
    } catch (error) {
      console.error('[RoomActionService] extendContract Error:', error);
      throw error;
    }
  },

  /**
   * Đổi phòng (Swap Room)
   */
  async swapRoom(oldRoomId: string, newRoomId: string): Promise<boolean> {
    const db = DatabaseManager.get('mypos');
    if (!db) {throw new Error('Database connection not found');}

    try {
      const q = `
        UPDATE contracts 
        SET product_id = ?, updated_at = datetime('now')
        WHERE product_id = ? AND status = 'active'
      `;
      await db.execute(q, [newRoomId, oldRoomId]);
      return true;
    } catch (error) {
      console.error('[RoomActionService] swapRoom Error:', error);
      throw error;
    }
  },

  /**
   * Cập nhật thông tin phòng (Edit Room)
   */
  async editRoomDetails(roomId: string, data: any): Promise<boolean> {
    const db = DatabaseManager.get('mypos');
    if (!db) {throw new Error('Database connection not found');}

    try {
      await db.execute('BEGIN TRANSACTION');

      // Update tenant info in customers based on active contract
      const contractQ = 'SELECT customer_id FROM contracts WHERE product_id = ? AND status = \'active\'';
      const res = await db.execute(contractQ, [roomId]);
      if (res.rows && res.rows.length > 0) {
         const customerId = res.rows.item(0).customer_id;
         if (customerId) {
            const updateCust = 'UPDATE customers SET full_name = ?, phone = ?, updated_at = datetime(\'now\') WHERE id = ?';
            await db.execute(updateCust, [data.tenant, data.phone, customerId]);
         }
      }

      // Update contract pricing info
      const updateContract = `
        UPDATE contracts 
        SET rent_amount = ?, electric_rate = ?, water_rate = ?, updated_at = datetime('now')
        WHERE product_id = ? AND status = 'active'
      `;
      const electricOld = parseFloat(data.electricOld) || 0;
      const waterOld = parseFloat(data.waterOld) || 0;

      await db.execute(updateContract, [
        parseFloat(data.rentPrice) || 0,
        parseFloat(data.electricRate) || 0,
        parseFloat(data.waterRate) || 0,
        roomId,
      ]);

      const updateInitReading = `
        UPDATE contracts 
        SET electric_reading_init = ?, water_reading_init = ?
        WHERE product_id = ? AND status = 'active'
      `;
      await db.execute(updateInitReading, [electricOld, waterOld, roomId]);

      await db.execute('COMMIT');
      return true;
    } catch (error) {
      await db.execute('ROLLBACK');
      console.error('[RoomActionService] editRoomDetails Error:', error);
      throw error;
    }
  },

  /**
   * Thu tiền tháng - Read meters → calc bill → create records
   * @param roomId Room product_id
   * @param electricNew Current electric meter
   * @param waterNew Current water meter
   */
  async collectMonthlyPayment(roomId: string, electricNew: number, waterNew: number): Promise<{billId: string, total: number}> {
    const db = DatabaseManager.get('mypos');
    if (!db) {throw new Error('Database connection not found');}

    try {
      await db.execute('BEGIN TRANSACTION');

      // 1. Get active contract
      const contractQ = `
        SELECT c.id as contract_id, c.customer_id, c.rent_amount, 
               c.electric_rate, c.water_rate, 
               c.electric_reading_init, c.water_reading_init
        FROM contracts c 
        WHERE c.product_id = ? AND c.status = 'active'
      `;
      const contractRes = await db.execute(contractQ, [roomId]);
      if (!contractRes?.rows?.length) {throw new Error('No active contract for room');}

      const contract = contractRes.rows.item(0);

      // 2. Get latest readings from bills
      const latestBillQ = `
        SELECT bd.reading_to as electric_reading_to, bd2.reading_to as water_reading_to
        FROM bills b
        LEFT JOIN bill_details bd ON b.id = bd.bill_id AND bd.line_description LIKE '%điện%'
        LEFT JOIN bill_details bd2 ON b.id = bd2.bill_id AND bd2.line_description LIKE '%nước%' 
        WHERE b.ref_id = ? AND b.ref_type = 'contract'
        ORDER BY b.issued_at DESC LIMIT 1
      `;
      const latestRes = await db.execute(latestBillQ, [contract.contract_id]);

      const prevElectric = latestRes.rows?.length ? latestRes.rows.item(0).electric_reading_to || contract.electric_reading_init : contract.electric_reading_init;
      const prevWater = latestRes.rows?.length ? latestRes.rows.item(0).water_reading_to || contract.water_reading_init : contract.water_reading_init;

      // 3. Calculate
      const electricUsage = Math.max(0, electricNew - parseFloat(prevElectric));
      const waterUsage = Math.max(0, waterNew - parseFloat(prevWater));

      const electricCost = electricUsage * parseFloat(contract.electric_rate);
      const waterCost = waterUsage * parseFloat(contract.water_rate);
      const rentCost = parseFloat(contract.rent_amount);
      const total = rentCost + electricCost + waterCost;

      // 4. Create bill (current month)
      const now = new Date();
      const billId = 'BILL_' + Date.now();
      const issuedAt = now.toISOString();
      const cycleFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const cycleTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const createBill = `
        INSERT INTO bills (id, store_id, bill_number, customer_id, bill_type, ref_id, ref_type,
                          cycle_period_from, cycle_period_to, subtotal, total_amount, issued_at, bill_status)
        VALUES (?, 'STORE_1', ?, ?, 'cycle', ?, 'contract', ?, ?, ?, ?, ?, 'issued')
      `;
      await db.execute(createBill, [
        billId,
        'BILL-' + now.toISOString().slice(0,10).replace(/-/g,'') + '-' + Math.random().toString(36).slice(2,7).toUpperCase(),
        contract.customer_id,
        contract.contract_id,
        cycleFrom,
        cycleTo,
        total,
        total,
        issuedAt,
      ]);

      // 5. Add bill_details (rent, electric, water)
      const details = [
        {desc: 'Tiền thuê phòng tháng ' + cycleTo.slice(5), qty: 1, price: rentCost, amt: rentCost},
        {desc: `Điện ${electricUsage.toFixed(1)}kWh x ${contract.electric_rate}đ`, qty: electricUsage, price: parseFloat(contract.electric_rate), amt: electricCost, reading_from: prevElectric, reading_to: electricNew},
        {desc: `Nước ${waterUsage.toFixed(1)}m³ x ${contract.water_rate}đ`, qty: waterUsage, price: parseFloat(contract.water_rate), amt: waterCost, reading_from: prevWater, reading_to: waterNew},
      ];

      for (const detail of details) {
        const detailId = 'BD_' + Date.now() + '_' + Math.random().toString(36).slice(2,4);
        const insertDetail = `
          INSERT INTO bill_details (id, bill_id, line_description, quantity, unit_price, amount, reading_from, reading_to)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await db.execute(insertDetail, [
          detailId, billId, detail.desc, detail.qty, detail.price, detail.amt,
          detail.reading_from || null, detail.reading_to || null,
        ]);
      }

      // 6. Create receivables
      const recId = 'REC_' + Date.now();
      const insertRec = `
        INSERT INTO receivables (id, customer_id, contract_id, bill_id, receivable_type, description, amount, due_date)
        VALUES (?, ?, ?, ?, 'rent', ?, ?, date('now', '+7 days'))
      `;
      await db.execute(insertRec, [recId, contract.customer_id, contract.contract_id, billId, 'Rent tháng ' + cycleTo, total]);

      await db.execute('COMMIT');
      return {billId, total};
    } catch (error) {
      await db.execute('ROLLBACK');
      console.error('[RoomActionService] collectMonthlyPayment Error:', error);
      throw error;
    }
  },

};
