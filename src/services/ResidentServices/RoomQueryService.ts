import { QueryBuilder } from '@dqcai/sqlite';
import DatabaseManager from '../../database/DBManagers';
import { BaseService } from '../BaseService';
import { RoomPriceService } from './RoomPriceService';

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────

export type RoomStatus = 'available' | 'occupied' | 'booked' | 'cleaning' | 'maintenance';

/** Shape trả về cho 1 ô phòng trên Grid (Màn hình 1) */
export interface RoomGridItem {
  id: string;               // product_variants.id
  name: string;             // tên phòng hiển thị (attr.room || variant.name)
  product_name: string;      // tên loại phòng (products.name)
  label: string;
  floor: string;            // lấy từ attributes.floor
  monthly_price?: number;    // Giá theo tháng (unit-019), chỉ có ở phòng dài hạn
  status: RoomStatus;
  contract_id: string | null;
  contract_status: string;
  end_date: string | null;  // contracts.end_date → badge "Hết hạn"
  start_date: string | null; // contracts.start_date
  checkInTime?: string;     // Giờ check-in từ contract metadata (HH:mm)
  customer_name: string;
  borderColor: string;
  attributes: Record<string, any>;
  product_id: string;
  displayPriceText?: string; // Giá hiển thị theo độ ưu tiên
  displayPriceValue?: number; // Giá trị số để filter
}

/** Shape trả về cho màn hình Chi tiết phòng (Màn hình 3) */
export interface RoomDetailInfo {
  // product_variants + products
  variant_id: string;
  variant_name: string;
  room_code: string;
  floor?: string | number;
  beds?: string;
  view?: string;
  area_m2?: number;
  product_name: string;     // tên loại phòng (products.name)
  // contracts
  contract_id?: string;
  contract_status?: string;
  contract_type?: string;   // 'long_term' | 'short_term'
  start_date?: string;
  end_date?: string;
  rent_amount?: number;
  electric_rate?: number;
  water_rate?: number;
  electric_reading_init?: number;
  water_reading_init?: number;
  // customers
  customer_name?: string;
  customer_phone?: string;
  cccd?: string;
  // bill hiện tại
  current_bill_id?: string;
  current_bill_status?: string;
  // services từ bill_details
  bill_items?: BillDetailItem[];
  total_amount?: number;
  paid_amount?: number;
  remaining_amount?: number;
  metadata?: string; // contracts.metadata
  check_in_time?: string;
  check_out_time?: string;
  adults?: number;
  children?: number;
  // logic AR mới
  negative_balance?: number;
  billing_day?: number;
  total_payable?: number;
  total_paid?: number;
  balance?: number;
  history_bills?: any[];
}

export interface BillDetailItem {
  id: string;
  line_description: string;
  quantity: number;
  unit_price: number;
  reading_from?: number;
  reading_to?: number;
  amount: number;
}

/** Shape dùng cho modal Đổi phòng */
export interface AvailableRoomItem {
  id: string;
  name: string;
  floor: string | number;
  monthly_price?: number;    // Giá theo tháng (unit-019), chỉ có ở phòng dài hạn
  product_id: string;
  product_name: string;
  attributes: Record<string, any>;
  displayPriceText?: string;
  displayPriceValue?: number;
}

// ─────────────────────────────────────────────
//  Màu theo trạng thái
// ─────────────────────────────────────────────

const BORDER_COLORS: Record<RoomStatus, string> = {
  available: '#4CAF50',
  occupied: '#FF4444',
  booked: '#2196F3',
  cleaning: '#FFA726',
  maintenance: '#9E9E9E',
};

// ─────────────────────────────────────────────
//  Base services (mỗi bảng 1 class)
// ─────────────────────────────────────────────

class ProductVariantService extends BaseService {
  constructor() { super('pos', 'product_variants'); }
}

class ProductService extends BaseService {
  constructor() { super('pos', 'products'); }
}

class PriceService extends BaseService {
  constructor() { super('pos', 'prices'); }
}

class ContractService extends BaseService {
  constructor() { super('pos', 'contracts'); }
}

