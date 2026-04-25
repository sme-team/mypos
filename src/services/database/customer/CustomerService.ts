/**
 * CustomerService.ts
 *
 * Covers ALL data needs of:
 *  - CustomerScreen   (list, bulk delete)
 *  - AddCustomer      (create, duplicate phone check)
 *  - CustomerDetail   (get, update, avatar, bills, contract)
 *
 * ⚠️  FIX: Tất cả query dùng QueryBuilder trực tiếp (như PosQueryService)
 *          thay vì BaseService.findAll() để tránh bug `deleted_at = NULL`
 *          (phải là IS NULL).
 */

import {QueryBuilder} from '@dqcai/sqlite';
import DatabaseManager from '../../../database/DBManagers';
import {generateSequentialId} from '../../../utils';

// ═══════════════════════════════════════════════════════════════════════════════
// Internal DAO helper (chỉ dùng cho generateSequentialId + transaction)
// ═══════════════════════════════════════════════════════════════════════════════

import {BaseService} from '../../BaseService';

class CustomerDAO extends BaseService {
  constructor() {
    super('pos', 'customers');
  }
}

class BillDAO extends BaseService {
  constructor() {
    super('pos', 'bills');
  }
}

class ContractDAO extends BaseService {
  constructor() {
    super('pos', 'contracts');
  }
}

