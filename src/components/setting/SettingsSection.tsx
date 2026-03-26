import React from 'react';
import {View, Text} from 'react-native';
import {useTranslation} from 'react-i18next';

const SettingsSection = ({title, children}: any) => {
  const {t} = useTranslation();

  return (
    <View className="mt-6">
      <Text className="text-xs text-gray-400 mb-2 px-2 uppercase">
        {t(title)}
      </Text>

      <View className="bg-white rounded-xl px-3 shadow-sm">{children}</View>
    </View>
  );
};

export default SettingsSection;