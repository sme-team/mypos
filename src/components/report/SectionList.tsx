import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import {useTranslation} from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';

export interface BusinessItem {
  id: string;
  icon: string; // MaterialIcons name
  name: string; // i18n key
  amount: number;
}

interface SectionListProps {
  title: string;
  subtitle: string;
  onViewAll: () => void;
  items: BusinessItem[];
  isDark?: boolean;
}

const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('vi-VN') + 'đ';
};

export const SectionList: React.FC<SectionListProps> = ({
  title,
  subtitle,
  onViewAll,
  items,
  isDark = false,
}) => {
  const {t} = useTranslation();

  return (
    <View
      className={`rounded-2xl p-4 shadow-sm ${
        isDark ? 'bg-gray-800' : 'bg-white'
      }`}>
      {/* Header */}
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
        <TouchableOpacity onPress={onViewAll}>
          <Text className="text-xs font-medium text-blue-600">
            {t('report.viewAll')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Items */}
      <View className="gap-3">
        {items.map((item, index) => (
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
                {t(item.name)}
              </Text>
              <Text className="text-sm font-semibold text-blue-600">
                {formatCurrency(item.amount)}
              </Text>
            </View>
            {index < items.length - 1 && (
              <View
                className={`h-px ml-12 ${
                  isDark ? 'bg-gray-700' : 'bg-gray-100'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
};
