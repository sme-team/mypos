import React from 'react';

/**
 * App.tsx – Entry point
 *
 * Kiến trúc:
 *   <SafeAreaProvider>
 *     <ThemeProvider>
 *       <AuthProvider>          ← tokenManager + phiên đăng nhập
 *         <AppContent>          ← đọc authState, điều hướng màn hình
 *
 * Luồng điều hướng:
 *   landing → login → BusinessTypeNavigator → pos_resident | booking | setup
 *   (sidebar) → dashboard | categories | report | setting | report_export
 *                        → profile → edit_profile
 *   logout → landing
 *
 * BusinessType routing (từ JWT businessTypes):
 *   []                         → 'setup'       (chưa thiết lập shop)
 *   ['sale']                   → 'pos_resident' (chỉ hiện menu POS)
 *   ['accommodation']          → 'booking'      (chỉ hiện menu Lưu trú)
 *   ['sale','accommodation']   → 'selector'     → chọn rồi vào
 */

import './src/i18n/index';
import { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  StatusBar,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  BackHandler,
} from 'react-native';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import PreLogin from './src/screens/login/PreLogin';
import { UILogin } from './src/screens/login/UILogin';
import DashBoard from './src/screens/dashboard/Dashboard';
import PosResident from './src/screens/pos/PosResident';
import PlaceScreen from './src/screens/booking/Place';
import Setting from './src/screens/setting/Setting';
import Report from './src/screens/report/Report';
import ReportExport from './src/screens/excel-export/ExcelExport';
import ExportHistory from './src/screens/excel-export/ExportHistory';
import CategoryManagement from './src/screens/category/CategoryManagement';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import EditProfileScreen from './src/screens/profile/EditProfileScreen';

import { BusinessTypeNavigator } from './src/navigation/BusinessTypeNavigator';
import Sidebar from './src/components/Sidebar';
import { AuthProvider, useAuth } from './src/store/authStore';
import { ThemeProvider, useTheme } from './src/hooks/useTheme';
import { createModuleLogger, AppModules } from './src/logger';
import { initDatabase } from './src/database';
import { WEB_LANDING_URL as ENV_WEB_LANDING_URL } from '@env';

const REGISTER_URL = ENV_WEB_LANDING_URL ?? 'https://mypos.vn/register';

const logger = createModuleLogger(AppModules.APP);
logger.trace('App started…');

// ─── Screen type ──────────────────────────────────────────────────────────────

type Screen =
  | 'landing'
  | 'login'
  | 'main'
  | 'dashboard'
  | 'pos_resident'
  | 'booking'
  | 'categories'
  | 'report'
  | 'report_export'
  | 'report_export_history'  // ← thêm cái này
  | 'setting'
  | 'profile'
  | 'edit_profile';

