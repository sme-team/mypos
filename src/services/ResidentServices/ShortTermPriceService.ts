/**
 * @file: ShortTermPriceService.ts
 * @description: Service tính giá phòng ngắn hạn dựa trên thời gian nhận/trả phòng.
 * Logic tính giá:
 * - Bắt đầu > Tính theo giờ
 * - Thời gian < ngày > Tính theo giờ
 * - Thời gian = ngày > Tính ngày + Tính theo giờ
 * - Thời gian > ngày > Tính theo ngày
 */

import { QueryBuilder } from '@dqcai/sqlite';
import DatabaseManager from '../../database/DBManagers';
import { UNIT_IDS } from './RoomPriceService';

export interface ShortTermPriceInput {
  checkinDate: string;     // YYYY-MM-DD
  checkinTime: string;     // HH:mm
  checkoutDate: string;    // YYYY-MM-DD
  checkoutTime: string;    // HH:mm
  variantId: string;
  productId: string;
  storeId: string;
}

export interface ShortTermPriceResult {
  totalAmount: number;           // Tổng tiền
  breakdown: PriceBreakdown[];     // Chi tiết tính toán
  totalHours: number;            // Tổng số giờ lưu trú
  totalDays: number;             // Tổng số ngày (làm tròn)
  description: string;             // Mô tả cách tính
}

export interface PriceBreakdown {
  type: 'hour' | 'day' | 'night';
  quantity: number;
  unitPrice: number;
  amount: number;
  description: string;
}

class ShortTermPriceServiceClass {
  /**
   * Tính giá phòng ngắn hạn dựa trên thời gian nhận/trả
   */
  async calculatePrice(input: ShortTermPriceInput): Promise<ShortTermPriceResult> {
    const { checkinDate, checkinTime, checkoutDate, checkoutTime, variantId, storeId } = input;

    // Parse datetime
    const checkinDateTime = new Date(`${checkinDate}T${checkinTime}`);
    const checkoutDateTime = new Date(`${checkoutDate}T${checkoutTime}`);

    // Tính tổng thời gian lưu trú (ms)
    const totalMs = checkoutDateTime.getTime() - checkinDateTime.getTime();
    const totalHours = totalMs / (1000 * 60 * 60);
    const totalDays = totalHours / 24;

    // Lấy giá phòng (theo giờ, đêm, ngày)
    const prices = await this.getRoomPrices(variantId, storeId);

    // Logic tính giá theo yêu cầu
    if (totalDays < 1) {
      // TH1: Thời gian < 1 ngày → Tính theo giờ
      return this.calculateByHour(totalHours, prices.hourPrice);
    } else if (totalDays === 1 || (totalDays > 1 && totalDays < 2 && this.isSameDay(checkinDateTime, checkoutDateTime))) {
      // TH2: Thời gian = 1 ngày → Tính ngày + tính theo giờ (nếu có)
      return this.calculateDayWithHour(totalHours, prices.dayPrice, prices.hourPrice);
    } else {
      // TH3: Thời gian > 1 ngày → Tính theo ngày (hoặc đêm)
      return this.calculateByDayOrNight(totalDays, prices.dayPrice, prices.nightPrice);
    }
  }

  /**
   * Lấy giá phòng theo các đơn vị thời gian từ DB
   */
  private async getRoomPrices(variantId: string, storeId: string): Promise<{
    hourPrice: number;
    nightPrice: number;
    dayPrice: number;
    monthPrice: number;
  }> {
    const db = DatabaseManager.get('pos');
    if (!db) {
      return { hourPrice: 0, nightPrice: 0, dayPrice: 0, monthPrice: 0 };
    }

    // Query prices từ bảng prices
    const prices = await QueryBuilder.table('prices', db.getInternalDAO())
      .select(['variant_id', 'unit_id', 'price', 'price_list_name'])
      .where('variant_id', variantId)
      .where('store_id', storeId)
      .get();

    // Ưu tiên giá 'default' trước
    const defaultPrices = prices.filter((p: any) =>
      p.price_list_name && p.price_list_name.toLowerCase() === 'default'
    );
    const pricesToUse = defaultPrices.length > 0 ? defaultPrices : prices;

    // Lấy giá theo đơn vị
    const hourPrice = pricesToUse.find((p: any) => p.unit_id === UNIT_IDS.HOUR)?.price || 0;
    const nightPrice = pricesToUse.find((p: any) => p.unit_id === UNIT_IDS.NIGHT)?.price || 0;
    const dayPrice = pricesToUse.find((p: any) => p.unit_id === UNIT_IDS.DAY)?.price || 0;
    const monthPrice = pricesToUse.find((p: any) => p.unit_id === UNIT_IDS.MONTH)?.price || 0;

    // Nếu không có giá theo ngày, dùng giá theo tháng chia ra
    const effectiveDayPrice = dayPrice || (monthPrice > 0 ? Math.ceil(monthPrice / 30) : 0);
    const effectiveNightPrice = nightPrice || effectiveDayPrice || 0;
    const effectiveHourPrice = hourPrice || (effectiveDayPrice > 0 ? Math.ceil(effectiveDayPrice / 24) : 0);

    return {
      hourPrice: effectiveHourPrice,
      nightPrice: effectiveNightPrice,
      dayPrice: effectiveDayPrice,
      monthPrice,
    };
  }

