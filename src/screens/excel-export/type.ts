import {SheetConfig} from '../../components/excel-export/SheetCard';

// ─── Re-export SheetConfig để dùng trong screen ───────────────────────────────
export type {SheetConfig};

// ─── Options ──────────────────────────────────────────────────────────────────

export interface ReportTypeOption {
  value: string;
  label: string;
}

export interface TemplateOption {
  value: string;
  label: string;
}

// ─── Export Data ──────────────────────────────────────────────────────────────

export type ExportRow = Record<string, string | number | null>;

export interface ExportSheetData {
  reportType: string;
  template: string;
  fromDate: Date;
  toDate: Date;
  rows: ExportRow[];
}

// ─── Screen Props & State ─────────────────────────────────────────────────────

export interface ExcelExportScreenProps {
  storeId?: string;
  onOpenMenu: () => void;
  onBack: () => void;
  onHistory?: () => void;
}

export interface ExcelExportScreenState {
  sheets: SheetConfig[];
  deleteModalVisible: boolean;
  sheetToDelete: string | null;
  exporting: boolean;
}

// ─── Component Props ──────────────────────────────────────────────────────────

export interface ConfirmDeleteModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface AddSheetButtonProps {
  onPress: () => void;
  isDark?: boolean;
}
