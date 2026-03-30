import { BaseService } from '../BaseService';
import { generateUID } from '../../utils';

// ─────────────────────────────────────────────
//  Base services (mỗi bảng 1 class)
// ─────────────────────────────────────────────

class ContractService extends BaseService {
  constructor() { super('mypos', 'contracts'); }
}

class ContractMemberService extends BaseService {
  constructor() { super('mypos', 'contract_members'); }
}

class CustomerService extends BaseService {
  constructor() { super('mypos', 'customers'); }
}

class ResidentService extends BaseService {
  constructor() { super('mypos', 'residents'); }
}

class BillService extends BaseService {
  constructor() { super('mypos', 'bills'); }
}

class BillDetailService extends BaseService {
  constructor() { super('mypos', 'bill_details'); }
}

class PaymentService extends BaseService {
  constructor() { super('mypos', 'payments'); }
}

// ─────────────────────────────────────────────
//  Input DTOs
// ─────────────────────────────────────────────

/** Màn hình 2A — Đặt phòng dài hạn (khách cũ) */
export interface LongTermCheckInInput {
  storeId: string;
  variantId: string;
  productId: string;
  customerId: string;           // khách cũ → đã có trong customers
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
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  // Trả cọc ngay không?
  payDepositNow?: boolean;
  depositPaymentMethod?: 'cash' | 'bank_transfer' | 'e_wallet';
}

