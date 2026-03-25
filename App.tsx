/**
 * App.tsx – Entry point
 *
 * Kiến trúc:
 *   <AuthProvider>          ← Khởi tạo tokenManager + auto-login + quản lý phiên
 *     <AppContent>          ← Đọc authState, quyết định màn hình
 *
 * Luồng điều hướng:
 *   landing  →  login  →  pos   (đăng nhập thành công – credentials hoặc Google)
 *   landing  →  demo          (dùng thử)
 *   pos      →  landing       (đăng xuất)
 */
import './src/i18n/index';
import {useTranslation} from 'react-i18next';
import React, {useEffect, useState, useCallback} from 'react';
import {
  StyleSheet,
  StatusBar,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialIcons';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import PreLogin from './src/screens/login/PreLogin';
import {UILogin} from './src/screens/login/UILogin';
import DashBoard from './src/screens/dashboard/Dashboard';
import PosResident from './src/screens/pos/PosResident';
import PlaceScreen from './src/screens/booking/Place';
import Setting from './src/screens/setting/Setting';
import Report from './src/screens/report/Report';
import ReportExport from './src/screens/excel-export/ExcelExport';
import CategoryManagement from './src/screens/category/CategoryManagement';

import Sidebar from './src/components/Sidebar';
import {AuthProvider, useAuth} from './src/store/authStore';
import {ThemeProvider, useTheme} from './src/hooks/useTheme';
import {createModuleLogger, AppModules} from './src/logger';
import {initDatabase} from './src/database';

const logger = createModuleLogger(AppModules.APP);
logger.trace('App started…');

type Screen =
  | 'landing'
  | 'login'
  | 'webLogin'
  | 'pos'
  | 'dashboard'
  | 'categories'
  | 'report'
  | 'setting'
  | 'pos_resident'
  | 'place_resident'
  | 'report_export';

// ─── Inner app ────────────────────────────────────────────────────────────────
const AppContent: React.FC = () => {
  const {state: auth, logout} = useAuth();
  const {isDark} = useTheme();
  const {t} = useTranslation();
  const [screen, setScreen] = useState<Screen>('landing');
  const [dbReady, setDbReady] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [posMode, setPosMode] = useState<'food' | 'accommodation'>('food');

  useEffect(() => {
    const startApp = async () => {
      try {
        await initDatabase();
        setDbReady(true);
      } catch (err) {
        logger.error('[App] Database initialization failed:', err);
        Alert.alert(
          'Lỗi',
          'Không thể khởi tạo cơ sở dữ liệu. Vui lòng thử lại sau.',
        );
      }
    };
    startApp();
  }, []);

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) {
      logger.info('[App] Session restored → navigating to Dashboard');
      setScreen('dashboard');
    }
  }, [auth.isLoading, auth.isAuthenticated]);

  const handleLoginSuccess = useCallback(() => {
    logger.info('[App] Login success → dashboard');
    setScreen('dashboard');
  }, []);

  const handleLogout = useCallback(() => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      {text: 'Huỷ', style: 'cancel'},
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logout();
          setScreen('landing');
        },
      },
    ]);
  }, [logout]);

  // ── Splash Screen (hydrate từ storage + database init) ───────────────────
  if (auth.isLoading || !dbReady) {
    return (
      <View
        className={`flex-1 items-center justify-center ${
          isDark ? 'bg-gray-900' : 'bg-white'
        }`}>
        <Image
          source={require('./src/assets/logo-mypos.png')}
          style={{width: 120, height: 120, marginBottom: 24}}
          resizeMode="contain"
        />
        <ActivityIndicator
          size="small"
          color={isDark ? '#ffffff' : '#0000ff'}
        />
      </View>
    );
  }

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#111827' : '#ffffff'}
      />

      {/* ── Landing ─────────────────────────────────────────── */}
      {screen === 'landing' && <PreLogin onLogin={() => setScreen('login')} />}

      {/* ── Login ───────────────────────────────────────────── */}
      {screen === 'login' && (
        <UILogin
          isDark={isDark}
          onLoginSuccess={handleLoginSuccess}
          onBack={() => setScreen('landing')}
        />
      )}

      {/* ── POS (Legacy/Optional) ───────────────────────────────── */}
      {screen === 'pos' && (
        <View
          className={`flex-1 items-center justify-center px-6 ${
            isDark ? 'bg-gray-900' : 'bg-blue-50'
          }`}>
          {/* Avatar placeholder */}
          <View className="w-20 h-20 rounded-full bg-blue-600 items-center justify-center mb-4 shadow-lg">
            <Text className="text-white text-3xl font-bold">
              {auth.user?.full_name?.[0] ?? auth.user?.username?.[0] ?? '?'}
            </Text>
          </View>

          <Text
            className={`text-2xl font-bold mb-1 ${
              isDark ? 'text-white' : 'text-blue-900'
            }`}>
            Xin chào, {auth.user?.full_name ?? auth.user?.username}!
          </Text>

          <Text
            className={`mb-1 ${isDark ? 'text-gray-400' : 'text-blue-700'}`}>
            {auth.user?.email}
          </Text>

          <Text
            className={`text-sm mb-2 ${
              isDark ? 'text-gray-500' : 'text-gray-500'
            }`}>
            Vai trò: {auth.user?.role}
          </Text>

          {/* Badge phương thức đăng nhập */}
          <View
            className={`px-3 py-1 rounded-full mb-8 ${
              auth.authMethod === 'google'
                ? isDark
                  ? 'bg-blue-900'
                  : 'bg-blue-100'
                : isDark
                ? 'bg-green-900'
                : 'bg-green-100'
            }`}>
            <Text
              className={`text-xs font-medium ${
                auth.authMethod === 'google'
                  ? isDark
                    ? 'text-blue-300'
                    : 'text-blue-700'
                  : isDark
                  ? 'text-green-300'
                  : 'text-green-700'
              }`}>
              {auth.authMethod === 'google' ? '🔵 Google' : '🟢 Credentials'}
            </Text>
          </View>

          {/* Logout */}
          <TouchableOpacity
            onPress={handleLogout}
            className="px-8 py-3 rounded-xl bg-red-500 shadow mb-4">
            <Text className="text-white font-semibold">Đăng xuất</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setScreen('dashboard')}
            className="px-8 py-3 rounded-xl bg-blue-500 shadow">
            <Text className="text-white font-semibold">Tới Dashboard</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Dashboard (Chính) ─────────────────────────────────── */}
      {screen === 'dashboard' && (
        <DashBoard
          onOpenMenu={() => setIsSidebarVisible(true)}
          onNavigate={(target: any) =>
            setScreen(target === 'sales' ? 'pos_resident' : target)
          }
        />
      )}

      {/* ── POS Resident ───────────────────────────────────────── */}
      {screen === 'pos_resident' && (
        <PosResident
          onOpenMenu={() => setIsSidebarVisible(true)}
          initialMode={posMode}
        />
      )}

      {/* ── Place Resident ───────────────────────────────────────── */}
      {screen === 'place_resident' && (
        <PlaceScreen
          onOpenMenu={() => setIsSidebarVisible(true)}
          onBack={() => setScreen('dashboard')}
        />
      )}

      {/* ── Placeholder for Report & Setting ──────────────────────
      {(screen === 'report' || screen === 'setting') && (
        <View className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
          <View className="flex-row items-center px-4 pt-3 pb-2 border-b border-gray-100">
            <TouchableOpacity
              onPress={() => setIsSidebarVisible(true)}
              className="p-1">
              <Icon name="menu" size={28} color="#4B5563" />
            </TouchableOpacity>
            <Text className="text-lg font-bold ml-4 text-gray-800">
              {screen === 'report' ? t('sidebar.report') : t('sidebar.setting')}
            </Text>
          </View>
          <View className="flex-1 items-center justify-center">
            <Icon
              name={screen === 'report' ? 'assessment' : 'settings'}
              size={64}
              color="#CBD5E1"
            />
            <Text className="text-gray-400 mt-4 font-medium italic">
              Coming Soon
            </Text>
          </View>
        </View>
      )} */}

      {/* ── Categories (Place - Legacy) ────────────────────────────────── */}
      {screen === 'categories' && (
        <CategoryManagement
          onOpenMenu={() => setIsSidebarVisible(true)}
          onBack={() => setScreen('categories')}
        />
      )}

      {/* ── Report ─────────────────────────────────────────────── */}
      {screen === 'report' && (
        <Report
          onOpenMenu={() => setIsSidebarVisible(true)}
          onExport={() => setScreen('report_export')}
        />
      )}

      {/* ── Report Export ───────────────────────────────────────── */}
      {screen === 'report_export' && (
        <ReportExport
          onOpenMenu={() => setIsSidebarVisible(true)}
          onBack={() => setScreen('report')}
        />
      )}

      {/* ── Setting ─────────────────────────────────────────────── */}
      {screen === 'setting' && (
        <Setting
          onOpenMenu={() => setIsSidebarVisible(true)}
          onBack={() => setScreen('dashboard')}
        />
      )}

      {/* ── Sidebar Overlay ───────────────────────────────────── */}
      {isSidebarVisible && (
        <View
          style={[StyleSheet.absoluteFill, {zIndex: 50, flexDirection: 'row'}]}>
          {/* Sidebar tự quản lý width = 80% bên trong component */}
          <Sidebar
            activeScreen={screen}
            onNavigate={(newScreen: any) => setScreen(newScreen)}
            onLogout={handleLogout}
            onClose={() => setIsSidebarVisible(false)}
          />

          {/* Overlay phần còn lại */}
          <TouchableOpacity
            style={{flex: 1}}
            activeOpacity={1}
            onPress={() => setIsSidebarVisible(false)}
          />
        </View>
      )}
    </>
  );
};

// ─── Root App ─────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

export default App;
