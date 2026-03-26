import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../../hooks/useTheme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {SheetCard, SheetConfig} from '../../components/excel-export/SheetCard';

const SHEETS_STORAGE_KEY = 'excel_export_sheets';

// ─── ConfirmDeleteModal ────────────────────────────────────────────────────────
interface ConfirmDeleteModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

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

// ─── AddSheetButton ────────────────────────────────────────────────────────────
interface AddSheetButtonProps {
  onPress: () => void;
  t: (key: string) => string;
  isDark?: boolean;
}

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

export default function ReportExport({
  onOpenMenu,
  onBack,
}: {
  onOpenMenu: () => void;
  onBack: () => void;
}) {
  const [sheets, setSheets] = useState<SheetConfig[]>([]);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [sheetToDelete, setSheetToDelete] = useState<string | null>(null);
  const {t} = useTranslation();
  const {isDark} = useTheme();

  // Load sheets from AsyncStorage on mount
  useEffect(() => {
    loadSheetsFromStorage();
  }, []);

  // Save sheets to AsyncStorage whenever they change
  useEffect(() => {
    saveSheetsToStorage();
  }, [sheets]);

  const loadSheetsFromStorage = async () => {
    try {
      const storedSheets = await AsyncStorage.getItem(SHEETS_STORAGE_KEY);
      if (storedSheets) {
        const parsedSheets = JSON.parse(storedSheets).map((sheet: any) => ({
          ...sheet,
          fromDate: new Date(sheet.fromDate),
          toDate: new Date(sheet.toDate),
        }));
        setSheets(parsedSheets);
      }
    } catch (error) {
      console.warn('Failed to load sheets from storage:', error);
    }
  };

  const saveSheetsToStorage = async () => {
    try {
      await AsyncStorage.setItem(SHEETS_STORAGE_KEY, JSON.stringify(sheets));
    } catch (error) {
      console.warn('Failed to save sheets to storage:', error);
    }
  };

  // Estimated rows — rough mock calculation
  const estimatedRows = sheets.reduce((acc, s) => {
    if (!s.reportType || !s.template) return acc;
    const days =
      Math.ceil(
        (s.toDate.getTime() - s.fromDate.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1;
    return acc + days * 12;
  }, 0);

  const handleAddSheet = useCallback(() => {
    setSheets(prev => [...prev, createDefaultSheet()]);
  }, []);

  const handleUpdateSheet = useCallback((updated: SheetConfig) => {
    setSheets(prev => prev.map(s => (s.id === updated.id ? updated : s)));
  }, []);

  const handleRemoveSheet = useCallback((id: string) => {
    setSheetToDelete(id);
    setDeleteModalVisible(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (sheetToDelete) {
      setSheets(prev => prev.filter(s => s.id !== sheetToDelete));
    }
    setDeleteModalVisible(false);
    setSheetToDelete(null);
  }, [sheetToDelete]);

  const handleCancelDelete = useCallback(() => {
    setDeleteModalVisible(false);
    setSheetToDelete(null);
  }, []);

  const handleExport = () => {
    // Export logic goes here
    console.log('Exporting sheets:', sheets);
  };

  const clearStorage = async () => {
    try {
      await AsyncStorage.removeItem(SHEETS_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear storage:', error);
    }
  };

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
        {/* Sheet Cards */}
        {sheets.map(sheet => (
          <SheetCard
            key={sheet.id}
            sheet={sheet}
            onUpdate={handleUpdateSheet}
            onRemove={handleRemoveSheet}
            isDark={isDark}
          />
        ))}

        {/* Add Sheet Button */}
        <AddSheetButton onPress={handleAddSheet} t={t} isDark={isDark} />

        {/* Spacer for bottom button */}
        <View className="h-28" />
      </ScrollView>

      {/* Footer Export Button */}
      <View
        className={`absolute bottom-0 left-0 right-0 border-t px-4 pb-8 pt-3 ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
        }`}>
        <TouchableOpacity
          onPress={handleExport}
          disabled={!canExport}
          className={`flex-row items-center justify-center rounded-2xl py-4 gap-2 ${
            canExport ? 'bg-blue-600' : isDark ? 'bg-gray-700' : 'bg-blue-200'
          }`}>
          <Icon
            name="download"
            size={20}
            color={canExport ? 'white' : isDark ? '#6b7280' : '#cbd5e1'}
          />
          <Text
            className={`text-base font-bold ${
              canExport
                ? 'text-white'
                : isDark
                ? 'text-gray-500'
                : 'text-blue-400'
            }`}>
            {t('report.export.export')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        visible={deleteModalVisible}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </SafeAreaView>
  );
}