/** Màn hình 2B — Đặt phòng ngắn hạn (khách mới) */
export interface ShortTermCheckInInput {
  storeId: string;
  variantId: string;
  productId: string;
  // Khách mới — sẽ INSERT vào customers + residents
  fullName: string;
  phone: string;
  idNumber?: string;
  idCardFrontUrl?: string;
  idCardBackUrl?: string;
  // Thông tin đặt phòng
  checkinDate: string;          // YYYY-MM-DD
  checkinTime?: string;         // HH:mm
  checkoutDate: string;
  checkoutTime?: string;
  adults?: number;
  children?: number;
  rentPerNight: number;         // UI tính: rentAmount = rentPerNight × số ngày
  depositAmount?: number;
  notes?: string;
  extraServices?: Array<{
    productId: string;
    variantId?: string;
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

  // ── helpers ─────────────────────────────────

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
    services: LongTermCheckInInput['extraServices'],
    startOrder = 10,
  ): Promise<void> {
    if (!services || services.length === 0) return;
    for (let i = 0; i < services.length; i++) {
      const svc = services[i];
      await this.billDetailSvc.create({
        id: generateUID('BDT'),
        store_id: storeId,
        bill_id: billId,
        product_id: svc.productId,
        variant_id: svc.variantId ?? null,
        line_description: svc.name,
        quantity: svc.quantity,
        unit_price: svc.unitPrice,
        amount: svc.quantity * svc.unitPrice,
        sort_order: startOrder + i,
        sync_status: 'local',
        created_at: this.now(),
        updated_at: this.now(),
      });
    }
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
      const billId = generateUID('BILL');

      const endDate = this.calcEndDate(
        input.startDate,
        input.durationMonths ?? 12,
      );

      // 1. contracts
      await this.contractSvc.create({
        id: contractId,
        store_id: input.storeId,
        customer_id: input.customerId,
        product_id: input.productId,
        variant_id: input.variantId,
        contract_number: input.contractNumber ?? `CTR-${Date.now()}`,
        start_date: input.startDate,
        end_date: endDate,
        rent_amount: input.rentAmount,
        deposit_amount: input.depositAmount ?? 0,
        electric_rate: input.electricRate ?? 0,
        water_rate: input.water_rate ?? 0,
        electric_reading_init: input.electricReadingInit ?? 0,
        water_reading_init: input.waterReadingInit ?? 0,
        billing_day: input.billingDay ?? 1,
        status: 'active',
        notes: input.notes ?? '',
        sync_status: 'local',
        created_at: now,
        updated_at: now,
      });

      // 2. contract_members (người thuê chính)
      await this.contractMemberSvc.create({
        id: generateUID('CM'),
        store_id: input.storeId,
        contract_id: contractId,
        customer_id: input.customerId,
        is_primary: true,
        joined_date: input.startDate,
        created_at: now,
        updated_at: now,
      });

      // 3. Bill đặt cọc
      const depositAmount = input.depositAmount ?? 0;
      await this.billSvc.create({
        id: billId,
        store_id: input.storeId,
        customer_id: input.customerId,
        bill_number: `HD-DEP-${Date.now()}`,
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

      // 4. bill_details — dòng tiền cọc
      await this.billDetailSvc.create({
        id: generateUID('BDT'),
        store_id: input.storeId,
        bill_id: billId,
        line_description: 'Tiền đặt cọc',
        quantity: 1,
        unit_price: depositAmount,
        amount: depositAmount,
        sort_order: 1,
        sync_status: 'local',
        created_at: now,
        updated_at: now,
      });

      // 5. Dịch vụ thêm → bill_details
      await this.insertExtraServices(billId, input.storeId, input.extraServices);

      // 6. Thanh toán tiền cọc ngay (nếu có)
      if (input.payDepositNow && depositAmount > 0) {
        await this.paymentSvc.create({
          id: generateUID('PAY'),
          store_id: input.storeId,
          bill_id: billId,
          payment_method: input.depositPaymentMethod ?? 'cash',
          amount: depositAmount,
          paid_at: now,
          status: 'success',
          sync_status: 'local',
          created_at: now,
          updated_at: now,
        });
        // Cập nhật bill đã thanh toán
        await this.billSvc.update(billId, {
          paid_amount: depositAmount,
          remaining_amount: 0,
          bill_status: 'paid',
          updated_at: now,
        });
      }

      return { contractId, billId };
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
      const customerId = generateUID('CUST');
      const contractId = generateUID('CTR');
      const billId = generateUID('BILL');

      const nights = this.calcNights(input.checkinDate, input.checkoutDate);
      const rentAmount = input.rentPerNight * nights;
      const metadata = JSON.stringify({
        adults: input.adults ?? 1,
        children: input.children ?? 0,
        checkin_time: input.checkinTime ?? '14:00',
        checkout_time: input.checkoutTime ?? '12:00',
      });

      // 1. customers (khách mới)
      await this.customerSvc.create({
        id: customerId,
        store_id: input.storeId,
        full_name: input.fullName,
        phone: input.phone,
        id_number: input.idNumber ?? '',
        customer_code: `C-${customerId}`,
        status: 'active',
        sync_status: 'local',
        created_at: now,
        updated_at: now,
      });

      // 2. residents (ảnh CCCD + tạm trú)
      await this.residentSvc.create({
        id: generateUID('RES'),
        store_id: input.storeId,
        customer_id: customerId,
        id_card_front_url: input.idCardFrontUrl ?? '',
        id_card_back_url: input.idCardBackUrl ?? '',
        temp_residence_status: 'pending',
        status: 1,
        created_at: now,
      });

      // 3. contracts (dùng chung bảng, end_date = checkout)
      await this.contractSvc.create({
        id: contractId,
        store_id: input.storeId,
        customer_id: customerId,
        product_id: input.productId,
        variant_id: input.variantId,
        contract_number: `CTR-SHT-${Date.now()}`,
        start_date: input.checkinDate,
        end_date: input.checkoutDate,
        rent_amount: rentAmount,
        deposit_amount: input.depositAmount ?? 0,
        status: 'active',
        notes: input.notes ?? '',
        metadata,          // adults, children, checkin_time, checkout_time
        sync_status: 'local',
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

      // 5. Bill (cycle = lưu trú ngắn hạn)
      const depositAmount = input.depositAmount ?? 0;
      const totalAmount = rentAmount + depositAmount;
      await this.billSvc.create({
        id: billId,
        store_id: input.storeId,
        customer_id: customerId,
        bill_number: `HD-SHT-${Date.now()}`,
        bill_type: 'cycle',
        ref_id: contractId,
        ref_type: 'contract',
        cycle_period_from: input.checkinDate,
        cycle_period_to: input.checkoutDate,
        subtotal: totalAmount,
        total_amount: totalAmount,
        paid_amount: 0,
        remaining_amount: totalAmount,
        bill_status: 'issued',
        issued_at: now,
        sync_status: 'local',
        created_at: now,
        updated_at: now,
      });

      // 6. bill_details — tiền phòng
      await this.billDetailSvc.create({
        id: generateUID('BDT'),
        store_id: input.storeId,
        bill_id: billId,
        line_description: `Tiền phòng (${nights} đêm × ${input.rentPerNight.toLocaleString()}đ)`,
        quantity: nights,
        unit_price: input.rentPerNight,
        amount: rentAmount,
        sort_order: 1,
        sync_status: 'local',
        created_at: now,
        updated_at: now,
      });

      // 7. Dịch vụ thêm
      await this.insertExtraServices(billId, input.storeId, input.extraServices, 10);

      // 8. Thanh toán cọc ngay
      if (input.payDepositNow && depositAmount > 0) {
        await this.paymentSvc.create({
          id: generateUID('PAY'),
          store_id: input.storeId,
          bill_id: billId,
          payment_method: input.depositPaymentMethod ?? 'cash',
          amount: depositAmount,
          paid_at: now,
          status: 'success',
          sync_status: 'local',
          created_at: now,
          updated_at: now,
        });
        await this.billSvc.update(billId, {
          paid_amount: depositAmount,
          remaining_amount: totalAmount - depositAmount,
          bill_status: depositAmount >= totalAmount ? 'paid' : 'partial',
          updated_at: now,
        });
      }

      return { customerId, contractId, billId };
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