class CustomerBaseService extends BaseService {
  constructor() { super('pos', 'customers'); }
}

class BillService extends BaseService {
  constructor() { super('pos', 'bills'); }
}

class BillDetailService extends BaseService {
  constructor() { super('pos', 'bill_details'); }
}

// ─────────────────────────────────────────────
//  RoomQueryService
// ─────────────────────────────────────────────

class RoomQueryServiceClass {
  private variantSvc = new ProductVariantService();
  private productSvc = new ProductService();
  private priceSvc = new PriceService();
  private contractSvc = new ContractService();
  private customerSvc = new CustomerBaseService();
  private billSvc = new BillService();
  private billDetailSvc = new BillDetailService();

  // ── helpers ─────────────────────────────────

  private parseAttr(raw: any): Record<string, any> {
    if (!raw) {return {};}
    if (typeof raw === 'object') {return raw;}
    try { return JSON.parse(raw); } catch { return {}; }
  }

  private resolveFloor(attr: Record<string, any>, name: string): string {
    if (attr.floor != null) {return String(attr.floor);}
    const m = String(name || '').match(/\d/);
    return m ? m[0] : '?';
  }

  private resolveStatus(
    variantStatus: string,
    contractId: string | null,
    contractStartDate: string | null,
    contractEndDate: string | null,
    attrStatus?: string,
    checkInTime?: string,
    checkOutTime?: string,
  ): RoomStatus {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    // Parse check-in/check-out times (format: "14:00")
    const checkInHour = checkInTime ? parseInt(checkInTime.split(':')[0]) : 14;
    const checkInMinute = checkInTime ? parseInt(checkInTime.split(':')[1]) : 0;
    const checkInTimeInMinutes = checkInHour * 60 + checkInMinute;

    const checkOutHour = checkOutTime ? parseInt(checkOutTime.split(':')[0]) : 12;
    const checkOutMinute = checkOutTime ? parseInt(checkOutTime.split(':')[1]) : 0;
    const checkOutTimeInMinutes = checkOutHour * 60 + checkOutMinute;

    // Determine if this is a long-term contract (no check-in/check-out times in metadata)
    const isLongTerm = !checkInTime && !checkOutTime;

    console.log('[resolveStatus] variantStatus:', variantStatus, 'contractId:', contractId, 'contractStartDate:', contractStartDate, 'contractEndDate:', contractEndDate, 'attrStatus:', attrStatus, 'today:', today, 'checkInTime:', checkInTime, 'checkOutTime:', checkOutTime, 'currentTime:', `${currentHour}:${currentMinute}`, 'isLongTerm:', isLongTerm);

    if (variantStatus === 'inactive') {return 'maintenance';}
    if (attrStatus === 'cleaning') {return 'cleaning';}

    if (contractId && contractStartDate && contractEndDate) {
      const start = contractStartDate;
      const end = contractEndDate;

      // For short-term contracts: apply time-based check-in logic
      if (!isLongTerm) {
        // Check-in day: before check-in time
        if (today === start && currentTimeInMinutes < checkInTimeInMinutes) {
          console.log('[resolveStatus] Returning booked (check-in day, before time)');
          return 'booked';
        }

        // Check-out day: after check-out time
        if (today === end && currentTimeInMinutes >= checkOutTimeInMinutes) {
          console.log('[resolveStatus] Returning available (check-out day, after time)');
          return 'available';
        }
      }

      // Within contract period (including check-in day after time, check-out day before time)
      if (today >= start && today <= end) {
        console.log('[resolveStatus] Returning occupied');
        return 'occupied';
      } else if (today < start) {
        console.log('[resolveStatus] Returning booked');
        return 'booked';
      }
    }

    console.log('[resolveStatus] Returning available');
    return 'available';
  }

  // ── Màn hình 1: Danh sách phòng ─────────────

