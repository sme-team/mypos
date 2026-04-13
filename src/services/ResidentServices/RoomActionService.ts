import { BaseService } from '../BaseService';
import { generateUID } from '../../utils';
import { ShortTermPriceService } from './ShortTermPriceService';
import { ReceivableService } from './ReceivableService';
import {
  generateCustomerCode,
  generateContractCode,
  generateBillNumber,
  generateReceivableCode,
} from '../../utils/codeGenerator';
import { QueryBuilder } from '@dqcai/sqlite';
import DatabaseManager from '../../database/DBManagers';

// ─────────────────────────────────────────────
//  Base services (mỗi bảng 1 class)
// ─────────────────────────────────────────────

class ContractService extends BaseService {
  constructor() { super('pos', 'contracts'); }
}

class ContractMemberService extends BaseService {
  constructor() { super('pos', 'contract_members'); }
}

class CustomerService extends BaseService {
  constructor() { super('pos', 'customers'); }
}

class ResidentService extends BaseService {
  constructor() { super('pos', 'residents'); }
}

class BillService extends BaseService {
  constructor() { super('pos', 'bills'); }
}

class BillDetailService extends BaseService {
  constructor() { super('pos', 'bill_details'); }
}

class PaymentService extends BaseService {
  constructor() { super('pos', 'payments'); }
}

class ReceivableServiceClass extends BaseService {
  constructor() { super('pos', 'receivables'); }
}

// ─────────────────────────────────────────────
//  Input DTOs
// ─────────────────────────────────────────────

/** Màn hình 2A — Đặt phòng dài hạn (hỗ trợ cả khách cũ và mới) */
export interface LongTermCheckInInput {
  storeId: string;
  variantId: string;
  productId: string;
  customerId?: string;           // Nếu có → dùng khách cũ. Nếu không → tạo mới từ các field dưới.
  // Thông tin khách mới (nếu customerId rỗng)
  fullName?: string;
  phone?: string;
  idNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  email?: string;
  nationality?: string;
  address?: string;
  idCardFrontUrl?: string;
  idCardBackUrl?: string;

  contractNumber?: string;
  startDate: string;            // YYYY-MM-DD
  durationMonths?: number;      // mặc định 12
  rentAmount: number;
  depositAmount?: number;
  electricReadingInit?: number;
  waterReadingInit?: number;
  electricRate?: number;
  water_rate?: number;
  billingDay?: number;          // ngày xuất bill hàng tháng, mặc định 1
  notes?: string;
  // Dịch vụ thêm
  extraServices?: Array<{
    productId: string;
    variantId?: string;
    unitId?: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  // Trả cọc ngay không?
  payDepositNow?: boolean;
  depositPaymentMethod?: 'cash' | 'bank_transfer' | 'e_wallet';
}

/** Màn hình 2B — Đặt phòng ngắn hạn (hỗ trợ cả khách cũ và mới) */
export interface ShortTermCheckInInput {
  storeId: string;
  variantId: string;
  productId: string;
  customerId?: string;           // Nếu có → dùng khách cũ. Nếu không → tạo mới từ các field dưới.
  // Khách mới — sẽ INSERT vào customers + residents
  fullName?: string;
  phone?: string;
  idNumber?: string;
  // Trường ẩn từ QR CCCD (chỉ lưu DB, không hiện UI)
  dateOfBirth?: string;    // Ngày sinh (DD/MM/YYYY)
  gender?: string;         // Giới tính ('Nam' | 'Nữ')
  email?: string;
  nationality?: string;
  address?: string;        // Địa chỉ thường trú
  idCardFrontUrl?: string;
  idCardBackUrl?: string;
  // Thông tin đặt phòng
  checkinDate: string;          // YYYY-MM-DD
  checkinTime: string;          // HH:mm (bắt buộc)
  checkoutDate: string;
  checkoutTime: string;         // HH:mm (bắt buộc)
  adults?: number;
  children?: number;
  depositAmount?: number;
  notes?: string;
  extraServices?: Array<{
    productId: string;
    variantId?: string;
    unitId?: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  payDepositNow?: boolean;
  depositPaymentMethod?: 'cash' | 'bank_transfer' | 'e_wallet';
}

/** Màn hình 3 — Chỉnh sửa thông tin phòng / khách */
export interface EditRoomDetailsInput {
  storeId: string;
  variantId: string;            // dùng để tìm contract active
  // Thông tin khách
  fullName?: string;
  phone?: string;
  idNumber?: string;
  // Thông tin hợp đồng
  rentAmount?: number;
  electricRate?: number;
  waterRate?: number;
  electricReadingInit?: number;
  waterReadingInit?: number;
  endDate?: string;
  notes?: string;
}

/** Màn hình 3 — Thu tiền tháng */
export interface CollectMonthlyPaymentInput {
  storeId: string;
  variantId: string;
  electricNew: number;
  waterNew: number;
  notes?: string;
  adults?: number;
  children?: number;
  extraServices?: Array<{
    productId?: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
}

// ─────────────────────────────────────────────
//  RoomActionService
// ─────────────────────────────────────────────

class RoomActionServiceClass {
  private contractSvc = new ContractService();
  private contractMemberSvc = new ContractMemberService();
  private customerSvc = new CustomerService();
  private residentSvc = new ResidentService();
  private billSvc = new BillService();
  private billDetailSvc = new BillDetailService();
  private paymentSvc = new PaymentService();
  private receivableSvc = new ReceivableServiceClass();

