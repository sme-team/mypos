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
  Linking,
  BackHandler,
} from 'react-native';

import {SafeAreaProvider} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import PreLogin from './src/screens/login/PreLogin';
import {UILogin} from './src/screens/login/UILogin';
import DashBoard from './src/screens/dashboard/Dashboard';
import PosResident from './src/screens/pos/PosResident';
import PlaceScreen from './src/screens/booking/Place';
import Setting from './src/screens/setting/Setting';
import Report from './src/screens/report/Report';
import ReportExport from './src/screens/excel-export/ExcelExport';
import CategoryManagement from './src/screens/category/CategoryManagement';
import CustomerScreen from './src/screens/customer/CustomerScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import EditProfileScreen from './src/screens/profile/EditProfileScreen';

import {BusinessTypeNavigator} from './src/navigation/BusinessTypeNavigator';
import Sidebar from './src/components/Sidebar';
import {AuthProvider, useAuth} from './src/store/authStore';
import {ThemeProvider, useTheme} from './src/hooks/useTheme';
import {createModuleLogger, AppModules} from './src/logger';
import {initDatabase} from './src/database';
import {WEB_LANDING_URL as ENV_WEB_LANDING_URL} from '@env';

const REGISTER_URL = ENV_WEB_LANDING_URL ?? 'https://mypos.vn/register';
// const REGISTER_URL = 'https://mypos.vn/register';

const logger = createModuleLogger(AppModules.APP);
logger.trace('App started…');

// ─── Screen type ──────────────────────────────────────────────────────────────

type Screen =
  | 'landing'
  | 'login'
  | 'main' // BusinessTypeNavigator xử lý (selector / pos / booking / setup)
  | 'dashboard'
  | 'pos_resident'
  | 'booking'
  | 'categories'
  | 'customers'
  | 'report'
  | 'report_export'
  | 'setting'
  | 'place_resident'
  | 'customer'
  | 'report_export'
  | 'profile' // ← MÀN HÌNH HỒ SƠ CÁ NHÂN
  | 'edit_profile'; // ← MÀN HÌNH CHỈNH SỬA HỒ SƠ

type BusinessType = 'sale' | 'accommodation';

// ─── AppContent ───────────────────────────────────────────────────────────────

const AppContent: React.FC = () => {
  const {state: auth, logout} = useAuth();
  const {isDark} = useTheme();
  const {t} = useTranslation();

  const [screen, setScreen] = useState<Screen>('landing');
  const [dbReady, setDbReady] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  // Lưu businessType đang active để truyền xuống Sidebar
  // Khi user có ['sale','accommodation'] và chọn 1 loại từ selector, lưu lại ở đây
  const [activeBusinessType, setActiveBusinessType] = useState<
    BusinessType | undefined
  >(undefined);

  // Lưu màn hình trước đó khi vào profile để quay lại đúng chỗ
  const [screenBeforeProfile, setScreenBeforeProfile] =
    useState<Screen>('setting');

  // ── Khởi động database ────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        setDbReady(true);
      } catch (err) {
        logger.error('[App] Database init failed:', err);
        Alert.alert(
          'Lỗi',
          'Không thể khởi tạo cơ sở dữ liệu. Vui lòng thử lại.',
        );
      }
    })();
  }, []);

  // ── Auto-restore session (hydrate) ────────────────────────────────────────
  useEffect(() => {
    const handleUrl = async ({url}: {url: string}) => {
      // Handle deep links if needed
      if (url && url.startsWith('mypos://callback')) {
        logger.info('[App] Deep link received but not implemented yet');
      }
    };

    Linking.getInitialURL().then(url => {
      if (url) {
        handleUrl({url});
      }
    });

    const subscription = Linking.addEventListener('url', handleUrl);
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) {
      logger.info('[App] Session restored → main', {
        businessTypes: auth.user?.businessTypes,
        shopSetupDone: auth.user?.shopSetupDone,
      });

      // Tự động set activeBusinessType từ token khi chỉ có 1 loại
      const types = auth.user?.businessTypes ?? [];
      if (types.length === 1) {
        setActiveBusinessType(types[0] as BusinessType);
      }

      setScreen('main');
    }
  }, [auth.isLoading, auth.isAuthenticated]);

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
    const types = auth.user?.businessTypes ?? [];
    logger.info('[App] Login success → main', {businessTypes: types});
    if (types.length === 1) {
      setActiveBusinessType(types[0] as BusinessType);
    }
    setScreen('main');
  }, [auth.user?.businessTypes]);

  const handleLogout = useCallback(() => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      {text: 'Huỷ', style: 'cancel'},
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logout();
          setActiveBusinessType(undefined);
          setScreen('landing');
        },
      },
    ]);
  }, [logout]);

  const handleNavigate = useCallback((target: string) => {
    setScreen(target as Screen);
    setIsSidebarVisible(false);
  }, []);

  // Khi user chọn loại từ BusinessSelectorScreen, lưu lại để Sidebar biết mode
  const handleBusinessTypeSelected = useCallback((type: BusinessType) => {
    setActiveBusinessType(type);
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
      <View
        style={[
          styles.splash,
          {backgroundColor: isDark ? '#111827' : '#ffffff'},
        ]}>
        <Image
          source={require('./src/assets/logo-mypos.png')}
          style={styles.splashLogo}
          resizeMode="contain"
        />
        <ActivityIndicator
          size="small"
          color={isDark ? '#ffffff' : '#2563eb'}
        />
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
      {screen === 'landing' && <PreLogin onLogin={() => setScreen('login')} />}

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
          onBusinessTypeSelected={handleBusinessTypeSelected}
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

      {/* ── Customer ───────────────────────────────────────── */}
      {screen === 'customers' && (
        <CustomerScreen onOpenMenu={() => setIsSidebarVisible(true)} />
      )}

      {/* ── Categories (Place - Legacy) ────────────────────────────────── */}
      {screen === 'categories' && (
        <CategoryManagement
          onOpenMenu={() => setIsSidebarVisible(true)}
          storeId="store-001"
        />
      )}

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
            setActiveBusinessType(undefined);
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
              [{text: 'OK'}],
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
            activeBusinessType={activeBusinessType}
            onSwitchBusinessType={() => {
              // Tab bar luôn hiển thị – chỉ cần reset activeBusinessType
              setActiveBusinessType(undefined);
            }}
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
