import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {DateInput} from '../../components/DateInput';
import {DisplayModeDropdown} from '../../components/report/DisplayModeDropdown';
import {RevenueCard} from '../../components/report/RevenueCard';
import {RevenueBarChart} from '../../components/report/RevenueBarChart';
import {useTheme} from '../../hooks/useTheme';
import {useAuth} from '../../store/authStore';
import {ReportService} from '../../services/database/report/ReportService';
import {
  DisplayMode as ReportDisplayMode,
  RevenueChartPoint as ReportRevenueChartPoint,
  ReportSummary as ReportReportSummary,
} from '../../services/database/report/ReportService';
import {DisplayMode, ReportScreenProps} from './type';

// ─── Constants ─────────────────────────────────────────────────────────────────

const DISPLAY_MODE_OPTIONS: {label: string; value: DisplayMode}[] = [
  {label: 'report.displayMode.day', value: 'day'},
  {label: 'report.displayMode.week', value: 'week'},
  {label: 'report.displayMode.month', value: 'month'},
];

const PREVIEW_COUNT = 5;

// ─── DbSectionList ────────────────────────────────────────────────────────────

interface DbSectionListProps {
  title: string;
  subtitle: string;
  items: any[];
  isDark: boolean;
}

const DbSectionList: React.FC<DbSectionListProps> = ({
  title,
  subtitle,
  items,
  isDark,
}) => {
  const {t} = useTranslation();
  const [showAll, setShowAll] = useState(false);

  const displayedItems = showAll ? items : items.slice(0, PREVIEW_COUNT);
  const hasMore = items.length > PREVIEW_COUNT;

  return (
    <View
      className={`rounded-2xl p-4 shadow-sm ${
        isDark ? 'bg-gray-800' : 'bg-white'
      }`}>
      <View className="flex-row items-start justify-between mb-4">
        <View>
          <Text
            className={`text-sm font-semibold ${
              isDark ? 'text-white' : 'text-gray-800'
            }`}>
            {title}
          </Text>
          <Text
            className={`text-xs mt-0.5 ${
              isDark ? 'text-gray-500' : 'text-gray-400'
            }`}>
            {subtitle}
          </Text>
        </View>
        {hasMore && (
          <TouchableOpacity onPress={() => setShowAll(prev => !prev)}>
            <Text className="text-xs font-medium text-blue-600">
              {showAll ? t('report.collapse') : t('report.viewAll')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {items.length === 0 ? (
        <Text
          className={`text-xs text-center py-4 ${
            isDark ? 'text-gray-500' : 'text-gray-400'
          }`}>
          {t('report.noData')}
        </Text>
      ) : (
        <View className="gap-3">
          {displayedItems.map((item, index) => (
            <React.Fragment key={item.id}>
              <View className="flex-row items-center">
                <View
                  className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${
                    isDark ? 'bg-blue-900/40' : 'bg-blue-50'
                  }`}>
                  <Icon name={item.icon as any} size={18} color="#3B82F6" />
                </View>
                <Text
                  className={`flex-1 text-sm ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  {item.name}
                </Text>
                <Text className="text-sm font-semibold text-blue-600">
                  {item.amount.toLocaleString('vi-VN') + 'đ'}
                </Text>
              </View>
              {index < displayedItems.length - 1 && (
                <View
                  className={`h-px ml-12 ${
                    isDark ? 'bg-gray-700' : 'bg-gray-100'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </View>
      )}

      {/* Show more / collapse button ở dưới cùng khi đã expand */}
      {hasMore && showAll && (
        <TouchableOpacity
          onPress={() => setShowAll(false)}
          className="mt-4 items-center">
          <Text className="text-xs font-medium text-blue-600">
            {t('report.collapse')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function Report({
  storeId: storeIdProp,
  onOpenMenu,
  onExport,
}: ReportScreenProps) {
  const {t} = useTranslation();
  const {isDark} = useTheme();

  const {state: auth} = useAuth();
  const storeId = storeIdProp ?? auth.user?.store_id ?? 'store-001';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [fromDate, setFromDate] = useState<Date>(today);
  const [toDate, setToDate] = useState<Date>(new Date());
  const [displayMode, setDisplayMode] = useState<DisplayMode>('day');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ReportReportSummary | null>(null);
  const [chartData, setChartData] = useState<ReportRevenueChartPoint[]>([]);
  const [applyToGroups, setApplyToGroups] = useState<any[]>([]);
  const [topSalesItems, setTopSalesItems] = useState<any[]>([]);
  const [topLodgingItems, setTopLodgingItems] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [summaryData, chart, groups, sales, lodging] = await Promise.all([
        ReportService.getSummary(storeId, fromDate, toDate),
        ReportService.getChartData(storeId, fromDate, toDate, displayMode),
        ReportService.getApplyToGroups(storeId),
        // Lấy tất cả, không giới hạn 5 — DbSectionList tự xử lý preview
        ReportService.getTopSalesItems(storeId, fromDate, toDate),
        ReportService.getTopLodgingItems(storeId, fromDate, toDate),
      ]);

      setSummary(summaryData);
      setChartData(chart);
      setApplyToGroups(groups);
      setTopSalesItems(sales);
      setTopLodgingItems(lodging);
    } catch (error) {
      console.error('[Report] loadData error:', error);
    } finally {
      setLoading(false);
    }
  }, [storeId, fromDate, toDate, displayMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
            className={`text-2xl font-black ml-3 ${
              isDark ? 'text-white' : 'text-gray-800'
            }`}>
            {t('report.title')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onExport}
          className={`px-3 py-1.5 rounded-lg flex-row items-center gap-1 ${
            isDark ? 'bg-blue-700' : 'bg-blue-600'
          }`}>
          <Icon name="file-download" size={16} color="#fff" />
          <Text className="text-white text-xs font-medium">
            {t('report.exportExcel')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Filter Card */}
        <View
          className={`mx-4 mt-4 rounded-2xl p-4 shadow-sm ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
          <DateInput
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
            isDark={isDark}
          />
          <View className="mt-3">
            <DisplayModeDropdown
              displayMode={displayMode}
              displayModeOptions={DISPLAY_MODE_OPTIONS}
              onDisplayModeChange={setDisplayMode}
              isDark={isDark}
            />
          </View>
        </View>

        {loading ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator
              size="large"
              color={isDark ? '#60a5fa' : '#2563eb'}
            />
          </View>
        ) : (
          <>
            {/* Revenue Card */}
            <View className="mx-4 mt-3">
              <RevenueCard
                total={summary?.totalRevenue ?? 0}
                growthPercent={summary?.growthPercent ?? 0}
                isPositive={summary?.isPositive ?? true}
                isDark={isDark}
              />
            </View>

            {/* Chart */}
            <View
              className={`mx-4 mt-3 rounded-2xl p-4 shadow-sm ${
                isDark ? 'bg-gray-800' : 'bg-white'
              }`}>
              <RevenueBarChart
                data={chartData as any}
                applyToGroups={applyToGroups}
                displayMode={displayMode}
                isDark={isDark}
              />
            </View>

            {/* Top Sales Items */}
            {topSalesItems.length > 0 && (
              <View className="mx-4 mt-3">
                <DbSectionList
                  title={t('report.topSales')}
                  subtitle={t('report.topSalesDesc')}
                  items={topSalesItems}
                  isDark={isDark}
                />
              </View>
            )}

            {/* Top Lodging Items */}
            {topLodgingItems.length > 0 && (
              <View className="mx-4 mt-3 mb-24">
                <DbSectionList
                  title={t('report.topLodging') || 'Top Lưu trú'}
                  subtitle={
                    t('report.topLodgingDesc') || 'Phòng cho thuê nhiều nhất'
                  }
                  items={topLodgingItems}
                  isDark={isDark}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
