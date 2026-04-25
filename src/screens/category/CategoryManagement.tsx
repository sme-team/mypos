import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../../hooks/useTheme';
import PosCategoryManagement from './PosCategoryManagement';
import RoomManagement from '../../screens/room/RoomManagement';

interface Props {
  onOpenMenu: () => void;
  storeId: string;
}

type SectionKey = 'selling' | 'stay';

const SECTIONS: {key: SectionKey; labelKey: string; label: string; icon: string}[] = [
  {key: 'selling', labelKey: 'category.sectionSelling', label: 'Bán hàng', icon: 'shopping-basket'},
  {key: 'stay',    labelKey: 'category.sectionStay',    label: 'Lưu trú', icon: 'bed'},
];

export default function CategoryManagement({onOpenMenu, storeId}: Props) {
  const {t} = useTranslation();
  const {isDark} = useTheme();

  const bgColor   = isDark ? '#111827' : '#f5f7fa';
  const headerBg  = isDark ? '#1f2937' : '#f5f7fa';
  const textColor = isDark ? '#f9fafb' : '#111827';
  const borderColor = isDark ? '#374151' : '#c2c2c2';

  const [activeSection, setActiveSection] = useState<SectionKey>('selling');

  const handleSwitchSection = (key: SectionKey) => {
    setActiveSection(key);
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: bgColor}}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* ── Shared header: hamburger + section tabs ── */}
      <View
        style={{
          backgroundColor: headerBg,
          borderBottomWidth: 1,
          borderBottomColor: borderColor,
          zIndex: 10,
        }}>
        {/* Top row: hamburger + title */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            gap: 10,
          }}>
          <TouchableOpacity onPress={onOpenMenu} style={{padding: 4}}>
            <View style={{gap: 4}}>
              {[0, 1, 2].map(i => (
                <View
                  key={i}
                  style={{
                    width: i === 2 ? 14 : 20,
                    height: 2,
                    backgroundColor: isDark ? '#f9fafb' : '#374151',
                    borderRadius: 2,
                  }}
                />
              ))}
            </View>
          </TouchableOpacity>

          <Text style={{fontSize: 20, fontWeight: '700', color: textColor}}>
            {t('category.title', 'Danh mục')}
          </Text>
        </View>

        {/* Section pill tabs */}
        <View style={{paddingHorizontal: 16, paddingBottom: 16}}>
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
              borderRadius: 16,
              padding: 4,
            }}>
            {SECTIONS.map(sec => {
              const isActive = activeSection === sec.key;
              return (
                <TouchableOpacity
                  key={sec.key}
                  onPress={() => handleSwitchSection(sec.key)}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: isActive
                      ? isDark ? '#3b82f6' : '#fff'
                      : 'transparent',
                    shadowColor: '#000',
                    shadowOffset: {width: 0, height: 2},
                    shadowOpacity: isActive ? 0.1 : 0,
                    shadowRadius: 4,
                    elevation: isActive ? 4 : 0,
                    gap: 8,
                  }}>
                  <Icon
                    name={sec.icon}
                    size={18}
                    color={
                      isActive
                        ? isDark ? '#fff' : '#3b82f6'
                        : isDark ? '#9ca3af' : '#6b7280'
                    }
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: isActive
                        ? isDark ? '#fff' : '#1e3a8a'
                        : isDark ? '#9ca3af' : '#6b7280',
                    }}>
                    {t(sec.labelKey, sec.label)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* ── Mode screens: completely independent ── */}
      {activeSection === 'selling' ? (
        <PosCategoryManagement storeId={storeId} />
      ) : (
        <RoomManagement storeId={storeId} />
      )}
    </SafeAreaView>
  );
}
