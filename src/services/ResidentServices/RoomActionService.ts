import {BaseService} from '../BaseService';
import {generateSequentialId} from '../../utils';
import {ShortTermPriceService} from './ShortTermPriceService';
import {ReceivableService} from './ReceivableService';
import {
  generateCustomerCode,
  generateContractCode,
  generateBillNumber,
  generateReceivableCode,
} from '../../utils/codeGenerator';
import {QueryBuilder} from '@dqcai/sqlite';
import DatabaseManager from '../../database/DBManagers';

// ─────────────────────────────────────────────
//  Base services (mỗi bảng 1 class)
// ─────────────────────────────────────────────

class ContractService extends BaseService {
  constructor() {
    super('pos', 'contracts');
  }
}

class ContractMemberService extends BaseService {
  constructor() {
    super('pos', 'contract_members');
  }
}

class CustomerService extends BaseService {
  constructor() {
    super('pos', 'customers');
  }
}

class ResidentService extends BaseService {
  constructor() {
    super('pos', 'residents');
  }
}

class BillService extends BaseService {
  constructor() {
    super('pos', 'bills');
  }
}

class BillDetailService extends BaseService {
  constructor() {
    super('pos', 'bill_details');
  }
}

class PaymentService extends BaseService {
  constructor() {
    super('pos', 'payments');
  }
}

class ReceivableServiceClass extends BaseService {
  constructor() {
    super('pos', 'receivables');
  }
}

// ─────────────────────────────────────────────
//  Input DTOs
// ─────────────────────────────────────────────

/** Màn hình 2A — Đặt phòng dài hạn (hỗ trợ cả khách cũ và mới) */
export interface LongTermCheckInInput {
  storeId: string;
  variantId: string;
  productId: string;
  customerId?: string; // Nếu có → dùng khách cũ. Nếu không → tạo mới từ các field dưới.
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
  // Thông tin cư dân bổ sung (residents)
  hometown?: string;
  occupation?: string;
  workplace?: string;
  portraitUrl?: string;

  contractNumber?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;              // YYYY-MM-DD - thời gian kết thúc hợp đồng từ UI
  durationMonths?: number; // mặc định 12
  rentAmount: number;
  depositAmount?: number;
  electricReadingInit?: number;
  waterReadingInit?: number;
  electricRate?: number;
  water_rate?: number;
  billingDay?: number; // ngày xuất bill hàng tháng, mặc định 1
  notes?: string;
  // Dịch vụ thêm
  extraServices?: Array<{
    productId: string;
    variantId?: string;
    unitId?: string;
    name: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;  // FIX #7: Thêm tax_rate từ products.tax_rate
  }>;
  // Trả cọc ngay không?
  payDepositNow?: boolean;
  depositPaymentMethod?: 'cash' | 'bank_transfer' | 'e_wallet';
  // Thông tin session
  cashierUserId?: string;
  sessionId?: string;
}

/** Màn hình 2B — Đặt phòng ngắn hạn (hỗ trợ cả khách cũ và mới) */
export interface ShortTermCheckInInput {
  storeId: string;
  variantId: string;
  productId: string;
  customerId?: string; // Nếu có → dùng khách cũ. Nếu không → tạo mới từ các field dưới.
  // Khách mới — sẽ INSERT vào customers + residents
  fullName?: string;
  phone?: string;
  idNumber?: string;
  // Trường ẩn từ QR CCCD (chỉ lưu DB, không hiện UI)
  dateOfBirth?: string; // Ngày sinh (DD/MM/YYYY)
  gender?: string; // Giới tính ('Nam' | 'Nữ')
  email?: string;
  nationality?: string;
  address?: string; // Địa chỉ thường trú
  idCardFrontUrl?: string;
  idCardBackUrl?: string;
  // Thông tin cư dân bổ sung (residents)
  hometown?: string;
  occupation?: string;
  workplace?: string;
  portraitUrl?: string;
  // Thông tin đặt phòng
  checkinDate: string; // YYYY-MM-DD
  checkinTime: string; // HH:mm (bắt buộc)
  checkoutDate: string;
  checkoutTime: string; // HH:mm (bắt buộc)
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
    taxRate?: number;  // FIX #7: Thêm tax_rate từ products.tax_rate
  }>;
  payDepositNow?: boolean;
  depositPaymentMethod?: 'cash' | 'bank_transfer' | 'e_wallet';
  // Thông tin session
  cashierUserId?: string;
  sessionId?: string;
}

