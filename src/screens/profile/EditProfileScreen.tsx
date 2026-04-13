/**
 * src/screens/profile/EditProfileScreen.tsx
 *
 * Màn hình Chỉnh sửa hồ sơ.
 * Nút "Đổi mật khẩu" → mở trình duyệt tại WEB_BASE_URL/change-password
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import { WEB_BASE_URL } from '@env';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../store/authStore';
import {
  getMyProfile,
  updateMyProfile,
  updateAvatar,
  UserProfile,
} from '../../services/profile.service';

interface EditProfileScreenProps {
  onBack: () => void;
  onSaved?: () => void;
}

// URL trang đổi mật khẩu — fallback nếu .env chưa set
const CHANGE_PASSWORD_URL = `${WEB_BASE_URL ?? 'http://localhost:3000'}/change-password`;

// ─── Colors ───────────────────────────────────────────────────────────────────

function useColors(isDark: boolean) {
  return {
    bg: isDark ? '#0f172a' : '#f5f7f8',
    card: isDark ? '#1e293b' : '#ffffff',
    text: isDark ? '#f8fafc' : '#0f172a',
    subText: isDark ? '#94a3b8' : '#64748b',
    outline: isDark ? '#334155' : '#e2e8f0',
    header: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.9)',
    primary: '#0077ff',
    inputBg: isDark ? '#0f172a' : '#f0f7ff',
    inputBorder: isDark ? '#334155' : '#bfdbfe',
    inputBorderFocus: '#0077ff',
    sectionLabelBg: isDark ? '#111827' : '#f8fafc',
    sectionLabel: isDark ? '#64748b' : '#64748b',
    error: '#ef4444',
    warningBg: isDark ? '#1c1208' : '#fffbeb',
    warningBorder: isDark ? '#78350f' : '#fcd34d',
    warningText: isDark ? '#fcd34d' : '#92400e',
  };
}

// ─── Labeled Input ────────────────────────────────────────────────────────────

interface LabeledInputProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  colors: ReturnType<typeof useColors>;
}

function LabeledInput({
  label, value, onChangeText, placeholder,
  keyboardType = 'default', autoCapitalize = 'words', colors,
}: LabeledInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.subText }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.subText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBg,
            borderColor: focused ? colors.inputBorderFocus : colors.inputBorder,
            color: colors.text,
          },
        ]}
      />
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditProfileScreen({ onBack, onSaved }: EditProfileScreenProps) {
  const { isDark } = useTheme();
  const { updateProfileInStore } = useAuth();
  const colors = useColors(isDark);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMyProfile();
      setProfile(data);
      setFullName(data.fullName ?? '');
      setPhone(data.phone ?? '');
      setEmail(data.email ?? '');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message ?? 'Không thể tải hồ sơ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // ── Lưu hồ sơ ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ và tên');
      return;
    }
    try {
      setSaving(true);
      await updateMyProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
      });
      updateProfileInStore({ fullName: fullName.trim() });
      Alert.alert('Thành công', 'Đã cập nhật hồ sơ', [
        { text: 'OK', onPress: () => { onSaved?.(); onBack(); } },
      ]);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message ?? 'Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  };

  // ── Đổi mật khẩu → mở trình duyệt ──────────────────────────────────────
  const handleChangePassword = useCallback(async () => {
    try {
      const canOpen = await Linking.canOpenURL(CHANGE_PASSWORD_URL);
      if (canOpen) {
        await Linking.openURL(CHANGE_PASSWORD_URL);
      } else {
        Alert.alert(
          'Không thể mở trình duyệt',
          `Vui lòng truy cập thủ công:\n${CHANGE_PASSWORD_URL}`,
        );
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể mở trang đổi mật khẩu');
    }
  }, []);

  // ── Chọn avatar ─────────────────────────────────────────────────────────
  const handlePickAvatar = async () => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.8, includeBase64: false },
      async response => {
        if (response.didCancel || response.errorCode) return;
        const uri = response.assets?.[0]?.uri;
        if (!uri) return;
        try {
          setUploadingAvatar(true);
          const updated = await updateAvatar(uri);
          setProfile(updated);
          updateProfileInStore({ avatarUrl: updated.avatarUrl });
          Alert.alert('Thành công', 'Đã cập nhật ảnh đại diện');
        } catch (err: any) {
          Alert.alert('Lỗi', err?.response?.data?.message ?? 'Không thể cập nhật ảnh');
        } finally {
          setUploadingAvatar(false);
        }
      },
    );
  };

  const getInitials = (name: string) =>
    name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

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
        <Text style={[styles.topBarTitle, { color: colors.text }]}>Chỉnh sửa hồ sơ</Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}>
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Lưu</Text>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">

            {/* ── Avatar ── */}
            <View style={styles.avatarSection}>
              <TouchableOpacity
                style={styles.avatarTouchable}
                onPress={handlePickAvatar}
                activeOpacity={0.8}
                disabled={uploadingAvatar}>
                <View style={[styles.avatarBorderWrap, { borderColor: colors.primary }]}>
                  {profile?.avatarUrl ? (
                    <Image
                      source={{ uri: profile.avatarUrl }}
                      style={styles.avatarImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                      <Text style={styles.avatarInitials}>
                        {getInitials(fullName || profile?.username || 'U')}
                      </Text>
                    </View>
                  )}
                  {uploadingAvatar && (
                    <View style={styles.avatarOverlay}>
                      <ActivityIndicator size="small" color="#fff" />
                    </View>
                  )}
                </View>
                <View style={[styles.editBadge, { backgroundColor: colors.primary }]}>
                  <Icon name="edit" size={14} color="#fff" />
                </View>
              </TouchableOpacity>
              <Text style={[styles.avatarHint, { color: colors.primary }]}>
                Nhấn để thay đổi ảnh đại diện
              </Text>
            </View>

            {/* ── Thông tin cá nhân ── */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.outline }]}>
              <View style={[styles.cardHeader, { backgroundColor: colors.sectionLabelBg, borderBottomColor: colors.outline }]}>
                <Text style={[styles.cardHeaderText, { color: colors.sectionLabel }]}>
                  THÔNG TIN CÁ NHÂN
                </Text>
              </View>
              <View style={styles.cardBody}>
                <LabeledInput
                  label="HỌ VÀ TÊN"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Nhập họ và tên"
                  colors={colors}
                />
                <LabeledInput
                  label="SỐ ĐIỆN THOẠI"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Nhập số điện thoại"
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  colors={colors}
                />
                <LabeledInput
                  label="EMAIL"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Nhập địa chỉ email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  colors={colors}
                />
              </View>
            </View>

            {/* ── Bảo mật ── */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.outline }]}>
              <View style={[styles.cardHeader, { backgroundColor: colors.sectionLabelBg, borderBottomColor: colors.outline }]}>
                <Text style={[styles.cardHeaderText, { color: colors.sectionLabel }]}>
                  BẢO MẬT
                </Text>
              </View>

              {/* Nút → mở browser tại /change-password */}
              <TouchableOpacity
                style={styles.securityRow}
                onPress={handleChangePassword}
                activeOpacity={0.75}>
                <View style={[styles.securityIcon, { backgroundColor: '#fff7ed' }]}>
                  <Icon name="lock-reset" size={22} color="#ea580c" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.securityTitle, { color: colors.text }]}>
                    Đổi mật khẩu
                  </Text>
                  <Text style={[styles.securityDesc, { color: colors.subText }]}>
                    Cập nhật mật khẩu để bảo vệ tài khoản
                  </Text>
                </View>
                {/* "open in browser" icon thay cho chevron */}
                <Icon name="open-in-new" size={18} color={colors.subText} />
              </TouchableOpacity>

              {/* Hiển thị URL để user biết sẽ mở đâu */}
              <View style={[styles.urlHint, {
                backgroundColor: colors.warningBg,
                borderTopColor: colors.warningBorder,
              }]}>
                <Icon name="info-outline" size={13} color={colors.warningText} />
                <Text
                  style={[styles.urlHintText, { color: colors.warningText }]}
                  numberOfLines={1}
                  ellipsizeMode="middle">
                  {CHANGE_PASSWORD_URL}
                </Text>
              </View>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  topBar: {
    height: 56, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 4, borderBottomWidth: 1,
  },
  topBarBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  saveBtn: {
    backgroundColor: '#16a34a', paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 10, marginRight: 8, minWidth: 52, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 24 },

  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarTouchable: { position: 'relative', marginBottom: 10 },
  avatarBorderWrap: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 2, borderStyle: 'dashed',
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: { width: 120, height: 120, borderRadius: 60 },
  avatarPlaceholder: {
    width: 120, height: 120, borderRadius: 60,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontSize: 40, fontWeight: '700', color: '#fff' },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  avatarHint: { fontSize: 13, fontWeight: '600' },

  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  cardHeader: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  cardHeaderText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  cardBody: { padding: 16, gap: 16 },

  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginLeft: 2 },
  input: {
    borderWidth: 2, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, fontWeight: '500',
  },

  securityRow: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
  },
  securityIcon: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  securityTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  securityDesc: { fontSize: 12 },
  urlHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1,
  },
  urlHintText: { fontSize: 11, flex: 1 },
});
