/**
 * @file: EarlyCheckInService.ts
 * @description: Service xử lý nghiệp vụ check-in sớm cho lưu trú ngắn hạn.
 * Chức năng:
 * - Tính toán phí phụ thu check-in sớm
 * - Tạo bill phụ thu
 * - Cập nhật contract metadata
 * - Hỗ trợ 2 mode tính phí: % theo giá ngày hoặc số tiền cố định
 */

import {BaseService} from '../BaseService';
import {generateSequentialId} from '../../utils';
import {generateBillNumber} from '../../utils/codeGenerator';
import {QueryBuilder} from '@dqcai/sqlite';
import DatabaseManager from '../../database/DBManagers';

// ─────────────────────────────────────────────
//  Input DTOs
// ─────────────────────────────────────────────

export interface EarlyCheckInInput {
  storeId: string;
  contractId: string;
  variantId: string; // ID phòng để kiểm tra availability
  actualCheckinDateTime: string; // ISO datetime (giờ thực tế check-in)
  scheduledCheckinDateTime: string; // ISO datetime (giờ check-in chuẩn từ contract)
  surchargeMode: 'percentage' | 'fixed';
  surchargeValue: string; // giá trị do user nhập
  basePriceType: 'day' | 'hour'; // loại giá cơ sở để tính
  basePrice: number; // giá phòng ngày hoặc giờ
  overrideReason?: string; // lý do điều chỉnh (nếu khác giá gợi ý)
  cashierUserId?: string;
  sessionId?: string;
}

export interface EarlyCheckInResult {
  surchargeBillId: string;
  surchargeAmount: number;
  hoursEarly: number;
  equivalentPercentage?: number; // chỉ có khi mode='fixed'
}

export interface SurchargeCalculation {
  hoursEarly: number;
  baseAmount: number; // giá tương ứng với số giờ sớm
  surchargeAmount: number;
  equivalentPercentage: number;
  description: string;
}

// ─────────────────────────────────────────────
//  EarlyCheckInService
// ─────────────────────────────────────────────

class EarlyCheckInServiceClass {
  private contractSvc = new BaseService('pos', 'contracts');
  private billSvc = new BaseService('pos', 'bills');
  private billDetailSvc = new BaseService('pos', 'bill_details');
  private receivableSvc = new BaseService('pos', 'receivables');

  private now(): string {
    return new Date().toISOString();
  }

  /**
   * Tính số giờ sớm so với giờ check-in chuẩn (tính cả ngày giờ)
   */
  calculateHoursEarly(
    actualDateTime: string,
    scheduledDateTime: string,
  ): number {
    const actual = new Date(actualDateTime);
    const scheduled = new Date(scheduledDateTime);

    const diffMs = scheduled.getTime() - actual.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    // Nếu check-in muộn hơn hoặc đúng giờ → không có phí
    if (diffHours <= 0) {
      return 0;
    }

    return Math.ceil(diffHours); // làm tròn lên số giờ
  }

  /**
   * Kiểm tra availability của phòng trong khoảng thời gian check-in sớm
   * Phòng phải trống (không có booking hoặc occupied) trong khoảng thời gian này
   */
  private async checkAvailabilityForEarlyCheckIn(
    variantId: string,
    actualCheckinDateTime: string,
    scheduledCheckinDateTime: string,
    excludeContractId: string,
  ): Promise<void> {
    const db = DatabaseManager.get('pos');
    if (!db) {
      return; // Không thể kiểm tra, cho phép tiếp tục
    }

    const actualDate = actualCheckinDateTime.split('T')[0];
    const scheduledDate = scheduledCheckinDateTime.split('T')[0];

    // Tìm các contract khác của phòng này trong khoảng thời gian
    const conflictingContracts = await QueryBuilder.table('contracts', db.getInternalDAO())
      .select(['id', 'start_date', 'end_date', 'status'])
      .where('variant_id', variantId)
      .where('id', '!=', excludeContractId)
      .where('status', '!=', 'cancelled')
      .where('status', '!=', 'terminated')
      .where((query: any) => {
        // Contract trùng với khoảng thời gian check-in sớm
        query
          .where('start_date', '<=', scheduledDate)
          .where('end_date', '>=', actualDate);
      })
      .get();

    if (conflictingContracts.length > 0) {
      const conflict = conflictingContracts[0];
      throw new Error(
        `Phòng đã có khách đặt hoặc đang ở trong khoảng thời gian này (${conflict.start_date} - ${conflict.end_date}). Không thể check-in sớm.`
      );
    }
  }

