/**
 * @file RoomPriceService.ts
 * @description Xử lý logic chọn giá ưu tiên cho phòng (Tháng > Ngày > Đêm > Giờ)
 */

export const UNIT_IDS = {
  MONTH: 'unit-019',
  YEAR: 'unit-020',
  DAY: 'unit-022',
  NIGHT: 'unit-023',
  HOUR: 'unit-021',
};

export interface PriceRecord {
  unit_id: string;
  price: number;
}

class RoomPriceServiceClass {
  /**
   * Chọn giá ưu tiên theo thứ tự: Tháng > Ngày > Đêm > Giờ
   * @param prices Danh sách các mức giá của variant
   * @returns Mức giá ưu tiên nhất hoặc null
   */
  getPriorityPrice(prices: PriceRecord[]): PriceRecord | null {
    if (!prices || prices.length === 0) return null;

    // Ưu tiên 1: Tháng
    const monthPrice = prices.find(p => p.unit_id === UNIT_IDS.MONTH);
    if (monthPrice) return monthPrice;

    // Ưu tiên 2: Ngày
    const dayPrice = prices.find(p => p.unit_id === UNIT_IDS.DAY);
    if (dayPrice) return dayPrice;

    // Ưu tiên 3: Đêm
    const nightPrice = prices.find(p => p.unit_id === UNIT_IDS.NIGHT);
    if (nightPrice) return nightPrice;

    // Ưu tiên 4: Giờ
    const hourPrice = prices.find(p => p.unit_id === UNIT_IDS.HOUR);
    if (hourPrice) return hourPrice;

    // Nếu không khớp unit_id nào ở trên, lấy giá đầu tiên có được
    return prices[0];
  }

  /**
   * Định dạng chuỗi hiển thị giá kèm đơn vị
   * @param price Số tiền
   * @param unitId ID đơn vị
   * @returns Chuỗi hiển thị (ví dụ: "5.000.000đ / tháng")
   */
  formatPriceDisplay(price: number, unitId: string): string {
    const formattedAmount = price.toLocaleString('vi-VN') + 'đ';
    
    switch (unitId) {
      case UNIT_IDS.MONTH:
        return `${formattedAmount} / tháng`;
      case UNIT_IDS.DAY:
        return `${formattedAmount} / ngày`;
      case UNIT_IDS.NIGHT:
        return `${formattedAmount} / đêm`;
      case UNIT_IDS.HOUR:
        return `${formattedAmount} / giờ`;
      default:
        return formattedAmount;
    }
  }
}

export const RoomPriceService = new RoomPriceServiceClass();
export default RoomPriceService;