// ─── Inner app ────────────────────────────────────────────────────────────────
const AppContent: React.FC = () => {
  const { state: auth, logout } = useAuth();
  const { isDark } = useTheme();

  const [screen, setScreen] = useState<Screen>('landing');
  const [dbReady, setDbReady] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  // Lưu màn hình trước đó khi vào profile để quay lại đúng chỗ
  const [screenBeforeProfile, setScreenBeforeProfile] = useState<Screen>('setting');

  // ── Khởi động database ────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        console.log('[App] Starting database initialization...');
        await initDatabase();
        console.log('[App] Database initialized successfully');
        setDbReady(true);
      } catch (err) {
        logger.error('[App] Database initialization failed:', err);
        Alert.alert(
          'Lỗi',
          'Không thể khởi tạo cơ sở dữ liệu. Vui lòng thử lại sau.',
        );
      }
    })();
  }, []);

  // ── Auto-restore session (hydrate) ────────────────────────────────────────
  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) {
      logger.info('[App] Session restored → main', {
        businessTypes: auth.user?.businessTypes,
        shopSetupDone: auth.user?.shopSetupDone,
      });
      setScreen('main');
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.user?.businessTypes, auth.user?.shopSetupDone]);

  // ── Back button Android: đóng sidebar trước, rồi xử lý profile ───────────
  useEffect(() => {
    const handler = () => {
      if (isSidebarVisible) {
        setIsSidebarVisible(false);
        return true;
      }
      // Nếu đang ở profile / edit_profile → quay lại
      if (screen === 'edit_profile') {
        setScreen('profile');
        return true;
      }
      if (screen === 'profile') {
        setScreen(screenBeforeProfile);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => sub.remove();
  }, [isSidebarVisible, screen, screenBeforeProfile]);

  // ── Callbacks ─────────────────────────────────────────────────────────────

  const handleLoginSuccess = useCallback(() => {
    logger.info('[App] Login success → main', { businessTypes: auth.user?.businessTypes });
    setScreen('main');
  }, [auth.user?.businessTypes]);

  const handleLogout = useCallback(() => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Huỷ', style: 'cancel' },
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

  const handleNavigate = useCallback((target: string) => {
    setScreen(target as Screen);
    setIsSidebarVisible(false);
  }, []);

  // Mở màn hình Profile, lưu lại màn hình hiện tại để quay lại
  const handleNavigateProfile = useCallback(() => {
    setScreenBeforeProfile(screen as Screen);
    setIsSidebarVisible(false);
    setScreen('profile');
  }, [screen]);

  // ── Splash ────────────────────────────────────────────────────────────────
  if (auth.isLoading || !dbReady) {
    return (
      <View style={[styles.splash, { backgroundColor: isDark ? '#111827' : '#ffffff' }]}>
        <Image
          source={require('./src/assets/logo-mypos.png')}
          style={styles.splashLogo}
          resizeMode="contain"
        />
        <ActivityIndicator size="small" color={isDark ? '#ffffff' : '#2563eb'} />
      </View>
    );
  }

  // Sidebar chỉ hiện trên các màn hình đã đăng nhập (không hiện trên profile)
  const showSidebar =
    isSidebarVisible &&
    !['landing', 'login', 'profile', 'edit_profile'].includes(screen);

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#111827' : '#ffffff'}
      />

      {/* ── Landing ──────────────────────────────────────────── */}
      {screen === 'landing' && (
        <PreLogin onLogin={() => setScreen('login')} />
      )}

      {/* ── Login ────────────────────────────────────────────── */}
      {screen === 'login' && (
        <UILogin
          isDark={isDark}
          onLoginSuccess={handleLoginSuccess}
          onBack={() => setScreen('landing')}
        />
      )}

      {/* ── Main (BusinessTypeNavigator) ─────────────────────── */}
      {screen === 'main' && (
        <BusinessTypeNavigator
          isDark={isDark}
          SaleScreen={() => (
            <PosResident onOpenMenu={() => setIsSidebarVisible(true)} />
          )}
          AccommodationScreen={() => (
            <PlaceScreen
              onOpenMenu={() => setIsSidebarVisible(true)}
              onBack={() => setScreen('dashboard')}
            />
          )}
          registerUrl={REGISTER_URL}
        />
      )}

      {/* ── Dashboard ────────────────────────────────────────── */}
      {screen === 'dashboard' && (
        <DashBoard
          onOpenMenu={() => setIsSidebarVisible(true)}
          onNavigate={(target: string) => {
            if (target === 'sales') {
              setScreen('main');
            } else {
              setScreen(target as Screen);
            }
          }}
        />
      )}

      {/* ── POS Resident (sale) ───────────────────────────────── */}
      {screen === 'pos_resident' && (
        <PosResident onOpenMenu={() => setIsSidebarVisible(true)} />
      )}

      {/* ── Booking / Place (accommodation) ──────────────────── */}
      {screen === 'booking' && (
        <PlaceScreen
          onOpenMenu={() => setIsSidebarVisible(true)}
          onBack={() => setScreen('dashboard')}
        />
      )}

      {/* ── Category Management ───────────────────────────────── */}
      {screen === 'categories' && (
        <CategoryManagement
          onOpenMenu={() => setIsSidebarVisible(true)}
          onBack={() => setScreen('dashboard')}
        />
      )}

      {/* ── Report ────────────────────────────────────────────── */}
      {screen === 'report' && (
        <Report
          onOpenMenu={() => setIsSidebarVisible(true)}
          onExport={() => setScreen('report_export')}
        />
      )}

      {/* ── Report Export ─────────────────────────────────────── */}
      {screen === 'report_export' && (
        <ReportExport
          onOpenMenu={() => setIsSidebarVisible(true)}
          onBack={() => setScreen('report')}
          onHistory={() => setScreen('report_export_history')}
        />
      )}

      {/* ── Report Export History ───────────────────────────────── */}
      {screen === 'report_export_history' && (
        <ExportHistory
          onOpenMenu={() => setIsSidebarVisible(true)}
          onBack={() => setScreen('report_export')}
        />
      )}

      {/* ── Settings ──────────────────────────────────────────── */}
      {screen === 'setting' && (
        <Setting
          onOpenMenu={() => setIsSidebarVisible(true)}
          onBack={() => setScreen('dashboard')}
          onNavigateProfile={handleNavigateProfile}
        />
      )}

      {/* ── Profile ───────────────────────────────────────────── */}
      {screen === 'profile' && (
        <ProfileScreen
          onBack={() => setScreen(screenBeforeProfile)}
          onEdit={() => setScreen('edit_profile')}
          onLogout={async () => {
            await logout();
            setScreen('landing');
          }}
        />
      )}

      {/* ── Edit Profile ──────────────────────────────────────── */}
      {screen === 'edit_profile' && (
        <EditProfileScreen
          onBack={() => setScreen('profile')}
          onSaved={() => setScreen('profile')}
          onChangePassword={() => {
            // TODO: setScreen('change_password') khi có màn hình đổi mật khẩu
            Alert.alert(
              'Đổi mật khẩu',
              'Tính năng này sẽ gửi OTP về email để xác nhận.',
              [{ text: 'OK' }],
            );
          }}
        />
      )}

      {/* ── Sidebar Overlay ───────────────────────────────────── */}
      {showSidebar && (
        <View style={[StyleSheet.absoluteFill, styles.sidebarOverlay]}>
          <Sidebar
            activeScreen={screen}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            onClose={() => setIsSidebarVisible(false)}
            onNavigateProfile={handleNavigateProfile}
          />
          {/* Vùng mờ bên phải – bấm để đóng */}
          <TouchableOpacity
            style={styles.sidebarDismiss}
            activeOpacity={1}
            onPress={() => setIsSidebarVisible(false)}
          />
        </View>
      )}
    </>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  sidebarOverlay: {
    zIndex: 50,
    flexDirection: 'row',
  },
  sidebarDismiss: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#94a3b8',
  },
  placeholderSub: {
    fontSize: 13,
    color: '#cbd5e1',
  },
});

// ─── Root ─────────────────────────────────────────────────────────────────────

const App: React.FC = () => (
  <SafeAreaProvider>
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  </SafeAreaProvider>
);

export default App;
