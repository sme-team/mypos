import {BaseService, FindOptions} from '../../BaseService';
import {QueryBuilder} from '@dqcai/sqlite';
import DatabaseManager from '../../../database/DBManagers';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DisplayMode = 'day' | 'week' | 'month';

export interface RevenueChartPoint {
  label: string;
  [applyToKey: string]: number | string;
}

export interface TopItem {
  id: string;
  icon: string;
  name: string;
  amount: number;
}

export interface ReportSummary {
  totalRevenue: number;
  salesRevenue: number;
  lodgingRevenue: number;
  previousPeriodRevenue: number;
  growthPercent: number;
  isPositive: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAID_STATUSES = ['paid', 'partial'];
const POS_BILL_TYPES = ['pos'];
const LODGING_BILL_TYPES = ['rent', 'hotel'];

const BILL_TYPE_TO_APPLY_TO: Record<string, string> = {
  pos: 'pos',
  manual: 'pos',
  rent: 'hostel',
  cycle: 'hostel',
  hotel: 'hotel',
};

// ─── Sub-services ─────────────────────────────────────────────────────────────

class BillService extends BaseService {
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

    const bills = await this.findAll(
      {store_id: storeId},
      {
        columns: [
          'id',
          'bill_type',
          'total_amount',
          'bill_status',
          'issued_at',
          'deleted_at',
        ],
      },
    );

    return bills.filter(b => {
      if (b.deleted_at) return false;
      if (!PAID_STATUSES.includes(b.bill_status)) return false;
      const d = b.issued_at ? b.issued_at.split('T')[0] : '';
      return d >= from && d <= to;
    });
  }

  sumRevenue(bills: any[]): number {
    return bills.reduce((acc, b) => acc + (b.total_amount ?? 0), 0);
  }

  filterByTypes(bills: any[], types: string[]): any[] {
    return bills.filter(b => types.includes(b.bill_type));
  }
}

class BillDetailService extends BaseService {
  constructor() {
    super('pos', 'bill_details');
  }

  async getDetailsByBillIds(billIds: string[]): Promise<any[]> {
    if (billIds.length === 0) return [];

    const BATCH = 20;
    const allDetails: any[] = [];

    for (let i = 0; i < billIds.length; i += BATCH) {
      const batch = billIds.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map(billId =>
          this.findAll(
            {bill_id: billId},
            {columns: ['id', 'bill_id', 'product_id', 'amount', 'deleted_at']},
          ),
        ),
      );
      results.forEach(r => allDetails.push(...r));
    }

    return allDetails.filter(d => !d.deleted_at);
  }
}

class ProductService extends BaseService {
  constructor() {
    super('pos', 'products');
  }

  async getByIds(ids: string[]): Promise<any[]> {
    if (ids.length === 0) return [];
    const uniqueIds = [...new Set(ids)];
    const results = await Promise.all(
      uniqueIds.map(id =>
        this.findAll({id}, {columns: ['id', 'name', 'product_type']}),
      ),
    );
    return results.flat();
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getPreviousPeriod(from: Date, to: Date): {from: Date; to: Date} {
  const diffMs = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - diffMs);
  return {from: prevFrom, to: prevTo};
}

function getISOWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7,
  );
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function getMonthKey(dateStr: string): string {
  return dateStr.substring(0, 7);
}

function accumulateBill(
  map: Record<string, Record<string, number>>,
  bucketKey: string,
  bill: any,
  applyToKeys: string[],
) {
  if (!map[bucketKey]) {
    map[bucketKey] = Object.fromEntries(applyToKeys.map(k => [k, 0]));
  }
  const amount = bill.total_amount ?? 0;
  const applyTo = BILL_TYPE_TO_APPLY_TO[bill.bill_type];
  if (applyTo && applyToKeys.includes(applyTo)) {
    map[bucketKey][applyTo] += amount;
  }
}

// ─── ReportService (public API) ───────────────────────────────────────────────

class ReportServiceClass {
  private billSvc = new BillService();
  private detailSvc = new BillDetailService();
  private productSvc = new ProductService();

