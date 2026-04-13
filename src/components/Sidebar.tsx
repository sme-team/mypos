/**
 * Sidebar.tsx
 *
 * Flow đúng:
 *  1. BE trả JWT token có businessTypes = "sale" | "accommodation" | "sale,accommodation"
 *  2. authStore parse token → user.businessTypes: string[]
 *  3. Sidebar đọc businessTypes từ token:
 *     - ['sale']              → chỉ show menu POS (Bán hàng)
 *     - ['accommodation']    → chỉ show menu Lưu trú
 *     - ['sale','accommodation'] → show cả hai + nút switch
 *  4. activeBusinessType (prop) quyết định menu nào đang hiển thị
 *     khi user có cả 2 loại và đã chọn 1
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StyleSheet,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../store/authStore';

type BusinessType = 'accommodation' | 'sale';

interface SidebarProps {
  activeScreen: string;
  onNavigate: (screen: string) => void;
  onLogout: () => void;
  onClose: () => void;
  /** businessType đang active (khi user có cả 2, chọn 1) */
  activeBusinessType?: BusinessType;
  onSwitchBusinessType?: () => void;
  /** Callback điều hướng sang màn hình Profile */
  onNavigateProfile?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.8;

// ─── Menu items ───────────────────────────────────────────────────────────────

const MENU_SALE = [
  { id: 'dashboard',    labelKey: 'sidebar.dashboard',  labelDef: 'Bảng điều khiển',  icon: 'dashboard' },
  { id: 'pos_resident', labelKey: 'sidebar.sales',       labelDef: 'Bán hàng',          icon: 'point-of-sale' },
  { id: 'categories',  labelKey: 'sidebar.categories',  labelDef: 'Danh mục',           icon: 'category' },
  { id: 'report',      labelKey: 'sidebar.report',       labelDef: 'Báo cáo',            icon: 'assessment' },
  { id: 'setting',     labelKey: 'sidebar.setting',      labelDef: 'Cài đặt',            icon: 'settings' },
];

const MENU_ACCOMMODATION = [
  { id: 'dashboard', labelKey: 'sidebar.dashboard', labelDef: 'Bảng điều khiển',      icon: 'dashboard' },
  { id: 'booking',   labelKey: 'sidebar.booking',   labelDef: 'Đặt phòng / Lưu trú', icon: 'hotel' },
  { id: 'report',    labelKey: 'sidebar.report',    labelDef: 'Báo cáo',               icon: 'assessment' },
  { id: 'setting',   labelKey: 'sidebar.setting',   labelDef: 'Cài đặt',               icon: 'settings' },
];

// ─── Business type meta ───────────────────────────────────────────────────────

