/**
 * src/screens/login/UILogin.tsx
 *
 * Màn hình đăng nhập:
 *   1. Username / Password  → loginCredentials()
 *   2. Google Sign-In       → lấy idToken từ @react-native-google-signin/google-signin
 *                             → loginWithGoogleToken(idToken, 'login')
 *
 * Sau khi đăng nhập thành công, gọi onLoginSuccess() để navigator
 * đọc user.businessTypes và điều hướng đến đúng giao diện bán hàng.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useAuth } from '../../store/authStore';
import { createModuleLogger, AppModules } from '../../logger';


const logger = createModuleLogger(AppModules.LOGIN_SCREEN);

// ─── Google Sign-In config ───────────────────────────────────────────────────
// Thay GOOGLE_WEB_CLIENT_ID bằng client ID từ Google Cloud Console của bạn.
// Đây là WEB client ID (không phải Android/iOS), dùng để verify idToken trên BE.
GoogleSignin.configure({
  webClientId: '909913295236-8gcgqh2bp0fogl5th6c1vkt4sqsfgitb.apps.googleusercontent.com',
  offlineAccess: false,
});

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  isDark: boolean;
  onLoginSuccess: () => void;
  onBack: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UILogin({ isDark, onLoginSuccess, onBack }: Props) {
  const { t } = useTranslation();
  const { loginCredentials, loginWithGoogleToken, state: authState, clearError } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Hiệu ứng rung khi có lỗi
  useEffect(() => {
    if (authState.error) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    }
  }, [authState.error, shakeAnim]);

  // ── Đăng nhập username/password ──────────────────────────────────────────
  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      return;
    }
    clearError();
    setIsLoading(true);
    try {
      const success = await loginCredentials(username.trim(), password);
      if (success) {
        onLoginSuccess();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Đăng nhập Google ──────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    clearError();
    setIsGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      // Lấy idToken để gửi về BE
      const tokens = await GoogleSignin.getTokens();
      const idToken = tokens.idToken;

      if (!idToken) {
        logger.error('[UILogin] Không lấy được idToken từ Google');
        return;
      }

      logger.info('[UILogin] 🔑 Đã nhận Google idToken, gửi lên BE...');

      // Gửi idToken lên BE → BE verify → trả access_token có businessTypes
      const success = await loginWithGoogleToken(idToken, 'login');
      if (success) {
        onLoginSuccess();
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        logger.info('[UILogin] Google Sign-In bị hủy bởi người dùng');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        logger.warn('[UILogin] Google Sign-In đang xử lý');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        logger.error('[UILogin] Google Play Services không khả dụng');
      } else {
        logger.error('[UILogin] Lỗi Google Sign-In:', error.message);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // ── Theme ────────────────────────────────────────────────────────────────
  const bg = isDark ? '#1a1a2e' : '#f0f4ff';
  const card = isDark ? '#16213e' : '#ffffff';
  const text = isDark ? '#e0e0e0' : '#1a1a2e';
  const subText = isDark ? '#9e9e9e' : '#6b7280';
  const inputBg = isDark ? '#0f3460' : '#f9fafb';
  const inputBorder = isDark ? '#1e4d8c' : '#e5e7eb';
  const accent = '#4f8ef7';
  const danger = '#ef4444';

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Icon name="arrow-back-ios" size={20} color={text} />
          </TouchableOpacity>

          {/* Card */}
          <Animated.View
            style={[
              styles.card,
              { backgroundColor: card, transform: [{ translateX: shakeAnim }] },
            ]}>

            {/* Logo */}
            <View style={styles.logoWrap}>
              <Image
                source={require('../../assets/logo-mypos.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <Text style={[styles.title, { color: text }]}>Đăng nhập</Text>
            <Text style={[styles.subtitle, { color: subText }]}>
              Chào mừng trở lại!
            </Text>

            {/* Error banner */}
            {authState.error ? (
              <View style={styles.errorBanner}>
                <Icon name="error-outline" size={16} color={danger} />
                <Text style={[styles.errorText, { color: danger }]}>
                  {authState.error}
                </Text>
              </View>
            ) : null}

            {/* Username */}
            <View style={styles.fieldWrap}>
              <Text style={[styles.label, { color: subText }]}>Tên đăng nhập</Text>
              <View
                style={[
                  styles.inputRow,
                  { backgroundColor: inputBg, borderColor: inputBorder },
                ]}>
                <Icon name="person-outline" size={20} color={subText} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: text }]}
                  placeholder="Nhập username"
                  placeholderTextColor={subText}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldWrap}>
              <Text style={[styles.label, { color: subText }]}>Mật khẩu</Text>
              <View
                style={[
                  styles.inputRow,
                  { backgroundColor: inputBg, borderColor: inputBorder },
                ]}>
                <Icon name="lock-outline" size={20} color={subText} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: text }]}
                  placeholder="Nhập mật khẩu"
                  placeholderTextColor={subText}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity onPress={() => setShowPassword(p => !p)}>
                  <Icon
                    name={showPassword ? 'visibility' : 'visibility-off'}
                    size={20}
                    color={subText}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Nút đăng nhập */}
            <TouchableOpacity
              style={[
                styles.loginBtn,
                { backgroundColor: accent },
                (isLoading || !username || !password) && styles.disabled,
              ]}
              onPress={handleLogin}
              disabled={isLoading || !username.trim() || !password.trim()}>
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginBtnText}>Đăng nhập</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: inputBorder }]} />
              <Text style={[styles.dividerText, { color: subText }]}>hoặc</Text>
              <View style={[styles.dividerLine, { backgroundColor: inputBorder }]} />
            </View>

            {/* Nút đăng nhập Google */}
            <TouchableOpacity
              style={[
                styles.googleBtn,
                { borderColor: inputBorder, backgroundColor: card },
                isGoogleLoading && styles.disabled,
              ]}
              onPress={handleGoogleLogin}
              disabled={isGoogleLoading}>
              {isGoogleLoading ? (
                <ActivityIndicator color={accent} />
              ) : (
                <>
                  {/* Icon Google SVG inline */}
                  <View style={styles.googleIconWrap}>
                    <Text style={styles.googleIconText}>G</Text>
                  </View>
                  <Text style={[styles.googleBtnText, { color: text }]}>
                    Đăng nhập bằng Google
                  </Text>
                </>
              )}
            </TouchableOpacity>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  backBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  card: {
    borderRadius: 20,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    marginTop: 48,
  },
  logoWrap: { alignItems: 'center', marginBottom: 20 },
  logo: { width: 120, height: 48 },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: { fontSize: 13, flex: 1 },
  fieldWrap: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15 },
  loginBtn: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  disabled: { opacity: 0.6 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 10,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13 },
  googleBtn: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  googleIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  googleBtnText: { fontSize: 15, fontWeight: '600' },
});