import {BaseService} from '../../BaseService';
import {
  ExportRow,
  ExportSheetData,
  ReportTypeOption,
  TemplateOption,
} from '../../../screens/excel-export/type';

// ─── Static options ───────────────────────────────────────────────────────────

export const REPORT_TYPE_OPTIONS: ReportTypeOption[] = [
  {value: 'bills', label: 'Hóa đơn bán hàng'},
  {value: 'bill_details', label: 'Chi tiết hóa đơn'},
  {value: 'payments', label: 'Giao dịch thanh toán'},
  {value: 'contracts', label: 'Hợp đồng thuê phòng'},
  {value: 'receivables', label: 'Khoản phải thu'},
];

export const TEMPLATE_OPTIONS: Record<string, TemplateOption[]> = {
  bills: [
    {value: 'bills_all', label: 'Tất cả hóa đơn'},
    {value: 'bills_paid', label: 'Đã thanh toán'},
    {value: 'bills_unpaid', label: 'Chưa thanh toán'},
  ],
  bill_details: [{value: 'details_all', label: 'Tất cả chi tiết'}],
  payments: [
    {value: 'payments_all', label: 'Tất cả giao dịch'},
    {value: 'payments_cash', label: 'Tiền mặt'},
    {value: 'payments_transfer', label: 'Chuyển khoản'},
  ],
  contracts: [
    {value: 'contracts_active', label: 'HĐ đang hoạt động'},
    {value: 'contracts_all', label: 'Tất cả hợp đồng'},
  ],
  receivables: [
    {value: 'receivables_pending', label: 'Chưa thanh toán'},
    {value: 'receivables_overdue', label: 'Quá hạn'},
    {value: 'receivables_all', label: 'Tất cả khoản thu'},
  ],
};

// ─── Sub-services ─────────────────────────────────────────────────────────────

class BillExportService extends BaseService {
  constructor() {
    super('pos', 'bills');
  }

  async getBillsInRange(
    storeId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<any[]> {
    const from = toISODate(fromDate);
    const to = toISODate(toDate);
    const rows = await this.findAll(
      {store_id: storeId},
      {
        columns: [
          'id',
          'bill_number',
          'customer_id',
          'bill_type',
          'bill_status',
          'subtotal',
          'discount_amount',
          'tax_amount',
          'total_amount',
          'paid_amount',
          'remaining_amount',
          'issued_at',
          'deleted_at',
        ],
        orderBy: [{name: 'issued_at', order: 'DESC'}],
      },
    );
    return rows.filter((b: any) => {
      if (b.deleted_at) {return false;}
      const d = b.issued_at ? b.issued_at.split('T')[0] : '';
      return d >= from && d <= to;
    });
  }
}

class BillDetailExportService extends BaseService {
  constructor() {
    super('pos', 'bill_details');
  }

  async getDetailsByBillIds(billIds: string[]): Promise<any[]> {
    if (billIds.length === 0) {return [];}
    const BATCH = 20;
    const all: any[] = [];
    for (let i = 0; i < billIds.length; i += BATCH) {
      const results = await Promise.all(
        billIds.slice(i, i + BATCH).map(id =>
          this.findAll(
            {bill_id: id},
            {
              columns: [
                'id',
                'bill_id',
                'product_id',
                'variant_id',
                'unit_id',
                'line_description',
                'quantity',
                'unit_price',
                'discount_amount',
                'tax_amount',
                'amount',
                'sort_order',
                'deleted_at',
              ],
              orderBy: [{name: 'sort_order', order: 'ASC'}],
            },
          ),
        ),
      );
      results.forEach(r => all.push(...r));
    }
    return all.filter((d: any) => !d.deleted_at);
  }
}

class PaymentExportService extends BaseService {
  constructor() {
    super('pos', 'payments');
  }

  async getPaymentsByBillIds(billIds: string[]): Promise<any[]> {
    if (billIds.length === 0) {return [];}
    const BATCH = 20;
    const all: any[] = [];
    for (let i = 0; i < billIds.length; i += BATCH) {
      const results = await Promise.all(
        billIds.slice(i, i + BATCH).map(id =>
          this.findAll(
            {bill_id: id},
            {
              columns: [
                'id',
                'bill_id',
                'payment_method',
                'amount',
                'received_amount',
                'change_amount',
                'transaction_ref',
                'payment_gateway',
                'paid_at',
                'is_offline',
                'status',
                'deleted_at',
              ],
              orderBy: [{name: 'paid_at', order: 'DESC'}],
            },
          ),
        ),
      );
      results.forEach(r => all.push(...r));
    }
    return all.filter((p: any) => !p.deleted_at);
  }
}

class ContractExportService extends BaseService {
  constructor() {
    super('pos', 'contracts');
  }