  /**
   * Tính phụ thu theo % giá ngày
   * Formula: (dayPrice × hoursEarly / 24) × percentage / 100
   */
  calculateSurchargeByPercentage(
    percentage: number,
    dayPrice: number,
    hoursEarly: number,
  ): SurchargeCalculation {
    const dayFraction = hoursEarly / 24;
    const baseAmount = dayPrice * dayFraction;
    const surchargeAmount = baseAmount * (percentage / 100);
    const equivalentPercentage = percentage;

    return {
      hoursEarly,
      baseAmount: Math.round(baseAmount),
      surchargeAmount: Math.round(surchargeAmount),
      equivalentPercentage,
      description: `${percentage}% của giá ngày (${this.formatCurrency(baseAmount)})`,
    };
  }

  /**
   * Tính phụ thu theo số tiền cố định
   * Formula: fixedAmount (và tính % tương đương)
   */
  calculateSurchargeByFixed(
    fixedAmount: number,
    dayPrice: number,
    hoursEarly: number,
  ): SurchargeCalculation {
    const dayFraction = hoursEarly / 24;
    const baseAmount = dayPrice * dayFraction;
    const equivalentPercentage =
      baseAmount > 0 ? (fixedAmount / baseAmount) * 100 : 0;

    return {
      hoursEarly,
      baseAmount: Math.round(baseAmount),
      surchargeAmount: fixedAmount,
      equivalentPercentage: Math.round(equivalentPercentage),
      description: `Số tiền cố định (${this.formatCurrency(fixedAmount)})`,
    };
  }

  /**
   * Tính phụ thu dựa trên mode và giá trị input
   */
  calculateSurcharge(
    mode: 'percentage' | 'fixed',
    value: string,
    basePrice: number,
    basePriceType: 'day' | 'hour',
    hoursEarly: number,
  ): SurchargeCalculation {
    const numValue = parseFloat(value) || 0;

    // Nếu basePriceType là 'hour', chuyển sang giá ngày tương đương
    const dayPrice =
      basePriceType === 'hour' ? basePrice * 24 : basePrice;

    if (mode === 'percentage') {
      return this.calculateSurchargeByPercentage(numValue, dayPrice, hoursEarly);
    } else {
      return this.calculateSurchargeByFixed(numValue, dayPrice, hoursEarly);
    }
  }

