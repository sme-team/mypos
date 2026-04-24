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
  type: 'hour' | 'day';
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

    // Validate: duration > 29 ngày → ERROR
    if (totalDays > 29) {
      throw new Error('Duration cannot exceed 29 days');
    }

    // Lấy giá phòng
    const prices = await this.getRoomPrices(variantId, storeId);

    // Kiểm tra qua đêm
    const crossMidnight = checkoutDateTime.getDate() !== checkinDateTime.getDate() ||
                          checkoutDateTime.getMonth() !== checkinDateTime.getMonth() ||
                          checkoutDateTime.getFullYear() !== checkinDateTime.getFullYear();

    // Logic tính giá
    if (crossMidnight) {
      // Qua đêm → tính theo ngày
      return this.calculateByDayOvernight(checkinDateTime, checkoutDateTime, prices.dayPrice);
    } else {
      // Không qua đêm
      if (totalHours < 6) {
        // HOURLY: < 6h
        return this.calculateHourly(totalHours, prices.hourFirstPrice, prices.hourPrice);
      } else if (totalHours <= 8) {
        // HALF_DAY: 6h-8h
        return this.calculateHalfDay(prices.dayPrice);
      } else {
        // DAY: > 8h
        return this.calculateByDay(totalDays, prices.dayPrice);
      }
    }
  }

  /**
   * Lấy giá phòng theo các đơn vị thời gian từ DB
   */
  private async getRoomPrices(variantId: string, storeId: string): Promise<{
    hourFirstPrice: number;
    hourPrice: number;
    dayPrice: number;
    monthPrice: number;
  }> {
    const db = DatabaseManager.get('pos');
    if (!db) {
      return { hourFirstPrice: 0, hourPrice: 0, dayPrice: 0, monthPrice: 0 };
    }

    // Query prices từ bảng prices với unit_code
    const prices = await QueryBuilder.table('prices', db)
      .select([
        'prices.variant_id',
        'prices.unit_id',
        'prices.price',
        'prices.price_list_name',
        'units.unit_code'
      ])
      .innerJoin('units', 'prices.unit_id = units.id')
      .where('prices.variant_id', variantId)
      .where('prices.store_id', storeId)
      .get();

    // Ưu tiên giá 'default' trước
    const defaultPrices = prices.filter((p: any) =>
      p.price_list_name && p.price_list_name.toLowerCase() === 'default'
    );
    const pricesToUse = defaultPrices.length > 0 ? defaultPrices : prices;

    // Lấy giá theo unit_code (case-insensitive)
    let hourFirstPrice = pricesToUse.find((p: any) => p.unit_code?.toUpperCase() === 'HOURFIRST')?.price || 0;
    const hourPrice = pricesToUse.find((p: any) => p.unit_code?.toUpperCase() === 'HOUR')?.price || 0;
    const dayPrice = pricesToUse.find((p: any) => p.unit_code?.toUpperCase() === 'DAY')?.price || 0;
    const monthPrice = pricesToUse.find((p: any) => p.unit_code?.toUpperCase() === 'MONTH')?.price || 0;

    // Debug log
    console.log('[ShortTermPriceService] Prices for variant', variantId, ':', {
      hourFirstPrice,
      hourPrice,
      dayPrice,
      monthPrice,
      foundHOURFIRST: pricesToUse.some((p: any) => p.unit_code?.toUpperCase() === 'HOURFIRST'),
    });

    // Fallback: nếu không có hourFirstPrice, dùng hourPrice
    if (hourFirstPrice === 0 && hourPrice > 0) {
      hourFirstPrice = hourPrice * 2; // Giả sử giá 2h đầu = 2 × giá 1 giờ
      console.log('[ShortTermPriceService] Using fallback: hourFirstPrice =', hourFirstPrice);
    }

    return {
      hourFirstPrice,
      hourPrice,
      dayPrice,
      monthPrice,
    };
  }

  /**
   * Tính giá theo giờ (khi thời gian < 6h)
   * Formula: price_hour_first + (duration - 1h) × price_hour
   */
  private calculateHourly(totalHours: number, hourFirstPrice: number, hourPrice: number): ShortTermPriceResult {
    // Giờ đầu là 1 giờ
    const firstHours = 1;
    const extraHours = Math.max(0, Math.ceil(totalHours - 1));

    const firstAmount = hourFirstPrice;
    const extraAmount = extraHours * hourPrice;
    const totalAmount = firstAmount + extraAmount;

    const breakdown: PriceBreakdown[] = [
      {
        type: 'hour',
        quantity: firstHours,
        unitPrice: hourFirstPrice,
        amount: firstAmount,
        description: `${firstHours} giờ đầu x ${this.formatCurrency(hourFirstPrice)}/giờ`,
      },
    ];

    if (extraHours > 0) {
      breakdown.push({
        type: 'hour',
        quantity: extraHours,
        unitPrice: hourPrice,
        amount: extraAmount,
        description: `${extraHours} giờ thừa x ${this.formatCurrency(hourPrice)}/giờ`,
      });
    }

    return {
      totalAmount,
      totalHours,
      totalDays: totalHours / 24,
      breakdown,
      description: `Tính theo giờ: ${Math.ceil(totalHours)} giờ (${firstHours}h đầu + ${extraHours}h thừa)`,
    };
  }

  /**
   * Tính giá nửa ngày (khi 6h <= thời gian <= 8h)
   * Formula: price_day / 2
   */
  private calculateHalfDay(dayPrice: number): ShortTermPriceResult {
    const halfDayPrice = dayPrice / 2;

    return {
      totalAmount: halfDayPrice,
      totalHours: 8,
      totalDays: 0.5,
      breakdown: [
        {
          type: 'day',
          quantity: 0.5,
          unitPrice: dayPrice,
          amount: halfDayPrice,
          description: `Nửa ngày x ${this.formatCurrency(halfDayPrice)}`,
        },
      ],
      description: `Tính nửa ngày: 0.5 ngày (giá = ${this.formatCurrency(halfDayPrice)})`,
    };
  }

  /**
   * Tính giá qua đêm (qua 0h)
   * Formula: days × price_day
   */
  private calculateByDayOvernight(checkinDateTime: Date, checkoutDateTime: Date, dayPrice: number): ShortTermPriceResult {
    // Xác định mốc 12h
    let anchor = new Date(checkinDateTime);
    anchor.setHours(12, 0, 0, 0);

    if (checkinDateTime.getHours() >= 12) {
      // Nếu check-in >= 12h, anchor là 12h ngày hôm sau
      anchor.setDate(anchor.getDate() + 1);
    }

    // Tính số ngày
    let days = 1;
    while (checkoutDateTime > anchor) {
      days += 1;
      anchor.setDate(anchor.getDate() + 1);
    }

    const totalAmount = days * dayPrice;

    return {
      totalAmount,
      totalHours: days * 24,
      totalDays: days,
      breakdown: [
        {
          type: 'day',
          quantity: days,
          unitPrice: dayPrice,
          amount: totalAmount,
          description: `${days} ngày x ${this.formatCurrency(dayPrice)}/ngày`,
        },
      ],
      description: `Tính qua đêm: ${days} ngày`,
    };
  }

  /**
   * Tính giá theo ngày (khi thời gian > 1 ngày)
   */
  private calculateByDay(totalDays: number, dayPrice: number): ShortTermPriceResult {
    // Làm tròn số ngày
    const days = Math.ceil(totalDays);
    const amount = days * dayPrice;

    return {
      totalAmount: amount,
      totalHours: totalDays * 24,
      totalDays: days,
      breakdown: [
        {
          type: 'day',
          quantity: days,
          unitPrice: dayPrice,
          amount,
          description: `${days} ngày x ${this.formatCurrency(dayPrice)}/ngày`,
        },
      ],
      description: `Tính theo ngày: ${days} ngày`,
    };
  }

  /**
   * Tính giá theo giờ (khi thời gian < nửa ngày)
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