  // ── helpers ─────────────────────────────────

  /**
   * Lấy cycle_id từ bảng bill_cycles theo cycle_code
   */
  private async getCycleId(storeId: string, cycleCode: 'daily' | 'monthly'): Promise<string | null> {
    const db = DatabaseManager.get('pos');
    if (!db) return null;

    const result = await QueryBuilder.table('bill_cycles', db.getInternalDAO())
      .select(['id'])
      .where('store_id', storeId)
      .where('cycle_code', cycleCode)
      .where('status', 'active')
      .first();

    return result?.id || null;
  }

  private calcEndDate(startDate: string, months: number): string {
    const d = new Date(startDate);
    // Nếu là 12 tháng (1 năm), dùng logic 365 ngày theo yêu cầu người dùng
    if (months === 12) {
      d.setDate(d.getDate() + 365);
    } else {
      d.setMonth(d.getMonth() + months);
    }
    return d.toISOString().split('T')[0];
  }

  private calcNights(checkin: string, checkout: string): number {
    const ms = new Date(checkout).getTime() - new Date(checkin).getTime();
    return Math.max(1, Math.round(ms / 86_400_000));
  }

  private now(): string { return new Date().toISOString(); }
  /** Tạo bill_details rows từ mảng dịch vụ thêm */
  private async insertExtraServices(
    billId: string,
    storeId: string,
    services: any,
    startOrder = 10,
  ): Promise<number> {
    if (!services || services.length === 0) return 0;
    let totalSvcAmount = 0;
    for (let i = 0; i < services.length; i++) {
      const svc = services[i];
      const amount = svc.quantity * svc.unitPrice;
      totalSvcAmount += amount;
      await this.billDetailSvc.create({
        id: generateUID('BDT'),
        store_id: storeId,
        bill_id: billId,
        product_id: svc.productId,
        variant_id: svc.variantId ?? null,
        unit_id: svc.unitId ?? null,
        line_description: svc.name,
        quantity: svc.quantity,
        unit_price: svc.unitPrice,
        amount: amount,
        sort_order: startOrder + i,
        sync_status: 'local',
        created_at: this.now(),
        updated_at: this.now(),
      });
    }
    return totalSvcAmount;
  }

  /**
   * Đảm bảo có customerId (nếu chưa có thì tạo mới)
   */
  private async ensureCustomer(input: any, now: string): Promise<string> {
    if (input.customerId && input.customerId !== '') {
      return input.customerId;
    }

    const customerId = generateUID('CUST');
    const customerCode = await generateCustomerCode(input.storeId);
    
    await this.customerSvc.create({
      id: customerId,
      store_id: input.storeId,
      customer_code: customerCode,
      full_name: input.fullName || '--',
      phone: input.phone || '',
      id_number: input.idNumber || '',
      date_of_birth: input.dateOfBirth || null,
      gender: input.gender ? (input.gender === 'Nam' ? 'male' : input.gender === 'Nữ' ? 'female' : 'other') : null,
      email: input.email || null,
      nationality: input.nationality || 'VN',
      address: input.address || null,
      status: 'active',
      created_at: now,
      updated_at: now,
    });

    await this.residentSvc.create({
      id: generateUID('RES'),
      store_id: input.storeId,
      customer_id: customerId,
      id_card_front_url: input.idCardFrontUrl || '',
      id_card_back_url: input.idCardBackUrl || '',
      temp_residence_from: input.checkinDate || input.startDate,
      temp_residence_to: input.checkoutDate || null,
      status: 1,
      created_at: now,
    });

    return customerId;
  }

