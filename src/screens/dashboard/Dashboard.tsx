import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../hooks/useTheme';

// ─── Stat Card ───────────────────────────────────────────────────────────────
interface StatCardProps {
  icon: string;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  change: string;
  changePositive: boolean;
  onPress?: () => void;
  isDark: boolean;
}

const StatCard = ({
  icon,
  iconColor,
  iconBg,
  label,
  value,
  change,
  changePositive,
  onPress,
  isDark,
}: StatCardProps) => {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      className={`flex-1 mx-1 p-3.5 rounded-2xl border shadow-sm ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
      }`}>
      <View className="flex-row justify-between ">
        <View
          className="w-9 h-9 rounded-xl items-center justify-center"
          style={{ backgroundColor: iconBg }}>
          <Icon name={icon} size={18} color={iconColor} />
        </View>
        <Text
          className={`text-xs font-semibold ${changePositive ? 'text-green-500' : 'text-red-500'
            }`}>
          {change}
        </Text>
      </View>
      <Text className={`text-[10px] font-medium mt-2.5 leading-4 tracking-wide ${
        isDark ? 'text-gray-400' : 'text-gray-500'
      }`}>
        {label}
      </Text>
      <Text className={`text-[15px] font-bold mt-1 ${
        isDark ? 'text-gray-100' : 'text-gray-700'
      }`}>{value}</Text>
    </TouchableOpacity>
  );
};

// ─── Activity Item ───────────────────────────────────────────────────────────
interface ActivityItemProps {
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  amount: string;
  amountPositive?: boolean;
  isDark: boolean;
}

const ActivityItem = ({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  amount,
  amountPositive,
  isDark,
}: ActivityItemProps) => {
  return (
    <View className="flex-row items-center py-3 px-1">
      <View
        className="w-10 h-10 rounded-xl items-center justify-center mr-3"
        style={{ backgroundColor: iconBg }}>
        <Icon name={icon} size={20} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className={`text-sm font-semibold ${
          isDark ? 'text-gray-100' : 'text-gray-900'
        }`}>{title}</Text>
        <Text className={`text-xs mt-0.5 ${
          isDark ? 'text-gray-500' : 'text-gray-400'
        }`}>{subtitle}</Text>
      </View>
      <Text
        className={`text-sm font-bold ${amountPositive ? 'text-green-500' : isDark ? 'text-gray-100' : 'text-gray-900'
          }`}>
        {amount}
      </Text>
    </View>
  );
};

// ─── Divider ─────  ────────────────────────────────────────────────────────────
const Divider = ({ isDark }: { isDark: boolean }) => (
  <View className={`h-px mx-1 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`} />
);

