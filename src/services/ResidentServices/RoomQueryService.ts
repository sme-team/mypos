import { QueryBuilder } from '@dqcai/sqlite';
import DatabaseManager from '../../database/DBManagers';
import { BaseService } from '../BaseService';

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────

export type RoomStatus = 'available' | 'occupied' | 'cleaning' | 'maintenance';

/** Shape trả về cho 1 ô phòng trên Grid (Màn hình 1) */
export interface RoomGridItem {
  id: string;               // product_variants.id
  name: string;             // tên phòng hiển thị (attr.room || variant.name)
  product_name: string;      // tên loại phòng (products.name)
  label: string;
  floor: string;            // lấy từ attributes.floor
  price: number;            // prices.price
  status: RoomStatus;
  contract_id: string | null;
  contract_status: string;
  end_date: string | null;  // contracts.end_date → badge "Hết hạn"
  start_date: string | null; // contracts.start_date
  customer_name: string;
  borderColor: string;
  attributes: Record<string, any>;
  product_id: string;
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
  metadata?: string; // contracts.metadata
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
  price: number;
  product_id: string;
  attributes: Record<string, any>;
}

// ─────────────────────────────────────────────
//  Màu theo trạng thái
// ─────────────────────────────────────────────

const BORDER_COLORS: Record<RoomStatus, string> = {
  available: '#4CAF50',
  occupied: '#FF4444',
  cleaning: '#FFA726',
  maintenance: '#9E9E9E',
};

// ─────────────────────────────────────────────
//  Base services (mỗi bảng 1 class)
// ─────────────────────────────────────────────

class ProductVariantService extends BaseService {
  constructor() { super('mypos', 'product_variants'); }
}

class ProductService extends BaseService {
  constructor() { super('mypos', 'products'); }
}

class PriceService extends BaseService {
  constructor() { super('mypos', 'prices'); }
}

class ContractService extends BaseService {
  constructor() { super('mypos', 'contracts'); }
}

class CustomerBaseService extends BaseService {
  constructor() { super('mypos', 'customers'); }
}

class BillService extends BaseService {
  constructor() { super('mypos', 'bills'); }
}

