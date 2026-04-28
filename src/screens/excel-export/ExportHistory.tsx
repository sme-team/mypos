import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  StatusBar,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTheme} from '../../hooks/useTheme';

// ─── Types ───────────────────────────────────────────────────────────────────────

interface TaxReportItem {
  id: string;
  form_type: 'S1a-HKD' | 'S2a-HKD';
  period_type: 'month' | 'quarter';
  period_from: string;
  period_to: string;
  total_revenue: number;
  status: 'draft' | 'finalized' | 'submitted';
  created_at: string;
}

interface ExportHistoryScreenProps {
  storeId?: string;
  onOpenMenu: () => void;
  onBack: () => void;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────────

const MOCK_HISTORY: TaxReportItem[] = [
  {
    id: '1',
    form_type: 'S1a-HKD',
    period_type: 'month',
    period_from: '2025-01-01',
    period_to: '2025-01-31',
    total_revenue: 150000000,
    status: 'finalized',
    created_at: '2025-02-01',
  },
  {
    id: '2',
    form_type: 'S2a-HKD',
    period_type: 'month',
    period_from: '2025-02-01',
    period_to: '2025-02-28',
    total_revenue: 180000000,
    status: 'submitted',
    created_at: '2025-03-01',
  },
  {
    id: '3',
    form_type: 'S1a-HKD',
    period_type: 'quarter',
    period_from: '2025-01-01',
    period_to: '2025-03-31',
    total_revenue: 520000000,
    status: 'draft',
    created_at: '2025-04-01',
  },
];

// ─── Detail Modal ────────────────────────────────────────────────────────────────

const DetailModal: React.FC<{
  visible: boolean;
  item: TaxReportItem | null;
  onClose: () => void;
  isDark: boolean;
}> = ({visible, item, onClose, isDark}) => {
  const {t} = useTranslation();

  if (!item) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN');
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('vi-VN') + 'đ';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-green-100 text-green-700';
      case 'finalized':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'Đã nộp';
      case 'finalized':
        return 'Đã khóa';
      default:
        return 'Nháp';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView className="flex-1 bg-black/40">
        <TouchableOpacity
          className="flex-1 items-center justify-center"
          activeOpacity={1}
          onPress={onClose}>
          <View
            className={`w-11/12 max-h-[80%] rounded-3xl overflow-hidden ${
              isDark ? 'bg-gray-800' : 'bg-white'
            }`}>
            {/* Header */}
            <View
              className={`px-6 py-4 border-b flex-row items-center justify-between ${
                isDark ? 'border-gray-700' : 'border-gray-200'
              }`}>
              <Text
                className={`text-lg font-bold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                Chi tiết báo cáo
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Icon name="close" size={24} color={isDark ? '#9ca3af' : '#6B7280'} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView className="p-6">
              <View className="gap-4">
                {/* Mẫu báo cáo */}
                <View
                  className={`p-4 rounded-xl ${
                    isDark ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                  <Text
                    className={`text-xs mb-1 ${
                      isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                    Mẫu báo cáo
                  </Text>
                  <Text
                    className={`text-base font-semibold ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                    {item.form_type}
                  </Text>
                </View>

                {/* Kỳ kê khai */}
                <View
                  className={`p-4 rounded-xl ${
                    isDark ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                  <Text
                    className={`text-xs mb-1 ${
                      isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                    Kỳ kê khai
                  </Text>
                  <Text
                    className={`text-base font-semibold ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                    {formatDate(item.period_from)} - {formatDate(item.period_to)}
                  </Text>
                  <Text
                    className={`text-xs mt-1 ${
                      isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                    {item.period_type === 'month' ? 'Kỳ tháng' : 'Kỳ quý'}
                  </Text>
                </View>

                {/* Tổng doanh thu */}
                <View
                  className={`p-4 rounded-xl ${
                    isDark ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                  <Text
                    className={`text-xs mb-1 ${
                      isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                    Tổng doanh thu
                  </Text>
                  <Text
                    className={`text-2xl font-bold text-blue-600`}>
                    {formatCurrency(item.total_revenue)}
                  </Text>
                </View>

                {/* Trạng thái */}
                <View
                  className={`p-4 rounded-xl ${
                    isDark ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                  <Text
                    className={`text-xs mb-1 ${
                      isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                    Trạng thái
                  </Text>
                  <View
                    className={`px-3 py-1 rounded-full self-start ${getStatusColor(
                      item.status,
                    )}`}>
                    <Text className="text-xs font-medium">
                      {getStatusLabel(item.status)}
                    </Text>
                  </View>
                </View>

                {/* Ngày tạo */}
                <View
                  className={`p-4 rounded-xl ${
                    isDark ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                  <Text
                    className={`text-xs mb-1 ${
                      isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                    Ngày tạo
                  </Text>
                  <Text
                    className={`text-base ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    {formatDate(item.created_at)}
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────────

export default function ExportHistory({
  storeId: storeIdProp,
  onOpenMenu,
  onBack,
}: ExportHistoryScreenProps) {
  const {t} = useTranslation();
  const {isDark} = useTheme();
  const storeId = storeIdProp ?? 'store-001';

  const [history, setHistory] = useState<TaxReportItem[]>(MOCK_HISTORY);
  const [selectedItem, setSelectedItem] = useState<TaxReportItem | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN');
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('vi-VN') + 'đ';
  };

  const handleItemPress = (item: TaxReportItem) => {
    setSelectedItem(item);
    setDetailModalVisible(true);
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#111827' : '#f9fafb'} />
      {/* Header */}
      <View
        className={`flex-row items-center px-4 py-3 border-b ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
        }`}>
        <TouchableOpacity onPress={onBack}>
          <Icon name="arrow-back" size={28} color={isDark ? '#e5e7eb' : '#000'} />
        </TouchableOpacity>
        <Text
          className={`text-xl font-bold ml-3 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
          Lịch sử xuất file
        </Text>
      </View>

      {/* Content */}
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {history.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Icon name="history" size={64} color={isDark ? '#374151' : '#E5E7EB'} />
            <Text
              className={`text-sm mt-4 ${
                isDark ? 'text-gray-500' : 'text-gray-400'
              }`}>
              Chưa có lịch sử xuất file
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {history.map(item => (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleItemPress(item)}
                className={`p-4 rounded-xl border ${
                  isDark
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200'
                }`}>
                <View className="mb-3">
                  <Text
                    className={`text-sm font-semibold mb-1 ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                    {item.form_type}
                  </Text>
                  <Text
                    className={`text-xs ${
                      isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                    {formatDate(item.period_from)} - {formatDate(item.period_to)}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between">
                  <Text
                    className={`text-sm font-bold ${
                      isDark ? 'text-blue-400' : 'text-blue-600'
                    }`}>
                    {formatCurrency(item.total_revenue)}
                  </Text>
                  <Text
                    className={`text-xs ${
                      isDark ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                    {formatDate(item.created_at)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View className="h-28" />
      </ScrollView>

      {/* Detail Modal */}
      <DetailModal
        visible={detailModalVisible}
        item={selectedItem}
        onClose={() => setDetailModalVisible(false)}
        isDark={isDark}
      />
    </SafeAreaView>
  );
}
