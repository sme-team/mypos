/**
 * src/screens/profile/ProfileScreen.tsx
 *
 * Màn hình Hồ sơ cá nhân – chuyển đổi từ profile.html sang React Native.
 * Hiển thị: avatar, tên, username, phone, email, mật khẩu (ẩn), logout.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import { getMyProfile, UserProfile } from '../../services/profile.service';

interface ProfileScreenProps {
  onBack: () => void;
  onEdit: () => void;
  onLogout: () => void;
}

// ─── Avatar helper ────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ─── Info Row ─────────────────────────────────────────────────────────────────

interface InfoRowProps {
  label: string;
  value?: string;
  isPassword?: boolean;
  onPress?: () => void;
  borderBottom?: boolean;
  colors: ReturnType<typeof useColors>;
}

function InfoRow({ label, value, isPassword, onPress, borderBottom = true, colors }: InfoRowProps) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={[
        styles.infoRow,
        borderBottom && { borderBottomWidth: 1, borderBottomColor: colors.outline },
      ]}
      onPress={onPress}
      activeOpacity={0.7}>
      <Text style={[styles.infoLabel, { color: colors.subText }]}>{label}</Text>
      <View style={styles.infoRight}>
        {isPassword ? (
          <Text style={[styles.infoValue, { color: colors.text, letterSpacing: 3, fontSize: 16 }]}>
            ••••••••
          </Text>
        ) : (
          <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
            {value ?? '—'}
          </Text>
        )}
        {onPress && (
          <Icon name="chevron-right" size={20} color={colors.subText} style={{ marginLeft: 4 }} />
        )}
      </View>
    </Wrapper>
  );
}

// ─── Colors hook ──────────────────────────────────────────────────────────────

function useColors(isDark: boolean) {
  return {
    bg: isDark ? '#0f172a' : '#f5f7f8',
    card: isDark ? '#1e293b' : '#ffffff',
    text: isDark ? '#f8fafc' : '#0f172a',
    subText: isDark ? '#94a3b8' : '#64748b',
    outline: isDark ? '#334155' : '#e2e8f0',
    header: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.9)',
    primary: '#0077ff',
    error: '#ef4444',
    sectionLabel: isDark ? '#64748b' : '#64748b',
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileScreen({ onBack, onEdit, onLogout }: ProfileScreenProps) {
  const { isDark } = useTheme();
  const { state: authState } = useAuth();
  const colors = useColors(isDark);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMyProfile();
      setProfile(data);
    } catch (err: any) {
      Alert.alert(
        'Lỗi',
        err?.response?.data?.message ?? 'Không thể tải thông tin tài khoản',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const initials = getInitials(
    profile?.fullName ?? authState.user?.username ?? 'U',
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.header}
      />

      {/* ── TopBar ── */}
      <View style={[styles.topBar, { backgroundColor: colors.header, borderBottomColor: colors.outline }]}>
        <TouchableOpacity style={styles.topBarBtn} onPress={onBack} activeOpacity={0.7}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: colors.text }]}>Hồ sơ cá nhân</Text>
        <TouchableOpacity style={styles.topBarBtn} onPress={onEdit} activeOpacity={0.7}>
          <Text style={[styles.editBtnText, { color: colors.primary }]}>Sửa</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 }]}
          showsVerticalScrollIndicator={false}>

          {/* ── Hero: Avatar + Tên ── */}
          <View style={styles.hero}>
            <View style={styles.avatarWrap}>
              {profile?.avatarUrl ? (
                <Image
                  source={{ uri: profile.avatarUrl }}
                  style={styles.avatarImg}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.heroName, { color: colors.text }]}>
              {profile?.fullName ?? '—'}
            </Text>
            {/* Business type badge */}
            {(profile?.businessType ?? []).length > 0 && (
              <View style={styles.badgeRow}>
                {(profile?.businessType ?? []).map(type => (
                  <View
                    key={type}
                    style={[
                      styles.badge,
                      { backgroundColor: type === 'sale' ? '#eff6ff' : '#fff7ed' },
                    ]}>
                    <Icon
                      name={type === 'sale' ? 'point-of-sale' : 'hotel'}
                      size={12}
                      color={type === 'sale' ? '#2563eb' : '#ea580c'}
                    />
                    <Text
                      style={[
                        styles.badgeText,
                        { color: type === 'sale' ? '#2563eb' : '#ea580c' },
                      ]}>
                      {type === 'sale' ? 'Bán hàng' : 'Lưu trú'}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ── Group: Thông tin tài khoản ── */}
          <Text style={[styles.sectionLabel, { color: colors.sectionLabel }]}>
            THÔNG TIN TÀI KHOẢN
          </Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.outline }]}>
            <InfoRow label="Họ và tên"     value={profile?.fullName}  colors={colors} />
            <InfoRow label="Tên đăng nhập" value={profile?.username}  colors={colors} />
            <InfoRow label="Số điện thoại" value={profile?.phone}     colors={colors} />
            <InfoRow label="Email"          value={profile?.email}     colors={colors} />
            <InfoRow
              label="Mật khẩu"
              isPassword
              onPress={onEdit}
              borderBottom={false}
              colors={colors}
            />
          </View>

          {/* ── Logout ── */}
          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: isDark ? '#1e293b' : '#fff1f2' }]}
            onPress={() => {
              Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
                { text: 'Huỷ', style: 'cancel' },
                { text: 'Đăng xuất', style: 'destructive', onPress: onLogout },
              ]);
            }}
            activeOpacity={0.8}>
            <Icon name="logout" size={20} color={colors.error} />
            <Text style={[styles.logoutText, { color: colors.error }]}>Đăng xuất</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  topBarBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  editBtnText: { fontSize: 16, fontWeight: '700' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 24 },

  // Hero
  hero: { alignItems: 'center', marginBottom: 28 },
  avatarWrap: { marginBottom: 12 },
  avatarImg: { width: 88, height: 88, borderRadius: 44 },
  avatarPlaceholder: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontSize: 32, fontWeight: '700', color: '#fff' },
  heroName: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },

  // Section label
  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.8,
    marginBottom: 8, marginLeft: 4,
  },

  // Card
  card: {
    borderRadius: 14, borderWidth: 1,
    overflow: 'hidden', marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16,
  },
  infoLabel: { fontSize: 14, fontWeight: '500' },
  infoRight: { flexDirection: 'row', alignItems: 'center', maxWidth: '60%' },
  infoValue: { fontSize: 14, fontWeight: '600', textAlign: 'right' },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 4,
  },
  logoutText: { fontSize: 15, fontWeight: '700' },
});