  /**
   * Tăng số cuối của mã (VD: HD-0001 -> HD-0002)
   */
  private incrementCode(code: string): string {
    const parts = code.split('-');
    if (parts.length === 0) return code;
    const lastPart = parts[parts.length - 1];
    const num = parseInt(lastPart, 10);
    if (isNaN(num)) return code + '-1';
    
    parts[parts.length - 1] = String(num + 1).padStart(lastPart.length, '0');
    return parts.join('-');
  }

  // ── Màn hình 2A: Check-in dài hạn ───────────

  /**
   * Tạo hợp đồng dài hạn cho khách cũ.
   * INSERT: contracts, contract_members, bills (deposit), bill_details, payments?
   */
  async checkInLongTerm(input: LongTermCheckInInput): Promise<{ contractId: string; billId: string }> {
    return this.contractSvc.executeTransaction(async () => {
      const now = this.now();
      const contractId = generateUID('CTR');
      const depositBillId = generateUID('BILL');

      const endDate = this.calcEndDate(
        input.startDate,
        input.durationMonths ?? 12,
      );

      // Generate codes
      const contractCode = await generateContractCode(input.storeId);
      const depositBillNumber = await generateBillNumber(input.storeId);
      const rentBillNumber = this.incrementCode(depositBillNumber);

      // Lấy cycle_id cho dài hạn (monthly)
      const cycleId = await this.getCycleId(input.storeId, 'monthly');

      // Tính tổng dịch vụ
      const svcAmount = (input.extraServices ?? []).reduce((s, sv) => s + sv.quantity * sv.unitPrice, 0);

      // 0. Đảm bảo có customerId
      const customerId = await this.ensureCustomer(input, now);

      // 1. contracts
      await this.contractSvc.create({
        id: contractId,
        store_id: input.storeId,
        contract_number: contractCode,
        customer_id: customerId,
        product_id: input.productId,
        variant_id: input.variantId,
        start_date: input.startDate,
        end_date: endDate,
        signed_date: now.split('T')[0],
        rent_amount: input.rentAmount,
        deposit_amount: input.depositAmount ?? 0,
        electric_rate: input.electricRate ?? 0,
        water_rate: input.water_rate ?? 0,
        electric_reading_init: input.electricReadingInit ?? 0,
        water_reading_init: input.waterReadingInit ?? 0,
        billing_day: input.billingDay ?? 1,
        cycle_id: cycleId,
        status: 'active',
        notes: input.notes ?? '',
        created_at: now,
        updated_at: now,
      });

      // 2. contract_members (người thuê chính)
      await this.contractMemberSvc.create({
        id: generateUID('CM'),
        store_id: input.storeId,
        contract_id: contractId,
        customer_id: customerId,
        is_primary: true,
        joined_date: input.startDate,
        created_at: now,
        updated_at: now,
      });

      // 3. Bill đầu kỳ (Cọc)
      const depositAmount = input.depositAmount ?? 0;

      if (depositAmount > 0) {
        await this.billSvc.create({
          id: depositBillId,
          store_id: input.storeId,
          customer_id: customerId,
          bill_number: depositBillNumber,
          bill_type: 'deposit',
          ref_id: contractId,
          ref_type: 'contract',
          subtotal: depositAmount,
          total_amount: depositAmount,
          paid_amount: 0,
          remaining_amount: depositAmount,
          bill_status: 'issued',
          issued_at: now,
          sync_status: 'local',
          created_at: now,
          updated_at: now,
        });

        // 3.1 bill_details — dòng tiền cọc
        await this.billDetailSvc.create({
          id: generateUID('BDT'),
          store_id: input.storeId,
          bill_id: depositBillId,
          line_description: 'Tiền đặt cọc',
          quantity: 1,
          unit_price: depositAmount,
          amount: depositAmount,
          sort_order: 1,
          sync_status: 'local',
          created_at: now,
          updated_at: now,
        });

        // 3.2 Receivable cho cọc
        const receivableCodeDeposit = await generateReceivableCode(input.storeId);
        await this.receivableSvc.create({
          id: generateUID('REC'),
          store_id: input.storeId,
          customer_id: customerId,
          contract_id: contractId,
          bill_id: depositBillId,
          receivable_code: receivableCodeDeposit,
          receivable_type: 'deposit',
          description: 'Tiền đặt cọc phòng dài hạn',
          amount: depositAmount,
          due_date: input.startDate,
          status: 'pending',
          created_at: now,
          updated_at: now,
        });
      }

      // 4. Bill Tiền nhà (RENT BILL)
      const rentBillId = generateUID('BILL');
      const totalRentBill = input.rentAmount + svcAmount;

      await this.billSvc.create({
        id: rentBillId,
        store_id: input.storeId,
        customer_id: customerId,
        bill_number: rentBillNumber,
        bill_type: 'rent',
        ref_id: contractId,
        ref_type: 'contract',
        cycle_id: cycleId,
        cycle_period_from: input.startDate,
        cycle_period_to: endDate,
        subtotal: totalRentBill,
        total_amount: totalRentBill,
        paid_amount: 0,
        remaining_amount: totalRentBill,
        bill_status: 'issued',
        issued_at: now,
        sync_status: 'local',
        created_at: now,
        updated_at: now,
      });

      // 6. bill_details cho bill tiền nhà
      // - Dòng tiền phòng
      await this.billDetailSvc.create({
        id: generateUID('BDT'),
        store_id: input.storeId,
        bill_id: rentBillId,
        line_description: 'Tiền thuê phòng (tháng đầu)',
        quantity: 1,
        unit_price: input.rentAmount,
        amount: input.rentAmount,
        sort_order: 1,
        sync_status: 'local',
        created_at: now,
        updated_at: now,
      });

      // - Dòng dịch vụ thêm
      await this.insertExtraServices(rentBillId, input.storeId, input.extraServices, 10);

      // 6. Receivable cho tiền nhà
      let receivableCodeRent = await generateReceivableCode(input.storeId);
      // Nếu đã có bill cọc -> mã receivable tiếp theo phải tăng lên
      if (depositAmount > 0) {
        receivableCodeRent = this.incrementCode(receivableCodeRent);
      }

      await this.receivableSvc.create({
        id: generateUID('REC'),
        store_id: input.storeId,
        customer_id: customerId,
        contract_id: contractId,
        bill_id: rentBillId,
        receivable_code: receivableCodeRent,
        receivable_type: 'rent',
        description: 'Tiền thuê phòng và dịch vụ dài hạn',
        amount: totalRentBill,
        due_date: input.startDate,
        status: 'pending',
        created_at: now,
        updated_at: now,
      });

      // 7. Thanh toán tiền cọc ngay (nếu có)
      if (input.payDepositNow && depositAmount > 0) {
        await this.paymentSvc.create({
          id: generateUID('PAY'),
          store_id: input.storeId,
          bill_id: depositBillId,
          payment_method: input.depositPaymentMethod ?? 'cash',
          amount: depositAmount,
          paid_at: now,
          status: 'success',
          sync_status: 'local',
          created_at: now,
          updated_at: now,
        });
        // Cập nhật bill đã thanh toán
        await this.billSvc.update(depositBillId, {
          paid_amount: depositAmount,
          remaining_amount: 0,
          bill_status: 'paid',
          updated_at: now,
        });

        // Cập nhật receivable cọc thành paid
        const depositReceivables = await this.receivableSvc.findAll({
          bill_id: depositBillId,
          store_id: input.storeId,
        });
        if (depositReceivables.length > 0) {
          await this.receivableSvc.update(depositReceivables[0].id, {
            status: 'paid',
            updated_at: now,
          });
        }
      }

      return { contractId, billId: rentBillId };
    });
  }