  // ─── Summary ───────────────────────────────────────────────────────────────

  async getSummary(
    storeId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<ReportSummary> {
    const prev = getPreviousPeriod(fromDate, toDate);
    const [bills, prevBills] = await Promise.all([
      this.billSvc.getBillsInRange(storeId, fromDate, toDate),
      this.billSvc.getBillsInRange(storeId, prev.from, prev.to),
    ]);

    const totalRevenue = this.billSvc.sumRevenue(bills);
    const salesRevenue = this.billSvc.sumRevenue(
      this.billSvc.filterByTypes(bills, POS_BILL_TYPES),
    );
    const lodgingRevenue = this.billSvc.sumRevenue(
      this.billSvc.filterByTypes(bills, LODGING_BILL_TYPES),
    );
    const previousPeriodRevenue = this.billSvc.sumRevenue(prevBills);

    let growthPercent = 0;
    let isPositive = true;
    if (previousPeriodRevenue > 0) {
      const diff = totalRevenue - previousPeriodRevenue;
      growthPercent =
        Math.round((Math.abs(diff) / previousPeriodRevenue) * 1000) / 10;
      isPositive = diff >= 0;
    }

    return {
      totalRevenue,
      salesRevenue,
      lodgingRevenue,
      previousPeriodRevenue,
      growthPercent,
      isPositive,
    };
  }

  // ─── Chart ─────────────────────────────────────────────────────────────────

  async getChartData(
    storeId: string,
    fromDate: Date,
    toDate: Date,
    displayMode: DisplayMode,
    applyToGroups: {key: string}[] = [],
  ): Promise<RevenueChartPoint[]> {
    const bills = await this.billSvc.getBillsInRange(storeId, fromDate, toDate);
    const applyToKeys =
      applyToGroups.length > 0
        ? applyToGroups.map(g => g.key)
        : Object.values(BILL_TYPE_TO_APPLY_TO).filter(
            (v, i, a) => a.indexOf(v) === i,
          );

    if (displayMode === 'day')
      return this._groupByDay(bills, fromDate, toDate, applyToKeys);
    if (displayMode === 'week') return this._groupByWeek(bills, applyToKeys);
    return this._groupByMonth(bills, applyToKeys);
  }

  private _groupByDay(
    bills: any[],
    fromDate: Date,
    toDate: Date,
    applyToKeys: string[],
  ): RevenueChartPoint[] {
    const map: Record<string, Record<string, number>> = {};

    bills.forEach(b => {
      const key = b.issued_at ? b.issued_at.split('T')[0] : '';
      if (!key) return;
      accumulateBill(map, key, b, applyToKeys);
    });

    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => {
        const [, mm, dd] = date.split('-');
        return {label: `${dd}/${mm}`, ...v};
      });
  }

