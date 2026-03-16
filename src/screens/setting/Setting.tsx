import React from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTranslation} from 'react-i18next';
import SettingsHeader from '../../components/setting/SettingsHeader';
import SettingsSection from '../../components/setting/SettingsSection';
import SettingsItem from '../../components/setting/SettingsItem';

interface SettingProps {
  onOpenMenu: () => void;
  onBack: () => void;
}
export default function Setting({onOpenMenu, onBack}: SettingProps) {
  const {t, i18n} = useTranslation();
  const toggleLanguage = () => {
    const newLng = i18n.language === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLng);
  };
  const currentLangLabel = i18n.language === 'vi' ? 'Tiếng Việt' : 'English';

  const generalSettings = [
    {
      icon: 'person-outline',
      title: 'settings.profile',
      desc: 'settings.profileDesc',
    },
    {
      icon: 'wallet-outline',
      title: 'settings.currency',
      desc: 'settings.currencyDesc',
    },
    {
      icon: 'business-outline',
      title: 'settings.organization',
      desc: 'settings.organizationDesc',
    },
    {
      icon: 'time-outline',
      title: 'settings.history',
      desc: 'settings.historyDesc',
    },
  ];

  const supportSettings = [
    {
      icon: 'help-circle-outline',
      title: 'settings.help',
      desc: 'settings.helpDesc',
    },
    {
      icon: 'information-circle-outline',
      title: 'settings.about',
      desc: 'settings.aboutDesc',
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <SettingsHeader onOpenMenu={onOpenMenu} />
      <ScrollView className="px-4">
        {/* GENERAL */}
        <SettingsSection title="settings.general">
          {generalSettings.map((item, i) => (
            <SettingsItem
              key={i}
              icon={item.icon}
              title={item.title}
              desc={item.desc}
            />
          ))}
        </SettingsSection>

        {/* Language Setting */}
        <View className="mt-6">
          <Text className="text-xs  text-gray-400 uppercase tracking-widest mb-2 px-1">
            {t('settings.language')}
          </Text>

          <View className="bg-white rounded-2xl px-4 py-3 flex-row items-center">
            <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center mr-3">
              <Icon name="translate" size={20} color="#3B82F6" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-800">
                {t('settings.systemLanguage')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={toggleLanguage}
              activeOpacity={0.7}
              className="flex-row items-center border border-gray-200 rounded-lg px-3 py-1.5">
              <Text className="text-sm text-gray-700 mr-1">
                {currentLangLabel}
              </Text>
              <Icon name="keyboard-arrow-down" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* SUPPORT */}
        <SettingsSection title="settings.support">
          {supportSettings.map((item, i) => (
            <SettingsItem
              key={i}
              icon={item.icon}
              title={item.title}
              desc={item.desc}
            />
          ))}
        </SettingsSection>
      </ScrollView>
    </SafeAreaView>
  );
}
