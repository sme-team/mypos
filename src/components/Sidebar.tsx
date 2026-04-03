import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StyleSheet,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context'; // ✅ Import này
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../hooks/useTheme';

interface SidebarProps {
  activeScreen: string;
  onNavigate: (screen: string) => void;
  onLogout: () => void;
  onClose: () => void;
}

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.8;

const Sidebar: React.FC<SidebarProps> = ({
  activeScreen,
  onNavigate,
  onLogout,
  onClose,
}) => {
  const {t} = useTranslation();
  const {isDark} = useTheme();
  const insets = useSafeAreaInsets(); // ✅ Lấy insets chính xác từng thiết bị

  const menuItems = [
    {
      id: 'dashboard',
      label: t('sidebar.dashboard', 'Bảng điều khiển'),
      icon: 'dashboard',
    },

    {id: 'sales', label: t('sidebar.sales', 'Bán hàng'), icon: 'point-of-sale'},
    {
      id: 'categories',
      label: t('sidebar.categories', 'Danh mục'),
      icon: 'category',
    },
    {
      id: 'customers',
      label: t('sidebar.customers', 'Khách hàng'),
      icon: 'people',
    },
    {id: 'report', label: t('sidebar.report', 'Báo cáo'), icon: 'assessment'},
    {id: 'setting', label: t('sidebar.setting', 'Cài đặt'), icon: 'settings'},
  ];

  const bgColor = isDark ? '#111827' : '#ffffff';
  const textColor = isDark ? '#f8fafc' : '#0f172a';
  const subTextColor = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#1f2937' : '#f1f5f9';
  const itemHoverColor = isDark ? '#1f2937' : '#f8fafc';

  return (
    <View
      style={[
        styles.container,
        {width: SIDEBAR_WIDTH, height: SCREEN_HEIGHT, backgroundColor: bgColor},
      ]}>
      {/* Header — paddingTop động theo insets.top */}
      <View
        style={[
          styles.header,
          {paddingTop: insets.top + 16, borderBottomColor: borderColor},
        ]}>
        {/*                          insets.top thay cho số cứng 60 */}
        <View style={styles.logoBox}>
          <Icon name="storefront" size={24} color="#fff" />
        </View>
        <Text style={[styles.logoText, {color: textColor}]}>MyPOS</Text>
      </View>

      {/* Menu */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: 20}}>
        {menuItems.map(item => {
          const isActive = activeScreen === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => {
                onNavigate(item.id === 'sales' ? 'pos_resident' : item.id);
                onClose?.();
              }}
              activeOpacity={0.7}
              style={[
                styles.menuItem,
                isActive
                  ? isDark
                    ? {backgroundColor: '#1e3a8a'}
                    : styles.menuItemActive
                  : {},
              ]}>
              <View
                style={[
                  styles.iconWrapper,
                  {backgroundColor: itemHoverColor},
                  isActive &&
                    (isDark
                      ? {backgroundColor: '#2563eb'}
                      : styles.iconWrapperActive),
                ]}>
                <Icon
                  name={item.icon}
                  size={22}
                  color={isActive ? (isDark ? '#fff' : '#2563eb') : '#94a3b8'}
                />
              </View>
              <Text
                style={[
                  styles.menuLabel,
                  {color: subTextColor},
                  isActive &&
                    (isDark ? {color: '#fff'} : styles.menuLabelActive),
                ]}>
                {item.label}
              </Text>
              {isActive && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer — paddingBottom động theo insets.bottom */}
      <View
        style={[
          styles.footer,
          {paddingBottom: insets.bottom + 16, borderTopColor: borderColor},
        ]}>
        {/*                          ✅ insets.bottom thay cho số cứng */}
        <View style={styles.footerProfile}>
          <View style={[styles.avatarBox, {backgroundColor: itemHoverColor}]}>
            <Icon name="person" size={20} color="#2563eb" />
          </View>
          <View style={{flex: 1}}>
            <Text style={[styles.footerName, {color: textColor}]}>Admin</Text>
            <Text style={[styles.footerRole, {color: subTextColor}]}>
              Quản trị viên
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              onClose?.();
              onLogout();
            }}>
            <Icon name="logout" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>
        <Text style={styles.version}>v1.0.0</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {width: 4, height: 0},
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    // ❌ Không còn paddingTop cứng ở đây — đã chuyển lên style inline
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  logoBox: {
    width: 42,
    height: 42,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 4,
  },
  menuItemActive: {
    backgroundColor: '#eff6ff',
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconWrapperActive: {
    backgroundColor: '#dbeafe',
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#64748b',
  },
  menuLabelActive: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 20,
    paddingTop: 16,
    // ❌ Không còn paddingBottom cứng — đã chuyển lên style inline
  },
  footerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  footerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  footerRole: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 1,
  },
  version: {
    textAlign: 'center',
    fontSize: 11,
    color: '#cbd5e1',
  },
});

export default Sidebar;
