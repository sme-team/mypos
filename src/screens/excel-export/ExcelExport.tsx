import {createModuleLogger, AppModules} from '../../logger';
const logger = createModuleLogger(AppModules.EXCEL_EXPORT_SCREEN);

import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../../hooks/useTheme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {SheetCard, SheetConfig} from '../../components/excel-export/SheetCard';
import ExcelExportService, {
  BillType,
} from '../../services/excel-export-service/ExcelExportService';
import {
  ExcelExportScreenProps,
  ConfirmDeleteModalProps,
  AddSheetButtonProps,
} from '../../screens/excel-export/type';

const SHEETS_STORAGE_KEY = 'excel_export_sheets';

// ─── Mapping ──────────────────────────────────────────────

/**
 * 2 dimension độc lập:
 *   billType  → lấy từ reportType UI (sales/accommodation)
 *   reportType Excel (S1a/S2a) → lấy từ template mà user chọn
 *
 * Kết quả:
 *   sales         + s1a_hkd → { reportType: 'S1a', billType: 'pos'  }
 *   sales         + s2a_hkd → { reportType: 'S2a', billType: 'pos'  }
 *   accommodation + s1a_hkd → { reportType: 'S1a', billType: 'rent' }
 *   accommodation + s2a_hkd → { reportType: 'S2a', billType: 'rent' }
 */

/** Loại báo cáo UI → billType SQLite */
const BILL_TYPE_MAP: Record<string, BillType> = {
  sales: 'pos',
  accommodation: 'rent',
};

/** Template UI → reportType Excel */
const REPORT_EXCEL_MAP: Record<string, 'S1a' | 'S2a'> = {
  s1a_hkd: 'S1a',
  s2a_hkd: 'S2a',
  s1a: 'S1a',
  s2a: 'S2a',
  S1a: 'S1a',
  S2a: 'S2a',
};

function resolveSheetConfig(
  sheet: SheetConfig,
): {reportType: 'S1a' | 'S2a'; billType: BillType} | null {
  const billType = BILL_TYPE_MAP[sheet.reportType];
  const reportType =
    REPORT_EXCEL_MAP[sheet.template] ??
    REPORT_EXCEL_MAP[sheet.template?.toLowerCase()];
  if (!billType || !reportType) return null;
  return {reportType, billType};
}

// ─── ConfirmDeleteModal ────────────────────────────────────────────────────────

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  visible,
  onConfirm,
  onCancel,
}) => {
  const {t} = useTranslation();
  const {isDark} = useTheme();
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}>
      <View className="flex-1 bg-black/40 items-center justify-center px-4">
        <View
          className={`rounded-3xl px-6 py-8 w-full max-w-xs ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
          <View className="items-center mb-6">
            <View className="w-14 h-14 rounded-full bg-red-100 items-center justify-center mb-4">
              <Icon name="delete-outline" size={28} color="#EF4444" />
            </View>
            <Text
              className={`text-lg font-bold text-center ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
              {t('report.export.confirmDelete')}
            </Text>
          </View>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={onCancel}
              className={`flex-1 border-2 rounded-xl py-3 items-center justify-center ${
                isDark
                  ? 'border-gray-600 bg-gray-700/50'
                  : 'border-gray-300 bg-white'
              }`}>
              <Text
                className={`font-semibold ${
                  isDark ? 'text-gray-200' : 'text-gray-700'
                }`}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              className="flex-1 bg-red-500 rounded-xl py-3 items-center justify-center">
              <Text className="text-white font-semibold">
                {t('common.delete')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const createDefaultSheet = (): SheetConfig => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    id: Date.now().toString(),
    reportType: '',
    template: '',
    fromDate: firstOfMonth,
    toDate: today,
  };
};

// ─── AddSheetButton ───────────────────────────────────────────────────────────