  // ── Màn hình 2B: Check-in ngắn hạn ──────────

  /**
   * Tạo hợp đồng ngắn hạn + khách mới.
   * INSERT: customers, residents, contracts, contract_members, bills, bill_details, payments?
   */
  async checkInShortTerm(input: ShortTermCheckInInput): Promise<{ customerId: string; contractId: string; billId: string }> {
    return this.contractSvc.executeTransaction(async () => {
      const now = this.now();
      const contractId = generateUID('CTR');
      const depositBillId = generateUID('BILL');
      let rentBillId = generateUID('BILL_RENT');

      // Tính giá ngắn hạn theo logic mới (giờ/ngày/đêm)
      const priceResult = await ShortTermPriceService.calculatePrice({
        checkinDate: input.checkinDate,
        checkinTime: input.checkinTime,
        checkoutDate: input.checkoutDate,
        checkoutTime: input.checkoutTime,
        variantId: input.variantId,
        productId: input.productId,
        storeId: input.storeId,
      });

      const rentAmount = priceResult.totalAmount;
      const svcAmount = (input.extraServices ?? []).reduce((s, sv) => s + sv.quantity * sv.unitPrice, 0);
      // 0. Đảm bảo có customerId
      const customerId = await this.ensureCustomer(input, now);
      const totalSpent = rentAmount + svcAmount;

      // Generate codes
      const contractCode = await generateContractCode(input.storeId);
      const depositBillNumber = await generateBillNumber(input.storeId);
      const rentBillNumber = this.incrementCode(depositBillNumber);

      // Metadata lưu trữ thông tin thời gian checkin/checkout
      const metadata = JSON.stringify({
        checkin_time: input.checkinTime,
        checkout_time: input.checkoutTime,
        adults: input.adults || 1,
        children: input.children || 0,
        price_description: priceResult.description,
      });


      // 3. contracts (dùng chung bảng, end_date = checkout)
      // Lấy cycle_id cho ngắn hạn (daily)
      const cycleId = await this.getCycleId(input.storeId, 'daily');

      await this.contractSvc.create({
        id: contractId,
        store_id: input.storeId,
        contract_number: contractCode,
        customer_id: customerId,
        product_id: input.productId,
        variant_id: input.variantId,
        start_date: input.checkinDate,
        end_date: input.checkoutDate,
        signed_date: now.split('T')[0], // YYYY-MM-DD
        rent_amount: rentAmount,
        deposit_amount: input.depositAmount ?? 0,
        electric_rate: 0,
        water_rate: 0,
        billing_day: 1,
        cycle_id: cycleId,
        electric_reading_init: 0,
        water_reading_init: 0,
        status: 'active',
        notes: input.notes ?? '',
        metadata,          // adults, children, checkin_time, checkout_time
        created_at: now,
        updated_at: now,
      });

      // 4. contract_members
      await this.contractMemberSvc.create({
        id: generateUID('CM'),
        store_id: input.storeId,
        contract_id: contractId,
        customer_id: customerId,
        is_primary: true,
        joined_date: input.checkinDate,
        created_at: now,
        updated_at: now,
      });

      // 5. Bill (đặt cọc đầu kỳ cho ngắn hạn)
      const depositAmount = input.depositAmount ?? 0;
      const depositTotal = depositAmount;

      if (depositAmount > 0) {
        await this.billSvc.create({
          id: depositBillId,
          store_id: input.storeId,
          customer_id: customerId,
          bill_number: depositBillNumber,
          bill_type: 'deposit',
          ref_id: contractId,
          ref_type: 'contract',
          cycle_period_from: input.checkinDate,
          cycle_period_to: input.checkoutDate,
          subtotal: depositTotal,
          total_amount: depositTotal,
          paid_amount: 0,
          remaining_amount: depositTotal,
          bill_status: 'issued',
          issued_at: now,
          sync_status: 'local',
          created_at: now,
          updated_at: now,
        });

        // 5.1 Receivable cho cọc
        const receivableCodeDeposit = await generateReceivableCode(input.storeId);
        await this.receivableSvc.create({
          id: generateUID('REC'),
          store_id: input.storeId,
          customer_id: customerId,
          contract_id: contractId,
          bill_id: depositBillId,
          receivable_code: receivableCodeDeposit,
          receivable_type: 'deposit',
          description: 'Tiền đặt cọc phòng ngắn hạn',
          amount: depositAmount,
          due_date: input.checkinDate,
          status: 'pending',
          created_at: now,
          updated_at: now,
        });
      }

      // 6. Bill Tiền nhà & Dịch vụ ngắn hạn (RENT BILL)
      rentBillId = generateUID('BILL');
      const totalRentBill = rentAmount + svcAmount;

      await this.billSvc.create({
        id: rentBillId,
        store_id: input.storeId,
        customer_id: customerId,
        bill_number: rentBillNumber,
        bill_type: 'rent',
        ref_id: contractId,
        ref_type: 'contract',
        subtotal: totalRentBill,
        total_amount: totalRentBill,
        paid_amount: 0,
        remaining_amount: totalRentBill,
        bill_status: 'issued',
        issued_at: now,
        sync_status: 'local',
        created_at: now,
        updated_at: now,
      });

      // 7. bill_details (Tiền phòng)
      const nights = Math.ceil(priceResult.totalHours / 24);
      await this.billDetailSvc.create({
        id: generateUID('BDT'),
        store_id: input.storeId,
        bill_id: rentBillId,
        line_description: `Tiền thuê phòng ngắn hạn (${priceResult.description})`,
        quantity: nights > 0 ? nights : 1,
        unit_price: rentAmount / (nights > 0 ? nights : 1),
        amount: rentAmount,
        sort_order: 1,
        sync_status: 'local',
        created_at: now,
        updated_at: now,
      });

      // 8. Dịch vụ thêm
      await this.insertExtraServices(rentBillId, input.storeId, input.extraServices, 10);

      // 9. Receivable cho tiền phòng
      let receivableCodeRent = await generateReceivableCode(input.storeId);
      if (depositAmount > 0) {
        receivableCodeRent = this.incrementCode(receivableCodeRent);
      }

      await this.receivableSvc.create({
        id: generateUID('REC'),
        store_id: input.storeId,
        customer_id: customerId,
        contract_id: contractId,
        bill_id: rentBillId,
        receivable_code: receivableCodeRent,
        receivable_type: 'rent',
        description: 'Tiền thuê phòng và dịch vụ ngắn hạn',
        amount: totalRentBill,
        due_date: input.checkinDate,
        status: 'pending',
        created_at: now,
        updated_at: now,
      });

      // 10. Thanh toán cọc ngay
      if (input.payDepositNow && depositAmount > 0) {
        await this.paymentSvc.create({
          id: generateUID('PAY'),
          store_id: input.storeId,
          bill_id: depositBillId,
          payment_method: input.depositPaymentMethod ?? 'cash',
          amount: depositAmount,
          paid_at: now,
          status: 'success',
          sync_status: 'local',
          created_at: now,
          updated_at: now,
        });
        await this.billSvc.update(depositBillId, {
          paid_amount: depositAmount,
          remaining_amount: 0,
          bill_status: 'paid',
          updated_at: now,
        });

        // Cập nhật receivable cọc thành paid
        const depositReceivables = await this.receivableSvc.findAll({
          bill_id: depositBillId,
          store_id: input.storeId,
        });
        if (depositReceivables.length > 0) {
          await this.receivableSvc.update(depositReceivables[0].id, {
            status: 'paid',
            updated_at: now,
          });
        }
      }

      return { customerId, contractId, billId: rentBillId };
    });
  }

