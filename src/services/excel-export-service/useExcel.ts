/**
 * useExcelExport.ts
 *
 * Custom hook — gắn vào nút "Xuất file" trong màn hình ExcelExport.
 *
 * Usage trong ExcelExport.tsx:
 *   const { exporting, handleExport } = useExcelExport({ storeId, sheets });
 */

import {useState, useCallback} from 'react';
import {Alert} from 'react-native';
import {exportToFile, ExportParams} from './ExcelExportService';

export interface SheetConfigMinimal {
  reportType: string; // 'S1a' | 'S2a'
  template: string;
  fromDate: Date;
  toDate: Date;
}

interface UseExcelExportOptions {
  storeId: string;
  sheets: SheetConfigMinimal[];
  businessName?: string;
  taxCode?: string;
  address?: string;
}

export function useExcelExport({
  storeId,
  sheets,
  businessName,
  taxCode,
  address,
}: UseExcelExportOptions) {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (exporting) return;

    const validSheets = sheets.filter(s => s.reportType && s.template);
    if (validSheets.length === 0) {
      Alert.alert(
        'Chưa cấu hình',
        'Vui lòng chọn loại báo cáo và mẫu trước khi xuất.',
      );
      return;
    }

    setExporting(true);
    try {
      // Xuất từng sheet tuần tự
      for (const sheet of validSheets) {
        const reportType = sheet.reportType as ExportParams['reportType'];
        await exportToFile({
          storeId,
          fromDate: sheet.fromDate,
          toDate: sheet.toDate,
          reportType,
          businessName,
          taxCode,
          address,
        });
      }
    } catch (err: any) {
      console.error('[useExcelExport] Export error:', err);
      Alert.alert(
        'Lỗi xuất file',
        err?.message ?? 'Không thể xuất file. Vui lòng thử lại.',
      );
    } finally {
      setExporting(false);
    }
  }, [exporting, sheets, storeId, businessName, taxCode, address]);

  return {exporting, handleExport};
}

// ─────────────────────────────────────────────────────────────────────────────
//  HƯỚNG DẪN TÍCH HỢP VÀO ExcelExport.tsx
//  Chỉ cần thay đoạn export logic hiện tại:
// ─────────────────────────────────────────────────────────────────────────────
/*

// 1. Import hook
import { useExcelExport } from '../../hooks/useExcelExport';

// 2. Trong component, thay useState exporting + handleExport bằng:
const { exporting, handleExport } = useExcelExport({
  storeId,
  sheets,
  businessName: 'Nguyễn Văn A',   // lấy từ store settings nếu có
  taxCode: '0123456789',
  address: '123 Lê Lợi, Q.1, TP.HCM',
});

// 3. Nút xuất (giữ nguyên JSX, chỉ thay handler):
<TouchableOpacity
  onPress={handleExport}          // ← thay handleExport cũ
  disabled={!canExport || exporting}
  ...
>

// 4. canExport vẫn giữ nguyên logic cũ:
const canExport = sheets.length > 0 && sheets.every(s => s.reportType && s.template);

*/