  /**
   * Lấy tất cả contracts của một phòng cho timeline
   */
  async getRoomContracts(variantId: string): Promise<any[]> {
    const db = DatabaseManager.get('pos');
    if (!db) {return [];}

    const rows = await QueryBuilder.table('contracts', db.getInternalDAO())
      .select([
        'contracts.id',
        'contracts.start_date',
        'contracts.end_date',
        'contracts.status',
        'contracts.metadata',
        'customers.full_name',
      ])
      .innerJoin('customers', 'contracts.customer_id = customers.id')
      .where('contracts.variant_id', variantId)
      .where('contracts.status', '!=', 'cancelled')
      .where('contracts.status', '!=', 'terminated')
      .orderBy('contracts.start_date', 'ASC')
      .get();

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    return rows.map(r => {
      let checkInTime = '';
      let checkOutTime = '';
      if (r.metadata) {
        try {
          const meta = JSON.parse(r.metadata);
          checkInTime = meta.checkin_time || '';
          checkOutTime = meta.checkout_time || '';
        } catch (e) {
          console.warn('[RoomQueryService] Error parsing metadata for contract:', r.id);
        }
      }

      // Parse check-in/check-out times
      const checkInHour = checkInTime ? parseInt(checkInTime.split(':')[0]) : 14;
      const checkInMinute = checkInTime ? parseInt(checkInTime.split(':')[1]) : 0;
      const checkInTimeInMinutes = checkInHour * 60 + checkInMinute;

      const checkOutHour = checkOutTime ? parseInt(checkOutTime.split(':')[0]) : 12;
      const checkOutMinute = checkOutTime ? parseInt(checkOutTime.split(':')[1]) : 0;
      const checkOutTimeInMinutes = checkOutHour * 60 + checkOutMinute;

      // Calculate status based on current date AND time
      let status: 'occupied' | 'booked' = 'booked';

      // Check-in day: before check-in time
      if (today === r.start_date && currentTimeInMinutes < checkInTimeInMinutes) {
        status = 'booked';
      }
      // Check-out day: after check-out time
      else if (today === r.end_date && currentTimeInMinutes >= checkOutTimeInMinutes) {
        // Past contract - don't include in timeline
        return null;
      }
      // Within contract period (including check-in day after time, check-out day before time)
      else if (today >= r.start_date && today <= r.end_date) {
        status = 'occupied';
      } else if (today > r.end_date) {
        // Past contract - don't include in timeline
        return null;
      }

      return {
        id: r.id,
        customerName: r.full_name,
        startDate: r.start_date,
        endDate: r.end_date,
        checkInTime,
        checkOutTime,
        status,
      };
    }).filter(c => c !== null);
  }