  // ── Màn hình 3: Chỉnh sửa thông tin ─────────

  /**
   * Cập nhật thông tin khách thuê + hợp đồng.
   * UPDATE: customers, contracts
   */
  async editRoomDetails(input: EditRoomDetailsInput): Promise<void> {
    const now = this.now();

    // 1. Tìm hợp đồng active của variant
    const contracts = await this.contractSvc.findAll(
      { variant_id: input.variantId, status: 'active', store_id: input.storeId },
      { columns: ['id', 'customer_id'] },
    );
    const contract = contracts.length > 0 ? contracts[0] : null;
    if (!contract) throw new Error('Không tìm thấy hợp đồng đang hoạt động');

    await this.contractSvc.executeTransaction(async () => {
      // 2. Cập nhật thông tin khách
      if (input.fullName || input.phone || input.idNumber) {
        const customerUpdate: Record<string, any> = { updated_at: now };
        if (input.fullName) customerUpdate.full_name = input.fullName;
        if (input.phone) customerUpdate.phone = input.phone;
        if (input.idNumber) customerUpdate.id_number = input.idNumber;
        await this.customerSvc.update(contract.customer_id, customerUpdate);
      }

      // 3. Cập nhật hợp đồng
      const contractUpdate: Record<string, any> = { updated_at: now };
      if (input.rentAmount != null) contractUpdate.rent_amount = input.rentAmount;
      if (input.electricRate != null) contractUpdate.electric_rate = input.electricRate;
      if (input.waterRate != null) contractUpdate.water_rate = input.waterRate;
      if (input.electricReadingInit != null) contractUpdate.electric_reading_init = input.electricReadingInit;
      if (input.waterReadingInit != null) contractUpdate.water_reading_init = input.waterReadingInit;
      if (input.endDate) contractUpdate.end_date = input.endDate;
      if (input.notes != null) contractUpdate.notes = input.notes;

      await this.contractSvc.update(contract.id, contractUpdate);
    });
  }

