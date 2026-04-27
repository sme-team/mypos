import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';

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
}: StatCardProps) => {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      className="flex-1 mx-1 p-3.5 bg-white rounded-2xl border border-gray-100 shadow-sm">
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
      <Text className="text-gray-500 text-[10px] font-medium mt-2.5 leading-4 tracking-wide">
        {label}
      </Text>
      <Text className="text-gray-700 text-[15px] font-bold mt-1">{value}</Text>
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
}

const ActivityItem = ({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  amount,
  amountPositive,
}: ActivityItemProps) => {
  return (
    <View className="flex-row items-center py-3 px-1">
      <View
        className="w-10 h-10 rounded-xl items-center justify-center mr-3"
        style={{ backgroundColor: iconBg }}>
        <Icon name={icon} size={20} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-gray-900 text-sm font-semibold">{title}</Text>
        <Text className="text-gray-400 text-xs mt-0.5">{subtitle}</Text>
      </View>
      <Text
        className={`text-sm font-bold ${amountPositive ? 'text-green-500' : 'text-gray-900'
          }`}>
        {amount}
      </Text>
    </View>
  );
};

// ─── Divider ─────  ────────────────────────────────────────────────────────────
const Divider = () => <View className="h-px bg-gray-100 mx-1" />;

// ─── Main Dashboard ──────────────────────────────────────────────────────────
const DashBoard = ({ onOpenMenu, onNavigate }: { onOpenMenu: () => void, onNavigate: (screen: string) => void }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'pos' | 'hotel' | 'warehouse'>(
    'pos',
  );

  const tabs = [
    { key: 'pos', label: t('dashboard.pos', 'Bán hàng') },
    { key: 'hotel', label: t('dashboard.hotel', 'Lưu trú') },
  ] as const;

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-row items-center justify-between bg-white px-4 pt-3 pb-2 border-b border-gray-100">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={onOpenMenu} className="p-1">
            <Icon name="menu" size={28} color="#4B5563" />
          </TouchableOpacity>

          <Text className="text-xl font-black text-blue-600 tracking-tighter ml-2">
            MyPOS
          </Text>
        </View>
      </View>
      <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
        {/* ── Page Title ── */}
        <View className="px-4 mt-6">
          <Text className="text-2xl font-bold text-gray-900 leading-tight">
            {t('dashboard.overview')}
          </Text>
          <Text className="text-xs font-medium text-gray-400 mt-1 uppercase tracking-widest">
            {t('dashboard.updatedAt')} 14:30, {t('dashboard.today')}
          </Text>
        </View>

        {/* ── Stat Cards Row 1 ── */}
        <View className="flex-row px-3 mt-6">
          <StatCard
            icon="trending-up"
            iconColor="#2563EB"
            iconBg="#EFF6FF"
            label={t('dashboard.revenueToday')}
            value="15.200.000đ"
            change="+12.5%"
            changePositive
            onPress={() => onNavigate('sales')}
          />
          <StatCard
            icon="shopping-cart"
            iconColor="#16A34A"
            iconBg="#F0FDF4"
            label={t('dashboard.newOrders')}
            value="42"
            change="+8%"
            changePositive
          />
        </View>
        {/* ── Stat Cards Row 2 ── */}
        <View className="flex-row px-3 mt-3">
          <StatCard
            icon="hotel"
            iconColor="#EA580C"
            iconBg="#FFF7ED"
            label={t('dashboard.roomCapacity')}
            value="85%"
            change="-2%"
            changePositive={false}
            onPress={() => onNavigate('categories')}
          />
          <StatCard
            icon="login"
            iconColor="#7C3AED"
            iconBg="#F5F3FF"
            label={t('dashboard.checkins')}
            value="12"
            change="+5%"
            changePositive
          />
        </View>

        {/* ── Recent Activity ── */}
        <View className="px-4 mt-8">
          {/* Section Header */}
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-gray-900">
              {t('dashboard.recentActivity')}
            </Text>
            <TouchableOpacity>
              <Text className="text-sm font-semibold text-blue-600">
                {t('dashboard.viewAll')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Bar */}
          <View className="flex-row border-b border-gray-100 mb-2">
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
          <View className="bg-white rounded-3xl px-3 py-1 border border-gray-100 shadow-sm">
            {activeTab === 'pos' && (
              <>
                <ActivityItem
                  icon="receipt-long"
                  iconColor="#64748B"
                  iconBg="#F1F5F9"
                  title="Đơn #8492 - Bàn 04"
                  subtitle="14:25 · Chờ thanh toán"
                  amount="850.000đ"
                />
                <Divider />
                <ActivityItem
                  icon="receipt-long"
                  iconColor="#64748B"
                  iconBg="#F1F5F9"
                  title="Đơn #8490 - Bàn 12"
                  subtitle="14:10 · Đã thanh toán"
                  amount="1.240.000đ"
                  amountPositive
                />
              </>
            )}
            {activeTab === 'hotel' && (
              <>
                <ActivityItem
                  icon="meeting-room"
                  iconColor="#2563EB"
                  iconBg="#EFF6FF"
                  title="Phòng 201 - Check in"
                  subtitle="13:50 · Đã xác nhận"
                  amount="800.000đ"
                />
                <Divider />
                <ActivityItem
                  icon="logout"
                  iconColor="#EA580C"
                  iconBg="#FFF7ED"
                  title="Phòng 105 - Check out"
                  subtitle="12:30 · Đã hoàn thành"
                  amount="1.200.000đ"
                  amountPositive
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