/** Màn hình 3 — Chỉnh sửa thông tin phòng / khách */
export interface EditRoomDetailsInput {
  storeId: string;
  variantId: string; // dùng để tìm contract active
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
  paymentAmount: number; // Số tiền thực tế user muốn trả
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
  private async getCycleId(
    storeId: string,
    cycleCode: 'daily' | 'monthly',
  ): Promise<string | null> {
    const db = DatabaseManager.get('pos');
    if (!db) {return null;}

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

  private now(): string {
    return new Date().toISOString();
  }
  /** Tạo bill_details rows từ mảng dịch vụ thêm */
  private async insertExtraServices(
    billId: string,
    storeId: string,
    services: any,
    startOrder = 10,
    notes?: string,  // FIX #9: Thêm notes parameter
  ): Promise<number> {
    if (!services || services.length === 0) {return 0;}
    let totalSvcAmount = 0;
    for (let i = 0; i < services.length; i++) {
      const svc = services[i];
      const amount = svc.quantity * svc.unitPrice;
      // FIX #7: Tính tax_amount từ tax_rate
      const taxRate = svc.taxRate ?? 0;
      const taxAmount = amount * taxRate / 100;
      totalSvcAmount += amount;

      await this.billDetailSvc.create({
        id: await generateSequentialId(this.billDetailSvc, 'bdt'),
        store_id: storeId,
        bill_id: billId,
        product_id: svc.productId,
        variant_id: svc.variantId ?? null,
        unit_id: svc.unitId ?? null,
        line_description: svc.name,
        quantity: svc.quantity,
        unit_price: svc.unitPrice,
        amount: amount,
        // FIX #7: Thêm tax_rate và tax_amount
        tax_rate: taxRate,
        tax_amount: taxAmount,
        notes: notes || null,  // FIX #9: Thêm notes từ UI
        sort_order: startOrder + i,
        sync_status: 'local',  // FIX #11: Luôn là local
        created_at: this.now(),
        updated_at: this.now(),
      });
    }
    return totalSvcAmount;
  }

  /**
   * Đảm bảo có customerId (nếu chưa có thì tạo mới)
   * FIX #1: Thêm customer_group, loyalty_points, total_spent theo yêu cầu
   */
  private async ensureCustomer(input: any, now: string, tempResidenceTo?: string): Promise<string> {
    if (input.customerId && input.customerId !== '') {
      return input.customerId;
    }

    const customerId = await generateSequentialId(this.customerSvc, 'cust');
    const customerCode = await generateCustomerCode(input.storeId);

    // Tính total_spent tạm = tiền phòng + dịch vụ (sẽ cập nhật lại sau mỗi thanh toán)
    const totalSpent = input.rentAmount || 0;
    const svcAmount = (input.extraServices ?? []).reduce((s: number, sv: any) => s + sv.quantity * sv.unitPrice, 0);

    await this.customerSvc.create({
      id: customerId,
      store_id: input.storeId,
      customer_code: customerCode,
      full_name: input.fullName || '--',
      phone: input.phone || '',
      id_number: input.idNumber || '',
      date_of_birth: input.dateOfBirth || null,
      gender: input.gender
        ? input.gender === 'Nam'
          ? 'male'
          : input.gender === 'Nữ'
          ? 'female'
          : 'other'
        : null,
      email: input.email || null,
      nationality: input.nationality || 'VN',
      address: input.address || null,
      // FIX #1: Thêm các trường thiếu theo yêu cầu
      customer_group: 'regular',        // Mặc định 'regular'
      loyalty_points: 0,                // Mặc định 0
      total_spent: totalSpent + svcAmount, // Tính tạm = tiền phòng + dịch vụ
      notes: input.notes || null,       // FIX #9: Thêm notes từ UI
      // FIX #10: Bỏ status - dùng schema default 'active'
      sync_status: 'local',             // FIX #11: Luôn là local
      created_at: now,
      updated_at: now,
    });

    // FIX #2: Thêm các trường thiếu cho residents theo yêu cầu
    await this.residentSvc.create({
      id: await generateSequentialId(this.residentSvc, 'res'),
      store_id: input.storeId,
      customer_id: customerId,
      // Thông tin giấy tờ
      id_card_front_url: input.idCardFrontUrl || '',
      id_card_back_url: input.idCardBackUrl || '',
      portrait_url: input.portraitUrl || null,  // FIX #2: Thêm portrait_url
      // Thông tin cá nhân bổ sung
      hometown: input.hometown || null,         // FIX #2: Thêm hometown (quê quán)
      occupation: input.occupation || null,     // FIX #2: Thêm occupation (nghề nghiệp)
      workplace: input.workplace || null,        // FIX #2: Thêm workplace (nơi làm việc)
      // Tạm trú
      temp_residence_from: input.checkinDate || input.startDate,
      temp_residence_to: tempResidenceTo || input.checkoutDate || null, // Dài hạn dùng thời gian hợp đồng
      temp_residence_status: 'pending',        // FIX #2: Mặc định 'pending'
      police_ref_number: null,                 // FIX #2: Để trống, điền sau khi khai báo công an
      approved_by: null,                       // FIX #2: Để trống
      approved_date: null,                     // FIX #2: Để trống
      note: input.notes || null,               // FIX #9: Thêm note từ UI
      // FIX #10: Bỏ status - dùng schema default 1
      created_at: now,
    });

    return customerId;
  }

  /**
   * Tăng số cuối của mã (VD: HD-0001 -> HD-0002)
   */
  private incrementCode(code: string): string {
    const parts = code.split('-');
    if (parts.length === 0) {return code;}
    const lastPart = parts[parts.length - 1];
    const num = parseInt(lastPart, 10);
    if (isNaN(num)) {return code + '-1';}

    parts[parts.length - 1] = String(num + 1).padStart(lastPart.length, '0');
    return parts.join('-');
  }

  // ── Màn hình 2A: Check-in dài hạn ───────────

  /**
   * Tạo hợp đồng dài hạn cho khách cũ.
   * INSERT: contracts, contract_members, bills (deposit), bill_details, payments?
   */
  async checkInLongTerm(
    input: LongTermCheckInInput,
  ): Promise<{contractId: string; billId: string}> {
    return this.contractSvc.executeTransaction(async () => {
      // Kiểm tra trùng lịch trước khi tạo hợp đồng
      await this.checkRoomAvailability(
        input.variantId,
        input.startDate,
        input.endDate,
        input.storeId,
      );

      const now = this.now();
      const contractId = await generateSequentialId(this.contractSvc, 'ctr');
      const depositBillId = await generateSequentialId(this.billSvc, 'bill');

      // Tính cycle_period_to cho bill tháng đầu = start_date + 1 tháng
      const d = new Date(input.startDate);
      d.setMonth(d.getMonth() + 1);
      const cyclePeriodTo = d.toISOString().split('T')[0];

      // Generate codes
      const contractCode = await generateContractCode(input.storeId);
      const depositBillNumber = await generateBillNumber(input.storeId);
      const rentBillNumber = this.incrementCode(depositBillNumber);

      // Lấy cycle_id cho dài hạn (monthly)
      const cycleId = await this.getCycleId(input.storeId, 'monthly');

      // Tính tổng dịch vụ
      const svcAmount = (input.extraServices ?? []).reduce(
        (s, sv) => s + sv.quantity * sv.unitPrice,
        0,
      );

      // 0. Đảm bảo có customerId
      const customerId = await this.ensureCustomer(input, now, input.endDate);

      // 1. contracts
      await this.contractSvc.create({
        id: contractId,
        store_id: input.storeId,
        contract_number: contractCode,
        customer_id: customerId,
        product_id: input.productId,
        variant_id: input.variantId,
        start_date: input.startDate,
        end_date: input.endDate,
        signed_date: now.split('T')[0],
        rent_amount: input.rentAmount,
        deposit_amount: input.depositAmount ?? 0,
        electric_rate: input.electricRate ?? 0,
        electric_reading_init: input.electricReadingInit ?? 0,
        water_reading_init: input.waterReadingInit ?? 0,
        billing_day: input.billingDay ?? 1,
        cycle_id: cycleId,
        status: 'active',
        notes: input.notes || null,  // FIX #9: Thêm notes từ UI
        created_at: now,
        updated_at: now,
      });

      // 2. contract_members (người thuê chính)
      await this.contractMemberSvc.create({
        id: await generateSequentialId(this.contractMemberSvc, 'cm'),
        store_id: input.storeId,
        contract_id: contractId,
        customer_id: customerId,
        is_primary: true,
        joined_date: input.startDate,
        note: input.notes || null,  // FIX #9: Thêm note từ UI
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
          due_at: input.startDate,  // FIX #6: Hạn thanh toán = ngày nhận phòng
          notes: input.notes || null,  // FIX #9: Thêm notes từ UI
          // FIX #6: Thêm thông tin session
          cashier_user_id: input.cashierUserId || null,
          session_id: input.sessionId || null,
          sync_status: 'local',  // FIX #11: Luôn là local
          created_at: now,
          updated_at: now,
        });

        // 3.1 bill_details — dòng tiền cọc
        await this.billDetailSvc.create({
          id: await generateSequentialId(this.billDetailSvc, 'bdt'),
          store_id: input.storeId,
          bill_id: depositBillId,
          product_id: input.productId,
          variant_id: input.variantId,
          line_description: 'Tiền đặt cọc',
          quantity: 1,
          unit_price: depositAmount,
          amount: depositAmount,
          notes: input.notes || null,  // FIX #9: Thêm notes từ UI
          sort_order: 1,
          sync_status: 'local',  // FIX #11: Luôn là local
          created_at: now,
          updated_at: now,
        });

        // 3.2 Receivable cho cọc
        const receivableCodeDeposit = await generateReceivableCode(
          input.storeId,
        );
        await this.receivableSvc.create({
          id: await generateSequentialId(this.receivableSvc, 'rec'),
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
      const rentBillId = await generateSequentialId(this.billSvc, 'bill');
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
        cycle_period_to: cyclePeriodTo,  // FIX #4: Dùng cyclePeriodTo thay vì endDate
        subtotal: totalRentBill,
        total_amount: totalRentBill,
        paid_amount: 0,
        remaining_amount: totalRentBill,
        bill_status: 'issued',
        issued_at: now,
        due_at: input.startDate,  // FIX #6: Hạn thanh toán = ngày nhận phòng
        notes: input.notes || null,  // FIX #9: Thêm notes từ UI
        // FIX #6: Thêm thông tin session
        cashier_user_id: input.cashierUserId || null,
        session_id: input.sessionId || null,
        sync_status: 'local',  // FIX #11: Luôn là local
        created_at: now,
        updated_at: now,
      });

      // 6. bill_details cho bill tiền nhà
      // - Dòng tiền phòng
      // FIX #7: Tính tax_amount cho tiền phòng (giả định tax_rate = 0 cho phòng, có thể thay đổi sau)
      const roomTaxRate = 0;
      const roomTaxAmount = input.rentAmount * roomTaxRate / 100;

      await this.billDetailSvc.create({
        id: await generateSequentialId(this.billDetailSvc, 'bdt'),
        store_id: input.storeId,
        bill_id: rentBillId,
        product_id: input.productId,
        variant_id: input.variantId,
        line_description: 'Tiền thuê phòng (tháng đầu)',
        quantity: 1,
        unit_price: input.rentAmount,
        amount: input.rentAmount,
        // FIX #7: Thêm tax_rate và tax_amount
        tax_rate: roomTaxRate,
        tax_amount: roomTaxAmount,
        notes: input.notes || null,  // FIX #9: Thêm notes từ UI
        sort_order: 1,
        sync_status: 'local',  // FIX #11: Luôn là local
        created_at: now,
        updated_at: now,
      });

      // - Dòng dịch vụ thêm
      await this.insertExtraServices(rentBillId, input.storeId, input.extraServices, 10, input.notes);

      // 6. Receivable cho tiền nhà
      let receivableCodeRent = await generateReceivableCode(input.storeId);
      // Nếu đã có bill cọc -> mã receivable tiếp theo phải tăng lên
      if (depositAmount > 0) {
        receivableCodeRent = this.incrementCode(receivableCodeRent);
      }

      await this.receivableSvc.create({
        id: await generateSequentialId(this.receivableSvc, 'rec'),
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
          id: await generateSequentialId(this.paymentSvc, 'pay'),
          store_id: input.storeId,
          bill_id: depositBillId,
          payment_method: input.depositPaymentMethod ?? 'cash',
          amount: depositAmount,
          paid_at: now,
          status: 'success',
          notes: input.notes || null,  // FIX #9: Thêm notes từ UI
          sync_status: 'local',  // FIX #11: Luôn là local
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

      return {contractId, billId: rentBillId};
    });
  }

  // ── Màn hình 2B: Check-in ngắn hạn ──────────

  /**
   * Kiểm tra trùng lịch: phòng có hợp đồng nào chưa bị hủy mà overlap với khoảng thời gian mới không
   * Điều kiện overlap: existing.start < new.checkout AND existing.end > new.checkin
   */
  private async checkRoomAvailability(
    variantId: string,
    checkinDate: string,
    checkoutDate: string,
    storeId: string,
  ): Promise<void> {
    const db = DatabaseManager.get('pos');
    if (!db) {return;}

    console.log('[checkRoomAvailability] Checking availability for room:', variantId, 'from', checkinDate, 'to', checkoutDate);

    const conflictingContracts = await QueryBuilder.table('contracts', db.getInternalDAO())
      .select(['contracts.id', 'contracts.start_date', 'contracts.end_date', 'customers.full_name'])
      .innerJoin('customers', 'contracts.customer_id = customers.id')
      .where('contracts.variant_id', variantId)
      .where('contracts.store_id', storeId)
      .where('contracts.status', '!=', 'cancelled')
      .where('contracts.status', '!=', 'terminated')
      .where('contracts.start_date', '<', checkoutDate)
      .where('contracts.end_date', '>', checkinDate)
      .get();

    console.log('[checkRoomAvailability] Found conflicting contracts:', conflictingContracts.length);

    if (conflictingContracts.length > 0) {
      const conflict = conflictingContracts[0];
      const startDate = new Date(conflict.start_date).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
      });
      const endDate = new Date(conflict.end_date).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
      });

      const errorMsg = `Phòng này đã bị đặt bởi ${conflict.full_name} từ ${startDate} đến ${endDate}. Không thể tạo hợp đồng mới trong khoảng thời gian này.`;
      console.log('[checkRoomAvailability] Overlap detected:', errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Tạo hợp đồng ngắn hạn + khách mới.
   * INSERT: customers, residents, contracts, contract_members, bills, bill_details, payments?
   */
  async checkInShortTerm(
    input: ShortTermCheckInInput,
  ): Promise<{customerId: string; contractId: string; billId: string}> {
    return this.contractSvc.executeTransaction(async () => {
      // Kiểm tra trùng lịch trước khi tạo hợp đồng
      await this.checkRoomAvailability(
        input.variantId,
        input.checkinDate,
        input.checkoutDate,
        input.storeId,
      );

      const now = this.now();
      const contractId = await generateSequentialId(this.contractSvc, 'ctr');
      const depositBillId = await generateSequentialId(this.billSvc, 'bill');
      let rentBillId = await generateSequentialId(this.billSvc, 'bill');

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
      const svcAmount = (input.extraServices ?? []).reduce(
        (s, sv) => s + sv.quantity * sv.unitPrice,
        0,
      );
      // 0. Đảm bảo có customerId
      const customerId = await this.ensureCustomer(input, now);
      const totalSpent = rentAmount + svcAmount;

      // Generate codes
      const contractCode = await generateContractCode(input.storeId);
      const depositBillNumber = await generateBillNumber(input.storeId);
      const rentBillNumber = this.incrementCode(depositBillNumber);

      // Lấy cycle_id cho ngắn hạn (daily)
      const cycleId = await this.getCycleId(input.storeId, 'daily');

      // Metadata lưu trữ thông tin thời gian checkin/checkout và breakdown giá
      const metadata = JSON.stringify({
        checkin_time: input.checkinTime,
        checkout_time: input.checkoutTime,
        adults: input.adults || 1,
        children: input.children || 0,
        price_description: priceResult.description,
        price_breakdown: priceResult.breakdown,  // Lưu breakdown chi tiết để hiển thị sau này
        rent_amount: rentAmount,  // Tiền phòng riêng
        service_amount: svcAmount,  // Tiền dịch vụ riêng
      });

      // 4. contracts
      await this.contractSvc.create({
        id: contractId,
        store_id: input.storeId,
        contract_number: contractCode,
        customer_id: customerId,
        product_id: input.productId,
        variant_id: input.variantId,
        start_date: input.checkinDate,
        end_date: input.checkoutDate,
        signed_date: now.split('T')[0],
        rent_amount: rentAmount,
        deposit_amount: input.depositAmount ?? 0,
        electric_rate: 0,
        water_rate: 0,
        billing_day: 1,
        cycle_id: cycleId,
        electric_reading_init: 0,
        water_reading_init: 0,
        status: 'active',
        notes: input.notes || null,  // FIX #9: Thêm notes từ UI
        metadata,          // adults, children, checkin_time, checkout_time
        created_at: now,
        updated_at: now,
      });

      // 5. contract_members
      await this.contractMemberSvc.create({
        id: await generateSequentialId(this.contractMemberSvc, 'cm'),
        store_id: input.storeId,
        contract_id: contractId,
        customer_id: customerId,
        is_primary: true,
        joined_date: input.checkinDate,
        note: input.notes || null,  // FIX #9: Thêm note từ UI
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
          due_at: input.checkinDate,  // FIX #6: Hạn thanh toán = ngày nhận phòng
          notes: input.notes || null,  // FIX #9: Thêm notes từ UI
          // FIX #6: Thêm thông tin session
          cashier_user_id: input.cashierUserId || null,
          session_id: input.sessionId || null,
          sync_status: 'local',  // FIX #11: Luôn là local
          created_at: now,
          updated_at: now,
        });

        // 5.1 bill_details — dòng tiền cọc
        await this.billDetailSvc.create({
          id: await generateSequentialId(this.billDetailSvc, 'bdt'),
          store_id: input.storeId,
          bill_id: depositBillId,
          product_id: input.productId,
          variant_id: input.variantId,
          line_description: 'Tiền đặt cọc phòng ngắn hạn',
          quantity: 1,
          unit_price: depositAmount,
          amount: depositAmount,
          notes: input.notes || null,
          sort_order: 1,
          sync_status: 'local',
          created_at: now,
          updated_at: now,
        });

        // 5.2 Receivable cho cọc
        const receivableCodeDeposit = await generateReceivableCode(
          input.storeId,
        );
        await this.receivableSvc.create({
          id: await generateSequentialId(this.receivableSvc, 'rec'),
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
      rentBillId = await generateSequentialId(this.billSvc, 'bill');
      // Ngắn hạn: trừ tiền cọc ngay vào bill
      const totalRentBill = rentAmount + svcAmount - depositAmount;

      await this.billSvc.create({
        id: rentBillId,
        store_id: input.storeId,
        customer_id: customerId,
        bill_number: rentBillNumber,
        bill_type: 'hotel',  // FIX #3: Ngắn hạn dùng 'hotel' thay vì 'rent'
        ref_id: contractId,
        ref_type: 'contract',
        subtotal: totalRentBill,
        total_amount: totalRentBill,
        paid_amount: 0,
        remaining_amount: totalRentBill,
        bill_status: 'issued',
        issued_at: now,
        due_at: input.checkinDate,  // FIX #6: Hạn thanh toán = ngày nhận phòng
        // FIX #6: Thêm thông tin session
        cashier_user_id: input.cashierUserId || null,
        session_id: input.sessionId || null,
        sync_status: 'local',
        created_at: now,
        updated_at: now,
      });

      // 7. bill_details (Tiền phòng)
      const nights = Math.ceil(priceResult.totalHours / 24);
      // FIX #7: Tính tax_amount cho tiền phòng (giả định tax_rate = 0 cho phòng, có thể thay đổi sau)
      const roomTaxRate = 0;
      const roomTaxAmount = rentAmount * roomTaxRate / 100;

      await this.billDetailSvc.create({
        id: await generateSequentialId(this.billDetailSvc, 'bdt'),
        store_id: input.storeId,
        bill_id: rentBillId,
        product_id: input.productId,
        variant_id: input.variantId,
        line_description: `Tiền thuê phòng ngắn hạn (${priceResult.description})`,
        quantity: nights > 0 ? nights : 1,
        unit_price: rentAmount / (nights > 0 ? nights : 1),
        amount: rentAmount,
        // FIX #7: Thêm tax_rate và tax_amount
        tax_rate: roomTaxRate,
        tax_amount: roomTaxAmount,
        notes: input.notes || null,  // FIX #9: Thêm notes từ UI
        sort_order: 1,
        sync_status: 'local',  // FIX #11: Luôn là local
        created_at: now,
        updated_at: now,
      });

      // 8. Dịch vụ thêm
      await this.insertExtraServices(rentBillId, input.storeId, input.extraServices, 10, input.notes);

      // 9. Receivable cho tiền phòng
      let receivableCodeRent = await generateReceivableCode(input.storeId);
      if (depositAmount > 0) {
        receivableCodeRent = this.incrementCode(receivableCodeRent);
      }

      await this.receivableSvc.create({
        id: await generateSequentialId(this.receivableSvc, 'rec'),
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
          id: await generateSequentialId(this.paymentSvc, 'pay'),
          store_id: input.storeId,
          bill_id: depositBillId,
          payment_method: input.depositPaymentMethod ?? 'cash',
          amount: depositAmount,
          paid_at: now,
          status: 'success',
          notes: input.notes || null,  // FIX #9: Thêm notes từ UI
          sync_status: 'local',  // FIX #11: Luôn là local
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

      return {customerId, contractId, billId: rentBillId};
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
      {variant_id: input.variantId, status: 'active', store_id: input.storeId},
      {columns: ['id', 'customer_id']},
    );
    const contract = contracts.length > 0 ? contracts[0] : null;
    if (!contract) {throw new Error('Không tìm thấy hợp đồng đang hoạt động');}

    await this.contractSvc.executeTransaction(async () => {
      // 2. Cập nhật thông tin khách
      if (input.fullName || input.phone || input.idNumber) {
        const customerUpdate: Record<string, any> = {updated_at: now};
        if (input.fullName) {customerUpdate.full_name = input.fullName;}
        if (input.phone) {customerUpdate.phone = input.phone;}
        if (input.idNumber) {customerUpdate.id_number = input.idNumber;}
        await this.customerSvc.update(contract.customer_id, customerUpdate);
      }

      // 3. Cập nhật hợp đồng
      const contractUpdate: Record<string, any> = {updated_at: now};
      if (input.rentAmount != null)
        {contractUpdate.rent_amount = input.rentAmount;}
      if (input.electricRate != null)
        {contractUpdate.electric_rate = input.electricRate;}
      if (input.waterRate != null) {contractUpdate.water_rate = input.waterRate;}
      if (input.electricReadingInit != null)
        {contractUpdate.electric_reading_init = input.electricReadingInit;}
      if (input.waterReadingInit != null)
        {contractUpdate.water_reading_init = input.waterReadingInit;}
      if (input.endDate) {contractUpdate.end_date = input.endDate;}
      if (input.notes != null) {contractUpdate.notes = input.notes;}

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
    // Tìm contract với nhiều status khác nhau (không chỉ 'active')
    const db = DatabaseManager.get('pos');
    if (!db) {throw new Error('Database not available');}

    const contracts = await QueryBuilder.table('contracts', db.getInternalDAO())
      .select(['id', 'end_date', 'status'])
      .where('variant_id', variantId)
      .where('store_id', storeId)
      .where('status', '!=', 'cancelled')
      .where('status', '!=', 'terminated')
      .orderBy('created_at', 'DESC')
      .get();

    const contract = contracts.length > 0 ? contracts[0] : null;
    if (!contract) {throw new Error('Không tìm thấy hợp đồng đang hoạt động');}

    console.log('[extendContract] Found contract:', { id: contract.id, status: contract.status, end_date: contract.end_date });

    const newEndDate = this.calcEndDate(contract.end_date, extraMonths);
    await this.contractSvc.update(contract.id, {
      end_date: newEndDate,
      updated_at: this.now(),
    });

    console.log('[extendContract] Contract extended to:', newEndDate);
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
      {variant_id: currentVariantId, status: 'active', store_id: storeId},
      {columns: ['id']},
    );
    const contract = contracts.length > 0 ? contracts[0] : null;
    if (!contract) {throw new Error('Không tìm thấy hợp đồng đang hoạt động');}

    const updateData: Record<string, any> = {
      variant_id: newVariantId,
      product_id: newProductId,
      updated_at: this.now(),
    };
    if (newRentAmount != null) {updateData.rent_amount = newRentAmount;}

    await this.contractSvc.update(contract.id, updateData);
  }

  // ── Màn hình 3: Check-out ────────────────────

  /**
   * Trả phòng.
   * UPDATE: contracts (terminated), contract_members (left_date), bills (issued)
   */
  async checkOut(storeId: string, variantId: string): Promise<void> {
    // Tìm contract với nhiều status khác nhau (không chỉ 'active')
    const db = DatabaseManager.get('pos');
    if (!db) {throw new Error('Database not available');}

    const contracts = await QueryBuilder.table('contracts', db.getInternalDAO())
      .select(['id', 'customer_id', 'status'])
      .where('variant_id', variantId)
      .where('store_id', storeId)
      .where('status', '!=', 'cancelled')
      .where('status', '!=', 'terminated')
      .orderBy('created_at', 'DESC')
      .get();

    const contract = contracts.length > 0 ? contracts[0] : null;
    if (!contract) {throw new Error('Không tìm thấy hợp đồng đang hoạt động');}

    console.log('[checkOut] Found contract:', { id: contract.id, status: contract.status, customer_id: contract.customer_id });

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
        {contract_id: contract.id},
        {columns: ['id']},
      );
      for (const m of members) {
        await this.contractMemberSvc.update(m.id, {
          left_date: today,
          updated_at: now,
        });
      }

      // 3. Phát hành bill chốt cuối kỳ
      const bills = await this.billSvc.findAll(
        {ref_id: contract.id, ref_type: 'contract', bill_status: 'draft'},
        {columns: ['id']},
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
  ): Promise<{billId: string; total: number}> {
    const contracts = await this.contractSvc.findAll({
      variant_id: input.variantId,
      store_id: input.storeId,
    });
    // Filter out cancelled/terminated contracts, but allow contracts without status (old contracts)
    const activeContracts = contracts.filter(c =>
      c.status !== 'cancelled' && c.status !== 'terminated'
    );
    const contract = activeContracts.length > 0 ? activeContracts[0] : null;
    if (!contract) {throw new Error('Không tìm thấy hợp đồng đang hoạt động');}

    // Chỉ số điện nước kỳ trước (lấy từ bill_details gần nhất)
    const prevBills = await this.billSvc.findAll(
      {ref_id: contract.id, ref_type: 'contract', store_id: input.storeId},
      {orderBy: [{name: 'issued_at', order: 'DESC'}], limit: 1},
    );
    let prevElectric = contract.electric_reading_init ?? 0;
    let prevWater = contract.water_reading_init ?? 0;

    if (prevBills.length > 0) {
      const prevDetails = await this.billDetailSvc.findAll({
        bill_id: prevBills[0].id,
      });
      const eDet = prevDetails.find(
        (d: any) =>
          d.line_description?.includes('điện') ||
          d.line_description?.includes('Điện'),
      );
      const wDet = prevDetails.find(
        (d: any) =>
          d.line_description?.includes('nước') ||
          d.line_description?.includes('Nước'),
      );
      if (eDet?.reading_to != null) {prevElectric = eDet.reading_to;}
      if (wDet?.reading_to != null) {prevWater = wDet.reading_to;}
    }

    // Tính toán tiền điện nước
    const eUsage = Math.max(0, input.electricNew - prevElectric);
    const wUsage = Math.max(0, input.waterNew - prevWater);
    const eAmount = eUsage * (contract.electric_rate ?? 0);
    const wAmount = wUsage * (contract.water_rate ?? 0);
    const svcAmount = (input.extraServices ?? []).reduce(
      (s, sv) => s + sv.quantity * sv.unitPrice,
      0,
    );
    const meterTotal = eAmount + wAmount;

    return this.billSvc.executeTransaction(async () => {
      const now = this.now();
      const today = now.split('T')[0];

      // Lấy negative_balance (khoản điều chỉnh âm kỳ trước)
      const db = DatabaseManager.get('pos');
      const adjResult = await QueryBuilder.table('receivables', db!.getInternalDAO())
        .select(['SUM(amount) as total'])
        .where('contract_id', contract.id)
        .where('receivable_type', 'adjustment')
        .where('amount', '<', 0)
        .where('status', 'pending')
        .first();
      const negativeBalance = adjResult?.total || 0;

      // Kiểm tra xem đã có bill cho kỳ này chưa
      const existingBillRows = await QueryBuilder.table('bills', db!.getInternalDAO())
        .where('ref_id', contract.id)
        .where('ref_type', 'contract')
        .where('bill_type', '!=', 'deposit')
        .whereIn('bill_type', ['rent', 'cycle', 'hotel'])
        .whereIn('bill_status', ['draft', 'partial', 'overdue', 'issued', 'paid'])
        .orderBy('created_at', 'DESC')
        .limit(1)
        .get();

      const existingBill = existingBillRows.length > 0 ? existingBillRows[0] : null;

      let billId: string;
      let total: number;

      if (existingBill) {
        // Cập nhật bill hiện tại
        billId = existingBill.id;

        // Tính lại total_amount bao gồm điện nước mới + negative_balance
        const recalculatedTotal = (contract.rent_amount ?? 0) + eAmount + wAmount + svcAmount + negativeBalance;
        total = recalculatedTotal;
        const currentPaid = existingBill.paid_amount ?? 0;
        const newPaid = currentPaid + input.paymentAmount;
        const newRemaining = recalculatedTotal - newPaid;

        // Tạo payment record
        const paymentId = await generateSequentialId(this.paymentSvc, 'pay');
        await this.paymentSvc.create({
          id: paymentId,
          store_id: input.storeId,
          bill_id: billId,
          payment_method: 'cash',
          amount: input.paymentAmount,
          paid_at: now,
          status: 'success',
          notes: input.notes || null,
          sync_status: 'local',
          created_at: now,
          updated_at: now,
        });

        // Cập nhật bill với total_amount mới và paid_amount mới
        const newStatus = newRemaining <= 0 ? 'paid' : 'partial';
        await this.billSvc.update(billId, {
          total_amount: recalculatedTotal,
          paid_amount: newPaid,
          remaining_amount: Math.max(0, newRemaining),
          bill_status: newStatus,
          updated_at: now,
        });
      } else {
        // Tạo bill mới
        billId = await generateSequentialId(this.billSvc, 'bill');

        // Tính total cho bill mới
        total = (contract.rent_amount ?? 0) + meterTotal + svcAmount + negativeBalance;

        // Tính cycle_period_to cho bill = start_date + 1 tháng
        const d = new Date(contract.start_date);
        d.setMonth(d.getMonth() + 1);
        const cyclePeriodTo = d.toISOString().split('T')[0];

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
        const newBillStatus = input.paymentAmount >= total ? 'paid' : 'partial';
        const newRemaining = Math.max(0, total - input.paymentAmount);
        await this.billSvc.create({
          id: billId,
          store_id: input.storeId,
          customer_id: contract.customer_id,
          bill_number: `HD-CYC-${Date.now()}`,
          bill_type: 'cycle',
          ref_id: contract.id,
          ref_type: 'contract',
          cycle_id: contract.cycle_id,
          cycle_period_from: contract.start_date,
          cycle_period_to: cyclePeriodTo,
          subtotal: total,
          total_amount: total,
          paid_amount: input.paymentAmount,
          remaining_amount: newRemaining,
          bill_status: newBillStatus,
          issued_at: now,
          due_at: contract.start_date,
          notes: input.notes,
          sync_status: 'local',
          created_at: now,
          updated_at: now,
        });

        let sortOrder = 1;

        // 2. Dòng tiền phòng
        await this.billDetailSvc.create({
          id: await generateSequentialId(this.billDetailSvc, 'bdt'),
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
          id: await generateSequentialId(this.billDetailSvc, 'bdt'),
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
          id: await generateSequentialId(this.billDetailSvc, 'bdt'),
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
            billId, input.storeId, (input as any).extraServices, sortOrder, (input as any).notes,
          );
        }

        // 6. Tạo receivable cho bill mới (để theo dõi khoản phải thu)
        const receivableCode = await generateReceivableCode(input.storeId);
        await this.receivableSvc.create({
          id: await generateSequentialId(this.receivableSvc, 'rec'),
          store_id: input.storeId,
          customer_id: contract.customer_id,
          contract_id: contract.id,
          bill_id: billId,
          receivable_code: receivableCode,
          receivable_type: 'rent',
          description: 'Tiền thuê phòng và dịch vụ hàng tháng',
          amount: total,
          due_date: contract.start_date,
          status: newBillStatus,
          ref_id: contract.id,
          ref_type: 'contract',
          sync_status: 'local',
          created_at: now,
          updated_at: now,
        });

        // 7. Tạo payment record
        const paymentId = await generateSequentialId(this.paymentSvc, 'pay');
        await this.paymentSvc.create({
          id: paymentId,
          store_id: input.storeId,
          bill_id: billId,
          payment_method: 'cash',
          amount: input.paymentAmount,
          paid_at: now,
          status: 'success',
          notes: input.notes || null,
          sync_status: 'local',
          created_at: now,
          updated_at: now,
        });
      }

      return {billId, total};
    });
  }

  /**
   * Hủy đặt phòng / Hợp đồng.
   * UPDATE: contracts (cancelled), bills (cancelled), receivables (cancelled)
   */
  async cancelContract(contractId: string): Promise<void> {
    const now = this.now();
    const db = DatabaseManager.get('pos');
    if (!db) {throw new Error('Database connection not available');}

    await this.contractSvc.executeTransaction(async () => {
      // 1. Cập nhật trạng thái hợp đồng thành 'cancelled'
      await this.contractSvc.update(contractId, {
        status: 'cancelled',
        updated_at: now,
      });

      // 2. Hủy các hóa đơn liên quan (nếu chưa thanh toán)
      const bills = await this.billSvc.findAll({
        ref_id: contractId,
        ref_type: 'contract',
      });

      for (const bill of bills) {
        if (['draft', 'issued'].includes(bill.bill_status)) {
          await this.billSvc.update(bill.id, {
            bill_status: 'cancelled',
            updated_at: now,
          });
        }
      }

      // 3. Hủy các khoản phải thu liên quan (nếu đang chờ thanh toán)
      const receivables = await this.receivableSvc.findAll({
        contract_id: contractId,
        status: 'pending',
      });

      for (const rec of receivables) {
        await this.receivableSvc.update(rec.id, {
          status: 'cancelled',
          updated_at: now,
        });
      }
    });
  }
}

// ─────────────────────────────────────────────
//  Singleton export
// ─────────────────────────────────────────────

export const RoomActionService = new RoomActionServiceClass();
export default RoomActionService;