  // ── Màn hình 3: Gia hạn hợp đồng ────────────

  /**
   * Gia hạn hợp đồng thêm N tháng.
   * UPDATE contracts.end_date
   */
  async extendContract(
    storeId: string,
    variantId: string,
    extraMonths: number,
  ): Promise<void> {
    const contracts = await this.contractSvc.findAll(
      { variant_id: variantId, status: 'active', store_id: storeId },
      { columns: ['id', 'end_date'] },
    );
    const contract = contracts.length > 0 ? contracts[0] : null;
    if (!contract) throw new Error('Không tìm thấy hợp đồng đang hoạt động');

    const newEndDate = this.calcEndDate(contract.end_date, extraMonths);
    await this.contractSvc.update(contract.id, {
      end_date: newEndDate,
      updated_at: this.now(),
    });
  }

  // ── Màn hình 3: Đổi phòng ───────────────────

  /**
   * Đổi phòng: cập nhật contracts.variant_id + product_id.
   * Nếu đổi giá thì cập nhật thêm rent_amount.
   * UPDATE contracts
   */
  async swapRoom(
    storeId: string,
    currentVariantId: string,
    newVariantId: string,
    newProductId: string,
    newRentAmount?: number,
  ): Promise<void> {
    const contracts = await this.contractSvc.findAll(
      { variant_id: currentVariantId, status: 'active', store_id: storeId },
      { columns: ['id'] },
    );
    const contract = contracts.length > 0 ? contracts[0] : null;
    if (!contract) throw new Error('Không tìm thấy hợp đồng đang hoạt động');

    const updateData: Record<string, any> = {
      variant_id: newVariantId,
      product_id: newProductId,
      updated_at: this.now(),
    };
    if (newRentAmount != null) updateData.rent_amount = newRentAmount;

    await this.contractSvc.update(contract.id, updateData);
  }