  /**
   * Xử lý check-in sớm chính thức
   * Tạo bill phụ thu + cập nhật contract
   */
  async processEarlyCheckIn(
    input: EarlyCheckInInput,
  ): Promise<EarlyCheckInResult> {
    return this.contractSvc.executeTransaction(async () => {
      const {
        storeId,
        contractId,
        variantId,
        actualCheckinDateTime,
        scheduledCheckinDateTime,
        surchargeMode,
        surchargeValue,
        basePriceType,
        basePrice,
        overrideReason,
        cashierUserId,
        sessionId,
      } = input;

      // 1. Kiểm tra availability của phòng trong khoảng thời gian check-in sớm
      await this.checkAvailabilityForEarlyCheckIn(
        variantId,
        actualCheckinDateTime,
        scheduledCheckinDateTime,
        contractId,
      );

      // 2. Lấy thông tin contract
      const contract = await this.contractSvc.findById(contractId);
      if (!contract) {
        throw new Error('Contract not found');
      }

      // 3. Tính số giờ sớm
      const hoursEarly = this.calculateHoursEarly(
        actualCheckinDateTime,
        scheduledCheckinDateTime,
      );

      if (hoursEarly <= 0) {
        throw new Error('Check-in time is not early');
      }

      // 3. Tính phụ thu
      const calculation = this.calculateSurcharge(
        surchargeMode,
        surchargeValue,
        basePrice,
        basePriceType,
        hoursEarly,
      );

      const surchargeAmount = calculation.surchargeAmount;

      // 4. Tạo bill phụ thu
      const surchargeBillId = await generateSequentialId(this.billSvc, 'bill');
      const billNumber = await generateBillNumber(storeId);
      const now = this.now();

      await this.billSvc.create({
        id: surchargeBillId,
        store_id: storeId,
        customer_id: contract.customer_id,
        bill_number: billNumber,
        bill_type: 'hotel',
        ref_id: contractId,
        ref_type: 'contract',
        subtotal: surchargeAmount,
        total_amount: surchargeAmount,
        paid_amount: 0,
        remaining_amount: surchargeAmount,
        bill_status: 'issued',
        issued_at: now,
        due_at: now.split('T')[0], // hạn thanh toán = ngày hôm nay
        notes: 'Phụ thu check-in sớm',
        cashier_user_id: cashierUserId || null,
        session_id: sessionId || null,
        sync_status: 'local',
        metadata: JSON.stringify({
          type: 'early_checkin',
          actual_checkin_datetime: actualCheckinDateTime,
          scheduled_checkin_datetime: scheduledCheckinDateTime,
          hours_early: hoursEarly,
          calculation_mode: surchargeMode,
          calculation_value: parseFloat(surchargeValue),
          base_price_type: basePriceType,
          base_price: basePrice,
          override_reason: overrideReason || null,
        }),
        created_at: now,
        updated_at: now,
      });

      // 5. Tạo bill_detail cho dòng phụ thu
      const billDetailId = await generateSequentialId(
        this.billDetailSvc,
        'bdt',
      );
      await this.billDetailSvc.create({
        id: billDetailId,
        store_id: storeId,
        bill_id: surchargeBillId,
        line_description: `Phụ thu check-in sớm (${hoursEarly} giờ)`,
        quantity: 1,
        unit_price: surchargeAmount,
        amount: surchargeAmount,
        tax_rate: 0,
        tax_amount: 0,
        sort_order: 1,
        sync_status: 'local',
        created_at: now,
        updated_at: now,
      });

      // 6. Tạo receivable cho phụ thu
      const receivableCode = await this.generateReceivableCode(storeId);
      const receivableId = await generateSequentialId(
        this.receivableSvc,
        'rec',
      );
      await this.receivableSvc.create({
        id: receivableId,
        store_id: storeId,
        customer_id: contract.customer_id,
        contract_id: contractId,
        bill_id: surchargeBillId,
        receivable_code: receivableCode,
        receivable_type: 'surcharge',
        description: 'Phụ thu check-in sớm',
        amount: surchargeAmount,
        due_date: now.split('T')[0],
        status: 'pending',
        created_at: now,
        updated_at: now,
      });

      // 7. Cập nhật contract metadata
      const existingMetadata = contract.metadata
        ? JSON.parse(contract.metadata)
        : {};
      await this.contractSvc.update(contractId, {
        metadata: JSON.stringify({
          ...existingMetadata,
          early_checkin: {
            actual_checkin_datetime: actualCheckinDateTime,
            scheduled_checkin_datetime: scheduledCheckinDateTime,
            hours_early: hoursEarly,
            surcharge_bill_id: surchargeBillId,
            surcharge_amount: surchargeAmount,
            processed_at: now,
          },
        }),
        status: 'active', // chuyển từ 'booked' sang 'active'
        updated_at: now,
      });

      return {
        surchargeBillId,
        surchargeAmount,
        hoursEarly,
        equivalentPercentage: calculation.equivalentPercentage,
      };
    });
  }

  /**
   * Tạo mã receivable cho phụ thu
   */
  private async generateReceivableCode(storeId: string): Promise<string> {
    const db = DatabaseManager.get('pos');
    if (!db) {
      return 'REC-0001';
    }

    const result = await QueryBuilder.table('receivables', db.getInternalDAO())
      .select(['receivable_code'])
      .where('store_id', storeId)
      .orderBy('created_at', 'DESC')
      .first();

    if (!result) {
      return 'REC-0001';
    }

    const lastCode = result.receivable_code;
    const num = parseInt(lastCode.split('-')[1], 10);
    return `REC-${String(num + 1).padStart(4, '0')}`;
  }

  /**
   * Format số tiền
   */
  private formatCurrency(amount: number): string {
    return amount.toLocaleString('vi-VN') + 'đ';
  }

  /**
   * Lấy thông tin check-in sớm từ contract metadata
   */
  getEarlyCheckInInfo(contractId: string): any {
    return this.contractSvc.findById(contractId).then(contract => {
      if (!contract || !contract.metadata) {
        return null;
      }
      const metadata = JSON.parse(contract.metadata);
      return metadata.early_checkin || null;
    });
  }
}

export const EarlyCheckInService = new EarlyCheckInServiceClass();
