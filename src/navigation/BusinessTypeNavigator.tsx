/**
 * src/navigation/BusinessTypeNavigator.tsx
 *
 * Điều hướng giao diện bán hàng dựa vào businessTypes trong token JWT.
 *
 * Quy tắc:
 *   ["sale"]                      → SaleScreen trực tiếp
 *   ["accommodation"]             → AccommodationScreen trực tiếp
 *   ["sale", "accommodation"]     → Tab bar "POS | LƯU TRÚ" nhúng trong màn hình
 *   []  hoặc chưa setup shop      → NoBusinessTypeScreen (thông báo + nút đăng ký web)
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../store/authStore';

// ─── NoBusinessTypeScreen ─────────────────────────────────────────────────────

interface NoBusinessProps {
  registerUrl: string;
  isDark?: boolean;
}

function NoBusinessTypeScreen({ registerUrl, isDark = false }: NoBusinessProps) {
  const bg       = isDark ? '#0f172a' : '#f8fafc';
  const card     = isDark ? '#1e293b' : '#ffffff';
  const text     = isDark ? '#e2e8f0' : '#1e293b';
  const subText  = isDark ? '#94a3b8' : '#64748b';
  const iconBg   = isDark ? '#1e3a5f' : '#eff6ff';

  const handleOpenRegister = async () => {
    try {
      const supported = await Linking.canOpenURL(registerUrl);
      if (supported) {
        await Linking.openURL(registerUrl);
      } else {
        Alert.alert('Không thể mở trình duyệt', 'Vui lòng truy cập trang đăng ký thủ công.');
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể mở đường dẫn đăng ký.');
    }
  };

  return (
    <View style={[noStyles.container, { backgroundColor: bg }]}>
      <View style={[noStyles.card, { backgroundColor: card }]}>
        {/* Icon */}
        <View style={[noStyles.iconWrap, { backgroundColor: iconBg }]}>
          <Icon name="store-mall-directory" size={48} color="#4f8ef7" />
        </View>

        {/* Tiêu đề */}
        <Text style={[noStyles.title, { color: text }]}>
          Tài khoản chưa có loại hình kinh doanh
        </Text>

        {/* Mô tả */}
        <Text style={[noStyles.desc, { color: subText }]}>
          Tài khoản của bạn chưa được cấu hình loại hình kinh doanh.{'\n'}
          Vui lòng truy cập trang web để đăng ký và thiết lập cửa hàng.
        </Text>

        {/* Nút mở web */}
        <TouchableOpacity
          style={noStyles.btn}
          onPress={handleOpenRegister}
          activeOpacity={0.85}>
          <Icon name="open-in-browser" size={20} color="#ffffff" style={noStyles.btnIcon} />
          <Text style={noStyles.btnText}>Đăng ký trên web</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const noStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 26,
  },
  desc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f8ef7',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  btnIcon: {
    marginRight: 8,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});

// ─── BusinessTabBar ───────────────────────────────────────────────────────────

interface TabBarProps {
  active: 'sale' | 'accommodation';
  onChange: (type: 'sale' | 'accommodation') => void;
  isDark?: boolean;
}