  /**
   * Lấy toàn bộ phòng (flat list) — dùng cho getRoomsGroupedByFloor
   * Bảng cần: product_variants, products, contracts, customers, prices
   * Sử dụng QueryBuilder (ORM Style) để tối ưu hóa truy vấn
   */
  async getRoomsFlatList(storeId: string): Promise<RoomGridItem[]> {
    try {
      const db = DatabaseManager.get('pos');
      if (!db) {return [];}

      // Get all rooms first
      const rows = await QueryBuilder.table('product_variants', db.getInternalDAO())
        .select([
          'product_variants.id',
          'product_variants.name',
          'product_variants.attributes',
          'product_variants.status as variant_status',
          'products.name as product_name',
          'products.id as product_id',
        ])
        .innerJoin('products', 'product_variants.product_id = products.id')
        .where('product_variants.store_id', storeId)
        .where('products.product_type', 'room')
        .whereIn('product_variants.status', ['active', 'inactive'])
        .orderBy('product_variants.name', 'ASC')
        .get();

      // Fetch contracts separately for each room to get the most relevant one
      const variantIds = rows.map((r: any) => r.id);
      let contracts: any[] = [];
      if (variantIds.length > 0) {
        contracts = await QueryBuilder.table('contracts', db.getInternalDAO())
          .select([
            'contracts.id',
            'contracts.variant_id',
            'contracts.status',
            'contracts.start_date',
            'contracts.end_date',
            'contracts.metadata',
            'customers.full_name as customer_name',
          ])
          .innerJoin('customers', 'contracts.customer_id = customers.id')
          .where('contracts.variant_id', 'in', variantIds)
          .where('contracts.status', '!=', 'cancelled')
          .where('contracts.status', '!=', 'terminated')
          .orderBy('contracts.start_date', 'ASC')
          .get();
      }

      // Match contracts to rooms - get the most relevant contract for each room
      const contractMap = new Map<string, any>();
      const today = new Date().toISOString().split('T')[0];

      for (const contract of contracts) {
        const roomId = contract.variant_id;
        const existing = contractMap.get(roomId);

        // If no contract yet, add this one
        if (!existing) {
          contractMap.set(roomId, contract);
          continue;
        }

        // If existing contract is already in the past, replace with new one
        if (existing.end_date < today && contract.start_date >= today) {
          contractMap.set(roomId, contract);
          continue;
        }

        // If new contract is in the past and existing is current/future, keep existing
        if (contract.end_date < today && existing.start_date >= today) {
          continue;
        }

        // If both are in the future, keep the earliest one
        if (contract.start_date >= today && existing.start_date >= today) {
          if (contract.start_date < existing.start_date) {
            contractMap.set(roomId, contract);
          }
          continue;
        }

        // If both are current (overlap), keep the one that ends later
        if (contract.start_date <= today && contract.end_date >= today &&
            existing.start_date <= today && existing.end_date >= today) {
          if (contract.end_date > existing.end_date) {
            contractMap.set(roomId, contract);
          }
          continue;
        }
      }

      // Lấy tất cả giá cho các variant này với unit_code
      let allPrices: any[] = [];
      if (variantIds.length > 0) {
        allPrices = await QueryBuilder.table('prices', db.getInternalDAO())
          .select([
            'prices.variant_id',
            'prices.unit_id',
            'prices.price',
            'prices.price_list_name',
            'units.unit_code',
          ])
          .innerJoin('units', 'prices.unit_id = units.id')
          .whereIn('prices.variant_id', variantIds)
          .get();

        console.log(`[RoomQueryService] Fetched ${allPrices.length} total prices for ${variantIds.length} variants`);
        if (allPrices.length > 0) {
          console.log('[RoomQueryService] Sample price record:', JSON.stringify(allPrices[0]));
        }
      }

      // Process rooms with price calculation
      const roomItems: RoomGridItem[] = [];
      for (const r of rows) {
        const attr = this.parseAttr(r.attributes);
        const contract = contractMap.get(r.id) || null;

        // Parse check-in/check-out times from contract metadata
        let checkInTime: string | undefined;
        let checkOutTime: string | undefined;
        if (contract?.metadata) {
          try {
            const meta = JSON.parse(contract.metadata);
            checkInTime = meta.checkin_time;
            checkOutTime = meta.checkout_time;
          } catch (e) {
            console.warn('[RoomQueryService] Error parsing metadata for contract:', contract.id);
          }
        }

        const status = this.resolveStatus(
          r.variant_status,
          contract?.id || null,
          contract?.start_date || null,
          contract?.end_date || null,
          attr.room_status,
          checkInTime,
          checkOutTime
        );
        const floor = this.resolveFloor(attr, r.name);

        // Lọc giá của variant này và tìm giá ưu tiên (ưu tiên giá 'default' trước)
        const variantPrices = allPrices.filter(p => p.variant_id === r.id);
        const defaultPrices = variantPrices.filter(p =>
          p.price_list_name && p.price_list_name.toLowerCase() === 'default'
        );
        const pricesToUse = defaultPrices.length > 0 ? defaultPrices : variantPrices;

        console.log(`[RoomQueryService] Room ${r.name}: variantPrices=${variantPrices.length}, defaultPrices=${defaultPrices.length}, pricesToUse=${pricesToUse.length}`);
        if (pricesToUse.length > 0) {
          console.log(`[RoomQueryService] Room ${r.name}: First price unit_code=${pricesToUse[0].unit_code}, price=${pricesToUse[0].price}`);
        }

        const priorityPrice = await RoomPriceService.getPriorityPrice(pricesToUse);
        console.log(`[RoomQueryService] Room ${r.name}: priorityPrice=${JSON.stringify(priorityPrice)}`);

        const displayPriceText = priorityPrice
          ? await RoomPriceService.formatPriceDisplay(priorityPrice.price, priorityPrice.unit_id)
          : '';

        console.log(`[RoomQueryService] Room ${r.name}: displayPriceText="${displayPriceText}"`);

        if (!displayPriceText) {
          console.log(`[RoomQueryService] Room ${r.name} has NO display price. Total prices for variant: ${variantPrices.length}`);
        }

        const mPrice = variantPrices.find(p => p.unit_code?.toUpperCase() === 'MONTH')?.price;

        roomItems.push({
          id: r.id,
          name: r.name,
          product_name: r.product_name || '',
          label: attr.room ?? r.name,
          floor,
          monthly_price: mPrice || undefined,
          status,
          contract_id: contract?.id || null,
          contract_status: contract?.status || 'inactive',
          start_date: contract?.start_date || null,
          end_date: contract?.end_date || null,
          checkInTime,  // Giờ check-in từ contract metadata
          customer_name: contract?.customer_name || '',
          borderColor: BORDER_COLORS[status],
          attributes: attr,
          product_id: r.product_id,
          displayPriceText,  // Giá hiển thị theo độ ưu tiên
          displayPriceValue: priorityPrice?.price || 0,
        });
      }

      return roomItems;
    } catch (err) {
      console.error('[RoomQueryService] getRoomsFlatList error:', err);
      return [];
    }
  }