  private _groupByWeek(
    bills: any[],
    applyToKeys: string[],
  ): RevenueChartPoint[] {
    const map: Record<string, Record<string, number>> = {};
    bills.forEach(b => {
      const dateStr = b.issued_at ? b.issued_at.split('T')[0] : '';
      if (!dateStr) return;
      accumulateBill(map, getISOWeekKey(dateStr), b, applyToKeys);
    });

    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v], idx) => ({label: `Tuần ${idx + 1}`, ...v}));
  }

  private _groupByMonth(
    bills: any[],
    applyToKeys: string[],
  ): RevenueChartPoint[] {
    const map: Record<string, Record<string, number>> = {};
    bills.forEach(b => {
      const dateStr = b.issued_at ? b.issued_at.split('T')[0] : '';
      if (!dateStr) return;
      accumulateBill(map, getMonthKey(dateStr), b, applyToKeys);
    });

    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => ({
        label: `Tháng ${parseInt(key.split('-')[1], 10)}`,
        ...v,
      }));
  }

  // ─── Top Items ─────────────────────────────────────────────────────────────

  /**
   * Lấy tất cả mặt hàng bán chạy, sắp xếp theo doanh thu giảm dần.
   * UI tự xử lý việc hiển thị 5 hay toàn bộ.
   */
  async getTopSalesItems(
    storeId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<TopItem[]> {
    return this._getTopItems(
      storeId,
      fromDate,
      toDate,
      POS_BILL_TYPES,
      'shopping-bag',
    );
  }

  /**
   * Lấy tất cả phòng/lưu trú, sắp xếp theo doanh thu giảm dần.
   * UI tự xử lý việc hiển thị 5 hay toàn bộ.
   */
  async getTopLodgingItems(
    storeId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<TopItem[]> {
    return this._getTopItems(
      storeId,
      fromDate,
      toDate,
      LODGING_BILL_TYPES,
      'meeting-room',
    );
  }

  private async _getTopItems(
    storeId: string,
    fromDate: Date,
    toDate: Date,
    billTypes: string[],
    icon: string,
  ): Promise<TopItem[]> {
    // 1. Lấy bills đã thanh toán, lọc theo loại
    const bills = await this.billSvc.getBillsInRange(storeId, fromDate, toDate);
    const filtered = this.billSvc.filterByTypes(bills, billTypes);
    const billIds = filtered.map(b => b.id);

    // 2. Lấy bill_details
    const details = await this.detailSvc.getDetailsByBillIds(billIds);

    // 3. Gộp theo product_id → tổng amount
    const amountByProduct: Record<string, number> = {};
    details.forEach(d => {
      if (!d.product_id) return;
      amountByProduct[d.product_id] =
        (amountByProduct[d.product_id] ?? 0) + (d.amount ?? 0);
    });

    // 4. Sắp xếp toàn bộ theo doanh thu giảm dần (không slice)
    const sortedIds = Object.entries(amountByProduct)
      .sort(([, a], [, b]) => b - a)
      .map(([id]) => id);

    if (sortedIds.length === 0) return [];

    // 5. Lấy tên sản phẩm
    const products = await this.productSvc.getByIds(sortedIds);
    const nameById: Record<string, string> = {};
    products.forEach(p => {
      nameById[p.id] = p.name;
    });

    return sortedIds.map(id => ({
      id,
      icon,
      name: nameById[id] ?? 'Không có tên',
      amount: amountByProduct[id],
    }));
  }

  // ─── ApplyToGroups ─────────────────────────────────────────────────────────

  async getApplyToGroups(
    storeId: string,
  ): Promise<
    {key: string; label: string; color: string; colorClass: string}[]
  > {
    const COLOR_PALETTE = [
      {color: '#2563eb', colorClass: 'bg-blue-600'},
      {color: '#16a34a', colorClass: 'bg-green-600'},
      {color: '#9333ea', colorClass: 'bg-purple-600'},
      {color: '#ea580c', colorClass: 'bg-orange-600'},
      {color: '#0891b2', colorClass: 'bg-cyan-600'},
      {color: '#dc2626', colorClass: 'bg-red-600'},
      {color: '#ca8a04', colorClass: 'bg-yellow-600'},
      {color: '#db2777', colorClass: 'bg-pink-600'},
    ];

    try {
      const db = DatabaseManager.get('pos');
      if (!db) return [];

      const rows = await QueryBuilder.table('categories', db)
        .select(['apply_to'])
        .where('store_id', storeId)
        .where('status', 'active')
        .orderBy('apply_to', 'ASC')
        .get();

      const seenKeys = new Set<string>();
      const result: {
        key: string;
        label: string;
        color: string;
        colorClass: string;
      }[] = [];

      for (const row of rows) {
        if (row.apply_to && !seenKeys.has(row.apply_to)) {
          seenKeys.add(row.apply_to);
          const palette = COLOR_PALETTE[result.length % COLOR_PALETTE.length];
          result.push({
            key: row.apply_to,
            label: row.apply_to,
            color: palette.color,
            colorClass: palette.colorClass,
          });
        }
      }

      return result;
    } catch (error) {
      console.error('[ReportService] getApplyToGroups error:', error);
      return [];
    }
  }
}

export const ReportService = new ReportServiceClass();