// ─── Main Dashboard ──────────────────────────────────────────────────────────
const DashBoard = ({ onOpenMenu, onNavigate }: { onOpenMenu: () => void, onNavigate: (screen: string) => void }) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'pos' | 'hotel' | 'warehouse'>(
    'pos',
  );

  const tabs = [
    { key: 'pos', label: t('dashboard.pos', 'Bán hàng') },
    { key: 'hotel', label: t('dashboard.hotel', 'Lưu trú') },
  ] as const;

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-slate-50'}`}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View className={`flex-row items-center justify-between px-4 pt-3 pb-2 border-b ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
      }`}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={onOpenMenu} className="p-1">
            <Icon name="menu" size={28} color={isDark ? '#e5e7eb' : '#4B5563'} />
          </TouchableOpacity>

          <Text className={`text-xl font-black tracking-tighter ml-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
            MyPOS
          </Text>
        </View>
      </View>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* ── Page Title ── */}
        <View className="px-4 mt-6">
          <Text className={`text-2xl font-bold leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t('dashboard.overview')}
          </Text>
          <Text className={`text-xs font-medium mt-1 uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {t('dashboard.updatedAt')} 14:30, {t('dashboard.today')}
          </Text>
        </View>

        {/* ── Stat Cards Row 1 ── */}
        <View className="flex-row px-3 mt-6">
          <StatCard
            icon="trending-up"
            iconColor="#2563EB"
            iconBg={isDark ? '#1e3a8a33' : '#EFF6FF'}
            label={t('dashboard.revenueToday')}
            value="15.200.000đ"
            change="+12.5%"
            changePositive
            onPress={() => onNavigate('sales')}
            isDark={isDark}
          />
          <StatCard
            icon="shopping-cart"
            iconColor="#16A34A"
            iconBg={isDark ? '#14532d33' : '#F0FDF4'}
            label={t('dashboard.newOrders')}
            value="42"
            change="+8%"
            changePositive
            isDark={isDark}
          />
        </View>
        {/* ── Stat Cards Row 2 ── */}
        <View className="flex-row px-3 mt-3">
          <StatCard
            icon="hotel"
            iconColor="#EA580C"
            iconBg={isDark ? '#7c2d1233' : '#FFF7ED'}
            label={t('dashboard.roomCapacity')}
            value="85%"
            change="-2%"
            changePositive={false}
            onPress={() => onNavigate('categories')}
            isDark={isDark}
          />
          <StatCard
            icon="login"
            iconColor="#7C3AED"
            iconBg={isDark ? '#4c1d9533' : '#F5F3FF'}
            label={t('dashboard.checkins')}
            value="12"
            change="+5%"
            changePositive
            isDark={isDark}
          />
        </View>

        {/* ── Recent Activity ── */}
        <View className="px-4 mt-8">
          {/* Section Header */}
          <View className="flex-row justify-between items-center mb-4">
            <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {t('dashboard.recentActivity')}
            </Text>
            <TouchableOpacity>
              <Text className="text-sm font-semibold text-blue-600">
                {t('dashboard.viewAll')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Bar */}
          <View className={`flex-row border-b mb-2 ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
            {tabs.map(tab => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className={`mr-6 pb-3 border-b-2 ${activeTab === tab.key
                  ? 'border-blue-600'
                  : 'border-transparent'
                  }`}>
                <Text
                  className={`text-sm ${activeTab === tab.key
                    ? 'text-blue-600 font-bold'
                    : 'text-gray-400 font-medium'
                    }`}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Activity List */}
          <View className={`rounded-3xl px-3 py-1 border shadow-sm ${
            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
          }`}>
            {activeTab === 'pos' && (
              <>
                <ActivityItem
                  icon="receipt-long"
                  iconColor="#64748B"
                  iconBg={isDark ? '#33415533' : '#F1F5F9'}
                  title={t('dashboard.mock.order_table', {id: '8492', table: '04'})}
                  subtitle={`14:25 · ${t('dashboard.mock.pending_payment')}`}
                  amount="850.000đ"
                  isDark={isDark}
                />
                <Divider isDark={isDark} />
                <ActivityItem
                  icon="receipt-long"
                  iconColor="#64748B"
                  iconBg={isDark ? '#33415533' : '#F1F5F9'}
                  title={t('dashboard.mock.order_table', {id: '8490', table: '12'})}
                  subtitle={`14:10 · ${t('dashboard.mock.paid')}`}
                  amount="1.240.000đ"
                  amountPositive
                  isDark={isDark}
                />
              </>
            )}
            {activeTab === 'hotel' && (
              <>
                <ActivityItem
                  icon="meeting-room"
                  iconColor="#2563EB"
                  iconBg={isDark ? '#1e3a8a33' : '#EFF6FF'}
                  title={t('dashboard.mock.checkin', {id: '201'})}
                  subtitle={`13:50 · ${t('dashboard.mock.confirmed')}`}
                  amount="800.000đ"
                  isDark={isDark}
                />
                <Divider isDark={isDark} />
                <ActivityItem
                  icon="logout"
                  iconColor="#EA580C"
                  iconBg={isDark ? '#7c2d1233' : '#FFF7ED'}
                  title={t('dashboard.mock.checkout', {id: '105'})}
                  subtitle={`12:30 · ${t('dashboard.mock.completed')}`}
                  amount="1.200.000đ"
                  amountPositive
                  isDark={isDark}
                />
              </>
            )}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};
export default DashBoard;