  // ── Màn hình 3: Check-out ────────────────────

  /**
   * Trả phòng.
   * UPDATE: contracts (terminated), contract_members (left_date), bills (issued)
   */
  async checkOut(storeId: string, variantId: string): Promise<void> {
    const contracts = await this.contractSvc.findAll(
      { variant_id: variantId, status: 'active', store_id: storeId },
      { columns: ['id', 'customer_id'] },
    );
    const contract = contracts.length > 0 ? contracts[0] : null;
    if (!contract) throw new Error('Không tìm thấy hợp đồng đang hoạt động');

    const today = new Date().toISOString().split('T')[0];
    const now = this.now();

    await this.contractSvc.executeTransaction(async () => {
      // 1. Kết thúc hợp đồng
      await this.contractSvc.update(contract.id, {
        status: 'terminated',
        terminated_date: today,
        updated_at: now,
      });

      // 2. Cập nhật left_date cho tất cả thành viên hợp đồng
      const members = await this.contractMemberSvc.findAll(
        { contract_id: contract.id },
        { columns: ['id'] },
      );
      for (const m of members) {
        await this.contractMemberSvc.update(m.id, {
          left_date: today,
          updated_at: now,
        });
      }

      // 3. Phát hành bill chốt cuối kỳ
      const bills = await this.billSvc.findAll(
        { ref_id: contract.id, ref_type: 'contract', bill_status: 'draft' },
        { columns: ['id'] },
      );
      for (const b of bills) {
        await this.billSvc.update(b.id, {
          bill_status: 'issued',
          issued_at: now,
          due_at: now,
          updated_at: now,
        });
      }
    });
  }

  // ── Màn hình 3: Thu tiền tháng ───────────────

