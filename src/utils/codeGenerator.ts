import { QueryBuilder } from '@dqcai/sqlite';
import DatabaseManager from '../database/DBManagers';

/**
 * Tạo mã khách hàng tăng dần
 * Format: KH-{store_prefix}-{sequence:04d}
 */
export async function generateCustomerCode(storeId: string): Promise<string> {
  const db = DatabaseManager.get('pos');
  if (!db) throw new Error('Database not found');

  const storePrefix = storeId.substring(0, 4);
  const prefix = `KH-${storePrefix}-`;

  const result = await QueryBuilder.table('customers', db)
    .select(['customer_code'])
    .where('store_id', storeId)
    .whereLike('customer_code', `${prefix}%`)
    .orderBy('customer_code', 'DESC')
    .first();

  let sequence = 1;
  if (result && result.customer_code) {
    const match = result.customer_code.match(/-(\d+)$/);
    if (match) {
      sequence = parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
}

/**
 * Tạo mã hợp đồng tăng dần
 * Format: HD-{year}-{sequence:04d}
 */
export async function generateContractCode(storeId: string): Promise<string> {
  const db = DatabaseManager.get('pos');
  if (!db) throw new Error('Database not found');

  const year = new Date().getFullYear();
  const prefix = `HD-${year}-`;

  const result = await QueryBuilder.table('contracts', db)
    .select(['contract_number'])
    .where('store_id', storeId)
    .whereLike('contract_number', `${prefix}%`)
    .orderBy('contract_number', 'DESC')
    .first();

  let sequence = 1;
  if (result && result.contract_number) {
    const match = result.contract_number.match(/-(\d+)$/);
    if (match) {
      sequence = parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
}

/**
 * Tạo số hóa đơn tăng dần
 * Format: HD-{YYYYMMDD}-{sequence:04d}
 */
export async function generateBillNumber(storeId: string): Promise<string> {
  const db = DatabaseManager.get('pos');
  if (!db) throw new Error('Database not found');

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const prefix = `HD-${dateStr}-`;

  const result = await QueryBuilder.table('bills', db)
    .select(['bill_number'])
    .where('store_id', storeId)
    .whereLike('bill_number', `${prefix}%`)
    .orderBy('bill_number', 'DESC')
    .first();

  let sequence = 1;
  if (result && result.bill_number) {
    const match = result.bill_number.match(/-(\d+)$/);
    if (match) {
      sequence = parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
}

/**
 * Tạo mã khoản thu tăng dần
 * Format: REC-{store_prefix}-{year}{month}-{sequence:04d}
 */
export async function generateReceivableCode(storeId: string): Promise<string> {
  const db = DatabaseManager.get('pos');
  if (!db) throw new Error('Database not found');

  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const storePrefix = storeId.substring(0, 4);
  const prefix = `REC-${storePrefix}-${yearMonth}-`;

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
