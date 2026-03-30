import DatabaseManager from '../../database/DBManagers';
import { createModuleLogger, AppModules } from '../../logger';
import { Room, RoomStatus } from '../../screens/pos/types';

const logger = createModuleLogger(AppModules.DATABASE);

/**
 * Interface cho chi tiết phòng (dùng cho màn hình RoomDetail)
 * TRÁNH DÙNG ANY - Cung cấp dữ liệu đã được xử lý sẵn cho UI
 */
export interface RoomDetailInfo {
  id: string;
  name: string;
  room_code: string;
  status: string;
  status_label: string;
  floor?: number | string;
  beds?: string;
  view?: string;
  area_m2?: number;
  customer_name?: string;
  customer_phone?: string;
  cccd?: string;
  rent_amount?: number;
  contract_id?: string;
  start_date?: string;
  end_date?: string;
  latest_bill?: any;
  // Các chỉ số dịch vụ (Service cung cấp sẵn, UI không cần tính hay parse)
  electric_index?: number;
  water_index?: number;
  services?: Array<{ name: string; price: number; unit: string }>;
}

// Mapping from DB status to UI status
const STATUS_MAP: Record<string, RoomStatus> = {
  'available': 'available',
  'vacant': 'available',
  'occupied': 'occupied',
  'booked': 'occupied',
  'booked_online': 'occupied',
  'cleaning': 'cleaning',
};

// Default border colors based on status
const BORDER_COLORS: Record<RoomStatus, string> = {
  'available': '#4CAF50',
  'occupied': '#FF4444',
  'cleaning': '#FFA726',
  'maintenance': '#9E9E9E',
};

