import XLSX, {WorkBook, WorkSheet, CellObject, Range} from 'xlsx';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import {Platform, PermissionsAndroid} from 'react-native';
import {BaseService} from '../BaseService';
import {QueryBuilder} from '@dqcai/sqlite';
import {createModuleLogger, AppModules} from '../../logger';

const logger = createModuleLogger(AppModules.EXCEL_EXPORT_SERVICE);

// ─── Types ────────────────────────────────────────────────────────────────────

export type BillType = 'pos' | 'rent';

export interface ExportSheetRequest {
  reportType: string;
  template: string;
  fromDate: Date;
  toDate: Date;
  billType?: BillType;
}

export interface ExportParams {
  storeId: string;
  fromDate: Date;
  toDate: Date;
  reportType: 'S1a' | 'S2a';
  /** 'pos' = bán hàng → lọc bill_type='pos'  |  'rent' = lưu trú → lọc bill_type='rent' */
  billType?: BillType;
  businessName?: string;
  taxCode?: string;
  address?: string;
  location?: string;
}

export interface ExportParamsWithLabel extends ExportParams {
  sheetLabel?: string;
}

export interface AggregatedRow {
  dateStr: string;
  description: string;
  quantity: number;
  amount: number;
}

export interface ExportRowResult {
  reportType: string;
  template: string;
  fromDate: Date;
  toDate: Date;
  rows: AggregatedRow[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DATA_START_ROW = 11;

// ─── Permission helper ────────────────────────────────────────────────────────

async function requestWritePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const sdkInt = Number(Platform.Version);
  if (sdkInt >= 29) return true;
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    {
      title: 'Quyền lưu file',
      message: 'Ứng dụng cần quyền lưu file Excel vào thư mục Downloads.',
      buttonPositive: 'Cho phép',
      buttonNegative: 'Từ chối',
    },
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

// ─── Save & Share ─────────────────────────────────────────────────────────────

async function saveAndShare(
  base64Data: string,
  fileName: string,
  reportType: string,
): Promise<void> {
  if (Platform.OS === 'android') {
    const hasPermission = await requestWritePermission();
    if (!hasPermission) throw new Error('Không có quyền ghi file.');
    const downloadPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;
    await RNFS.writeFile(downloadPath, base64Data, 'base64');
    try {
      await RNFS.scanFile(downloadPath);
      logger.debug('[saveAndShare] ✓ MediaStore notified');
    } catch (e) {
      logger.warn('[saveAndShare] ⚠️ scanFile failed:', e);
    }
    await Share.open({
      url: `file://${downloadPath}`,
      type: 'application/vnd.ms-excel',
      filename: fileName,
      title: `Xuất ${reportType}`,
      failOnCancel: false,
    });
  } else {
    const path = `${RNFS.DocumentDirectoryPath}/${fileName}`;
    await RNFS.writeFile(path, base64Data, 'base64');
    await Share.open({
      url: `file://${path}`,
      type: 'application/vnd.ms-excel',
      filename: fileName,
      title: `Xuất ${reportType}`,
      failOnCancel: false,
    });
  }
}

// ─── Cell helpers ─────────────────────────────────────────────────────────────

const TNR_FONT = {name: 'Times New Roman', sz: 10};

function styleCell(
  value: string | number,
  opts: {
    bold?: boolean;
    align?: 'left' | 'center' | 'right';
    numFmt?: string;
    border?: boolean;
    fill?: string;
  } = {},
): CellObject {
  const isNum = typeof value === 'number';
  const cell: CellObject = {v: value, t: isNum ? 'n' : 's'};
  const s: any = {
    font: {...TNR_FONT, bold: opts.bold ?? false},
    alignment: {
      horizontal: opts.align ?? 'left',
      vertical: 'center',
      wrapText: false,
    },
  };
  if (opts.numFmt) {
    cell.z = opts.numFmt;
    s.numFmt = opts.numFmt;
  }
  if (opts.border) {
    const b = {style: 'thin', color: {rgb: 'FF000000'}};
    s.border = {top: b, bottom: b, left: b, right: b};
  }
  if (opts.fill) {
    s.fill = {patternType: 'solid', fgColor: {rgb: opts.fill}};
  }
  cell.s = s;
  return cell;
}

function numCell(v: number): CellObject {
  return styleCell(v, {align: 'right', numFmt: '#,##0', border: true});
}

function addr(col: number, row: number): string {
  return XLSX.utils.encode_cell({c: col, r: row - 1});
}

function setCell(ws: WorkSheet, row: number, col: number, cell: CellObject) {
  ws[addr(col, row)] = cell;
}

function addMerge(
  ws: WorkSheet,
  r1: number,
  c1: number,
  r2: number,
  c2: number,
) {
  if (!ws['!merges']) ws['!merges'] = [];
  (ws['!merges'] as Range[]).push({
    s: {r: r1 - 1, c: c1},
    e: {r: r2 - 1, c: c2},
  });
}

// ─── Date utilities ───────────────────────────────────────────────────────────

function toLocalDateStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateVN(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatDateFile(d: Date): string {
  return toLocalDateStr(d).replace(/-/g, '');
}

function bufferToBase64(buf: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return btoa(bin);
}

/**
 * Trích YYYY-MM-DD từ issued_at (ISO string / number / Date).
 * Luôn lấy phần ngày LOCAL.
 */
function extractLocalDate(raw: any): string | null {
  if (!raw) return null;
  try {
    const d = raw instanceof Date ? raw : new Date(raw);
    if (isNaN(d.getTime())) return null;
    return toLocalDateStr(d);
  } catch {
    return null;
  }
}

// ─── Data fetching & aggregation ──────────────────────────────────────────────

/**
 * Lấy dữ liệu từ SQLite, group theo ngày + line_description.
 *
 * Filter áp dụng:
 *  1. store_id    = storeId
 *  2. bill_status = 'paid'
 *  3. bill_type   = billType  ('pos' hoặc 'rent')
 *  4. issued_at   trong khoảng [from, to]  (ngày LOCAL, không UTC)
 */

async function fetchAggregated(
  storeId: string,
  fromDate: Date,
  toDate: Date,
  billType: BillType,
): Promise<AggregatedRow[]> {
  const billService = new BaseService('pos', 'bills');
  const billDetailService = new BaseService('pos', 'bill_details');

  const from = toLocalDateStr(fromDate);
  const to = toLocalDateStr(toDate);

  logger.debug('[fetchAggregated] Params:', {from, to, billType, storeId});

  // ── Lấy bills đúng loại + đúng khoảng ngày ──────────────────────
  const bills: any[] = await billService.findAll(
    {
      store_id: storeId,
      bill_status: 'paid',
      bill_type: billType, // 'pos' hoặc 'rent' — filter đúng loại
    },
    {orderBy: [{name: 'issued_at', order: 'ASC'}]},
  );

  logger.debug(`[fetchAggregated] Total paid ${billType} bills:`, bills.length);

  // ── Bước 2: Filter issued_at trong khoảng [from, to] ─────────────────────
  const filteredBills = bills.filter(b => {
    const dateStr = extractLocalDate(b.issued_at);
    if (!dateStr) return false;
    return dateStr >= from && dateStr <= to;
  });

  logger.debug(
    '[fetchAggregated] Filtered bills (in range):',
    filteredBills.length,
  );

  if (filteredBills.length === 0) {
    logger.warn('[fetchAggregated] ⚠️ No bills in range.');
    return [];
  }

  const billIds = filteredBills.map(b => b.id as string);
  const billDateMap = new Map<string, string>(
    filteredBills.map(b => [
      b.id as string,
      extractLocalDate(b.issued_at) ?? '',
    ]),
  );

  // ── Bước 3: Lấy bill_details  ────────

  const billIdSet = new Set<string>(billIds);

  const allDetails: any[] = await billDetailService.findAll({
    store_id: storeId,
  });

  const relevantDetails = allDetails.filter(d =>
    billIdSet.has(d.bill_id as string),
  );

  logger.debug(
    '[fetchAggregated] bill_details fetched:',
    relevantDetails.length,
  );

  if (relevantDetails.length === 0) {
    logger.warn('[fetchAggregated] ⚠️ No bill_details for filtered bills');
    return [];
  }

  // ── Bước 4: Aggregate theo ngày + line_description ────────────────────────
  const agg = new Map<string, AggregatedRow & {_date: Date; _qty: number}>();

  for (const detail of relevantDetails) {
    const dateISO = billDateMap.get(detail.bill_id);
    if (!dateISO) continue;

    const desc =
      (detail.line_description as string | undefined)?.trim() || 'Khác';
    const key = `${dateISO}|${desc}`;

    const qty = Number(detail.quantity ?? 1);
    const rawAmount =
      detail.amount ??
      detail.total ??
      detail.total_price ??
      detail.price ??
      null;
    const amount =
      rawAmount !== null
        ? Number(rawAmount)
        : qty * Number(detail.unit_price ?? 0);

    if (agg.has(key)) {
      const existing = agg.get(key)!;
      existing.amount += amount;
      existing._qty += qty;
      existing.description = `${desc} x ${existing._qty}`;
    } else {
      const d = new Date(dateISO);
      agg.set(key, {
        _date: d,
        _qty: qty,
        dateStr: formatDateVN(d),
        description: `${desc} x ${qty}`,
        quantity: qty,
        amount,
      });
    }
  }

  const result = Array.from(agg.values())
    .sort((a, b) => a._date.getTime() - b._date.getTime())
    .map(({_date: _d, _qty: _q, ...rest}) => rest);

  logger.debug('[fetchAggregated] Final rows:', result.length);
  return result;
}
// ─── Template loading ─────────────────────────────────────────────────────────

async function loadTemplate(templateName: string): Promise<WorkBook> {
  let lastError: any;

  if (Platform.OS === 'android') {
    for (const p of [
      `excel/${templateName}.xlsx`,
      `custom/${templateName}.xlsx`,
      `${templateName}.xlsx`,
    ]) {
      try {
        const base64 = await RNFS.readFileAssets(p, 'base64');
        const binary = atob(base64);
        const buf = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
        logger.debug('[loadTemplate] ✓ Android asset:', p);
        return XLSX.read(buf, {type: 'array', cellStyles: true});
      } catch (err) {
        lastError = err;
      }
    }
  }

  for (const basePath of [RNFS.MainBundlePath, RNFS.DocumentDirectoryPath]) {
    try {
      const path = `${basePath}/excel/${templateName}.xlsx`;
      const base64 = await RNFS.readFile(path, 'base64');
      const binary = atob(base64);
      const buf = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
      logger.debug('[loadTemplate] ✓ Loaded from:', basePath);
      return XLSX.read(buf, {type: 'array', cellStyles: true});
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(
    `Template ${templateName}.xlsx not found.\nError: ${lastError?.message}`,
  );
}

// ─── Header writer ────────────────────────────────────────────────────────────

function writeHeader(
  ws: WorkSheet,
  params: Pick<
    ExportParams,
    'businessName' | 'taxCode' | 'address' | 'location' | 'fromDate' | 'toDate'
  >,
  reportType?: string,
): void {
  const kyStr = `Kỳ kê khai: ${formatDateVN(params.fromDate)} – ${formatDateVN(
    params.toDate,
  )}`;

  if (reportType === 'S2a') {
    // Template S2a-HKD:

    const name_ = params.businessName ?? '';
    const tax_ = params.taxCode ?? '';
    const addr_ = params.address ?? '';
    const loc_ = params.location ?? '';
    if (ws['A1']) {
      ws[
        'A1'
      ].v = `HỘ, CÁ NHÂN KINH DOANH: ${name_}\nMã số thuế: ${tax_}\nĐịa chỉ: ${addr_}`;
    }
    if (ws['A4']) {
      ws['A4'].v = `Địa điểm kinh doanh: ${loc_}`;
    }
    if (ws['A5']) {
      ws['A5'].v = kyStr;
    }
  } else {
    // S1a: header nằm ở các ô riêng lẻ
    if (ws['A1'] && params.businessName)
      ws['A1'].v = `Hộ, CÁ NHÂN KINH DOANH: ${params.businessName}`;
    if (ws['A2'] && params.taxCode)
      ws['A2'].v = `Mã số thuế: ${params.taxCode}`;
    if (ws['A3'] && params.address) ws['A3'].v = `Địa chỉ: ${params.address}`;
    if (ws['A6'] && params.location)
      ws['A6'].v = `Địa điểm kinh doanh: ${params.location}`;
    if (ws['A7']) ws['A7'].v = kyStr;
  }
}

// // ─── Clear old data rows ──────────────────────────────────────────────────────

/**
 * Xoá cells từ fromRow trở đi.
 * Rows < fromRow (header + dòng trống template) được giữ nguyên.
 */
function clearDataRows(ws: WorkSheet, fromRow: number): void {
  if (!ws['!ref']) return;
  const range = XLSX.utils.decode_range(ws['!ref']);
  const maxRow = range.e.r + 1;
  for (let r = fromRow; r <= maxRow; r++) {
    for (let c = 0; c <= range.e.c; c++) {
      const cellAddr = addr(c, r);
      if (ws[cellAddr]) delete ws[cellAddr];
    }
  }
  if (ws['!merges']) {
    ws['!merges'] = (ws['!merges'] as Range[]).filter(m => m.s.r < fromRow - 1);
  }
}

// ─── S1a writer ──────────────────────────────────────────────────────────────

function writeS1aData(ws: WorkSheet, rows: AggregatedRow[]): void {
  clearDataRows(ws, DATA_START_ROW); // xoá từ row 11, row 10 giữ nguyên
  let r = DATA_START_ROW;

  for (const row of rows) {
    setCell(ws, r, 0, styleCell(row.dateStr, {border: true, align: 'center'}));
    setCell(ws, r, 1, styleCell(row.description, {border: true}));
    setCell(ws, r, 2, numCell(row.amount));
    r++;
  }

  ws['!ref'] = XLSX.utils.encode_range({s: {r: 0, c: 0}, e: {r: r + 10, c: 4}});

  // Tổng cộng
  const totalRow = r;
  setCell(ws, totalRow, 0, styleCell('', {border: true}));
  setCell(
    ws,
    totalRow,
    1,
    styleCell('Tổng cộng', {bold: true, align: 'center', border: true}),
  );

  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  logger.debug('[S1a] Total:', total);

  ws[addr(2, totalRow)] = {
    t: 'n',
    v: total,
    w: total.toLocaleString('vi-VN'),
    z: '#,##0',
    s: {
      font: {name: 'Times New Roman', sz: 10, bold: true},
      alignment: {horizontal: 'right', vertical: 'center'},
      border: {
        top: {style: 'thin', color: {rgb: 'FF000000'}},
        bottom: {style: 'thin', color: {rgb: 'FF000000'}},
        left: {style: 'thin', color: {rgb: 'FF000000'}},
        right: {style: 'thin', color: {rgb: 'FF000000'}},
      },
    },
  } as CellObject;

  // Chữ ký (3 dòng trống sau tổng cộng)
  const sig = totalRow + 3;
  setCell(
    ws,
    sig,
    2,
    styleCell('Ngày     ... tháng     ... năm ...', {align: 'center'}),
  );
  setCell(
    ws,
    sig + 1,
    2,
    styleCell('NGƯỜI ĐẠI DIỆN HỌ KINH DOANH/', {bold: true, align: 'center'}),
  );
  setCell(
    ws,
    sig + 2,
    2,
    styleCell('CÁ NHÂN KINH DOANH', {bold: true, align: 'center'}),
  );
  setCell(
    ws,
    sig + 3,
    2,
    styleCell('(Ký, họ tên, đóng dấu)', {align: 'center'}),
  );

  ws['!ref'] = XLSX.utils.encode_range({
    s: {r: 0, c: 0},
    e: {r: sig + 3, c: 2},
  });
}

// ─── S2a writer ───────────────────────────────────────────────────────────────

function writeS2aData(ws: WorkSheet, rows: AggregatedRow[]): void {
  // S2a: header rows 1-8, data bắt đầu từ row 9
  const S2A_DATA_START = 9;
  clearDataRows(ws, S2A_DATA_START); // xoá từ row 11, rows 9-10 giữ nguyên
  let r = S2A_DATA_START;

  // Data rows
  for (const row of rows) {
    setCell(ws, r, 0, styleCell('', {border: true, align: 'center'}));
    setCell(ws, r, 1, styleCell(row.dateStr, {border: true, align: 'center'}));
    setCell(ws, r, 2, styleCell(row.description, {border: true}));
    setCell(ws, r, 3, numCell(row.amount));
    // S2a: col D (index 3) is last col, no merge needed
    r++;
  }

  setCell(ws, r, 0, styleCell('', {border: true}));
  addMerge(ws, r, 0, r, 1);
  setCell(
    ws,
    r,
    2,
    styleCell('Tổng cộng', {bold: true, align: 'center', border: true}),
  );

  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  logger.debug('[S2a] Total:', total);

  ws[addr(3, r)] = {
    t: 'n',
    v: total,
    w: total.toLocaleString('vi-VN'),
    z: '#,##0',
    s: {
      font: {name: 'Times New Roman', sz: 10, bold: true},
      alignment: {horizontal: 'right', vertical: 'center'},
      border: {
        top: {style: 'thin', color: {rgb: 'FF000000'}},
        bottom: {style: 'thin', color: {rgb: 'FF000000'}},
        left: {style: 'thin', color: {rgb: 'FF000000'}},
        right: {style: 'thin', color: {rgb: 'FF000000'}},
      },
    },
  } as CellObject;
  r++;

  // Thuế GTGT
  setCell(ws, r, 0, styleCell('', {border: true}));
  addMerge(ws, r, 0, r, 1);
  setCell(ws, r, 2, styleCell('Thuế GTGT', {align: 'center', border: true}));
  setCell(ws, r, 3, styleCell('-', {align: 'right', border: true}));
  r++;

  // Thuế TNCN
  setCell(ws, r, 0, styleCell('', {border: true}));
  addMerge(ws, r, 0, r, 1);
  setCell(ws, r, 2, styleCell('Thuế TNCN', {align: 'center', border: true}));
  setCell(ws, r, 3, styleCell('-', {align: 'right', border: true}));
  r++;

  // Tổng số thuế GTGT phải nộp
  setCell(ws, r, 0, styleCell('', {border: true}));
  addMerge(ws, r, 0, r, 1);
  setCell(
    ws,
    r,
    2,
    styleCell('Tổng số thuế GTGT phải nộp', {
      bold: true,
      align: 'center',
      border: true,
    }),
  );
  setCell(ws, r, 3, styleCell('', {border: true}));
  r++;

  // Tổng số thuế TNCN phải nộp
  setCell(ws, r, 0, styleCell('', {border: true}));
  addMerge(ws, r, 0, r, 1);
  setCell(
    ws,
    r,
    2,
    styleCell('Tổng số thuế TNCN phải nộp', {
      bold: true,
      align: 'center',
      border: true,
    }),
  );
  setCell(ws, r, 3, styleCell('', {border: true}));
  r++;

  // Chữ ký — KHÔNG có "NGƯỜI ĐẠI DIỆN HỌ KINH DOANH/"
  const sig = r + 2;
  setCell(
    ws,
    sig,
    3,
    styleCell('Ngày .... tháng ..... năm ...', {align: 'center'}),
  );
  addMerge(ws, sig, 3, sig, 4);
  setCell(
    ws,
    sig + 1,
    3,
    styleCell('CÁ NHÂN KINH DOANH', {bold: true, align: 'center'}),
  );
  addMerge(ws, sig + 1, 3, sig + 1, 4);
  setCell(
    ws,
    sig + 2,
    3,
    styleCell('(Ký, họ tên, đóng dấu)', {align: 'center'}),
  );
  addMerge(ws, sig + 2, 3, sig + 2, 4);

  ws['!ref'] = XLSX.utils.encode_range({
    s: {r: 0, c: 0},
    e: {r: sig + 2, c: 4},
  });
}

// ─── Build worksheet ─────────────────────────────────────────────────────────

async function buildWorksheet(
  params: ExportParamsWithLabel,
): Promise<WorkSheet> {
  const templateName = `${params.reportType}-HKD`;
  const wb = await loadTemplate(templateName);
  const ws = wb.Sheets[wb.SheetNames[0]];

  writeHeader(ws, params, params.reportType);

  const rows = await fetchAggregated(
    params.storeId,
    params.fromDate,
    params.toDate,
    params.billType ?? 'pos',
  );
  logger.debug(
    `[buildWorksheet] ${params.reportType} (${params.billType}) rows:`,
    rows.length,
  );

  if (params.reportType === 'S2a') {
    writeS2aData(ws, rows);
  } else {
    writeS1aData(ws, rows);
  }

  return ws;
}

// ─── Export 1 sheet → 1 file ─────────────────────────────────────────────────

export async function exportToFile(params: ExportParams): Promise<void> {
  logger.debug('[exportToFile] Starting:', {
    reportType: params.reportType,
    billType: params.billType,
    storeId: params.storeId,
    fromDate: params.fromDate,
    toDate: params.toDate,
  });
  try {
    const ws = await buildWorksheet(params);
    const wb = XLSX.utils.book_new();
    const sheetName = `${params.reportType} ${formatDateFile(
      params.fromDate,
    )}-${formatDateFile(params.toDate)}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
    const wbout: Uint8Array = XLSX.write(wb, {
      bookType: 'xlsx',
      type: 'buffer',
      cellStyles: true,
    });
    const fileName = `${params.reportType}_${formatDateFile(
      params.fromDate,
    )}_${formatDateFile(params.toDate)}.xlsx`;
    await saveAndShare(bufferToBase64(wbout), fileName, params.reportType);
    logger.debug('[exportToFile] ✓ Done:', fileName);
  } catch (err: any) {
    logger.error('[exportToFile] ❌ Error:', err);
    throw err;
  }
}

// ─── Export nhiều sheets → 1 file ────────────────────────────────────────────

export async function exportAllSheetsToOneFile(params: {
  storeId: string;
  sheets: Array<{
    reportType: 'S1a' | 'S2a';
    billType?: BillType;
    fromDate: Date;
    toDate: Date;
    sheetLabel?: string;
  }>;
  businessName?: string;
  taxCode?: string;
  address?: string;
  location?: string;
}): Promise<void> {
  if (params.sheets.length === 0) return;
  logger.debug(
    '[exportAllSheetsToOneFile] Exporting',
    params.sheets.length,
    'sheets',
  );

  const wb = XLSX.utils.book_new();
  const usedSheetNames = new Set<string>();

  for (let i = 0; i < params.sheets.length; i++) {
    const sheet = params.sheets[i];
    const ws = await buildWorksheet({
      storeId: params.storeId,
      reportType: sheet.reportType,
      billType: sheet.billType ?? 'pos',
      fromDate: sheet.fromDate,
      toDate: sheet.toDate,
      businessName: params.businessName,
      taxCode: params.taxCode,
      address: params.address,
      location: params.location,
    });

    let sheetName =
      sheet.sheetLabel ??
      `${sheet.reportType} ${i + 1} (${formatDateVN(sheet.fromDate).substring(
        0,
        5,
      )}-${formatDateVN(sheet.toDate).substring(0, 5)})`;
    sheetName = sheetName.substring(0, 31);

    // Nếu trùng tên: thêm suffix (1), (2), ...
    let uniqueName = sheetName;
    let counter = 1;
    while (usedSheetNames.has(uniqueName)) {
      const suffix = ` (${counter++})`;
      uniqueName = `${sheetName.substring(0, 31 - suffix.length)}${suffix}`;
    }
    usedSheetNames.add(uniqueName);

    XLSX.utils.book_append_sheet(wb, ws, uniqueName);
    logger.debug(`[exportAllSheetsToOneFile] ✓ Sheet ${i + 1}: "${uniqueName}"`);
  }

  const wbout: Uint8Array = XLSX.write(wb, {
    bookType: 'xlsx',
    type: 'buffer',
    cellStyles: true,
  });
  logger.debug('[exportAllSheetsToOneFile] Buffer size:', wbout.length);

  const first = params.sheets[0];
  const last = params.sheets[params.sheets.length - 1];
  const fileName = `BaoCao_${formatDateFile(first.fromDate)}_${formatDateFile(
    last.toDate,
  )}.xlsx`;
  await saveAndShare(bufferToBase64(wbout), fileName, 'BaoCao');
  logger.debug('[exportAllSheetsToOneFile] ✓ Done:', fileName);
}

// ─── ExcelExportService (public API) ─────────────────────────────────────────

export const ExcelExportService = {
  async fetchAllSheets(
    storeId: string,
    sheets: ExportSheetRequest[],
  ): Promise<ExportRowResult[]> {
    const results: ExportRowResult[] = [];
    for (const sheet of sheets) {
      const rows = await fetchAggregated(
        storeId,
        sheet.fromDate,
        sheet.toDate,
        (sheet.billType ?? 'pos') as BillType,
      );
      results.push({
        reportType: sheet.reportType,
        template: sheet.template,
        fromDate: sheet.fromDate,
        toDate: sheet.toDate,
        rows,
      });
    }
    return results;
  },

  async exportSheet(params: ExportParams): Promise<void> {
    return exportToFile(params);
  },

  /**
   * Xuất tất cả sheets từ UI → 1 file Excel duy nhất (nhiều worksheet).
   * Hàm chính dùng trong ExcelExport.tsx.
   */
  async exportAllInOne(
    storeId: string,
    sheets: Array<{
      reportType: 'S1a' | 'S2a';
      billType?: BillType;
      fromDate: Date;
      toDate: Date;
      sheetLabel?: string;
    }>,
    meta: Pick<
      ExportParams,
      'businessName' | 'taxCode' | 'address' | 'location'
    > = {},
  ): Promise<void> {
    return exportAllSheetsToOneFile({storeId, sheets, ...meta});
  },

  async exportAllSheets(
    storeId: string,
    sheets: ExportSheetRequest[],
    meta: Pick<
      ExportParams,
      'businessName' | 'taxCode' | 'address' | 'location'
    > = {},
  ): Promise<void> {
    for (const sheet of sheets) {
      await exportToFile({
        storeId,
        reportType: sheet.reportType as 'S1a' | 'S2a',
        billType: (sheet.billType ?? 'pos') as BillType,
        fromDate: sheet.fromDate,
        toDate: sheet.toDate,
        ...meta,
      });
    }
  },
};

export default ExcelExportService;
