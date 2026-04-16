import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTranslation} from 'react-i18next';

interface Props {
  icon: string;
  title: string;
  desc: string;
  onPress?: () => void;
}

const SettingsItem = ({icon, title, desc, onPress}: Props) => {
  const {t} = useTranslation();

  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center justify-between py-4 border-b border-gray-200 last:border-b-0">
      <View className="flex-row items-center">
        <View className="w-10 h-10 bg-blue-100 rounded-lg items-center justify-center mr-3">
          <Icon name={icon} size={20} color="#2563EB" />
        </View>

        <View>
          <Text className="text-base font-semibold text-gray-800">
            {t(title)}
          </Text>

          <Text className="text-xs text-gray-500 mt-1">{t(desc)}</Text>
        </View>
      </View>

      <Icon name="chevron-forward" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );
};

export default SettingsItem;
