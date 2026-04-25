import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SettingsHeader from '../../components/setting/SettingsHeader';
import SettingsSection from '../../components/setting/SettingsSection';
import SettingsItem from '../../components/setting/SettingsItem';
import { databaseSeeder } from '../../database/seeder/GoogleSheetSeeder';

const SHEET_LINK_KEY = 'GOOGLE_SHEET_URL';

interface SettingProps {
  onOpenMenu: () => void;
  onBack: () => void;
}
export default function Setting({ onOpenMenu, onBack: _onBack }: SettingProps) {
  const { t, i18n } = useTranslation();
  const [sheetLink, setSheetLink] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SHEET_LINK_KEY).then(saved => {
      if (saved) { setSheetLink(saved); }
    });
  }, []);

  const toggleLanguage = () => {
    const newLng = i18n.language === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLng);
  };
  const currentLangLabel = i18n.language === 'vi' ? 'Tiếng Việt' : 'English';

  const handleSync = (strategy: 'merge' | 'overwrite') => {
    if (!sheetLink) {
      Alert.alert(t('error', 'Lỗi'), t('settings.sheetLinkRequired', 'Vui lòng nhập đường dẫn Google Sheets.'));
      return;
    }

    setIsSyncing(true);
    // Save the link for future use
    AsyncStorage.setItem(SHEET_LINK_KEY, sheetLink).catch(err => console.error('Failed to save sheetLink', err));

    databaseSeeder.seedRunner(sheetLink, strategy)
      .then(() => {
        Alert.alert(t('success', 'Thành công'), t('settings.syncSuccess', 'Đồng bộ dữ liệu thành công!'));
      })
      .catch((error: any) => {
        Alert.alert(t('error', 'Lỗi đồng bộ'), error.message || 'Unknown error');
      })
      .finally(() => {
        setIsSyncing(false);
      });
  };

  const showSyncStrategyPrompt = () => {
    if (!sheetLink) {
      Alert.alert(t('error', 'Lỗi'), t('settings.sheetLinkRequired', 'Vui lòng nhập đường dẫn Google Sheets.'));
      return;
    }
    Alert.alert(
      t('settings.syncData', 'Đồng bộ dữ liệu'),
      t('settings.syncStrategyPrompt', 'Bạn muốn ghi đè (xoá dữ liệu cũ) hay kết hợp (giữ nguyên những gì có sẵn) dữ liệu mới?'),
      [
        { text: t('settings.merge', 'Kết hợp (Merge)'), onPress: () => handleSync('merge') },
        { text: t('settings.overwrite', 'Ghi đè (Overwrite)'), onPress: () => handleSync('overwrite'), style: 'destructive' },
        { text: t('settings.cancel', 'Hủy'), style: 'cancel' },
      ]
    );
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

        {/* DATA SYNC */}
        <View className="mt-6">
          <Text className="text-xs text-gray-400 uppercase tracking-widest mb-2 px-1">
            {t('settings.dataSync', 'ĐỒNG BỘ DỮ LIỆU')}
          </Text>

          <View className="bg-white rounded-2xl px-4 py-4">
            <Text className="text-sm font-semibold text-gray-800 mb-2">
              {t('settings.googleSheetUrl', 'Đường dẫn Google Sheets (URL)')}
            </Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 mb-4"
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
              className={`flex-row items-center justify-center py-3 rounded-xl ${isSyncing ? 'bg-blue-300' : 'bg-blue-500'}`}
            >
              {isSyncing ? (
                <ActivityIndicator color="#fff" size="small" className="mr-2" />
              ) : (
                <Icon name="sync" size={20} color="#fff" style={{ marginRight: 8 }} />
              )}
              <Text className="text-white font-semibold text-base">
                {isSyncing ? t('settings.syncing', 'Đang đồng bộ...') : t('settings.syncDataBtn', 'Đồng bộ dữ liệu')}
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
    </SafeAreaView>
  );
}