class BillDetailService extends BaseService {
  constructor() { super('mypos', 'bill_details'); }
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
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try { return JSON.parse(raw); } catch { return {}; }
  }

  private resolveFloor(attr: Record<string, any>, name: string): string {
    if (attr.floor != null) return String(attr.floor);
    const m = String(name || '').match(/\d/);
    return m ? m[0] : '?';
  }

  private resolveStatus(
    variantStatus: string,
    contractId: string | null,
    attrStatus?: string,
  ): RoomStatus {
    if (variantStatus === 'inactive') return 'maintenance';
    if (attrStatus === 'cleaning') return 'cleaning';
    if (contractId) return 'occupied';
    return 'available';
  }

  // ── Màn hình 1: Danh sách phòng ─────────────

  /**
   * Lấy toàn bộ phòng (flat list) — dùng cho getRoomsGroupedByFloor
   * Bảng cần: product_variants, products, contracts, customers, prices
   * Sử dụng QueryBuilder (ORM Style) để tối ưu hóa truy vấn
   */
  async getRoomsFlatList(storeId: string): Promise<RoomGridItem[]> {
    try {
      const db = DatabaseManager.get('mypos');
      if (!db) return [];

      const rows = await QueryBuilder.table('product_variants', db.getInternalDAO())
        .select([
          'product_variants.id',
          'product_variants.name',
          'product_variants.attributes',
          'product_variants.status as variant_status',
          'products.name as product_name',
          'products.id as product_id',
          'prices.price',
          'contracts.id as contract_id',
          'contracts.status as contract_status',
          'contracts.start_date',
          'contracts.end_date',
          'customers.full_name as customer_name'
        ])
        .innerJoin('products', 'product_variants.product_id = products.id')
        .leftJoin('prices', 'product_variants.id = prices.variant_id AND prices.price_list_name = "default" AND prices.effective_to IS NULL')
        .leftJoin('contracts', 'product_variants.id = contracts.variant_id AND contracts.status = "active"')
        .leftJoin('customers', 'contracts.customer_id = customers.id')
        .where('product_variants.store_id', storeId)
        .where('products.product_type', 'room')
        .whereIn('product_variants.status', ['active', 'inactive'])
        .orderBy('product_variants.name', 'ASC')
        .get();

      return rows.map((r: any): RoomGridItem => {
        const attr = this.parseAttr(r.attributes);
        const status = this.resolveStatus(r.variant_status, r.contract_id, attr.room_status);
        const floor = this.resolveFloor(attr, r.name);

        return {
          id: r.id,
          name: r.name,
          product_name: r.product_name || '',
          label: attr.room ?? r.name,
          floor,
          price: r.price || 0,
          status,
          contract_id: r.contract_id || null,
          contract_status: r.contract_status || 'inactive',
          start_date: r.start_date || null,
          end_date: r.end_date || null,
          customer_name: r.customer_name || '',
          borderColor: BORDER_COLORS[status],
          attributes: attr,
          product_id: r.product_id,
        };
      });
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
      if (!byFloor[key]) byFloor[key] = [];
      byFloor[key].push(room);
    }

    return Object.keys(byFloor)
      .sort((a, b) => {
        if (a === 'Khác') return 1;
        if (b === 'Khác') return -1;
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
    if (!variant) return null;
    const attr = this.parseAttr(variant.attributes);

    // 2. Product (tên loại phòng)
    const product = await this.productSvc.findById(variant.product_id);

    // 3. Hợp đồng active
    const contracts = await this.contractSvc.findAll(
      { variant_id: variantId, status: 'active' },
    );
    const contract = contracts.length > 0 ? contracts[0] : null;

    // 4. Khách hàng
    let customer: any = null;
    if (contract?.customer_id) {
      customer = await this.customerSvc.findById(contract.customer_id);
    }

    // 5. Bill hiện tại (cycle bill gần nhất của hợp đồng)
    let currentBill: any = null;
    let billItems: BillDetailItem[] = [];

    if (contract?.id) {
      const bills = await this.billSvc.findAll(
        { ref_id: contract.id, ref_type: 'contract' },
        { orderBy: [{ name: 'created_at', order: 'DESC' }], limit: 1 },
      );
      currentBill = bills.length > 0 ? bills[0] : null;

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
      start_date: contract?.start_date,
      end_date: contract?.end_date,
      rent_amount: contract?.rent_amount,
      electric_rate: contract?.electric_rate,
      water_rate: contract?.water_rate,
      electric_reading_init: contract?.electric_reading_init,
      water_reading_init: contract?.water_reading_init,
      customer_name: customer?.full_name,
      customer_phone: customer?.phone,
      cccd: customer?.id_number,
      current_bill_id: currentBill?.id,
      current_bill_status: currentBill?.bill_status,
      bill_items: billItems,
      total_amount: currentBill?.total_amount,
      metadata: contract?.metadata,
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
      const db = DatabaseManager.get('mypos');
      if (!db) return [];

      // 1. Lấy variants loại 'room' và không có hợp đồng active
      const rows = await QueryBuilder.table('product_variants', db.getInternalDAO())
        .select([
          'product_variants.id',
          'product_variants.name',
          'product_variants.product_id',
          'product_variants.attributes',
          'prices.price'
        ])
        .innerJoin('products', 'product_variants.product_id = products.id')
        .leftJoin('prices', 'product_variants.id = prices.variant_id AND prices.price_list_name = "default" AND prices.effective_to IS NULL')
        .leftJoin('contracts', 'product_variants.id = contracts.variant_id AND contracts.status = "active"')
        .where('product_variants.store_id', storeId)
        .where('product_variants.status', 'active')
        .where('products.product_type', 'room')
        .whereIn('contracts.id', [null]) // Chỉ lấy phòng trống (không có hợp đồng active)
        .get();

      // 2. Lọc loại trừ variant hiện tại và Group theo tầng
      const byFloor: Record<string, AvailableRoomItem[]> = {};

      for (const r of rows) {
        if (r.id === excludeVariantId) continue;

        const attr = this.parseAttr(r.attributes);
        const floor = this.resolveFloor(attr, r.name);
        const key = floor !== '?' ? `Tầng ${floor}` : 'Khác';

        if (!byFloor[key]) byFloor[key] = [];
        byFloor[key].push({
          id: r.id,
          name: attr.room ?? r.name,
          floor,
          price: r.price || 0,
          product_id: r.product_id,
          attributes: attr,
        });
      }

      return Object.keys(byFloor)
        .sort((a, b) => {
          if (a === 'Khác') return 1;
          if (b === 'Khác') return -1;
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