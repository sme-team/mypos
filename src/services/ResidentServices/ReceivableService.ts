import {BaseService} from '../BaseService';
import {generateSequentialId} from '../../utils';
import {QueryBuilder} from '@dqcai/sqlite';
import DatabaseManager from '../../database/DBManagers';
import {createModuleLogger, AppModules} from '../../logger';

const logger = createModuleLogger(AppModules.RECEIVABLE_SERVICE);

// Interface cho receivables
export interface Receivable {
  id?: string;
  store_id: string;
  customer_id: string;
  contract_id?: string;
  bill_id: string;
  receivable_code?: string;
  receivable_type:
    | 'rent'
    | 'electric'
    | 'water'
    | 'service'
    | 'deposit'
    | 'penalty'
    | 'adjustment';
  description?: string;
  amount: number;
  due_date?: string;
  status?: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  ref_id?: string;
  ref_type?: 'original' | 'adjustment' | 'replacement';
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

/**
 * Service quản lý khoản phải thu (receivables)
 */
export class ReceivableServiceClass extends BaseService {
  constructor() {
    super('pos', 'receivables');
  }

  /**
   * Tạo mã receivable tăng dần
   * Format: REC-{store}-{year}{month}-{sequence}
   */
  async generateReceivableCode(storeId: string): Promise<string> {
    const db = DatabaseManager.get('pos');
    if (!db) throw new Error('Database not found');

    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(
      now.getMonth() + 1,
    ).padStart(2, '0')}`;
    const prefix = `REC-${storeId.substring(0, 4)}-${yearMonth}-`;

    // Lấy mã lớn nhất hiện tại
    const result = await QueryBuilder.table('receivables', db)
      .select(['receivable_code'])
      .where('store_id', storeId)
      .whereLike('receivable_code', `${prefix}%`)
      .orderBy('receivable_code', 'DESC')
      .first();

    let sequence = 1;
    if (result && result.receivable_code) {
      const match = result.receivable_code.match(/-(\d+)$/);
      if (match) {
        sequence = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefix}${String(sequence).padStart(4, '0')}`;
  }

  /**
   * Tạo receivable từ bill
   */
  async createFromBill(
    storeId: string,
    customerId: string,
    contractId: string | undefined,
    billId: string,
    billType: 'deposit' | 'rent' | 'hotel',
    amount: number,
    dueDate: string,
  ): Promise<Receivable> {
    const receivableCode = await this.generateReceivableCode(storeId);

    const receivableType = billType === 'deposit' ? 'deposit' : 'rent';
    const description =
      billType === 'deposit'
        ? 'Tiền đặt cọc phòng'
        : 'Tiền thuê phòng và dịch vụ';
    const id = await generateSequentialId(this, 'REC');

    return this.create({
      id,
      store_id: storeId,
      customer_id: customerId,
      contract_id: contractId,
      bill_id: billId,
      receivable_code: receivableCode,
      receivable_type: receivableType,
      description,
      amount,
      due_date: dueDate,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
}

export const ReceivableService = new ReceivableServiceClass();
export default ReceivableService;
