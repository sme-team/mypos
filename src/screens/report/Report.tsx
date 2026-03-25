import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {DateInput} from '../../components/DateInput';
import {DisplayModeDropdown} from '../../components/report/DisplayModeDropdown';
import {RevenueCard} from '../../components/report/RevenueCard';
import {RevenueBarChart} from '../../components/report/RevenueBarChart';
import {SectionList} from '../../components/report/SectionList';
import {useTheme} from '../../hooks/useTheme';
// ─── Types ────────────────────────────────────────────────────────────────────
export type DisplayMode = 'day' | 'week' | 'month';

const DISPLAY_MODE_OPTIONS: {label: string; value: DisplayMode}[] = [
  {label: 'report.displayMode.day', value: 'day'},
  {label: 'report.displayMode.week', value: 'week'},
  {label: 'report.displayMode.month', value: 'month'},
];

// ─── Mock Data (thay bằng API thực tế) ────────────────────────────────────────
// Helper: Generate chart data based on display mode and date range
const generateChartData = (
  displayMode: DisplayMode,
  fromDate: Date,
  toDate: Date,
): any[] => {
  const data: any[] = [];

  if (displayMode === 'day') {
    // Generate data for each day from fromDate to toDate
    const current = new Date(fromDate);
    while (current <= toDate) {
      const day = current.getDate().toString().padStart(2, '0');
      const month = (current.getMonth() + 1).toString().padStart(2, '0');
      const label = `${day}/${month}`;
      data.push({
        label,
        sales: Math.floor(Math.random() * 250) + 100,
        lodging: Math.floor(Math.random() * 200) + 80,
        gym: Math.floor(Math.random() * 120) + 40,
      });
      current.setDate(current.getDate() + 1);
    }
  } else if (displayMode === 'week') {
    // Generate data for each week from fromDate to toDate
    const current = new Date(fromDate);
    let weekCount = 1;

    // Get first day of week (Monday)
    const firstDay = new Date(current);
    firstDay.setDate(firstDay.getDate() - ((firstDay.getDay() + 6) % 7));

    while (firstDay <= toDate) {
      data.push({
        label: `Tuần ${weekCount}`,
        sales: Math.floor(Math.random() * 2000) + 1000,
        lodging: Math.floor(Math.random() * 1500) + 800,
        gym: Math.floor(Math.random() * 1000) + 400,
      });
      firstDay.setDate(firstDay.getDate() + 7);
      weekCount++;
    }
  } else if (displayMode === 'month') {
    // Generate data for each month from fromDate to toDate
    const current = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
    const endMonth = new Date(toDate.getFullYear(), toDate.getMonth(), 1);

    while (current <= endMonth) {
      const month = current.getMonth() + 1;
      const year = current.getFullYear();
      const monthName = `Tháng ${month}`;
      data.push({
        label: monthName,
        sales: Math.floor(Math.random() * 7000) + 5000,
        lodging: Math.floor(Math.random() * 5000) + 3500,
        gym: Math.floor(Math.random() * 3000) + 2000,
      });
      current.setMonth(current.getMonth() + 1);
    }
  }

  return data;
};

const SALES_ITEMS = [
  {id: '1', icon: 'coffee', name: 'report.items.blackCoffee', amount: 3600000},
  {id: '2', icon: 'restaurant', name: 'report.items.phoBeef', amount: 6375000},
  {id: '3', icon: 'local-bar', name: 'report.items.peachTea', amount: 2880000},
];

const LODGING_ITEMS = [
  {
    id: '1',
    icon: 'meeting-room',
    name: 'report.items.deluxe302',
    amount: 28500000,
  },
  {
    id: '2',
    icon: 'meeting-room',
    name: 'report.items.suite101',
    amount: 24200000,
  },
  {
    id: '3',
    icon: 'meeting-room',
    name: 'report.items.family205',
    amount: 21800000,
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function Report({
  onOpenMenu,
  onExport,
}: {
  onOpenMenu: () => void;
  onExport?: () => void;
}) {
  const {t} = useTranslation();
  const {isDark} = useTheme();

  const [fromDate, setFromDate] = useState<Date>(new Date());
  const [toDate, setToDate] = useState<Date>(new Date());
  const [displayMode, setDisplayMode] = useState<DisplayMode>('day');

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <View
        className={`flex-row items-center justify-between px-4 py-3 ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
        } border-b`}>
        <View className="flex-row item-center ">
          <TouchableOpacity onPress={onOpenMenu}>
            <Icon name="menu" size={28} color={isDark ? '#e5e7eb' : '#000'} />
          </TouchableOpacity>
          <Text
            className={`text-2xl font-black font-semibold ml-3 ${
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

        {/* Total Revenue */}
        <View className="mx-4 mt-3">
          <RevenueCard
            total={500000000}
            growthPercent={12.5}
            isPositive
            isDark={isDark}
          />
        </View>

        {/* Chart */}
        <View
          className={`mx-4 mt-3 rounded-2xl p-4 shadow-sm ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
          <RevenueBarChart
            data={generateChartData(displayMode, fromDate, toDate)}
            displayMode={displayMode}
            isDark={isDark}
          />
        </View>

        {/* Sales Section */}
        <View className="mx-4 mt-3 mb-3">
          <SectionList
            title={t('report.section.sales')}
            subtitle="300.000.000đ"
            onViewAll={() => {}}
            items={SALES_ITEMS}
            isDark={isDark}
          />
        </View>

        {/* Lodging Section */}
        <View className="mx-4 mb-24">
          <SectionList
            title={t('report.section.lodging')}
            subtitle={`${t('report.section.totalRevenue')}: 200.000.000đ`}
            onViewAll={() => {}}
            items={LODGING_ITEMS}
            isDark={isDark}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
