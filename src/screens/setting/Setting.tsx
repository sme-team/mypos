import React, {useState} from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IconIon from 'react-native-vector-icons/Ionicons';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../../hooks/useTheme';
import SettingsSection from '../../components/setting/SettingsSection';
import SettingsItem from '../../components/setting/SettingsItem';

interface SettingProps {
  onOpenMenu: () => void;
  onBack: () => void;
}
export default function Setting({onOpenMenu, onBack}: SettingProps) {
  const {t, i18n} = useTranslation();
  const {isDark} = useTheme();
  const [langOpen, setLangOpen] = useState(false);

  const languages = [
    {value: 'vi', label: 'Tiếng Việt'},
    {value: 'en', label: 'English'},
    {value: 'zh', label: '中文'},
  ];

  const currentLang = languages.find(l => l.value === i18n.language);

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    setLangOpen(false);
  };

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
    <SafeAreaView
      className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Header */}
      <View
        className={`flex-row items-center justify-between px-4 py-3 border-b ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
        }`}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={onOpenMenu}>
            <IconIon
              name="menu"
              size={28}
              color={isDark ? '#e5e7eb' : '#000'}
            />
          </TouchableOpacity>
          <Text
            className={`text-2xl font-black font-semibold ml-3 ${
              isDark ? 'text-white' : 'text-gray-800'
            }`}>
            {t('settings.title')}
          </Text>
        </View>

        <View className="flex-row">
          <TouchableOpacity className="mr-3">
            <IconIon
              name="notifications-outline"
              size={22}
              color={isDark ? '#9ca3af' : '#000'}
            />
          </TouchableOpacity>

          <TouchableOpacity>
            <IconIon
              name="search-outline"
              size={22}
              color={isDark ? '#9ca3af' : '#000'}
            />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView className="px-4">
        {/* GENERAL */}
        <SettingsSection title="settings.general" isDark={isDark}>
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
        <View className="mt-3">
          <Text
            className={`text-xs uppercase tracking-widest mb-2 px-1 ${
              isDark ? 'text-gray-500' : 'text-gray-400'
            }`}>
            {t('settings.language')}
          </Text>

          <TouchableOpacity
            onPress={() => setLangOpen(!langOpen)}
            activeOpacity={0.9}
            className={`rounded-2xl px-4 py-3 flex-row items-center ${
              isDark ? 'bg-gray-800' : 'bg-white'
            }`}>
            <View
              className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${
                isDark ? 'bg-blue-900/40' : 'bg-blue-50'
              }`}>
              <Icon name="translate" size={20} color="#3B82F6" />
            </View>
            <View className="flex-1">
              <Text
                className={`text-base font-semibold ${
                  isDark ? 'text-white' : 'text-gray-800'
                }`}>
                {t('settings.systemLanguage')}
              </Text>
            </View>
            <View
              className={`flex-row items-center border rounded-lg px-3 py-1.5 ${
                isDark
                  ? 'border-gray-600 bg-gray-700'
                  : 'border-gray-200 bg-white'
              }`}>
              <Text
                className={`text-sm mr-1 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                {currentLang?.label}
              </Text>
              <Icon
                name={langOpen ? 'expand-less' : 'expand-more'}
                size={18}
                color={isDark ? '#9ca3af' : '#6B7280'}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* SUPPORT */}
        <SettingsSection title="settings.support" isDark={isDark}>
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

      {/* Language Dropdown - Outside ScrollView for overlay effect */}
      {langOpen && (
        <View
          className={`absolute left-4 right-4 top-auto border rounded-lg overflow-hidden z-50 ${
            isDark ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
          }`}
          style={{bottom: 280}}>
          {languages.map((lang, idx) => (
            <TouchableOpacity
              key={lang.value}
              onPress={() => handleLanguageChange(lang.value)}
              className={`px-4 py-3 flex-row items-center justify-between ${
                idx < languages.length - 1
                  ? isDark
                    ? 'border-b border-gray-700'
                    : 'border-b border-gray-100'
                  : ''
              } ${
                i18n.language === lang.value
                  ? isDark
                    ? 'bg-blue-900/50'
                    : 'bg-blue-50'
                  : ''
              }`}>
              <Text
                className={`text-base ${
                  i18n.language === lang.value
                    ? 'text-blue-600 font-semibold'
                    : isDark
                    ? 'text-gray-300'
                    : 'text-gray-700'
                }`}>
                {lang.label}
              </Text>
              {i18n.language === lang.value && (
                <Icon name="check" size={20} color="#3B82F6" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}