  /**
   * Tạo bill thu tiền tháng cho nhà trọ dài hạn.
   * SELECT contracts, bills (để lấy chỉ số điện nước kỳ trước).
   * INSERT bills, bill_details.
   */
  async collectMonthlyPayment(
    input: CollectMonthlyPaymentInput,
  ): Promise<{ billId: string; total: number }> {
    const contracts = await this.contractSvc.findAll(
      { variant_id: input.variantId, status: 'active', store_id: input.storeId },
    );
    const contract = contracts.length > 0 ? contracts[0] : null;
    if (!contract) throw new Error('Không tìm thấy hợp đồng đang hoạt động');

    // Chỉ số điện nước kỳ trước (lấy từ bill_details gần nhất)
    const prevBills = await this.billSvc.findAll(
      { ref_id: contract.id, ref_type: 'contract', store_id: input.storeId },
      { orderBy: [{ name: 'issued_at', order: 'DESC' }], limit: 1 },
    );
    let prevElectric = contract.electric_reading_init ?? 0;
    let prevWater = contract.water_reading_init ?? 0;

    if (prevBills.length > 0) {
      const prevDetails = await this.billDetailSvc.findAll(
        { bill_id: prevBills[0].id },
      );
      const eDet = prevDetails.find((d: any) =>
        d.line_description?.includes('điện') || d.line_description?.includes('Điện'),
      );
      const wDet = prevDetails.find((d: any) =>
        d.line_description?.includes('nước') || d.line_description?.includes('Nước'),
      );
      if (eDet?.reading_to != null) prevElectric = eDet.reading_to;
      if (wDet?.reading_to != null) prevWater = wDet.reading_to;
    }

    // Tính toán tiền điện nước
    const eUsage = Math.max(0, input.electricNew - prevElectric);
    const wUsage = Math.max(0, input.waterNew - prevWater);
    const eAmount = eUsage * (contract.electric_rate ?? 0);
    const wAmount = wUsage * (contract.water_rate ?? 0);
    const svcAmount = (input.extraServices ?? []).reduce(
      (s, sv) => s + sv.quantity * sv.unitPrice, 0,
    );
    const total = (contract.rent_amount ?? 0) + eAmount + wAmount + svcAmount;

    return this.billSvc.executeTransaction(async () => {
      const now = this.now();
      const billId = generateUID('BILL');

      // 0. Update Contract Metadata (optional but recommended for persistence)
      const newMeta = JSON.stringify({
        adults: input.adults ?? 1,
        children: input.children ?? 0,
        notes: input.notes ?? '',
      });
      await this.contractSvc.update(contract.id, {
        metadata: newMeta,
        updated_at: now,
      });

      // 1. Tạo bill
      await this.billSvc.create({
        id: billId,
        store_id: input.storeId,
        customer_id: contract.customer_id,
        bill_number: `HD-CYC-${Date.now()}`,
        bill_type: 'cycle',
        ref_id: contract.id,
        ref_type: 'contract',
        subtotal: total,
        total_amount: total,
        paid_amount: 0,
        remaining_amount: total,
        bill_status: 'issued',
        issued_at: now,
        notes: input.notes, // Save user notes to bill
        sync_status: 'local',
        created_at: now,
        updated_at: now,
      });

      let sortOrder = 1;

      // 2. Dòng tiền phòng
      await this.billDetailSvc.create({
        id: generateUID('BDT'),
        store_id: input.storeId,
        bill_id: billId,
        line_description: 'Tiền phòng',
        quantity: 1,
        unit_price: contract.rent_amount ?? 0,
        amount: contract.rent_amount ?? 0,
        sort_order: sortOrder++,
        sync_status: 'local',
        created_at: now,
        updated_at: now,
      });

      // 3. Dòng tiền điện
      await this.billDetailSvc.create({
        id: generateUID('BDT'),
        store_id: input.storeId,
        bill_id: billId,
        line_description: `Tiền điện (Cũ: ${prevElectric} / Mới: ${input.electricNew})`,
        quantity: eUsage,
        unit_price: contract.electric_rate ?? 0,
        reading_from: prevElectric,
        reading_to: input.electricNew,
        amount: eAmount,
        sort_order: sortOrder++,
        sync_status: 'local',
        created_at: now,
        updated_at: now,
      });

      // 4. Dòng tiền nước
      await this.billDetailSvc.create({
        id: generateUID('BDT'),
        store_id: input.storeId,
        bill_id: billId,
        line_description: `Tiền nước (Cũ: ${prevWater} / Mới: ${input.waterNew})`,
        quantity: wUsage,
        unit_price: contract.water_rate ?? 0,
        reading_from: prevWater,
        reading_to: input.waterNew,
        amount: wAmount,
        sort_order: sortOrder++,
        sync_status: 'local',
        created_at: now,
        updated_at: now,
      });

      // 5. Dịch vụ thêm (Nếu có trong input)
      if ((input as any).extraServices) {
        await this.insertExtraServices(
          billId, input.storeId, (input as any).extraServices, sortOrder,
        );
      }

      return { billId, total };
    });
  }
}

// ─────────────────────────────────────────────
//  Singleton export
// ─────────────────────────────────────────────

export const RoomActionService = new RoomActionServiceClass();
export default RoomActionService;