import React from 'react';
import {View, Text} from 'react-native';
import {useTranslation} from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface RevenueCardProps {
  total: number;
  isPositive: boolean;
  isDark?: boolean;
}

const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('vi-VN') + 'đ';
};

export const RevenueCard: React.FC<RevenueCardProps> = ({
  total,
  isPositive,
  isDark = false,
}) => {
  const {t} = useTranslation();

  return (
    <View
      className={`rounded-2xl p-4 shadow-sm flex-row items-center ${
        isDark ? 'bg-gray-800' : 'bg-white'
      }`}>
      <View
        className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${
          isDark ? 'bg-blue-900/40' : 'bg-blue-100'
        }`}>
        <Icon name="account-balance-wallet" size={24} color="#3B82F6" />
      </View>
      <View>
        <Text
          className={`text-xs mb-0.5 ${
            isDark ? 'text-gray-400' : 'text-gray-500'
          }`}>
          {t('report.totalRevenue')}
        </Text>
        <Text
          className={`text-2xl font-bold tracking-tight ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
          {formatCurrency(total)}
        </Text>
      </View>
    </View>
  );
};
