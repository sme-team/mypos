/**
 * HƯỚNG DẪN TÍCH HỢP – Đăng nhập + BusinessTypes
 * ==================================================
 *
 * Bước 1: Cài đặt dependencies
 * Bước 2: Cấu hình Google Sign-In
 * Bước 3: Cập nhật App.tsx
 * Bước 4: Cấu hình BASE_URL
 */

/**
 * ─── BƯỚC 1: Cài dependencies ────────────────────────────────────────────────
 *
 * npm install @react-native-google-signin/google-signin
 *
 * iOS:
 *   cd ios && pod install
 *
 * Android: Không cần cấu hình thêm nếu đã có Google Play Services.
 */

/**
 * ─── BƯỚC 2: Cấu hình Google Sign-In ─────────────────────────────────────────
 *
 * 1. Vào Google Cloud Console → tạo OAuth 2.0 Client ID:
 *    - Loại: Web application (dùng để verify idToken trên BE)
 *    - Loại: Android (dùng để app mobile authenticate)
 *    - Loại: iOS (nếu build iOS)
 *
 * 2. Thêm GOOGLE_WEB_CLIENT_ID vào .env:
 *    GOOGLE_WEB_CLIENT_ID=xxxxxx.apps.googleusercontent.com
 *
 * 3. Trong UILogin.tsx, thay:
 *    webClientId: 'YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com'
 *    bằng client ID thật.
 *
 * 4. Trên BE, đảm bảo GOOGLE_CLIENT_ID trong .env khớp với WEB client ID.
 */

/**
 * ─── BƯỚC 3: App.tsx ──────────────────────────────────────────────────────────
 */

// import React from 'react';
// import { AuthProvider, useAuth } from './src/store/authStore';
// import { BusinessTypeNavigator } from './src/navigation/BusinessTypeNavigator';
// import { PreLogin } from './src/screens/login/PreLogin';
// import SalePosScreen from './src/screens/pos/SalePosScreen';         // màn hình bán hàng của bạn
// import AccommodationScreen from './src/screens/booking/Place';       // màn hình lưu trú của bạn
// import ShopSetupScreen from './src/screens/setup/ShopSetup';         // màn hình setup shop

// function RootNavigator() {
//   const { state } = useAuth();
//
//   if (state.isLoading) {
//     return <SplashScreen />;
//   }
//
//   if (!state.isAuthenticated) {
//     return <PreLogin isDark={false} />;
//   }
//
//   // ✅ Đã đăng nhập → điều hướng theo businessTypes
//   return (
//     <BusinessTypeNavigator
//       isDark={false}
//       SaleScreen={SalePosScreen}
//       AccommodationScreen={AccommodationScreen}
//       ShopSetupScreen={ShopSetupScreen}
//     />
//   );
// }
//
// export default function App() {
//   return (
//     <AuthProvider>
//       <RootNavigator />
//     </AuthProvider>
//   );
// }

/**
 * ─── BƯỚC 4: BASE_URL ─────────────────────────────────────────────────────────
 *
 * File: .env (hoặc .env.local)
 *
 * # Emulator Android (BE chạy local):
 * AUTH_API_BASE=http://10.0.2.2:3000
 *
 * # Simulator iOS (BE chạy local):
 * AUTH_API_BASE=http://127.0.0.1:3000
 *
 * # Thiết bị thật (BE chạy local, cùng mạng LAN):
 * AUTH_API_BASE=http://192.168.x.x:3000
 *
 * # Production:
 * AUTH_API_BASE=https://api.yourdomain.com
 */

/**
 * ─── LUỒNG DỮ LIỆU ────────────────────────────────────────────────────────────
 *
 * [App khởi động]
 *   └─ AuthProvider hydrate() → tokenManager.init()
 *      ├─ Có token cũ → set isAuthenticated=true, user.businessTypes từ storage
 *      └─ Không có   → isAuthenticated=false → hiển thị Login
 *
 * [Đăng nhập credentials]
 *   UILogin.handleLogin()
 *     └─ loginCredentials(username, password)
 *          └─ GET /api/auth/login/:username/:password
 *               └─ BE trả { success, access_token, shopSetupDone }
 *                    └─ decodeJwt(access_token) → businessTypes: "sale,accommodation"
 *                         └─ parseBusinessTypes() → ["sale", "accommodation"]
 *                              └─ tokenManager.setTokens({ user: { businessTypes } })
 *                                   └─ dispatch LOGIN_SUCCESS → isAuthenticated=true
 *                                        └─ onLoginSuccess() → RootNavigator re-render
 *                                             └─ BusinessTypeNavigator → chọn màn hình
 *
 * [Đăng nhập Google]
 *   UILogin.handleGoogleLogin()
 *     └─ GoogleSignin.signIn() → getTokens().idToken
 *          └─ loginWithGoogleToken(idToken, 'login')
 *               └─ POST /api/auth/google/token { idToken, mode: 'login' }
 *                    └─ BE verify idToken → tìm user → trả access_token có businessTypes
 *                         └─ (giống luồng credentials từ đây)
 *
 * [BusinessTypeNavigator]
 *   useBusinessType() đọc user.businessTypes:
 *     - []                          → ShopSetupScreen
 *     - ["sale"]                    → SaleScreen
 *     - ["accommodation"]           → AccommodationScreen
 *     - ["sale","accommodation"]    → BusinessSelectorScreen (chọn 1 trong 2)
 */

/**
 * ─── TOKEN JWT PAYLOAD ─────────────────────────────────────────────────────────
 *
 * BE ký token với payload:
 * {
 *   sub: "user_uuid",
 *   username: "owner1",
 *   role: "owner",
 *   shopId: "shop_uuid",
 *   businessTypes: "sale"           ← "sale" | "accommodation" | "sale,accommodation"
 * }
 *
 * App decode (không verify) để đọc businessTypes ngay sau khi nhận token.
 */

export {};