const TYPE_META: Record<BusinessType, { label: string; icon: string; color: string; bg: string }> = {
  sale: {
    label: 'POS - Bán hàng',
    icon: 'point-of-sale',
    color: '#2563eb',
    bg: '#eff6ff',
  },
  accommodation: {
    label: 'Lưu trú',
    icon: 'hotel',
    color: '#ea580c',
    bg: '#fff7ed',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

const Sidebar: React.FC<SidebarProps> = ({
  activeScreen,
  onNavigate,
  onLogout,
  onClose,
  activeBusinessType,
  onSwitchBusinessType,
  onNavigateProfile,
}) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { state: authState } = useAuth();

  const user = authState.user;

  /**
   * Parse businessTypes từ token.
   * Token lưu: businessTypes = "sale" | "accommodation" | "sale,accommodation"
   * authStore đã parse thành string[] → dùng trực tiếp
   */
  const businessTypes: BusinessType[] = (user?.businessTypes ?? []) as BusinessType[];
  const hasSale = businessTypes.includes('sale');
  const hasAccommodation = businessTypes.includes('accommodation');
  const hasMultiple = hasSale && hasAccommodation;

  /**
   * Xác định businessType đang hiển thị:
   * - Nếu user chỉ có 1 loại → dùng loại đó
   * - Nếu user có 2 loại → dùng activeBusinessType (do App.tsx quản lý)
   *   fallback về 'sale' nếu chưa chọn
   */
  const resolveCurrentType = (): BusinessType => {
    if (!hasMultiple) {
      // Chỉ có 1 loại → luôn dùng loại đó
      if (hasSale) return 'sale';
      if (hasAccommodation) return 'accommodation';
      return 'sale'; // fallback an toàn
    }
    // Có cả 2 loại → theo prop từ App.tsx
    if (activeBusinessType && TYPE_META[activeBusinessType]) {
      return activeBusinessType;
    }
    return 'sale'; // default khi chưa chọn
  };

  const currentType: BusinessType = resolveCurrentType();

  /**
   * Chọn menu dựa vào loại hình đang active:
   * - 'sale'          → MENU_SALE (có POS, không có Booking)
   * - 'accommodation' → MENU_ACCOMMODATION (có Booking, không có POS)
   */
  const menuItems = currentType === 'accommodation' ? MENU_ACCOMMODATION : MENU_SALE;
  const meta = TYPE_META[currentType];

  // Theme
  const bgColor = isDark ? '#111827' : '#ffffff';
  const textColor = isDark ? '#f8fafc' : '#0f172a';
  const subTextColor = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#1f2937' : '#f1f5f9';
  const itemHoverColor = isDark ? '#1f2937' : '#f8fafc';

  return (
    <View
      style={[
        styles.container,
        { width: SIDEBAR_WIDTH, height: SCREEN_HEIGHT, backgroundColor: bgColor },
      ]}>

      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 16, borderBottomColor: borderColor },
        ]}>
        <View style={styles.logoBox}>
          <Icon name="storefront" size={24} color="#fff" />
        </View>
        <Text style={[styles.logoText, { color: textColor }]}>MyPOS</Text>
      </View>

      {/* ── BusinessType Badge ──────────────────────────────────────────────
          Chỉ hiện sau khi đăng nhập và có businessTypes từ token.
          Nếu chỉ có 1 loại → hiện badge tĩnh.
          Nếu có 2 loại → hiện badge + nút "Đổi giao diện".
      */}
      {businessTypes.length > 0 && (
        <View
          style={[
            styles.typeBadgeRow,
            { borderBottomColor: borderColor },
          ]}>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: isDark ? '#0f172a' : meta.bg },
            ]}>
            <Icon name={meta.icon} size={14} color={meta.color} />
            <Text style={[styles.typeBadgeText, { color: meta.color }]}>
              {meta.label}
            </Text>
          </View>

          {/* Nút switch chỉ hiện khi có cả 2 loại */}
          {hasMultiple && onSwitchBusinessType && (
            <TouchableOpacity
              onPress={() => {
                onSwitchBusinessType();
                onClose();
              }}
              style={[
                styles.switchBtn,
                { borderColor: isDark ? '#334155' : '#e2e8f0' },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="swap-horiz" size={16} color={subTextColor} />
              <Text style={[styles.switchBtnText, { color: subTextColor }]}>
                {t('sidebar.switch_mode', 'Đổi giao diện')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Menu Items ─────────────────────────────────────────────────────
          Chỉ hiển thị menu phù hợp với loại hình kinh doanh:
          - sale         → POS, Categories, Report, Setting
          - accommodation → Booking, Report, Setting
      */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}>
        {menuItems.map(item => {
          const isActive = activeScreen === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => {
                onNavigate(item.id);
                onClose();
              }}
              activeOpacity={0.7}
              style={[
                styles.menuItem,
                isActive
                  ? isDark
                    ? { backgroundColor: '#1e3a8a' }
                    : styles.menuItemActive
                  : {},
              ]}>
              <View
                style={[
                  styles.iconWrapper,
                  { backgroundColor: itemHoverColor },
                  isActive &&
                    (isDark
                      ? { backgroundColor: '#2563eb' }
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
                  { color: subTextColor },
                  isActive &&
                    (isDark
                      ? { color: '#fff' }
                      : styles.menuLabelActive),
                ]}>
                {t(item.labelKey, item.labelDef)}
              </Text>
              {isActive && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Footer: Profile + Logout ───────────────────────────────────── */}
      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + 16, borderTopColor: borderColor },
        ]}>
        {/* Profile row – nhấn để vào màn hình Profile */}
        <TouchableOpacity
          style={styles.footerProfile}
          activeOpacity={0.75}
          onPress={() => {
            onClose();
            onNavigateProfile?.();
          }}>
          {/* Avatar */}
          <View style={[styles.avatarBox, { backgroundColor: itemHoverColor }]}>
            {user?.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                style={styles.avatarImg}
                resizeMode="cover"
              />
            ) : (
              <Icon name="person" size={20} color="#2563eb" />
            )}
          </View>

          {/* Name + role */}
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.footerName, { color: textColor }]}
              numberOfLines={1}>
              {user?.fullName ?? user?.username ?? 'Người dùng'}
            </Text>
            <Text
              style={[styles.footerRole, { color: subTextColor }]}
              numberOfLines={1}>
              {user?.role === 'admin' ? 'Quản trị viên' : 'Chủ cửa hàng'}
            </Text>
          </View>

          {/* Logout button */}
          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => {
              onClose();
              onLogout();
            }}>
            <Icon name="logout" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </TouchableOpacity>

        <Text style={styles.version}>v1.0.0</Text>
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
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
  logoText: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  typeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  typeBadgeText: { fontSize: 12, fontWeight: '700' },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  switchBtnText: { fontSize: 11, fontWeight: '500' },
  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 4,
  },
  menuItemActive: { backgroundColor: '#eff6ff' },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconWrapperActive: { backgroundColor: '#dbeafe' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  menuLabelActive: { color: '#1d4ed8', fontWeight: '700' },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  footer: { borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 16 },
  footerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImg: { width: 38, height: 38 },
  footerName: { fontSize: 14, fontWeight: '700' },
  footerRole: { fontSize: 12, marginTop: 1 },
  version: { textAlign: 'center', fontSize: 11, color: '#cbd5e1' },
});

export default Sidebar;
