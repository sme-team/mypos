import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTranslation} from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useTheme} from '../../hooks/useTheme';
import SettingsHeader from '../../components/setting/SettingsHeader';
import SettingsSection from '../../components/setting/SettingsSection';
import SettingsItem from '../../components/setting/SettingsItem';
import {databaseSeeder} from '../../database/seeder/GoogleSheetSeeder';

const SHEET_LINK_KEY = 'GOOGLE_SHEET_URL';

interface SettingProps {
  onOpenMenu: () => void;
  onBack: () => void;
}
export default function Setting({onOpenMenu, onBack: _onBack}: SettingProps) {
  const {t, i18n} = useTranslation();
  const {isDark, toggleTheme} = useTheme();
  const [sheetLink, setSheetLink] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SHEET_LINK_KEY).then(saved => {
      if (saved) {
        setSheetLink(saved);
      }
    });
  }, []);

  const languages = [
    { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'zh', label: '中文', flag: '🇨🇳' },
  ];

  const selectLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setShowLanguageDropdown(false);
  };

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  const handleSync = (strategy: 'merge' | 'overwrite') => {
    if (!sheetLink) {
      Alert.alert(t('alert.error'), t('settings.sheetLinkRequired'));
      return;
    }

    setIsSyncing(true);
    // Save the link for future use
    AsyncStorage.setItem(SHEET_LINK_KEY, sheetLink).catch(err =>
      console.error('Failed to save sheetLink', err),
    );

    databaseSeeder
      .seedRunner(sheetLink, strategy)
      .then(() => {
        Alert.alert(t('alert.success'), t('settings.syncSuccess'));
      })
      .catch((error: any) => {
        Alert.alert(
          t('alert.error'),
          error.message || 'Unknown error',
        );
      })
      .finally(() => {
        setIsSyncing(false);
      });
  };

  const showSyncStrategyPrompt = () => {
    if (!sheetLink) {
      Alert.alert(
        t('alert.error'),
        t('settings.sheetLinkRequired'),
      );
      return;
    }
    Alert.alert(
      t('settings.syncData'),
      t('settings.syncStrategyPrompt'),
      [
        {
          text: t('settings.merge'),
          onPress: () => handleSync('merge'),
        },
        {
          text: t('settings.overwrite'),
          onPress: () => handleSync('overwrite'),
          style: 'destructive',
        },
        {text: t('settings.cancel'), style: 'cancel'},
      ],
    );
  };

  const generalSettings = [
    {
      icon: 'person-outline',
      title: 'settings.profile',
      desc: 'settings.profileDesc',
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
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
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

          <View className={`rounded-2xl px-4 py-3 flex-row items-center ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${isDark ? 'bg-blue-900/40' : 'bg-blue-50'}`}>
              <Icon name="translate" size={20} color="#3B82F6" />
            </View>
            <View className="flex-1">
              <Text className={`text-base font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                {t('settings.systemLanguage')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowLanguageDropdown(true)}
              activeOpacity={0.7}
              className={`flex-row items-center border rounded-lg px-3 py-1.5 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <Text className="text-lg mr-2">{currentLang.flag}</Text>
              <Text className={`text-sm mr-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {currentLang.label}
              </Text>
              <Icon name="keyboard-arrow-down" size={18} color={isDark ? '#4b5563' : '#6B7280'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* INTERFACE */}
        <View className="mt-6">
          <Text className="text-xs text-gray-400 uppercase tracking-widest mb-2 px-1">
            {t('settings.interface', 'Giao diện')}
          </Text>

          <View className={`rounded-2xl px-4 py-3 flex-row items-center justify-between ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <View className="flex-row items-center flex-1">
              <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${isDark ? 'bg-purple-900/40' : 'bg-purple-50'}`}>
                <Icon
                  name={isDark ? 'dark-mode' : 'light-mode'}
                  size={20}
                  color={isDark ? '#fbbf24' : '#8B5CF6'}
                />
              </View>
              <View className="flex-1">
                <Text className={`text-base font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                  {t('settings.themeMode', 'Chế độ giao diện')}
                </Text>
                <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {isDark ? t('settings.darkMode', 'Tối') : t('settings.lightMode', 'Sáng')}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={toggleTheme}
              activeOpacity={0.7}
              className={`w-14 h-8 rounded-full p-1 flex-row items-center ${isDark ? 'bg-purple-600' : 'bg-gray-300'}`}>
              <View
                className="w-6 h-6 rounded-full bg-white shadow-md"
                style={{
                  transform: [{translateX: isDark ? 20 : 0}],
                }}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* DATA SYNC */}
        <View className="mt-6">
          <Text className="text-xs text-gray-400 uppercase tracking-widest mb-2 px-1">
            {t('settings.dataSync')}
          </Text>

          <View className={`rounded-2xl px-4 py-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
              {t('settings.googleSheetUrl')}
            </Text>
            <TextInput
              className={`border rounded-lg px-3 py-2 text-sm mb-4 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              placeholderTextColor="#9CA3AF"
              value={sheetLink}
              onChangeText={setSheetLink}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              onPress={showSyncStrategyPrompt}
              disabled={isSyncing}
              className={`flex-row items-center justify-center py-3 rounded-xl ${
                isSyncing ? 'bg-blue-300' : 'bg-blue-500'
              }`}>
              {isSyncing ? (
                <ActivityIndicator color="#fff" size="small" className="mr-2" />
              ) : (
                <Icon
                  name="sync"
                  size={20}
                  color="#fff"
                  style={{marginRight: 8}}
                />
              )}
              <Text className="text-white font-semibold text-base">
                {isSyncing
                  ? t('settings.syncing')
                  : t('settings.syncDataBtn')}
              </Text>
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

      {/* Language Dropdown Modal */}
      <Modal
        visible={showLanguageDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageDropdown(false)}>
        <TouchableOpacity
          activeOpacity={1}
          className="flex-1 bg-black/50"
          onPress={() => setShowLanguageDropdown(false)}>
          <View className="absolute bottom-0 left-0 right-0">
            <View className={`rounded-t-3xl p-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
              <View className="flex-row items-center justify-between mb-4">
                <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {t('settings.selectLanguage')}
                </Text>
                <TouchableOpacity onPress={() => setShowLanguageDropdown(false)}>
                  <Icon name="close" size={24} color={isDark ? '#9ca3af' : '#6B7280'} />
                </TouchableOpacity>
              </View>
              {languages.map(lang => (
                <TouchableOpacity
                  key={lang.code}
                  onPress={() => selectLanguage(lang.code)}
                  className={`flex-row items-center p-4 rounded-xl mb-2 ${
                    i18n.language === lang.code
                      ? isDark
                        ? 'bg-blue-900/30'
                        : 'bg-blue-50'
                      : isDark
                      ? 'bg-gray-700'
                      : 'bg-gray-100'
                  }`}>
                  <Text className="text-2xl mr-3">{lang.flag}</Text>
                  <Text className={`text-base font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {lang.label}
                  </Text>
                  {i18n.language === lang.code && (
                    <View className="ml-auto">
                      <Icon name="check" size={20} color="#3B82F6" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
