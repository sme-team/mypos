import {BaseService} from '../../BaseService';
import {generateSequentialId} from '../../../utils';

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

class PaymentBaseService extends BaseService {
  constructor() {
    super('pos', 'payments');
  }
}

// ─────────────────────────────────────────────
// Payment Service
// ─────────────────────────────────────────────

interface CreateOrderInput {
  cartItems: any[];
  total: number;
  cash: number;
  storeId: string;
  customerId?: string | null;
}

class PaymentServiceClass {
  private billSvc = new BillService();
  private billDetailSvc = new BillDetailService();
  private paymentSvc = new PaymentBaseService();

  private generateBillId = () => generateSequentialId(this.billSvc, 'bill');
  private generatePaymentId = () =>
    generateSequentialId(this.paymentSvc, 'pay');
  private async generateBillDetailIds(count: number): Promise<string[]> {
    if (count === 0) return [];

    // Query DB 1 lần để lấy start number
    const firstId = await generateSequentialId(this.billDetailSvc, 'bdet');
    const prefix = 'bdet';
    const match = firstId.match(new RegExp(`^${prefix}-(\\d+)$`));
    const startNum = match ? parseInt(match[1], 10) : 1;

    // Tạo các ID tiếp theo bằng increment
    return Array.from(
      {length: count},
      (_, i) => `${prefix}-${String(startNum + i).padStart(3, '0')}`,
    );
  }
  // số hóa đơn
  private generateBillNumber(): string {
    const year = new Date().getFullYear();
    return `HD-${year}-${Date.now()}`;
  }

  // CREATE ORDER (CORE)
  // ─────────────────────────────────────────
  async createOrder({
    cartItems,
    total,
    cash,
    storeId,
    customerId = null,
  }: CreateOrderInput) {
    if (!cartItems || cartItems.length === 0) {
      throw new Error('Cart is empty');
    }

    const now = new Date().toISOString();
    const billId = await this.generateBillId();
    const change = Math.max(0, cash - total);

    try {
      // 1. BILL
      await this.billSvc.create({
        id: billId,
        store_id: storeId,
        bill_number: this.generateBillNumber(),

        customer_id: customerId,
        cashier_user_id: null,
        session_id: null,

        bill_type: 'pos',

        cycle_id: null,
        cycle_period_from: null,
        cycle_period_to: null,
        ref_id: null,
        ref_type: null,

        subtotal: total,
        discount_amount: 0,
        tax_amount: 0,
        total_amount: total,

        paid_amount: total,
        remaining_amount: 0,

        issued_at: now,
        due_at: null,
        bill_status: 'paid',

        notes: null,
        internal_notes: null,
        metadata: null,

        sync_status: 'local',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });

      // 2. BILL DETAILS
      const detailIds = await this.generateBillDetailIds(cartItems.length);
      for (let i = 0; i < cartItems.length; i++) {
        const item = cartItems[i];
        const detailId = detailIds[i];

        await this.billDetailSvc.create({
          id: detailId,
          store_id: storeId,
          bill_id: billId,
          product_id: item.product.id,
          variant_id: item.selectedVariant?.id || null,
          unit_id: item.product.unit_id ?? null,
          line_description:
            item.product.name +
            (item.selectedVariant?.name
              ? ` - ${item.selectedVariant.name}`
              : ''),
          quantity: item.quantity,
          unit_price: item.product.price,

          discount_pct: 0,
          discount_amount: 0,
          tax_rate: item.product.tax_rate ?? 0,
          tax_amount: 0,

          amount: item.product.price * item.quantity,

          reading_from: null,
          reading_to: null,
          meter_photo_url: null,

          sort_order: i,
          notes: null,

          sync_status: 'local',
          created_at: now,
          updated_at: now,
          deleted_at: null,
        });
      }

      //  3. PAYMENT
      const paymentId = await this.generatePaymentId();
      await this.paymentSvc.create({
        id: paymentId,
        store_id: storeId,
        bill_id: billId,

        receivable_id: null,
        cashier_user_id: null,

        payment_method: 'cash',

        amount: total,
        received_amount: cash,
        change_amount: change,

        transaction_ref: null,
        payment_gateway: null,

        paid_at: now,

        is_offline: true,
        synced_at: null,

        notes: null,
        status: 'success',

        sync_status: 'local',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });

      return {
        billId,
        total,
        paid: cash,
        change,
      };
    } catch (err) {
      console.error('[PaymentService] createOrder error:', err);
      throw err;
    }
  }
}

export const PaymentService = new PaymentServiceClass();