const AddSheetButton: React.FC<AddSheetButtonProps> = ({
  onPress,
  isDark = false,
}) => {
  const {t} = useTranslation();
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`border-2 border-dashed rounded-2xl py-5 px-4 items-center justify-center mb-4 ${
        isDark
          ? 'border-gray-600 bg-gray-800/50'
          : 'border-gray-200 bg-gray-50/60'
      }`}>
      <View className="flex-row items-center gap-2">
        <View
          className={`w-8 h-8 rounded-full items-center justify-center ${
            isDark ? 'bg-blue-900/60' : 'bg-blue-50'
          }`}>
          <Icon name="add" size={20} color="#3B82F6" />
        </View>
        <Text
          className={`text-sm font-semibold ${
            isDark ? 'text-gray-300' : 'text-gray-600'
          }`}>
          {t('report.export.create')}
        </Text>
      </View>
      <Text
        className={`text-xs text-center mt-2 leading-relaxed px-4 ${
          isDark ? 'text-gray-500' : 'text-gray-400'
        }`}>
        {t('report.export.description')}
      </Text>
    </TouchableOpacity>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ReportExport({
  storeId: storeIdProp,
  onOpenMenu,
  onBack,
}: ExcelExportScreenProps) {
  const [sheets, setSheets] = useState<SheetConfig[]>([]);
  const [deleteModalVisible, setDeleteModal] = useState(false);
  const [sheetToDelete, setSheetToDelete] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const storeId = storeIdProp ?? 'store-001';
  const {t} = useTranslation();
  const {isDark} = useTheme();

  useEffect(() => {
    loadSheetsFromStorage();
  }, []);
  useEffect(() => {
    saveSheetsToStorage();
  }, [sheets]);

  const loadSheetsFromStorage = async () => {
    try {
      const stored = await AsyncStorage.getItem(SHEETS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored).map((s: any) => ({
          ...s,
          fromDate: new Date(s.fromDate),
          toDate: new Date(s.toDate),
        }));
        setSheets(parsed);
      }
    } catch (e) {
      logger.warn('[ExcelExport] load error:', e);
    }
  };

  const saveSheetsToStorage = async () => {
    try {
      await AsyncStorage.setItem(SHEETS_STORAGE_KEY, JSON.stringify(sheets));
    } catch (e) {
      logger.warn('[ExcelExport] save error:', e);
    }
  };

  const handleAddSheet = useCallback(() => {
    setSheets(prev => [...prev, createDefaultSheet()]);
  }, []);

  const handleUpdateSheet = useCallback((updated: SheetConfig) => {
    setSheets(prev => prev.map(s => (s.id === updated.id ? updated : s)));
  }, []);

  const handleRemoveSheet = useCallback((id: string) => {
    setSheetToDelete(id);
    setDeleteModal(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (sheetToDelete)
      setSheets(prev => prev.filter(s => s.id !== sheetToDelete));
    setDeleteModal(false);
    setSheetToDelete(null);
  }, [sheetToDelete]);

  const handleCancelDelete = useCallback(() => {
    setDeleteModal(false);
    setSheetToDelete(null);
  }, []);

  /**
   * Export tất cả sheets → 1 file Excel duy nhất.
   *
   * Mỗi SheetConfig được resolve sang:
   *  - reportType: 'S1a' | 'S2a'  → chọn template và cấu trúc cột
   *  - billType:   'pos' | 'rent'  → lọc đúng loại bill trong SQLite
   *
   * Ánh xạ:
   *  S1a (bán hàng) → bill_type = 'pos'
   *  S2a (lưu trú)  → bill_type = 'rent'
   */
  const handleExport = useCallback(async () => {
    if (!canExport || exporting) return;
    setExporting(true);

    try {
      const validSheets = sheets.filter(s => s.reportType && s.template);
      logger.debug('[ExcelExport] Sheets to export:', validSheets.length);

      const sheetsForExport = validSheets.map((sheet, index) => {
        const resolved = resolveSheetConfig(sheet);
        if (!resolved) {
          throw new Error(
            `Không nhận dạng được loại báo cáo: "${sheet.reportType}" / "${sheet.template}"`,
          );
        }

        const sheetLabel = `${resolved.reportType}-${
          resolved.billType === 'rent' ? 'LT' : 'BH'
        }`;

        logger.debug(`[ExcelExport] Sheet ${index + 1}:`, {
          reportType: resolved.reportType,
          billType: resolved.billType,
          fromDate: sheet.fromDate.toLocaleDateString('vi-VN'),
          toDate: sheet.toDate.toLocaleDateString('vi-VN'),
          sheetLabel,
        });

        return {
          reportType: resolved.reportType,
          billType: resolved.billType,
          fromDate: sheet.fromDate,
          toDate: sheet.toDate,
          sheetLabel,
        };
      });

      await ExcelExportService.exportAllInOne(storeId, sheetsForExport);

      logger.debug('[ExcelExport] ✓ Export completed');
      Alert.alert(t('common.success'), t('report.export.success'));
    } catch (err: any) {
      logger.error('[ExcelExport] Export error:', err);
      Alert.alert(t('report.export.error'), err?.message ?? 'Unable to export');
    } finally {
      setExporting(false);
    }
  }, [sheets, storeId, exporting, t]);

  const canExport =
    sheets.length > 0 && sheets.every(s => s.reportType && s.template);

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <View
        className={`flex-row items-center justify-between px-4 py-3 border-b ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
        }`}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={onOpenMenu}>
            <Icon name="menu" size={28} color={isDark ? '#e5e7eb' : '#000'} />
          </TouchableOpacity>
          <Text
            className={`text-xl font-bold ml-3 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
            {t('report.export.title')}
          </Text>
        </View>
        <TouchableOpacity onPress={onBack}>
          <Icon name="close" size={28} color={isDark ? '#9ca3af' : '#6B7280'} />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {sheets.map(sheet => (
          <SheetCard
            key={sheet.id}
            sheet={sheet}
            onUpdate={handleUpdateSheet}
            onRemove={handleRemoveSheet}
            isDark={isDark}
          />
        ))}
        <AddSheetButton onPress={handleAddSheet} isDark={isDark} />
        <View className="h-28" />
      </ScrollView>

      {/* Footer */}
      <View
        className={`absolute bottom-0 left-0 right-0 border-t px-4 pb-8 pt-3 ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
        }`}>
        <TouchableOpacity
          onPress={handleExport}
          disabled={!canExport || exporting}
          className={`flex-row items-center justify-center rounded-2xl py-4 gap-2 ${
            canExport && !exporting
              ? 'bg-blue-600'
              : isDark
              ? 'bg-gray-700'
              : 'bg-blue-200'
          }`}>
          <Icon
            name={exporting ? 'hourglass-empty' : 'download'}
            size={20}
            color={
              canExport && !exporting ? 'white' : isDark ? '#6b7280' : '#cbd5e1'
            }
          />
          <Text
            className={`text-base font-bold ${
              canExport && !exporting
                ? 'text-white'
                : isDark
                ? 'text-gray-500'
                : 'text-blue-400'
            }`}>
            {exporting ? t('common.loading') : t('report.export.export')}
          </Text>
        </TouchableOpacity>
      </View>

      <ConfirmDeleteModal
        visible={deleteModalVisible}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </SafeAreaView>
  );
}
