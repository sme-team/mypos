import React from 'react';
import {View, Text} from 'react-native';
import {useTranslation} from 'react-i18next';

const SettingsSection = ({title, children, isDark = false}: any) => {
  const {t} = useTranslation();

  return (
    <View className="mt-3">
      <Text
        className={`text-xs mb-2 px-2 uppercase ${
          isDark ? 'text-gray-500' : 'text-gray-400'
        }`}>
        {t(title)}
      </Text>

      <View
        className={`rounded-xl px-3 shadow-sm ${
          isDark ? 'bg-gray-800' : 'bg-white'
        }`}>
        {React.Children.map(children, (child: any) =>
          React.cloneElement(child, {isDark}),
        )}
      </View>
    </View>
  );
};

export default SettingsSection;
