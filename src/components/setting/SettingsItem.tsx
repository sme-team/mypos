import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTranslation} from 'react-i18next';

interface Props {
  icon: string;
  title: string;
  desc: string;
  isDark?: boolean;
}

const SettingsItem = ({icon, title, desc, isDark = false}: Props) => {
  const {t} = useTranslation();

  return (
    <TouchableOpacity
      className={`flex-row items-center justify-between py-4 border-b last:border-b-0 ${
        isDark ? 'border-gray-700' : 'border-gray-200'
      }`}>
      <View className="flex-row items-center">
        <View
          className={`w-10 h-10 rounded-lg items-center justify-center mr-3 ${
            isDark ? 'bg-blue-900/30' : 'bg-blue-100'
          }`}>
          <Icon name={icon} size={20} color="#2563EB" />
        </View>

        <View>
          <Text
            className={`text-base font-semibold ${
              isDark ? 'text-white' : 'text-gray-800'
            }`}>
            {t(title)}
          </Text>

          <Text
            className={`text-xs mt-1 ${
              isDark ? 'text-gray-500' : 'text-gray-500'
            }`}>
            {t(desc)}
          </Text>
        </View>
      </View>

      <Icon
        name="chevron-forward"
        size={18}
        color={isDark ? '#6b7280' : '#9CA3AF'}
      />
    </TouchableOpacity>
  );
};

export default SettingsItem;