  /**
   * Group theo tầng — dùng trực tiếp cho SectionList trên Màn hình 1
   */
  async getRoomsGroupedByFloor(
    storeId: string,
  ): Promise<Array<{ title: string; data: RoomGridItem[] }>> {
    const flat = await this.getRoomsFlatList(storeId);
    const byFloor: Record<string, RoomGridItem[]> = {};

    for (const room of flat) {
      const key = room.floor !== '?' ? `Tầng ${room.floor}` : 'Khác';
      if (!byFloor[key]) {byFloor[key] = [];}
      byFloor[key].push(room);
    }

    return Object.keys(byFloor)
      .sort((a, b) => {
        if (a === 'Khác') {return 1;}
        if (b === 'Khác') {return -1;}
        return a.localeCompare(b, undefined, { numeric: true });
      })
      .map(title => ({ title, data: byFloor[title] }));
  }

  // ── Màn hình 3: Chi tiết phòng ──────────────

  /**
   * Lấy đầy đủ thông tin phòng đang có khách
   * Bảng cần: product_variants, products, contracts, customers,
   *           bills, bill_details
   */
  async getRoomDetails(variantId: string): Promise<RoomDetailInfo | null> {
    // 1. Variant
    const variant = await this.variantSvc.findById(variantId);
    if (!variant) {return null;}
    const attr = this.parseAttr(variant.attributes);

    // 2. Product (tên loại phòng)
    const product = await this.productSvc.findById(variant.product_id);

    // 3. Hợp đồng active - tìm với nhiều status khác nhau
    const contracts = await this.contractSvc.findAll(
      { variant_id: variantId },
    );
    // Lọc contract không bị cancelled hoặc terminated
    const activeContracts = contracts.filter(c => c.status !== 'cancelled' && c.status !== 'terminated');
    // Lấy contract mới nhất (sắp xếp theo created_at DESC)
    const contract = activeContracts.length > 0 ? activeContracts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] : null;

    // 4. Khách hàng
    let customer: any = null;
    if (contract?.customer_id) {
      customer = await this.customerSvc.findById(contract.customer_id);
    }

    // 5. Bill hiện tại (cycle bill kỳ hiện tại của hợp đồng)
    let currentBill: any = null;
    let billItems: BillDetailItem[] = [];
    const today = new Date().toISOString().split('T')[0];

