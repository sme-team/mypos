import React from 'react';
import {
  View,
  Text,
  SafeAreaView,
  Image,
  Pressable,
  ScrollView,
  useWindowDimensions,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../hooks/useTheme';

const PreLogin = ({ onLogin }: any) => {
  const { t, i18n } = useTranslation();
  const { width, height } = useWindowDimensions();
  const { isDark, toggleTheme } = useTheme();

  // responsive font
  const fontScale = width < 360 ? 0.9 : width > 400 ? 1.1 : 1;

  const toggleLanguage = () => {
    const newLng = i18n.language === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLng);
  };

  const currentLangLabel = i18n.language === 'vi' ? 'VN' : 'EN';

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 40,
          paddingBottom: 20,
        }}
        showsVerticalScrollIndicator={false}>
        <View className="items-center justify-center">
          {/* Logo Section */}
          <View className="items-center mb-6">
            <Image
              source={require('../../assets/logo/logoMypos.png')}
              style={{
                width: 80 * fontScale,
                height: 80 * fontScale,
                borderRadius: 12,
              }}
              resizeMode="contain"
            />
            <View className="items-center mb-6">
              <Text className={`text-3xl font-bold mb-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>myPOS</Text>
              <View className={`h-1 w-12 ${isDark ? 'bg-blue-400' : 'bg-blue-600'}`} />
            </View>
          </View>

          {/* Welcome Text */}
          <Text
            style={{ fontSize: 26 * fontScale }}
            className={`font-bold text-center mb-2 ${isDark ? 'text-white' : 'text-gray-900'
              }`}>
            {t('landing.welcome')}
          </Text>

          <Text
            style={{ fontSize: 15 * fontScale }}
            className={`text-center mb-8 px-4 ${isDark ? 'text-gray-400' : 'text-gray-500'
              }`}>
            {t('landing.description')}
          </Text>

          {/* Main Illustration */}
          <Image
            source={require('../../assets/back-ground.jpg')}
            style={{
              width: '100%',
              height: height * 0.28,
              borderRadius: 20,
              marginBottom: 30,
            }}
            resizeMode="cover"
          />

          {/* Buttons */}
          <Pressable
            onPress={onLogin}
            className="w-full bg-blue-600 py-4 rounded-2xl mb-10 active:opacity-90">
            <Text
              style={{ fontSize: 18 * fontScale }}
              className="text-white text-center font-bold">
              {t('landing.login')}
            </Text>
          </Pressable>

          {/* Register Link */}
          <View className="flex-row items-center mb-10">
            <Text
              className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {t('landing.no_account')}
            </Text>

            <TouchableOpacity>
              <Text
                className={`text-xs font-bold underline ml-1 ${isDark ? 'text-white' : 'text-blue-600'
                  }`}>
                {t('landing.register')}
              </Text>
            </TouchableOpacity>
          </View>
          {/* Footer Toggles */}
          <View
            className={`flex-row items-center rounded-3xl px-4 py-2 ${isDark ? 'bg-gray-800' : 'bg-gray-100'
              }`}>
            {/* Language Switcher */}
            <TouchableOpacity
              onPress={toggleLanguage}
              className="flex-row items-center">
              <Ionicons
                name="globe-outline"
                size={20}
                color={isDark ? '#1c60d7ff' : '#3d6ac4ff'}
              />
              <Text
                className={`mx-2 font-bold ${isDark ? 'text-gray-200' : 'text-gray-700'
                  }`}>
                {currentLangLabel}
              </Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={isDark ? '#1c60d7ff' : '#3d6ac4ff'}
              />
            </TouchableOpacity>

            {/* Divider */}
            <View
              className={`w-[1px] h-4 mx-4 ${isDark ? 'bg-gray-700' : 'bg-gray-300'
                }`}
            />

            {/* Theme Toggle */}
            <TouchableOpacity onPress={toggleTheme}>
              <Ionicons
                name={isDark ? 'sunny-outline' : 'moon-outline'}
                size={20}
                color={isDark ? '#2366daff' : '#0e41a8ff'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PreLogin;
