import {QueryBuilder} from '@dqcai/sqlite';
import DatabaseManager from '../../database/DBManagers';
import {createModuleLogger, AppModules} from '../../logger';

import {BaseService} from '../BaseService';
import {generateSequentialId} from '../../utils';

// ─────────────────────────────────────────────
//  Interfaces
// ─────────────────────────────────────────────

export interface Customer {
  id?: string;
  store_id: string;
  customer_code?: string;
  full_name: string;
  id_number?: string; // CCCD / CMND / Passport
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  phone?: string;
  email?: string;
  address?: string;
  nationality?: string;
  customer_group?: 'regular' | 'vip' | 'wholesale' | 'corporate' | 'staff';
  loyalty_points?: number;
  total_spent?: number;
  notes?: string;
  metadata?: string; // JSON string
  status?: 'active' | 'inactive' | 'blacklisted';
  sync_status?: 'local' | 'synced' ;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface Resident {
  id?: string;
  store_id: string;
  customer_id: string;
  hometown?: string;
  occupation?: string;
  workplace?: string;
  id_card_front_url?: string;
  id_card_back_url?: string;
  portrait_url?: string;
  temp_residence_from?: string;
  temp_residence_to?: string;
  temp_residence_status?: 'pending' | 'approved' | 'expired' | 'cancelled';
  police_ref_number?: string;
  approved_by?: string;
  approved_date?: string;
  note?: string;
  status?: number; // 1 = active, 0 = inactive
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

//  CustomerService — kế thừa BaseService
// ─────────────────────────────────────────────

export class CustomerServiceClass extends BaseService {
  constructor() {
    super('pos', 'customers');
  }

  protected _validateData(data: Partial<Customer>): void {
    super._validateData(data);
    if (data.full_name !== undefined && typeof data.full_name !== 'string') {
      throw new Error('full_name must be a string');
    }
    if (data.phone !== undefined && typeof data.phone !== 'string') {
      throw new Error('phone must be a string');
    }
    if (
      data.status !== undefined &&
      !['active', 'inactive', 'blacklisted'].includes(data.status)
    ) {
      throw new Error('Invalid status value');
    }
    if (
      data.customer_group !== undefined &&
      !['regular', 'vip', 'wholesale', 'corporate', 'staff'].includes(
        data.customer_group,
      )
    ) {
      throw new Error('Invalid customer_group value');
    }
  }

  // ── CRUD helpers ──────────────────────────────

  async create(data: Customer): Promise<Customer> {
    const id = await generateSequentialId(this, 'cust');
    const now = new Date().toISOString();
    return super.create({
      ...data,
      id,
      customer_code: data.customer_code ?? `C-${id}`,
      nationality: data.nationality ?? 'VN',
      customer_group: data.customer_group ?? 'regular',
      loyalty_points: data.loyalty_points ?? 0,
      total_spent: data.total_spent ?? 0,
      status: data.status ?? 'active',
      sync_status: 'local',
      created_at: now,
      updated_at: now,
    });
  }

  async update(id: string, data: Partial<Customer>): Promise<Customer> {
    return super.update(id, {
      ...data,
      updated_at: new Date().toISOString(),
    });
  }

  // ── Queries theo màn hình UI ──────────────────

  /**
   * Màn hình 2A – Chọn khách hàng cũ (dropdown / search)
   * Trả về: id, full_name, phone, id_number
   */
  async getCustomerPickerList(
    storeId: string,
  ): Promise<Pick<Customer, 'id' | 'full_name' | 'phone' | 'id_number'>[]> {
    const rows = await this.findAll(
      {store_id: storeId, status: 'active'},
      {
        columns: ['id', 'full_name', 'phone', 'id_number'],
        orderBy: [{name: 'full_name', order: 'ASC'}],
      },
    );
    return rows as Pick<Customer, 'id' | 'full_name' | 'phone' | 'id_number'>[];
  }

  /**
   * Màn hình 3 – Lấy thông tin khách để chỉnh sửa
   */
  async getCustomerById(id: string): Promise<Customer | null> {
    return this.findById(id);
  }

  /**
   * Tìm kiếm khách theo tên / SĐT / CCCD (dùng cho search box)
   */
  async searchCustomers(
    storeId: string,
    keyword: string,
  ): Promise<Pick<Customer, 'id' | 'full_name' | 'phone' | 'id_number'>[]> {
    // Dùng findAll rồi filter phía JS vì BaseService chưa hỗ trợ LIKE
    const all = await this.findAll(
      {store_id: storeId, status: 'active'},
      {columns: ['id', 'full_name', 'phone', 'id_number']},
    );
    const kw = keyword.toLowerCase();
    return all.filter(
      c =>
        c.full_name?.toLowerCase().includes(kw) ||
        c.phone?.includes(kw) ||
        c.id_number?.includes(kw),
    );
  }

  /**
   * Màn hình 2B – Tạo khách mới (khách ngắn hạn, chưa có trong hệ thống)
   * Lưu đồng thời customers + residents trong 1 transaction
   */
  async createNewCustomerWithResident(
    storeId: string,
    customerData: Pick<Customer, 'full_name' | 'phone' | 'id_number'>,
    residentData?: Pick<
      Resident,
      'id_card_front_url' | 'id_card_back_url' | 'portrait_url'
    >,
  ): Promise<{customerId: string}> {
    return this.executeTransaction(async () => {
      // 1. Tạo customer
      const customer = await this.create({
        store_id: storeId,
        full_name: customerData.full_name,
        phone: customerData.phone,
        id_number: customerData.id_number,
      });

      // 2. Tạo resident bổ sung (nếu có ảnh CCCD / thông tin tạm trú)
      await residentService.create({
        store_id: storeId,
        customer_id: customer.id!,
        id_card_front_url: residentData?.id_card_front_url ?? '',
        id_card_back_url: residentData?.id_card_back_url ?? '',
        portrait_url: residentData?.portrait_url ?? '',
        temp_residence_status: 'pending',
        status: 1,
      });

      return {customerId: customer.id!};
    });
  }

  /**
   * Màn hình 3 – Cập nhật thông tin khách thuê (full_name, phone, id_number)
   */
  async updateCustomerInfo(
    customerId: string,
    data: Pick<Customer, 'full_name' | 'phone' | 'id_number'>,
  ): Promise<Customer> {
    return this.update(customerId, data);
  }
}

// ─────────────────────────────────────────────
//  ResidentService — kế thừa BaseService
// ─────────────────────────────────────────────

export class ResidentServiceClass extends BaseService {
  constructor() {
    super('pos', 'residents');
  }

  async create(data: Resident): Promise<Resident> {
    const id = await generateSequentialId(this, 'res');
    const now = new Date().toISOString();
    return super.create({
      ...data,
      id,
      temp_residence_status: data.temp_residence_status ?? 'pending',
      status: data.status ?? 1,
      sort_order: data.sort_order ?? 0,
      created_at: now,
    });
  }

  async update(id: string, data: Partial<Resident>): Promise<Resident> {
    return super.update(id, {
      ...data,
      updated_at: new Date().toISOString(),
    });
  }

  /** Lấy thông tin cư dân theo customer_id */
  async getByCustomerId(customerId: string): Promise<Resident | null> {
    const rows = await this.findAll({customer_id: customerId, status: 1});
    return rows.length > 0 ? rows[0] : null;
  }

  /** Cập nhật ảnh CCCD sau khi quét */
  async updateIdCardImages(
    residentId: string,
    data: Pick<Resident, 'id_card_front_url' | 'id_card_back_url'>,
  ): Promise<Resident> {
    return this.update(residentId, data);
  }
}

// ─────────────────────────────────────────────
//  Singleton exports
// ─────────────────────────────────────────────

export const residentService = new ResidentServiceClass();
export const customerService = new CustomerServiceClass();

export default customerService;
