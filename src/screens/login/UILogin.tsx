import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Linking,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../store/authStore';
import { createModuleLogger, AppModules } from '../../logger';

const logger = createModuleLogger(AppModules.LOGIN_SCREEN);
const DEEP_LINK_SCHEME = 'mypos://auth/callback';

interface Props {
  isDark: boolean;
  onLoginSuccess: () => void;
  onBack: () => void;
}

type GoogleStep = 'idle' | 'fetching_url' | 'waiting_code' | 'processing';

export function UILogin({ isDark, onLoginSuccess, onBack }: Props) {
  const { t } = useTranslation();
  const {
    loginCredentials,
    loginWithCode,
    state: authState,
    clearError,
  } = useAuth();

  // ── State ──────────────────────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleStep, setGoogleStep] = useState<GoogleStep>('idle');
  const [oauthCode, setOauthCode] = useState('');

  // ── Animations ─────────────────────────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── Handlers (Defined first to be used in effects) ─────────────────────────
  const processGoogleCode = useCallback(async (codeOverride?: string) => {
    const finalCode = (codeOverride ?? oauthCode).trim();
    if (!finalCode) { return; }
    setGoogleStep('processing');
    const success = await loginWithCode(finalCode);
    if (success) {
      setOauthCode('');
      onLoginSuccess();
    } else {
      setGoogleStep('waiting_code');
    }
  }, [oauthCode, loginWithCode, onLoginSuccess]);

  const handleLogin = async () => {
    setIsLoading(true);
    const success = await loginCredentials(email, password);
    setIsLoading(false);
    if (success) { onLoginSuccess(); }
  };

  const handleGetAuthUrl = useCallback(async () => {
    clearError();
    onLoginSuccess(); // Mock Google Login too for simplicity
  }, [clearError, onLoginSuccess]);

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (googleStep === 'waiting_code') {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [googleStep, fadeAnim]);

  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      logger.info('[UILogin] Deep link received:', url);
      if (!url.startsWith(DEEP_LINK_SCHEME)) { return; }

      let receivedCode = '';
      if (url.includes('code=')) {
        receivedCode = url.split('code=')[1].split('&')[0];
      }
      receivedCode = decodeURIComponent(receivedCode);

      if (receivedCode) {
        setOauthCode(receivedCode);
        setGoogleStep('waiting_code');
        setTimeout(() => processGoogleCode(receivedCode), 500);
      }
    };

    const subscription = Linking.addListener('url', handleUrl);
    Linking.getInitialURL().then(url => {
      if (url) { handleUrl({ url }); }
    });
    return () => subscription.remove();
  }, [processGoogleCode]);

  const C = {
    screen: isDark ? 'bg-gray-900' : 'bg-slate-50',
    text: isDark ? 'text-white' : 'text-gray-900',
    subText: isDark ? 'text-gray-400' : 'text-gray-600',
    inputBg: isDark ? 'bg-gray-800' : 'bg-gray-50',
    inputBorder: isDark ? 'border-gray-700' : 'border-gray-300',
    cardBg: isDark ? 'bg-gray-800' : 'bg-white',
    divider: isDark ? 'bg-gray-700' : 'bg-gray-200',
    googleBtnBg: isDark ? 'bg-gray-800' : 'bg-white',
    googleBtnBorder: isDark ? 'border-gray-700' : 'border-gray-300',
  };

  return (
    <SafeAreaView className={`flex-1 ${C.screen}`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          className="px-6">

          {/* Header & Back Button */}
          <View className="flex-row items-center mt-4">
            <TouchableOpacity
              onPress={onBack}
              className={`p-2 w-10 h-10 items-center justify-center rounded-lg shadow-sm mr-4 ${C.googleBtnBg}`}>
              <Text className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-700'}`}>←</Text>
            </TouchableOpacity>
            <Text className={`text-lg font-bold ${C.text}`} />
          </View>

          <View className="flex-1 justify-start py-8 pt-0">
            <View className="w-full max-w-sm self-center">
              <View className="items-center -mt-10">
                <Image
                  source={require('../../assets/logo/logoMypos.png')}
                  style={{ width: 160, height: 160 }}
                  resizeMode="contain"
                />
                <View className="items-center -mt-8 mb-12">
                  <View
                    className={`h-1 ${isDark ? 'bg-blue-400' : 'bg-blue-600'}`}
                    style={{ width: 100 }}
                  />
                </View>

                <Text className={`text-2xl font-bold text-center mb-2 ${C.text}`}>
                  {t('landing.welcome_back')}
                </Text>
                <Text className={`text-sm text-center mb-10 ${C.subText}`}>
                  {t('landing.welcome_login')}
                </Text>
              </View>

              {/* Error Display */}
              {authState.error && (
                <View className={`border flex-row items-center p-3 rounded-xl mb-4 ${isDark ? 'bg-red-900/20 border-red-900/30' : 'bg-red-50 border-red-200'}`}>
                  <Icon name="error-outline" size={18} color="#dc2626" />
                  <Text className="text-red-600 text-sm ml-2">{authState.error}</Text>
                </View>
              )}

              {/* Google Code Verification Step */}
              {googleStep === 'waiting_code' || googleStep === 'processing' ? (
                <Animated.View style={{ opacity: fadeAnim }} className="mb-6">
                  <View className={`border flex-row items-center p-4 rounded-xl mb-4 ${isDark ? 'bg-blue-900/20 border-blue-900/30' : 'bg-blue-50 border-blue-200'}`}>
                    <Icon name="vpn-key" size={18} color={isDark ? '#93c5fd' : '#2563eb'} />
                    <View className="ml-3">
                      <Text className={`${isDark ? 'text-blue-300' : 'text-blue-700'} font-bold mb-1`}>{t('auth.google_verify_title')}</Text>
                      <Text className={`${isDark ? 'text-blue-400' : 'text-blue-600'} text-xs`}>{t('auth.google_verify_desc')}</Text>
                    </View>
                  </View>
                  <TextInput
                    placeholder={t('auth.codePlaceholder')}
                    placeholderTextColor={isDark ? '#4B5563' : '#9CA3AF'}
                    value={oauthCode}
                    onChangeText={setOauthCode}
                    multiline
                    numberOfLines={2}
                    className={`w-full px-4 py-3 rounded-xl border ${C.inputBg} ${C.inputBorder} ${C.text}`}
                    style={{ minHeight: 60 }}
                  />
                  <TouchableOpacity
                    onPress={() => processGoogleCode()}
                    disabled={googleStep === 'processing'}
                    className="w-full bg-blue-600 py-3 rounded-xl mt-4 items-center">
                    {googleStep === 'processing' ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold">{t('auth.confirm_code')}</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setGoogleStep('idle')} className="mt-2 self-center">
                    <Text className="text-gray-400 text-sm">{t('auth.cancel_retry')}</Text>
                  </TouchableOpacity>
                </Animated.View>
              ) : null}

              {/* Credentials Login Form */}
              {googleStep === 'idle' || googleStep === 'fetching_url' ? (
                <View className="space-y-4">
                  <View>
                    <Text className={`text-sm font-semibold mb-2 ${C.text}`}>
                      {t('auth.placeholderEmail')}
                    </Text>
                    <TextInput
                      placeholder={t('auth.placeholderloginEmail')}
                      placeholderTextColor={isDark ? '#4B5563' : '#9CA3AF'}
                      value={email}
                      onChangeText={setEmail}
                      className={`w-full px-4 py-3 rounded-xl border ${C.inputBg} ${C.inputBorder} ${C.text}`}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>

                  <View className="mt-4">
                    <Text className={`text-sm font-semibold mb-2 ${C.text}`}>
                      {t('auth.placeholderPassword')}
                    </Text>
                    <View className="relative">
                      <TextInput
                        placeholder={t('auth.placeholderloginPassword')}
                        placeholderTextColor={isDark ? '#4B5563' : '#9CA3AF'}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        className={`w-full px-4 py-3 rounded-xl border ${C.inputBg} ${C.inputBorder} ${C.text}`}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-3">
                        <Icon
                          name={showPassword ? 'visibility-off' : 'visibility'}
                          size={20}
                          color={isDark ? '#4B5563' : '#9CA3AF'}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between mt-2">
                    <TouchableOpacity
                      onPress={() => setRememberMe(!rememberMe)}
                      className="flex-row items-center">
                      <View className={`w-5 h-5 border rounded-md mr-2 items-center justify-center ${rememberMe ? 'bg-blue-600 border-blue-600' : isDark ? 'border-gray-600' : 'border-gray-300'}`}>
                        {rememberMe && <Icon name="check" size={12} color="white" />}
                      </View>
                      <Text className={`text-sm ${C.subText}`}>{t('auth.rememberMe')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity>
                      <Text className={`text-sm font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                        {t('auth.forgotPassword')}?
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={handleLogin}
                    className={`w-full bg-blue-600 py-4 rounded-xl mt-6 items-center ${isLoading ? 'opacity-70' : ''}`}>
                    {isLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-semibold text-base">
                        {t('auth.btnSignIn')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Google Login Button */}
              {googleStep === 'idle' || googleStep === 'fetching_url' ? (
                <>
                  <View className="flex-row items-center my-6">
                    <View className={`flex-1 h-[1px] ${C.divider}`} />
                    <Text className="mx-4 text-xs font-semibold text-gray-400 uppercase">
                      {t('auth.orDivider')}
                    </Text>
                    <View className={`flex-1 h-[1px] ${C.divider}`} />
                  </View>

                  <TouchableOpacity
                    onPress={handleGetAuthUrl}
                    disabled={googleStep === 'fetching_url'}
                    activeOpacity={0.85}
                    className={`w-full flex-row items-center justify-center py-4 px-5 border rounded-xl shadow-sm ${C.googleBtnBg} ${C.googleBtnBorder}`}
                  >
                    {googleStep === 'fetching_url' ? (
                      <ActivityIndicator color="#4285F4" size="small" />
                    ) : (
                      <>
                        <View className={`w-8 h-8 rounded-full mr-3 items-center justify-center border shadow-sm ${C.googleBtnBg} ${C.googleBtnBorder}`}>
                          <Text
                            style={{
                              color: '#4285F4',
                              fontWeight: '900',
                              fontSize: 18,
                            }}
                          >
                            G
                          </Text>
                        </View>

                        <Text className={`font-semibold text-base ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                          Google
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              ) : null}

              <View className="flex-row justify-center mt-8">
                <Text className={C.subText}>{t('landing.no_account')} </Text>
                <TouchableOpacity>
                  <Text className={`font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    {t('landing.register')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
