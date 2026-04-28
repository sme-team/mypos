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
  onBack?: () => void;
}

function NoBusinessTypeScreen({ registerUrl, isDark = false, onBack }: NoBusinessProps) {
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

        {/* Nút quay lại đăng nhập */}
        {onBack && (
          <TouchableOpacity
            style={[noStyles.backBtn, { borderColor: isDark ? '#334155' : '#e2e8f0' }]}
            onPress={onBack}
            activeOpacity={0.75}>
            <Icon name="arrow-back" size={18} color={isDark ? '#94a3b8' : '#64748b'} style={noStyles.btnIcon} />
            <Text style={[noStyles.backBtnText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              Quay lại đăng nhập
            </Text>
          </TouchableOpacity>
        )}
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
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});


interface TabBarProps {
  active: 'sale' | 'accommodation';
  onChange: (type: 'sale' | 'accommodation') => void;
  isDark?: boolean;
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

  if (!user) { return { screen: 'loading' as const }; }
  if (!user.shopSetupDone || user.businessTypes.length === 0) { return { screen: 'setup' as const }; }

  const types = user.businessTypes;
  if (types.includes('sale') && types.includes('accommodation')) { return { screen: 'both' as const }; }
  if (types.includes('sale')) { return { screen: 'sale' as const }; }
  if (types.includes('accommodation')) { return { screen: 'accommodation' as const }; }

  return { screen: 'setup' as const };
}

// ─── BusinessTypeNavigator ────────────────────────────────────────────────────

interface NavigatorProps {
  isDark?: boolean;
  SaleScreen: React.ComponentType<any>;
  AccommodationScreen: React.ComponentType<any>;
  /** URL trang web đăng ký – gắn từ App.tsx */
  registerUrl: string;
  /** Callback quay lại màn hình đăng nhập */
  onBack?: () => void;
}

export function BusinessTypeNavigator({
  isDark = false,
  SaleScreen,
  AccommodationScreen,
  registerUrl,
  onBack,
}: NavigatorProps) {
  const { screen } = useBusinessType();

  if (screen === 'setup') {
    return <NoBusinessTypeScreen registerUrl={registerUrl} isDark={isDark} onBack={onBack} />;
  }

  if (screen === 'sale') { return <SaleScreen isDark={isDark} />; }

  if (screen === 'accommodation') { return <AccommodationScreen isDark={isDark} />; }

  if (screen === 'both') {
    // PosResident tự render cả 2 tab (POS + lưu trú) dựa theo JWT businessTypes
    return <SaleScreen isDark={isDark} />;
  }

  return null;
}