    if (contract?.id) {
      const db = DatabaseManager.get('pos');
      const billRows = await QueryBuilder.table('bills', db!.getInternalDAO())
        .where('ref_id', contract.id)
        .where('ref_type', 'contract')
        .where('bill_type', '!=', 'deposit')
        .whereIn('bill_type', ['rent', 'cycle', 'hotel'])
        .whereIn('bill_status', ['draft', 'partial', 'overdue', 'issued', 'paid'])
        .orderBy('created_at', 'DESC')
        .limit(1)
        .get();

      currentBill = billRows.length > 0 ? billRows[0] : null;

      if (currentBill?.id) {
        const details = await this.billDetailSvc.findAll(
          { bill_id: currentBill.id },
          { orderBy: [{ name: 'sort_order', order: 'ASC' }] },
        );
        billItems = details.map((d: any): BillDetailItem => ({
          id: d.id,
          line_description: d.line_description ?? '',
          quantity: d.quantity ?? 1,
          unit_price: d.unit_price ?? 0,
          reading_from: d.reading_from,
          reading_to: d.reading_to,
          amount: d.amount ?? 0,
        }));
      }
    }

    // 6. Khoản dư âm kỳ trước (adjustment âm pending)
    let negativeBalance = 0;
    if (contract?.id) {
      const db = DatabaseManager.get('pos');
      const adjResult = await QueryBuilder.table('receivables', db!.getInternalDAO())
        .select(['SUM(amount) as total'])
        .where('contract_id', contract.id)
        .where('receivable_type', 'adjustment')
        .where('amount', '<', 0)
        .where('status', 'pending')
        .first();
      negativeBalance = adjResult?.total || 0;
    }

    // 7. Chi tiết Lịch sử Hợp đồng (Tổng nợ, Tổng trả, Lịch sử Bill)
    let totalPayable = 0;
    let totalPaid = 0;
    let historyBills: any[] = [];

    if (contract?.id) {
      const db = DatabaseManager.get('pos');
      const dao = db!.getInternalDAO();

      // a. Tổng Phải thu (receivables.status != cancelled)
      const payResult = await QueryBuilder.table('receivables', dao)
        .select(['SUM(amount) as total'])
        .where('contract_id', contract.id)
        .where('status', '!=', 'cancelled')
        .first();
      totalPayable = payResult?.total || 0;

      // b. Tổng Đã trả (payments.status = success)
      const paidResult = await QueryBuilder.table('payments', dao)
        .select(['SUM(payments.amount) as total'])
        .leftJoin('bills', 'payments.bill_id = bills.id')
        .where('bills.ref_id', contract.id)
        .where('bills.ref_type', 'contract')
        .where('payments.status', 'success')
        .first();
      totalPaid = paidResult?.total || 0;

      // c. Danh sách Bills lịch sử
      const billRows = await QueryBuilder.table('bills', dao)
        .where('ref_id', contract.id)
        .where('ref_type', 'contract')
        .orderBy('cycle_period_from', 'DESC')
        .get();

      historyBills = billRows || [];
    }

    let metaDataObj: any = {};
    if (contract?.metadata) {
      try {
        metaDataObj = JSON.parse(contract.metadata);
      } catch (e) {
        console.warn('[RoomQueryService] Parse metadata error:', e);
      }
    }