  /**
   * Tính giá theo giờ (khi thời gian < 1 ngày)
   */
  private calculateByHour(totalHours: number, hourPrice: number): ShortTermPriceResult {
    // Làm tròn lên số giờ (tối thiểu 1 giờ)
    const hours = Math.max(1, Math.ceil(totalHours));
    const amount = hours * hourPrice;

    return {
      totalAmount: amount,
      totalHours,
      totalDays: totalHours / 24,
      breakdown: [
        {
          type: 'hour',
          quantity: hours,
          unitPrice: hourPrice,
          amount,
          description: `${hours} giờ x ${this.formatCurrency(hourPrice)}/giờ`,
        },
      ],
      description: `Tính theo giờ: ${hours} giờ`,
    };
  }

  /**
   * Tính giá khi thời gian = 1 ngày
   * Logic: Tính 1 ngày + giờ thừa (nếu có)
   */
  private calculateDayWithHour(totalHours: number, dayPrice: number, hourPrice: number): ShortTermPriceResult {
    const breakdown: PriceBreakdown[] = [];
    let totalAmount = 0;

    // Tính 1 ngày
    if (dayPrice > 0) {
      breakdown.push({
        type: 'day',
        quantity: 1,
        unitPrice: dayPrice,
        amount: dayPrice,
        description: `1 ngày x ${this.formatCurrency(dayPrice)}/ngày`,
      });
      totalAmount += dayPrice;
    }

    // Tính giờ thừa (nếu có)
    const extraHours = Math.ceil(totalHours - 24);
    if (extraHours > 0 && hourPrice > 0) {
      const extraAmount = extraHours * hourPrice;
      breakdown.push({
        type: 'hour',
        quantity: extraHours,
        unitPrice: hourPrice,
        amount: extraAmount,
        description: `${extraHours} giờ thừa x ${this.formatCurrency(hourPrice)}/giờ`,
      });
      totalAmount += extraAmount;
    }

    return {
      totalAmount,
      totalHours,
      totalDays: 1,
      breakdown,
      description: `Tính ngày + giờ: 1 ngày${extraHours > 0 ? ` + ${extraHours} giờ` : ''}`,
    };
  }

  /**
   * Tính giá theo ngày/đêm (khi thời gian > 1 ngày)
   */
  private calculateByDayOrNight(totalDays: number, dayPrice: number, nightPrice: number): ShortTermPriceResult {
    // Làm tròn số ngày/đêm
    const days = Math.ceil(totalDays);

    // Ưu tiên tính theo đêm nếu có giá đêm, không thì tính theo ngày
    const useNightPrice = nightPrice > 0 && nightPrice < dayPrice;
    const unitPrice = useNightPrice ? nightPrice : dayPrice;
    const unitType = useNightPrice ? 'night' : 'day';
    const unitLabel = useNightPrice ? 'đêm' : 'ngày';

    const amount = days * unitPrice;

    return {
      totalAmount: amount,
      totalHours: totalDays * 24,
      totalDays: days,
      breakdown: [
        {
          type: unitType,
          quantity: days,
          unitPrice,
          amount,
          description: `${days} ${unitLabel} x ${this.formatCurrency(unitPrice)}/${unitLabel}`,
        },
      ],
      description: `Tính theo ${unitLabel}: ${days} ${unitLabel}`,
    };
  }

  /**
   * Kiểm tra 2 ngày có phải cùng 1 ngày không
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  /**
   * Format số tiền
   */
  private formatCurrency(amount: number): string {
    return amount.toLocaleString('vi-VN') + 'đ';
  }

  /**
   * Tính số đêm giữa 2 ngày (dùng cho backward compatibility)
   */
  calcNights(checkin: string, checkout: string): number {
    const ms = new Date(checkout).getTime() - new Date(checkin).getTime();
    return Math.max(1, Math.round(ms / 86_400_000));
  }
}

export const ShortTermPriceService = new ShortTermPriceServiceClass();
