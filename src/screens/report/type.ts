// ─── Display Mode ─────────────────────────────────────────────────────────────

export type DisplayMode = 'day' | 'week' | 'month';

export interface DisplayModeOption {
  label: string;
  value: DisplayMode;
}

// ─── Category / ApplyTo ───────────────────────────────────────────────────────

/**
 * apply_to là string động lấy từ DB — KHÔNG hardcode enum.
 * Giá trị thực tế tuỳ theo dữ liệu categories của từng store.
 */
export type CategoryApplyTo = string;

/**
 * Một danh mục đọc từ DB.
 * name  → tên hiển thị (VD: "Bán hàng", "Nhà trọ")
 * apply_to → key nhóm (VD: "pos", "hostel") lấy thẳng từ DB
 */
export interface Category {
  id: string;
  store_id: string;
  name: string;
  apply_to: CategoryApplyTo;
  status: 'active' | 'inactive';
  deleted_at: string | null;
}

/**
 * Một nhóm loại hình kinh doanh được resolve từ categories.
 * key       = giá trị apply_to từ DB
 * label     = tên đại diện nhóm (lấy từ name của category đầu tiên thuộc nhóm)
 * color / colorClass = gán theo index từ COLOR_PALETTE trong service
 */
export interface ApplyToGroup {
  key: CategoryApplyTo;
  label: string;
  color: string;
  colorClass: string;
}

// ─── Chart ────────────────────────────────────────────────────────────────────

/**
 * Một điểm dữ liệu chart với key động theo apply_to từ DB.
 * Ví dụ: { label: '01/04', pos: 1200000, hostel: 800000 }
 */
export interface RevenueChartPoint {
  label: string;
  [applyToKey: string]: number | string;
}

// ─── Summary ──────────────────────────────────────────────────────────────────

export interface ReportSummary {
  totalRevenue: number;
  /** Doanh thu theo từng apply_to key từ DB */
  revenueByApplyTo: Record<CategoryApplyTo, number>;
  previousPeriodRevenue: number;
  growthPercent: number;
  isPositive: boolean;
}

// ─── Section / TopItem ────────────────────────────────────────────────────────

/** Một mục trong top sản phẩm — name là tên thực từ DB */
export interface TopItem {
  id: string;
  icon: string;
  name: string;
  amount: number;
}

/** Một section trong màn hình Report — mỗi apply_to sinh ra một section */
export interface ReportSection {
  applyTo: CategoryApplyTo;
  title: string;
  subtitle: string;
  items: TopItem[];
}

// ─── Screen Props & State ─────────────────────────────────────────────────────

export interface ReportScreenProps {
  storeId?: string;
  onOpenMenu: () => void;
  onExport?: () => void;
}

export interface ReportScreenState {
  fromDate: Date;
  toDate: Date;
  displayMode: DisplayMode;
  loading: boolean;
  summary: ReportSummary | null;
  chartData: RevenueChartPoint[];
  applyToGroups: ApplyToGroup[];
  sections: ReportSection[];
}