    return {
      variant_id: variant.id,
      variant_name: variant.name,
      room_code: attr.room ?? variant.name,
      floor: attr.floor,
      beds: attr.beds,
      view: attr.view,
      area_m2: attr.area_m2,
      product_name: product?.name ?? '',
      contract_id: contract?.id,
      contract_status: contract?.status,
      contract_type: contract?.contract_type,
      start_date: contract?.start_date,
      end_date: contract?.end_date,
      rent_amount: contract?.rent_amount,
      electric_rate: contract?.electric_rate,
      water_rate: contract?.water_rate,
      electric_reading_init: contract?.electric_reading_init,
      water_reading_init: contract?.water_reading_init,
      billing_day: contract?.billing_day,
      customer_name: customer?.full_name,
      customer_phone: customer?.phone,
      cccd: customer?.id_number,
      current_bill_id: currentBill?.id,
      current_bill_status: currentBill?.bill_status,
      bill_items: billItems,
      total_amount: currentBill?.total_amount,
      paid_amount: currentBill?.paid_amount ?? 0,
      remaining_amount: currentBill?.remaining_amount ?? 0,
      metadata: contract?.metadata,
      check_in_time: metaDataObj.checkin_time,
      check_out_time: metaDataObj.checkout_time,
      adults: metaDataObj.adults,
      children: metaDataObj.children,
      negative_balance: negativeBalance,
      total_payable: totalPayable,
      total_paid: totalPaid,
      balance: totalPayable - totalPaid,
      history_bills: historyBills,
    };
  }

  // ── Đổi phòng: danh sách phòng trống ────────

  /**
   * Màn hình Đổi phòng — lấy danh sách phòng trống, group theo tầng
   * Bảng cần: product_variants, products, contracts, prices
   */
  async getAvailableRooms(
    storeId: string,
    excludeVariantId?: string,
  ): Promise<Array<{ title: string; data: AvailableRoomItem[] }>> {
    try {
      const db = DatabaseManager.get('pos');
      if (!db) {return [];}

      // 1. Lấy variants loại 'room' và không có hợp đồng active
      const rows = await QueryBuilder.table('product_variants', db.getInternalDAO())
        .select([
          'product_variants.id',
          'product_variants.name',
          'product_variants.product_id',
          'product_variants.attributes',
          'products.name as product_name',
        ])
        .innerJoin('products', 'product_variants.product_id = products.id')
        .leftJoin('contracts', 'product_variants.id = contracts.variant_id AND contracts.status = "active"')
        .where('product_variants.store_id', storeId)
        .where('product_variants.status', 'active')
        .where('products.product_type', 'room')
        .whereNull('contracts.id') // Chỉ lấy phòng trống (không có hợp đồng active)
        .get();

      // Lấy tất cả giá cho các variant này với unit_code
      const variantIds = rows.map((r: any) => r.id);
      let allPrices: any[] = [];
      if (variantIds.length > 0) {
        allPrices = await QueryBuilder.table('prices', db.getInternalDAO())
          .select([
            'prices.variant_id',
            'prices.unit_id',
            'prices.price',
            'prices.price_list_name',
            'units.unit_code',
          ])
          .innerJoin('units', 'prices.unit_id = units.id')
          .whereIn('prices.variant_id', variantIds)
          .get();
      }

      // 2. Lọc loại trừ variant hiện tại và Group theo tầng
      const byFloor: Record<string, AvailableRoomItem[]> = {};

      for (const r of rows) {
        if (r.id === excludeVariantId) {continue;}

        const attr = this.parseAttr(r.attributes);
        const floor = this.resolveFloor(attr, r.name);
        const key = floor !== '?' ? `Tầng ${floor}` : 'Khác';

        // Tìm giá ưu tiên
        const variantPrices = allPrices.filter(p => p.variant_id === r.id);
        const defaultPrices = variantPrices.filter(p =>
          p.price_list_name && p.price_list_name.toLowerCase() === 'default'
        );
        const pricesToUse = defaultPrices.length > 0 ? defaultPrices : variantPrices;

        const priorityPrice = await RoomPriceService.getPriorityPrice(pricesToUse);
        const displayPriceText = priorityPrice
          ? await RoomPriceService.formatPriceDisplay(priorityPrice.price, priorityPrice.unit_id)
          : '';

        const mPrice = variantPrices.find(p => p.unit_code?.toUpperCase() === 'MONTH')?.price;

        if (!byFloor[key]) {byFloor[key] = [];}
        byFloor[key].push({
          id: r.id,
          name: attr.room ?? r.name,
          floor,
          monthly_price: mPrice || undefined,
          product_id: r.product_id,
          product_name: r.product_name || '',
          attributes: attr,
          displayPriceText,
          displayPriceValue: priorityPrice?.price || 0,
        });
      }

      return Object.keys(byFloor)
        .sort((a, b) => {
          if (a === 'Khác') {return 1;}
          if (b === 'Khác') {return -1;}
          return a.localeCompare(b, undefined, { numeric: true });
        })
        .map(title => ({ title, data: byFloor[title] }));
    } catch (err) {
      console.error('[RoomQueryService] getAvailableRooms error:', err);
      return [];
    }
  }
}

// ─────────────────────────────────────────────
//  Singleton export
// ─────────────────────────────────────────────

export const RoomQueryService = new RoomQueryServiceClass();
export default RoomQueryService;