export const RoomQueryService = {
  /**
   * Lấy danh sách phòng phẳng (Flat List) - Dùng cho màn hình Quản lý
   */
  async getRoomsFlatList(storeId: string): Promise<any[]> {
    try {
      const db = DatabaseManager.get('mypos');
      if (!db) {
        console.error('[RoomQueryService] Database "mypos" not found');
        return [];
      }

      // 1. Sử dụng JOIN SQL để lấy dữ liệu chính xác và hiệu năng cao
      // Xử lý deleted_at is null hoặc empty string để tránh bỏ sót dữ liệu
      const sql = `
        SELECT 
          v.id, 
          v.name, 
          v.attributes, 
          v.status AS variant_status,
          p.product_type,
          c.id AS contract_id,
          c.end_date,
          c.status AS contract_status,
          cu.full_name AS customer_name,
          pr.price
        FROM product_variants v
        JOIN products p ON v.product_id = p.id
        LEFT JOIN contracts c ON c.variant_id = v.id AND (c.status = 'active' OR c.status = 'pending')
        LEFT JOIN customers cu ON c.customer_id = cu.id
        LEFT JOIN prices pr ON pr.variant_id = v.id AND pr.status = 'active'
        WHERE p.product_type = 'room'
          AND v.store_id = ?
          AND (v.deleted_at IS NULL OR v.deleted_at = '')
          AND (p.deleted_at IS NULL OR p.deleted_at = '')
      `;

      const rows = await db.getRsts(sql, [storeId]);
      
      console.log(`[RoomQueryService] Found ${rows.length} room records for store ${storeId}`);

      const flatRooms = rows.map(r => {
        let attr: any = {};
        try {
          attr = r.attributes ? JSON.parse(r.attributes) : {};
        } catch (e) {
          console.warn(`[RoomQueryService] Failed to parse attributes for variant ${r.id}`);
        }
        
        // Logic xác định trạng thái phòng
        let status: RoomStatus = 'available';
        if (r.variant_status === 'inactive') {
          status = 'maintenance';
        } else if (r.contract_id) {
          status = 'occupied';
        }

        // Trích xuất tầng từ attr hoặc từ tên phòng (ví dụ P.101 -> tầng 1)
        let floorNum = attr.floor != null ? String(attr.floor) : null;
        if (!floorNum) {
          const nameMatch = String(r.name || '').match(/\d/);
          floorNum = nameMatch ? nameMatch[0] : '?';
        }

        return {
          id: r.id,
          name: r.name,
          label: attr.room || r.name,
          status: status,
          contract_status: r.contract_status || 'inactive',
          price: r.price || 0,
          floor: floorNum,
          customer_name: r.customer_name || '',
          contract_id: r.contract_id,
          end_date: r.end_date || null,
          attributes: attr,
          borderColor: BORDER_COLORS[status] || BORDER_COLORS.available
        };
      });

      return flatRooms;
    } catch (err) {
      logger.error('[RoomQueryService] getRoomsFlatList error:', err);
      return [];
    }
  },

  /**
   * Lấy danh sách phòng hiển thị trên Grid POS (phân loại theo tầng)
   */
  async getRoomsGroupedByFloor(storeId: string): Promise<any[]> {
    const flatRooms = await this.getRoomsFlatList(storeId);
    const roomsByFloor: Record<string, any[]> = {};

    for (const room of flatRooms) {
      const floorKey = room.floor !== '?' ? `Tầng ${room.floor}` : 'Khác';
      if (!roomsByFloor[floorKey]) roomsByFloor[floorKey] = [];

      roomsByFloor[floorKey].push({
        ...room,
        tag: room.contract_status === 'active' ? `Hết hạn: ${room.end_date || '---'}` : `Checkout: 12:00`,
        customer_name: room.customer_name || 'Sẵn sàng'
      });
    }

    const sortedFloors = Object.keys(roomsByFloor).sort((a, b) => {
      if (a === 'Khác') return 1;
      if (b === 'Khác') return -1;
      return a.localeCompare(b, undefined, { numeric: true });
    });

    return sortedFloors.map(floor => ({
      title: floor,
      data: roomsByFloor[floor]
    }));
  },

  /**
   * @deprecated Dùng getRoomsGroupedByFloor hoặc getRoomsFlatList
   */
  async getRooms(storeId: string = 'store-001'): Promise<any> {
    return this.getRoomsGroupedByFloor(storeId);
  },

  /**
   * Lấy chi tiết phòng đang có khách (Dùng sequential fetch)
   */
  async getRoomDetails(variantId: string): Promise<RoomDetailInfo | null> {
    try {
      const db = DatabaseManager.get('mypos');
      if (!db) return null;

      const sql = `
        SELECT 
          v.id, 
          v.name, 
          v.attributes, 
          v.status AS variant_status,
          c.id AS contract_id,
          c.start_date,
          c.end_date,
          c.rent_amount,
          cu.full_name AS customer_name,
          cu.phone AS customer_phone,
          cu.id_number AS cccd
        FROM product_variants v
        JOIN products p ON v.product_id = p.id
        LEFT JOIN contracts c ON c.variant_id = v.id AND (c.status = 'active' OR c.status = 'pending')
        LEFT JOIN customers cu ON c.customer_id = cu.id
        WHERE v.id = ?
          AND (v.deleted_at IS NULL OR v.deleted_at = '')
      `;

      const r = await db.getRst(sql, [variantId]);
      if (!r) return null;

      // Fetch latest bill separately to keep JOIN simple
      let latestBill = null;
      if (r.contract_id) {
        const bills = await db.selectAll({
          name: 'bills',
          cols: [],
          wheres: [
            { name: 'ref_id', value: r.contract_id },
            { name: 'ref_type', value: 'contract' }
          ]
        });
        if (bills && bills.length > 0) {
          latestBill = bills.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        }
      }

      const attr: any = r.attributes ? JSON.parse(r.attributes) : {};

      return {
        id: r.id,
        name: r.name,
        room_code: attr.room || r.name,
        status: r.variant_status,
        status_label: r.variant_status === 'inactive' ? 'Bảo trì' : r.contract_id ? 'Đang thuê' : 'Trống',
        floor: attr.floor,
        beds: attr.beds,
        view: attr.view,
        area_m2: attr.area_m2,
        customer_name: r.customer_name,
        customer_phone: r.customer_phone,
        cccd: r.cccd,
        rent_amount: r.rent_amount,
        contract_id: r.contract_id,
        start_date: r.start_date,
        end_date: r.end_date,
        latest_bill: latestBill,
        electric_index: attr.electric_index || 0,
        water_index: attr.water_index || 0
      };
    } catch (err) {
      logger.error('[RoomQueryService] getRoomDetails error:', err);
      return null;
    }
  },

  /**
   * Lấy danh sách các phòng trống (để đổi phòng)
   */
  async getAvailableRooms(storeId: string, excludeId?: string): Promise<any[]> {
    try {
      const db = DatabaseManager.get('mypos');
      if (!db) return [];

      // Lấy tất cả các phòng đang KHÔNG có hợp đồng active, status active
      const sql = `
        SELECT 
          v.id, 
          v.name, 
          v.attributes,
          pr.price
        FROM product_variants v
        JOIN products p ON v.product_id = p.id
        LEFT JOIN contracts c ON c.variant_id = v.id AND (c.status = 'active' OR c.status = 'pending')
        LEFT JOIN prices pr ON pr.variant_id = v.id AND pr.status = 'active'
        WHERE p.product_type = 'room'
          AND v.store_id = ?
          AND v.status = 'active'
          AND c.id IS NULL
          AND (v.deleted_at IS NULL OR v.deleted_at = '')
          AND (p.deleted_at IS NULL OR p.deleted_at = '')
      `;
      
      let rows = await db.getRsts(sql, [storeId]);
      
      if (excludeId) {
        rows = rows.filter(r => r.id !== excludeId);
      }

      return rows.map(r => {
        let attr: any = {};
        try {
          attr = r.attributes ? JSON.parse(r.attributes) : {};
        } catch (e) {
          console.warn(`[RoomQueryService] Failed to parse attributes for variant ${r.id}`);
        }
        
        return {
          id: r.id,
          name: attr.room || r.name,
          floor: attr.floor || '?',
          price: r.price || 0,
          attributes: attr
        };
      });
    } catch (err) {
      logger.error('[RoomQueryService] getAvailableRooms error:', err);
      return [];
    }
  }
};