class ResidentDAO extends BaseService {
  constructor() {
    super('pos', 'residents');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export type CustomerStatus = 'active' | 'inactive' | 'blacklisted';
export type CustomerGroup =
  | 'regular'
  | 'vip'
  | 'wholesale'
  | 'corporate'
  | 'staff';
export type CustomerGender = 'male' | 'female' | 'other';
export type BillStatus =
  | 'draft'
  | 'issued'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'refunded';
export type ContractStatus = 'pending' | 'active' | 'expired' | 'terminated';

// ── Customer ──────────────────────────────────────────────────────────────────

export interface CustomerInput {
  store_id: string;
  full_name: string;
  phone: string;
  id_number?: string | null;
  date_of_birth?: string | null;
  gender?: CustomerGender | null;
  email?: string | null;
  address?: string | null;
  nationality?: string;
  customer_group?: CustomerGroup;
  notes?: string | null;
  imageUri?: string | null;
  metadata?: Record<string, any> | null;
}

export interface CustomerUpdateInput {
  full_name?: string;
  phone?: string;
  id_number?: string | null;
  date_of_birth?: string | null;
  gender?: CustomerGender | null;
  email?: string | null;
  address?: string | null;
  nationality?: string;
  customer_group?: CustomerGroup;
  notes?: string | null;
  status?: CustomerStatus;
  imageUri?: string | null;
  metadata?: Record<string, any> | null;
}

export interface CustomerRecord {
  id: string;
  store_id: string;
  customer_code: string;
  full_name: string;
  phone: string;
  id_number: string | null;
  date_of_birth: string | null;
  gender: CustomerGender | null;
  email: string | null;
  address: string | null;
  nationality: string;
  customer_group: CustomerGroup;
  loyalty_points: number;
  total_spent: number;
  notes: string | null;
  status: CustomerStatus;
  sync_status: 'local' | 'synced';
  imageUri?: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CustomerFindOptions {
  store_id?: string;
  status?: CustomerStatus;
  customer_group?: CustomerGroup;
  orderBy?: {name: string; order?: 'ASC' | 'DESC'}[];
  limit?: number;
  offset?: number;
}

// ── Bill ──────────────────────────────────────────────────────────────────────

export interface BillRecord {
  id: string;
  bill_number: string;
  customer_id: string;
  bill_type:
    | 'pos'
    | 'cycle'
    | 'manual'
    | 'deposit'
    | 'refund'
    | 'rent'
    | 'hotel';
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  bill_status: BillStatus;
  issued_at: string;
  notes: string | null;
}

// ── Contract ──────────────────────────────────────────────────────────────────

export interface ContractRecord {
  id: string;
  contract_number: string;
  customer_id: string;
  product_id: string;
  start_date: string;
  end_date: string | null;
  rent_amount: number;
  deposit_amount: number;
  status: ContractStatus;
  notes: string | null;
  room_name?: string;
  room_code?: string;
  room_type?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

function parseMeta(raw: any): Record<string, any> | null {
  if (!raw) {return null;}
  if (typeof raw === 'object') {return raw;}
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function mapCustomer(row: any): CustomerRecord {
  const meta = parseMeta(row.metadata);
  return {...row, metadata: meta, imageUri: meta?.imageUri ?? null};
}

/** Lấy internal DAO của QueryBuilder */
function getDB() {
  return DatabaseManager.get('pos');
}

// ═══════════════════════════════════════════════════════════════════════════════
// CustomerService
// ═══════════════════════════════════════════════════════════════════════════════

class CustomerServiceClass {
  // Chỉ dùng cho generateSequentialId và executeTransaction
  private dao = new CustomerDAO();
  private billDao = new BillDAO();
  private contractDao = new ContractDAO();

  // ── ID helpers ───────────────────────────────────────────────────────────────

  private generateId = (): Promise<string> =>
    generateSequentialId(this.dao, 'cust');

  private generateCode(seqId: string): string {
    const match = seqId.match(/(\d+)$/);
    return `KH-${(match ? match[1] : Date.now().toString()).padStart(3, '0')}`;
  }

  private residentDao = new ResidentDAO();
  /**
   * Lấy Set<customer_id> của tất cả khách hàng có trong bảng residents.
   * Dùng để phân loại 'storage' vs 'selling' khi load danh sách.
   */
  async getResidentCustomerIds(storeId: string): Promise<Set<string>> {
    const rows = await this.residentDao.findAll(
      {store_id: storeId, deleted_at: null},
      {columns: ['customer_id']},
    );
    return new Set(rows.map((r: any) => r.customer_id));
  }
  // ── CREATE ───────────────────────────────────────────────────────────────────

  /**
   * Tạo mới khách hàng.
   *
   * ```ts
   * const customer = await CustomerService.create({
   *   store_id: currentStoreId,
   *   full_name: form.full_name,
   *   phone: form.phone,
   * });
   * ```
   */
  async create(input: CustomerInput): Promise<CustomerRecord> {
    if (!input.full_name?.trim()) {throw new Error('full_name là bắt buộc');}
    if (!input.phone?.trim()) {throw new Error('phone là bắt buộc');}
    if (!input.store_id?.trim()) {throw new Error('store_id là bắt buộc');}

    const now = new Date().toISOString();
    const id = await this.generateId();
    const code = this.generateCode(id);

    const baseMeta = input.metadata ?? {};
    const metaFinal = input.imageUri
      ? {...baseMeta, imageUri: input.imageUri}
      : baseMeta;

    const record = {
      id,
      store_id: input.store_id,
      customer_code: code,
      full_name: input.full_name.trim(),
      phone: input.phone.trim(),
      id_number: input.id_number ?? null,
      date_of_birth: input.date_of_birth ?? null,
      gender: input.gender ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      nationality: input.nationality ?? 'VN',
      customer_group: input.customer_group ?? 'regular',
      loyalty_points: 0,
      total_spent: 0,
      notes: input.notes ?? null,
      metadata: Object.keys(metaFinal).length
        ? JSON.stringify(metaFinal)
        : null,
      status: 'active',
      sync_status: 'local',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    try {
      await this.dao.create(record);
      return (await this.getById(id)) as CustomerRecord;
    } catch (err) {
      console.error('[CustomerService] create error:', err);
      throw err;
    }
  }

  // ── READ ──────────────────────────────────────────────────────────────────────

  /**
   * Lấy khách hàng theo ID.
   *
   * ```ts
   * const detail = await CustomerService.getById(customer.id);
   * ```
   */
  async getById(id: string): Promise<CustomerRecord | null> {
    if (!id) {throw new Error('id là bắt buộc');}
    try {
      const db = getDB();
      if (!db) {return null;}

      const rows = await QueryBuilder.table('customers', db.getInternalDAO())
        .select(['*'])
        .where('id', id)
        .whereNull('deleted_at')
        .limit(1)
        .get();

      return rows.length ? mapCustomer(rows[0]) : null;
    } catch (err) {
      console.error('[CustomerService] getById error:', err);
      throw err;
    }
  }

  /**
   * Lấy danh sách khách hàng chưa bị xoá mềm.
   *
   * ```ts
   * const list = await CustomerService.getAll({
   *   store_id: currentStoreId,
   *   status: 'active',
   * });
   * setCustomers(list);
   * ```
   */
  async getAll(options: CustomerFindOptions = {}): Promise<CustomerRecord[]> {
    try {
      const db = getDB();
      if (!db) {return [];}

      let query = QueryBuilder.table('customers', db.getInternalDAO())
        .select(['*'])
        .whereNull('deleted_at'); // ✅ IS NULL — đúng SQL

      if (options.store_id) {query = query.where('store_id', options.store_id);}
      if (options.status) {query = query.where('status', options.status);}
      if (options.customer_group)
        {query = query.where('customer_group', options.customer_group);}

      const orderBy = options.orderBy ?? [{name: 'full_name', order: 'ASC'}];
      for (const o of orderBy) {
        query = query.orderBy(o.name, o.order ?? 'ASC');
      }

      if (options.limit !== undefined) {query = query.limit(options.limit);}
      if (options.offset !== undefined) {query = query.offset(options.offset);}

      const rows = await query.get();
      return rows.map(mapCustomer);
    } catch (err) {
      console.error('[CustomerService] getAll error:', err);
      throw err;
    }
  }

  /**
   * Kiểm tra trùng số điện thoại trước khi tạo mới.
   *
   * ```ts
   * const dup = await CustomerService.findByPhone(form.phone, storeId);
   * if (dup) setErrors({ phone: 'Số điện thoại đã tồn tại' });
   * ```
   */
  async findByPhone(
    phone: string,
    store_id?: string,
  ): Promise<CustomerRecord | null> {
    if (!phone) {throw new Error('phone là bắt buộc');}
    try {
      const db = getDB();
      if (!db) {return null;}

      let query = QueryBuilder.table('customers', db.getInternalDAO())
        .select(['*'])
        .where('phone', phone.trim())
        .whereNull('deleted_at')
        .limit(1);

      if (store_id) {query = query.where('store_id', store_id);}

      const rows = await query.get();
      return rows.length ? mapCustomer(rows[0]) : null;
    } catch (err) {
      console.error('[CustomerService] findByPhone error:', err);
      throw err;
    }
  }

  async findByIdNumber(
    idNumber: string,
    storeId: string,
  ): Promise<CustomerRecord | null> {
    if (!idNumber?.trim()) return null;
    try {
      const db = getDB();
      if (!db) return null;

      let query = QueryBuilder.table('customers', db.getInternalDAO())
        .select(['*'])
        .where('id_number', idNumber.trim())
        .whereNull('deleted_at')
        .limit(1);

      if (storeId) query = query.where('store_id', storeId);

      const rows = await query.get();
      return rows.length ? mapCustomer(rows[0]) : null;
    } catch (err) {
      console.error('[CustomerService] findByIdNumber error:', err);
      return null;
    }
  }

  /**
   * Đếm tổng số khách hàng theo điều kiện.
   */
  async count(
    options: Pick<
      CustomerFindOptions,
      'store_id' | 'status' | 'customer_group'
    > = {},
  ): Promise<number> {
    try {
      const db = getDB();
      if (!db) {return 0;}

      let query = QueryBuilder.table('customers', db.getInternalDAO())
        .select(['COUNT(*) as cnt'])
        .whereNull('deleted_at');

      if (options.store_id) {query = query.where('store_id', options.store_id);}
      if (options.status) {query = query.where('status', options.status);}
      if (options.customer_group)
        {query = query.where('customer_group', options.customer_group);}

      const rows = await query.get();
      return rows[0]?.cnt ?? 0;
    } catch (err) {
      console.error('[CustomerService] count error:', err);
      throw err;
    }
  }

  // ── UPDATE ────────────────────────────────────────────────────────────────────

  /**
   * Cập nhật thông tin khách hàng (partial update).
   *
   * ```ts
   * const updated = await CustomerService.update(customer.id, {
   *   phone: form.phone,
   *   address: form.address,
   * });
   * ```
   */
  async update(id: string, data: CustomerUpdateInput): Promise<CustomerRecord> {
    if (!id) {throw new Error('id là bắt buộc');}

    const now = new Date().toISOString();

    // Merge imageUri / metadata an toàn
    let metaPayload: string | undefined;
    if (data.imageUri !== undefined || data.metadata !== undefined) {
      const existing = await this.getById(id);
      const currentMeta = existing?.metadata ?? {};
      const merged = {
        ...currentMeta,
        ...(data.metadata ?? {}),
        ...(data.imageUri !== undefined ? {imageUri: data.imageUri} : {}),
      };
      metaPayload = JSON.stringify(merged);
    }

    const payload: Record<string, any> = {
      updated_at: now,
      sync_status: 'local',
    };

    type UpdatableKey = keyof Omit<
      CustomerUpdateInput,
      'imageUri' | 'metadata'
    >;
    const UPDATABLE: UpdatableKey[] = [
      'full_name',
      'phone',
      'id_number',
      'date_of_birth',
      'gender',
      'email',
      'address',
      'nationality',
      'customer_group',
      'notes',
      'status',
    ];

    for (const field of UPDATABLE) {
      if (field in data) {
        const val = data[field];
        payload[field] = typeof val === 'string' ? val.trim() : val;
      }
    }

    if (metaPayload !== undefined) {payload.metadata = metaPayload;}

    try {
      await this.dao.update(id, payload);
      return (await this.getById(id)) as CustomerRecord;
    } catch (err) {
      console.error('[CustomerService] update error:', err);
      throw err;
    }
  }

  /**
   * Cập nhật avatar khách hàng (lưu vào metadata.imageUri).
   *
   * ```ts
   * const updated = await CustomerService.updateAvatar(customer.id, uri);
   * onUpdateCustomer(updated);
   * ```
   */
  async updateAvatar(
    id: string,
    imageUri: string | null,
  ): Promise<CustomerRecord> {
    return this.update(id, {imageUri});
  }

  /**
   * Cộng điểm loyalty.
   */
  async addLoyaltyPoints(id: string, points: number): Promise<CustomerRecord> {
    if (points <= 0) {throw new Error('points phải > 0');}
    const existing = await this.getById(id);
    if (!existing) {throw new Error(`Không tìm thấy khách hàng: ${id}`);}
    await this.dao.update(id, {
      loyalty_points: (existing.loyalty_points ?? 0) + points,
      updated_at: new Date().toISOString(),
      sync_status: 'local',
    });
    return this.getById(id) as Promise<CustomerRecord>;
  }

  /**
   * Cộng tổng chi tiêu.
   */
  async addTotalSpent(id: string, amount: number): Promise<CustomerRecord> {
    if (amount <= 0) {throw new Error('amount phải > 0');}
    const existing = await this.getById(id);
    if (!existing) {throw new Error(`Không tìm thấy khách hàng: ${id}`);}
    await this.dao.update(id, {
      total_spent: (existing.total_spent ?? 0) + amount,
      updated_at: new Date().toISOString(),
      sync_status: 'local',
    });
    return this.getById(id) as Promise<CustomerRecord>;
  }

  // ── DELETE ────────────────────────────────────────────────────────────────────

  /**
   * Xoá mềm một khách hàng.
   *
   * ```ts
   * await CustomerService.softDelete(customer.id);
   * ```
   */
  async softDelete(id: string): Promise<boolean> {
    if (!id) {throw new Error('id là bắt buộc');}
    const now = new Date().toISOString();
    try {
      await this.dao.update(id, {
        deleted_at: now,
        status: 'inactive',
        updated_at: now,
        sync_status: 'local',
      });
      return true;
    } catch (err) {
      console.error('[CustomerService] softDelete error:', err);
      throw err;
    }
  }

  /**
   * Xoá cứng một khách hàng.
   */
  async hardDelete(id: string): Promise<boolean> {
    if (!id) {throw new Error('id là bắt buộc');}
    try {
      return await this.dao.delete(id);
    } catch (err) {
      console.error('[CustomerService] hardDelete error:', err);
      throw err;
    }
  }

  /**
   * Xoá mềm nhiều khách hàng trong một transaction.
   *
   * ```ts
   * const { success, failed } = await CustomerService.bulkSoftDelete([...selectedIds]);
   * setCustomers(prev => prev.filter(c => !success.includes(c.id)));
   * ```
   */
  async bulkSoftDelete(
    ids: string[],
  ): Promise<{success: string[]; failed: string[]}> {
    if (!ids.length) {throw new Error('ids không được rỗng');}
    const success: string[] = [];
    const failed: string[] = [];
    const now = new Date().toISOString();
    try {
      await this.dao.executeTransaction(async () => {
        for (const id of ids) {
          try {
            await this.dao.update(id, {
              deleted_at: now,
              status: 'inactive',
              updated_at: now,
              sync_status: 'local',
            });
            success.push(id);
          } catch {
            failed.push(id);
          }
        }
      });
    } catch (err) {
      console.error('[CustomerService] bulkSoftDelete error:', err);
      throw err;
    }
    return {success, failed};
  }

  /**
   * Xoá cứng nhiều khách hàng trong một transaction.
   */
  async bulkHardDelete(
    ids: string[],
  ): Promise<{success: string[]; failed: string[]}> {
    if (!ids.length) {throw new Error('ids không được rỗng');}
    const success: string[] = [];
    const failed: string[] = [];
    try {
      await this.dao.executeTransaction(async () => {
        for (const id of ids) {
          try {
            await this.dao.delete(id);
            success.push(id);
          } catch {
            failed.push(id);
          }
        }
      });
    } catch (err) {
      console.error('[CustomerService] bulkHardDelete error:', err);
      throw err;
    }
    return {success, failed};
  }

  // ── BILLS ─────────────────────────────────────────────────────────────────────

  /**
   * Lấy danh sách hóa đơn gần đây của khách hàng.
   *
   * ```ts
   * const bills = await CustomerService.getBillsByCustomerId(customer.id, { limit: 10 });
   * ```
   */
  async getBillsByCustomerId(
    customerId: string,
    options: {
      limit?: number;
      offset?: number;
      orderBy?: {name: string; order?: 'ASC' | 'DESC'}[];
    } = {},
  ): Promise<BillRecord[]> {
    if (!customerId) {throw new Error('customerId là bắt buộc');}
    try {
      const db = getDB();
      if (!db) {return [];}

      let query = QueryBuilder.table('bills', db.getInternalDAO())
        .select(['*'])
        .where('customer_id', customerId)
        .whereNull('deleted_at'); // ✅ IS NULL

      const orderBy = options.orderBy ?? [{name: 'issued_at', order: 'DESC'}];
      for (const o of orderBy) {
        query = query.orderBy(o.name, o.order ?? 'DESC');
      }

      if (options.limit !== undefined) {query = query.limit(options.limit);}
      else {query = query.limit(10);}

      if (options.offset !== undefined) {query = query.offset(options.offset);}

      const rows = await query.get();
      return rows as BillRecord[];
    } catch (err) {
      console.error('[CustomerService] getBillsByCustomerId error:', err);
      throw err;
    }
  }

  // ── CONTRACT ──────────────────────────────────────────────────────────────────

  /**
   * Lấy hợp đồng đang active của khách hàng.
   *
   * ```ts
   * const contract = await CustomerService.getActiveContractByCustomerId(customer.id);
   * ```
   */
  async getActiveContractByCustomerId(
    customerId: string,
  ): Promise<ContractRecord | null> {
    if (!customerId) {throw new Error('customerId là bắt buộc');}
    try {
      const db = getDB();
      if (!db) {return null;}

      const rows = await QueryBuilder.table('contracts', db.getInternalDAO())
        .select([
          'contracts.*',
          'products.name as room_name',
          'product_variants.name as room_code',
          'categories.name as room_type',
        ])
        .leftJoin('products', 'contracts.product_id = products.id')
        .leftJoin(
          'product_variants',
          'contracts.variant_id = product_variants.id',
        )
        .leftJoin('categories', 'products.category_id = categories.id')
        .where('contracts.customer_id', customerId)
        .where('contracts.status', 'active')
        .whereNull('contracts.deleted_at') // ✅ IS NULL
        .limit(1)
        .get();

      return rows.length ? (rows[0] as ContractRecord) : null;
    } catch (err) {
      console.error(
        '[CustomerService] getActiveContractByCustomerId error:',
        err,
      );
      throw err;
    }
  }

  // ── HEALTH ────────────────────────────────────────────────────────────────────

  async healthCheck() {
    return this.dao.healthCheck();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton export
// ═══════════════════════════════════════════════════════════════════════════════

export const CustomerService = new CustomerServiceClass();
