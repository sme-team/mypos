import React from 'react';
import {View, Text} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../../hooks/useTheme';

const SettingsSection = ({title, children}: any) => {
  const {t} = useTranslation();
  const {isDark} = useTheme();

  return (
    <View className="mt-6">
      <Text className="text-xs text-gray-400 mb-2 px-2 uppercase">
        {t(title)}
      </Text>

      <View className={`rounded-xl px-3 shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>{children}</View>
    </View>
  );
};

export default SettingsSection;