  async getContractsInRange(
    storeId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<any[]> {
    const from = toISODate(fromDate);
    const to = toISODate(toDate);
    const rows = await this.findAll(
      {store_id: storeId},
      {
        columns: [
          'id',
          'contract_number',
          'customer_id',
          'product_id',
          'start_date',
          'end_date',
          'rent_amount',
          'deposit_amount',
          'electric_rate',
          'water_rate',
          'status',
          'deleted_at',
        ],
        orderBy: [{name: 'start_date', order: 'DESC'}],
      },
    );
    return rows.filter((c: any) => {
      if (c.deleted_at) {return false;}
      if (c.start_date > to) {return false;}
      if (c.end_date && c.end_date < from) {return false;}
      return true;
    });
  }
}

class CustomerExportService extends BaseService {
  constructor() {
    super('pos', 'customers');
  }

  async getByIds(ids: string[]): Promise<any[]> {
    if (ids.length === 0) {return [];}
    const results = await Promise.all(
      [...new Set(ids)].map(id =>
        this.findAll({id}, {columns: ['id', 'full_name', 'phone']}),
      ),
    );
    return results.flat();
  }
}

class ProductExportService extends BaseService {
  constructor() {
    super('pos', 'products');
  }

  async getByIds(ids: string[]): Promise<any[]> {
    if (ids.length === 0) {return [];}
    const results = await Promise.all(
      [...new Set(ids)].map(id =>
        this.findAll({id}, {columns: ['id', 'name']}),
      ),
    );
    return results.flat();
  }
}

class ProductVariantExportService extends BaseService {
  constructor() {
    super('pos', 'product_variants');
  }

  async getByIds(ids: string[]): Promise<any[]> {
    if (ids.length === 0) {return [];}
    const results = await Promise.all(
      [...new Set(ids)]
        .filter(Boolean)
        .map(id => this.findAll({id}, {columns: ['id', 'name']})),
    );
    return results.flat();
  }
}

class UnitExportService extends BaseService {
  constructor() {
    super('pos', 'units');
  }

  async getByIds(ids: string[]): Promise<any[]> {
    if (ids.length === 0) {return [];}
    const results = await Promise.all(
      [...new Set(ids)]
        .filter(Boolean)
        .map(id => this.findAll({id}, {columns: ['id', 'name']})),
    );
    return results.flat();
  }
}

class ReceivableExportService extends BaseService {
  constructor() {
    super('pos', 'receivables');
  }

