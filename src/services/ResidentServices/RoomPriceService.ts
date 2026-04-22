/**
 * @file RoomPriceService.ts
 * @description Xử lý logic chọn giá ưu tiên cho phòng (Tháng > Ngày > Đêm > Giờ)
 * Sử dụng unit_code thay vì hardcode unit_id để linh hoạt với dữ liệu người dùng
 */

import { QueryBuilder } from '@dqcai/sqlite';
import DatabaseManager from '../../database/DBManagers';

export interface PriceRecord {
  unit_id: string;
  unit_code?: string;
  price: number;
}

export interface PriceRecordWithCode extends PriceRecord {
  unit_code: string;
}

class RoomPriceServiceClass {
  private unitCodeCache: Map<string, string> = new Map(); // unit_id -> unit_code

  /**
   * Lấy unit_code từ unit_id (có cache)
   */
  private async getUnitCode(unitId: string): Promise<string | null> {
    // Check cache first
    if (this.unitCodeCache.has(unitId)) {
      return this.unitCodeCache.get(unitId)!;
    }

    try {
      const db = DatabaseManager.get('pos');
      if (!db) return null;

      const result = await QueryBuilder.table('units', db.getInternalDAO())
        .select(['unit_code'])
        .where('id', unitId)
        .first();

      if (result?.unit_code) {
        this.unitCodeCache.set(unitId, result.unit_code);
        return result.unit_code;
      }
      return null;
    } catch (err) {
      console.error('[RoomPriceService] Error fetching unit_code:', err);
      return null;
    }
  }

  /**
   * Batch fetch unit_codes cho nhiều unit_id
   */
  private async batchFetchUnitCodes(unitIds: string[]): Promise<void> {
    const uncachedIds = unitIds.filter(id => !this.unitCodeCache.has(id));
    if (uncachedIds.length === 0) return;

    try {
      const db = DatabaseManager.get('pos');
      if (!db) return;

      const results = await QueryBuilder.table('units', db.getInternalDAO())
        .select(['id', 'unit_code'])
        .whereIn('id', uncachedIds)
        .get();

      for (const row of results) {
        if (row.unit_code) {
          this.unitCodeCache.set(row.id, row.unit_code);
        }
      }
    } catch (err) {
      console.error('[RoomPriceService] Error batch fetching unit_codes:', err);
    }
  }

  /**
   * Chuyển đổi PriceRecord sang PriceRecordWithCode bằng cách fetch unit_code
   */
  private async enrichPricesWithUnitCodes(prices: PriceRecord[]): Promise<PriceRecordWithCode[]> {
    const unitIds = prices.map(p => p.unit_id);
    await this.batchFetchUnitCodes(unitIds);

    const enriched: PriceRecordWithCode[] = [];
    for (const price of prices) {
      const unitCode = await this.getUnitCode(price.unit_id);
      if (unitCode) {  // Cho phép tất cả unit_code, bao gồm OVNIGHT
        enriched.push({
          ...price,
          unit_code: unitCode,
        });
      }
    }
    return enriched;
  }

  /**
   * Chọn giá ưu tiên theo thứ tự: Tháng > Ngày > Giờ đầu > Giờ
   * @param prices Danh sách các mức giá của variant
   * @returns Mức giá ưu tiên nhất hoặc null
   */
  async getPriorityPrice(prices: PriceRecord[]): Promise<PriceRecordWithCode | null> {
    if (!prices || prices.length === 0) return null;

    // Enrich prices with unit_codes
    const enrichedPrices = await this.enrichPricesWithUnitCodes(prices);

    // Ưu tiên theo unit_code
    const priorityOrder = ['MONTH', 'DAY', 'HOUR', 'HOURFIRST'];

    for (const code of priorityOrder) {
      const price = enrichedPrices.find(p => p.unit_code.toUpperCase() === code);
      if (price) return price;
    }

    // Nếu không khớp code nào, lấy giá đầu tiên
    return enrichedPrices[0] || null;
  }

  /**
   * Định dạng chuỗi hiển thị giá kèm đơn vị
   * @param price Số tiền
   * @param unitId ID đơn vị
   * @returns Chuỗi hiển thị (ví dụ: "5.000.000đ / tháng")
   */
  async formatPriceDisplay(price: number, unitId: string): Promise<string> {
    const formattedAmount = price.toLocaleString('vi-VN') + 'đ';
    const unitCode = await this.getUnitCode(unitId);

    if (!unitCode) return formattedAmount;

    const code = unitCode.toUpperCase();
    switch (code) {
      case 'MONTH':
        return `${formattedAmount} / tháng`;
      case 'DAY':
        return `${formattedAmount} / ngày`;
      case 'HOUR':
        return `${formattedAmount} / giờ`;
      case 'HOURFIRST':
        return `${formattedAmount} / giờ đầu`;
      default:
        return formattedAmount;
    }
  }
}

export const RoomPriceService = new RoomPriceServiceClass();
export default RoomPriceService;