function BusinessTabBar({ active, onChange, isDark = false }: TabBarProps) {
  const bg           = isDark ? '#1e293b' : '#ffffff';
  const borderClr    = isDark ? '#334155' : '#e2e8f0';
  const activeText   = '#4f8ef7';
  const inactiveText = isDark ? '#94a3b8' : '#64748b';
  const activeBg     = isDark ? '#1e3a5f' : '#eff6ff';

  return (
    <View style={[tabStyles.wrapper, { backgroundColor: bg, borderBottomColor: borderClr }]}>
      <TouchableOpacity
        style={[tabStyles.tab, active === 'sale' && { backgroundColor: activeBg }]}
        onPress={() => onChange('sale')}
        activeOpacity={0.75}>
        <Icon name="point-of-sale" size={18} color={active === 'sale' ? activeText : inactiveText} style={tabStyles.tabIcon} />
        <Text style={[tabStyles.tabText, { color: active === 'sale' ? activeText : inactiveText }, active === 'sale' && tabStyles.tabTextActive]}>
          POS
        </Text>
        {active === 'sale' && <View style={[tabStyles.indicator, { backgroundColor: activeText }]} />}
      </TouchableOpacity>

      <TouchableOpacity
        style={[tabStyles.tab, active === 'accommodation' && { backgroundColor: activeBg }]}
        onPress={() => onChange('accommodation')}
        activeOpacity={0.75}>
        <Icon name="hotel" size={18} color={active === 'accommodation' ? activeText : inactiveText} style={tabStyles.tabIcon} />
        <Text style={[tabStyles.tabText, { color: active === 'accommodation' ? activeText : inactiveText }, active === 'accommodation' && tabStyles.tabTextActive]}>
          LƯU TRÚ
        </Text>
        {active === 'accommodation' && <View style={[tabStyles.indicator, { backgroundColor: activeText }]} />}
      </TouchableOpacity>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  wrapper: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabIcon: { marginRight: 6 },
  tabText: { fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  tabTextActive: { fontWeight: '700' },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: '15%',
    right: '15%',
    height: 2,
    borderRadius: 2,
  },
});

// ─── Hook useBusinessType ─────────────────────────────────────────────────────

export function useBusinessType() {
  const { state } = useAuth();
  const user = state.user;

  if (!user) return { screen: 'loading' as const };
  if (!user.shopSetupDone || user.businessTypes.length === 0) return { screen: 'setup' as const };

  const types = user.businessTypes;
  if (types.includes('sale') && types.includes('accommodation')) return { screen: 'both' as const };
  if (types.includes('sale'))          return { screen: 'sale' as const };
  if (types.includes('accommodation')) return { screen: 'accommodation' as const };

  return { screen: 'setup' as const };
}

// ─── BusinessTypeNavigator ────────────────────────────────────────────────────

interface NavigatorProps {
  isDark?: boolean;
  SaleScreen: React.ComponentType<any>;
  AccommodationScreen: React.ComponentType<any>;
  /** URL trang web đăng ký – gắn từ App.tsx */
  registerUrl: string;
  onBusinessTypeSelected?: (type: 'sale' | 'accommodation') => void;
}

export function BusinessTypeNavigator({
  isDark = false,
  SaleScreen,
  AccommodationScreen,
  registerUrl,
  onBusinessTypeSelected,
}: NavigatorProps) {
  const { screen } = useBusinessType();
  const [activeTab, setActiveTab] = React.useState<'sale' | 'accommodation'>('sale');

  const { state } = useAuth();
  React.useEffect(() => { setActiveTab('sale'); }, [state.user?.id]);

  React.useEffect(() => {
    if (screen === 'sale')               onBusinessTypeSelected?.('sale');
    else if (screen === 'accommodation') onBusinessTypeSelected?.('accommodation');
    else if (screen === 'both')          onBusinessTypeSelected?.(activeTab);
  }, [screen, activeTab, onBusinessTypeSelected]);

  if (screen === 'setup') {
    return <NoBusinessTypeScreen registerUrl={registerUrl} isDark={isDark} />;
  }

  if (screen === 'sale') return <SaleScreen isDark={isDark} />;

  if (screen === 'accommodation') return <AccommodationScreen isDark={isDark} />;

  if (screen === 'both') {
    const handleTabChange = (type: 'sale' | 'accommodation') => {
      setActiveTab(type);
      onBusinessTypeSelected?.(type);
    };
    return (
      <View style={{ flex: 1 }}>
        <BusinessTabBar active={activeTab} onChange={handleTabChange} isDark={isDark} />
        {activeTab === 'sale' ? <SaleScreen isDark={isDark} /> : <AccommodationScreen isDark={isDark} />}
      </View>
    );
  }

  return null;
}