  async getReceivablesInRange(
    storeId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<any[]> {
    const from = toISODate(fromDate);
    const to = toISODate(toDate);
    const rows = await this.findAll(
      {store_id: storeId},
      {
        columns: [
          'id',
          'customer_id',
          'receivable_code',
          'receivable_type',
          'description',
          'amount',
          'due_date',
          'status',
          'deleted_at',
        ],
        orderBy: [{name: 'due_date', order: 'ASC'}],
      },
    );
    return rows.filter((r: any) => {
      if (r.deleted_at) {return false;}
      const d = r.due_date ?? '';
      return d >= from && d <= to;
    });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function buildLookup(items: any[], keyField = 'id'): Record<string, any> {
  return Object.fromEntries(items.map(i => [i[keyField], i]));
}

// ─── ExcelExportService (public API) ─────────────────────────────────────────

class ExcelExportServiceClass {
  private billSvc = new BillExportService();
  private detailSvc = new BillDetailExportService();
  private paymentSvc = new PaymentExportService();
  private contractSvc = new ContractExportService();
  private receivableSvc = new ReceivableExportService();
  private customerSvc = new CustomerExportService();
  private productSvc = new ProductExportService();
  private variantSvc = new ProductVariantExportService();
  private unitSvc = new UnitExportService();

  getReportTypeOptions(): ReportTypeOption[] {
    return REPORT_TYPE_OPTIONS;
  }
  getTemplateOptions(reportType: string): TemplateOption[] {
    return TEMPLATE_OPTIONS[reportType] ?? [];
  }
  estimateRows(fromDate: Date, toDate: Date): number {
    return (
      (Math.ceil((toDate.getTime() - fromDate.getTime()) / 86400000) + 1) * 12
    );
  }

  async fetchSheetData(
    storeId: string,
    reportType: string,
    template: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<ExportSheetData> {
    let rows: ExportRow[] = [];
    switch (reportType) {
      case 'bills':
        rows = await this._fetchBills(storeId, fromDate, toDate, template);
        break;
      case 'bill_details':
        rows = await this._fetchBillDetails(storeId, fromDate, toDate);
        break;
      case 'payments':
        rows = await this._fetchPayments(storeId, fromDate, toDate, template);
        break;
      case 'contracts':
        rows = await this._fetchContracts(storeId, fromDate, toDate, template);
        break;
      case 'receivables':
        rows = await this._fetchReceivables(
          storeId,
          fromDate,
          toDate,
          template,
        );
        break;
    }
    return {reportType, template, fromDate, toDate, rows};
  }

  async fetchAllSheets(
    storeId: string,
    sheets: {
      reportType: string;
      template: string;
      fromDate: Date;
      toDate: Date;
    }[],
  ): Promise<ExportSheetData[]> {
    return Promise.all(
      sheets.map(s =>
        this.fetchSheetData(
          storeId,
          s.reportType,
          s.template,
          s.fromDate,
          s.toDate,
        ),
      ),
    );
  }

  // ─── Fetch helpers ──────────────────────────────────────────────────────────

  private async _fetchBills(
    storeId: string,
    fromDate: Date,
    toDate: Date,
    template: string,
  ): Promise<ExportRow[]> {
    let bills = await this.billSvc.getBillsInRange(storeId, fromDate, toDate);
    if (template === 'bills_paid')
      {bills = bills.filter((b: any) => b.bill_status === 'paid');}
    if (template === 'bills_unpaid')
      {bills = bills.filter((b: any) =>
        ['draft', 'issued', 'partial', 'overdue'].includes(b.bill_status),
      );}

    const customerIds = [
      ...new Set(bills.map((b: any) => b.customer_id).filter(Boolean)),
    ];
    const customers = await this.customerSvc.getByIds(customerIds as string[]);
    const cusMap = buildLookup(customers);

    return bills.map(
      (b: any): ExportRow => ({
        'Số HĐ': b.bill_number,
        Ngày: b.issued_at?.split('T')[0] ?? '',
        'Khách hàng': cusMap[b.customer_id]?.full_name ?? 'Khách vãng lai',
        SĐT: cusMap[b.customer_id]?.phone ?? '',
        'Loại HĐ': b.bill_type,
        'Trạng thái': b.bill_status,
        'Tiền hàng': b.subtotal,
        'Giảm giá': b.discount_amount,
        Thuế: b.tax_amount,
        'Tổng tiền': b.total_amount,
        'Đã TT': b.paid_amount,
        'Còn lại': b.remaining_amount,
      }),
    );
  }

  private async _fetchBillDetails(
    storeId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<ExportRow[]> {
    const bills = await this.billSvc.getBillsInRange(storeId, fromDate, toDate);
    const details = await this.detailSvc.getDetailsByBillIds(
      bills.map((b: any) => b.id),
    );

    const [products, variants, units] = await Promise.all([
      this.productSvc.getByIds([
        ...new Set(details.map((d: any) => d.product_id).filter(Boolean)),
      ] as string[]),
      this.variantSvc.getByIds([
        ...new Set(details.map((d: any) => d.variant_id).filter(Boolean)),
      ] as string[]),
      this.unitSvc.getByIds([
        ...new Set(details.map((d: any) => d.unit_id).filter(Boolean)),
      ] as string[]),
    ]);

    const productMap = buildLookup(products);
    const variantMap = buildLookup(variants);
    const unitMap = buildLookup(units);
    const billMap = buildLookup(bills);

    return details.map(
      (d: any): ExportRow => ({
        'Số HĐ': billMap[d.bill_id]?.bill_number ?? '',
        Ngày: billMap[d.bill_id]?.issued_at?.split('T')[0] ?? '',
        'Sản phẩm': productMap[d.product_id]?.name ?? d.line_description ?? '',
        'Biến thể': variantMap[d.variant_id]?.name ?? '',
        ĐVT: unitMap[d.unit_id]?.name ?? '',
        SL: d.quantity,
        'Đơn giá': d.unit_price,
        'Giảm giá': d.discount_amount,
        Thuế: d.tax_amount,
        'Thành tiền': d.amount,
      }),
    );
  }

  private async _fetchPayments(
    storeId: string,
    fromDate: Date,
    toDate: Date,
    template: string,
  ): Promise<ExportRow[]> {
    const bills = await this.billSvc.getBillsInRange(storeId, fromDate, toDate);
    let payments = await this.paymentSvc.getPaymentsByBillIds(
      bills.map((b: any) => b.id),
    );
    if (template === 'payments_cash')
      {payments = payments.filter((p: any) => p.payment_method === 'cash');}
    if (template === 'payments_transfer')
      {payments = payments.filter(
        (p: any) => p.payment_method === 'bank_transfer',
      );}

    const billMap = buildLookup(bills);
    return payments.map(
      (p: any): ExportRow => ({
        'Số HĐ': billMap[p.bill_id]?.bill_number ?? '',
        'Ngày TT': p.paid_at?.split('T')[0] ?? '',
        'Phương thức': p.payment_method,
        'Số tiền': p.amount,
        'Tiền nhận': p.received_amount,
        'Tiền thối': p.change_amount,
        'Mã GD': p.transaction_ref ?? '',
        'Cổng TT': p.payment_gateway ?? '',
        'Trạng thái': p.status,
        'Kết nối': p.is_offline ? 'Offline' : 'Online',
      }),
    );
  }

  private async _fetchContracts(
    storeId: string,
    fromDate: Date,
    toDate: Date,
    template: string,
  ): Promise<ExportRow[]> {
    let contracts = await this.contractSvc.getContractsInRange(
      storeId,
      fromDate,
      toDate,
    );
    if (template === 'contracts_active')
      {contracts = contracts.filter((c: any) => c.status === 'active');}

    const customerIds = [
      ...new Set(contracts.map((c: any) => c.customer_id).filter(Boolean)),
    ];
    const productIds = [
      ...new Set(contracts.map((c: any) => c.product_id).filter(Boolean)),
    ];
    const [customers, products] = await Promise.all([
      this.customerSvc.getByIds(customerIds as string[]),
      this.productSvc.getByIds(productIds as string[]),
    ]);
    const cusMap = buildLookup(customers);
    const productMap = buildLookup(products);

    return contracts.map(
      (c: any): ExportRow => ({
        'Số HĐ': c.contract_number,
        'Người thuê': cusMap[c.customer_id]?.full_name ?? '',
        SĐT: cusMap[c.customer_id]?.phone ?? '',
        Phòng: productMap[c.product_id]?.name ?? '',
        'Ngày bắt đầu': c.start_date,
        'Ngày kết thúc': c.end_date ?? 'Không xác định',
        'Tiền thuê/tháng': c.rent_amount,
        'Tiền cọc': c.deposit_amount,
        'Giá điện': c.electric_rate,
        'Giá nước': c.water_rate,
        'Trạng thái': c.status,
      }),
    );
  }

  private async _fetchReceivables(
    storeId: string,
    fromDate: Date,
    toDate: Date,
    template: string,
  ): Promise<ExportRow[]> {
    let rows = await this.receivableSvc.getReceivablesInRange(
      storeId,
      fromDate,
      toDate,
    );
    if (template === 'receivables_pending')
      {rows = rows.filter((r: any) => r.status === 'pending');}
    if (template === 'receivables_overdue')
      {rows = rows.filter((r: any) => r.status === 'overdue');}

    const customerIds = [
      ...new Set(rows.map((r: any) => r.customer_id).filter(Boolean)),
    ];
    const customers = await this.customerSvc.getByIds(customerIds as string[]);
    const cusMap = buildLookup(customers);

    return rows.map(
      (r: any): ExportRow => ({
        'Mã khoản thu': r.receivable_code ?? '',
        'Khách hàng': cusMap[r.customer_id]?.full_name ?? '',
        SĐT: cusMap[r.customer_id]?.phone ?? '',
        Loại: r.receivable_type,
        'Mô tả': r.description ?? '',
        'Số tiền': r.amount,
        'Hạn TT': r.due_date ?? '',
        'Trạng thái': r.status,
      }),
    );
  }
}

export const ExcelExportService = new ExcelExportServiceClass();
