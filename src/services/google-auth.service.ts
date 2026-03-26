// src/services/google-auth.service.ts
/**
 * Google Auth Service - React Native
 *
 * Luồng OAuth trên mobile khác Electron:
 *   1. Lấy authUrl từ BE  →  2. Mở trình duyệt / WebView
 *   3. BE redirect về deep-link (vd: myapp://auth/callback?code=xxx)
 *   4. App bắt deep-link, lấy code  →  5. Gọi handleCallback()
 *
 * Cài thêm: expo-linking hoặc react-native-linking để xử lý deep-link.
 * Nếu dùng Expo: expo install expo-web-browser expo-linking
 */
import { Linking } from 'react-native';
import { AxiosError } from 'axios';
import { tokenManager } from './token-manager';
import { googleAuthApiClient, refreshGoogleToken } from './api-client';

import {createModuleLogger, AppModules} from '../logger';
const logger = createModuleLogger(AppModules.GOOGLE_AUTH_SERVICE);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  role: string;
}

export interface GoogleAuthUrlResponse {
  success: boolean;
  data: { authUrl: string };
  message?: string;
}

export interface GoogleAuthResponse {
  success: boolean;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
    expiresIn?: number;
  };
  message?: string;
}

export interface GoogleRefreshTokenResponse {
  success: boolean;
  data: { accessToken: string; refreshToken?: string; expiresIn?: number };
  message?: string;
}

export interface GoogleUserProfileResponse {
  success: boolean;
  data: User | null;
  message?: string;
}

export interface GoogleLogoutResponse {
  success: boolean;
  message: string;
}

export interface LinkAccountResponse {
  success: boolean;
  message: string;
}

export interface UnlinkAccountResponse {
  success: boolean;
  message: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const googleAuthService = {
  /**
   * Lấy Google OAuth URL (không callback - GET)
   */
  async getAuthUrl(): Promise<GoogleAuthUrlResponse> {
    try {
      logger.info('[GoogleAuth] 📡 Getting Google Auth URL');
      const response = await googleAuthApiClient.get<GoogleAuthUrlResponse>('/url');
      if (response.data.success && response.data.data?.authUrl) {
        logger.info('[GoogleAuth] ✅ Google Auth URL received');
      }
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const errorMessage =
        axiosError.response?.data?.message || axiosError.message || 'Failed to get Google auth URL';
      logger.error('[GoogleAuth] ❌ Error getting auth URL:', errorMessage);
      throw new Error(errorMessage);
    }
  },

  /**
   * Lấy Google OAuth URL với callback URL (POST)
   */
  async getAuthUrlWithCallback(callbackUrl?: string): Promise<GoogleAuthUrlResponse> {
    try {
      logger.info('[GoogleAuth] 📡 Getting Google Auth URL with callback', { callbackUrl });
      const response = await googleAuthApiClient.post<GoogleAuthUrlResponse>('/url', {
        callbackUrl,
      });
      if (response.data.success && response.data.data?.authUrl) {
        logger.info('[GoogleAuth] ✅ Google Auth URL with callback received');
      }
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const errorMessage =
        axiosError.response?.data?.message || axiosError.message || 'Failed to get Google auth URL';
      logger.error('[GoogleAuth] ❌ Error getting auth URL with callback:', errorMessage);
      throw new Error(errorMessage);
    }
  },

  /**
   * Mở trình duyệt hệ thống để đăng nhập Google.
   *
   * Ví dụ sử dụng (dùng deep-link myapp://auth/callback):
   *   const { authUrl } = (await googleAuthService.getAuthUrl()).data;
   *   await googleAuthService.openAuthBrowser(authUrl);
   *   // Sau đó bắt deep-link trong App.tsx để lấy `code` và gọi handleCallback()
   */
  async openAuthBrowser(authUrl: string): Promise<void> {
    const supported = await Linking.canOpenURL(authUrl);
    if (!supported) {
      throw new Error(`Cannot open URL: ${authUrl}`);
    }
    await Linking.openURL(authUrl);
  },

  /**
   * Xử lý OAuth callback - đổi code lấy tokens
   * Gọi hàm này sau khi bắt được code từ deep-link
   */
  async handleCallback(code: string, storeId?: string): Promise<GoogleAuthResponse> {
    try {
      logger.info('[GoogleAuth] 🔄 Exchanging Google OAuth code for tokens');

      const response = await googleAuthApiClient.post<GoogleAuthResponse>('/callback', {
        code,
        storeId,
      });

      const result = response.data;

      if (result.success && result.data) {
        await tokenManager.setTokens({
          accessToken: result.data.accessToken,
          refreshToken: result.data.refreshToken,
          authMethod: 'google',
          user: result.data.user,
          expiresIn: result.data.expiresIn,
        });

        logger.info('[GoogleAuth] ✅ Google authentication successful', {
          userId: result.data.user.id,
          email: result.data.user.email,
        });
      }

      return result;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const errorMessage =
        axiosError.response?.data?.message || axiosError.message || 'Google authentication failed';
      logger.error('[GoogleAuth] ❌ Google callback error:', errorMessage);
      throw new Error(errorMessage);
    }
  },

  /**
   * Refresh Google access token bằng refresh token đang lưu
   */
  async refreshAccessToken(): Promise<boolean> {
    try {
      const refreshToken = tokenManager.getRefreshToken();

      if (!refreshToken) {
        logger.error('[GoogleAuth] ❌ No refresh token available');
        return false;
      }

      logger.info('[GoogleAuth] 🔄 Refreshing Google access token');
      return await refreshGoogleToken(refreshToken);
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const errorMessage =
        axiosError.response?.data?.message || axiosError.message || 'Google token refresh failed';
      logger.error('[GoogleAuth] ❌ Google token refresh error:', errorMessage);
      throw new Error(errorMessage);
    }
  },

  /**
   * Tự động đăng nhập Google khi app khởi động
   */
  async autoLogin(): Promise<{ success: boolean; user?: User }> {
    try {
      const refreshToken = tokenManager.getRefreshToken();
      const authMethod = tokenManager.getAuthMethod();

      if (!refreshToken || authMethod !== 'google') {
        logger.info('[GoogleAuth] ℹ️ No stored Google refresh token');
        return { success: false };
      }

      logger.info('[GoogleAuth] 🔄 Attempting auto-login with stored Google token');

      const refreshSuccess = await this.refreshAccessToken();

      if (refreshSuccess) {
        const userProfile = await this.getUserProfile();
        if (userProfile.success && userProfile.data) {
          logger.info('[GoogleAuth] ✅ Google auto-login successful');
          return { success: true, user: userProfile.data };
        }
      }

      return { success: false };
    } catch (error: any) {
      logger.error('[GoogleAuth] ❌ Google auto-login failed:', error.message);
      await tokenManager.clearAll();
      return { success: false };
    }
  },

  /**
   * Lấy thông tin user Google hiện tại
   */
  async getUserProfile(): Promise<GoogleUserProfileResponse> {
    try {
      logger.info('[GoogleAuth] 👤 Getting Google user profile');

      const response = await googleAuthApiClient.get<GoogleUserProfileResponse>('/me', {
        validateStatus: (status) => (status >= 200 && status < 300) || status === 401,
      });

      if (response.status === 401) {
        logger.info('[GoogleAuth] ⚠️ Unauthorized - Google user not authenticated');
        return { success: false, data: null, message: 'Unauthorized' };
      }

      logger.info('[GoogleAuth] ✅ Google user profile retrieved successfully');
      return response.data;
    } catch (error) {
      logger.error('[GoogleAuth] ❌ Network error getting Google user profile');
      return { success: false, data: null, message: 'Network error' };
    }
  },

  /**
   * Liên kết Google account vào tài khoản hiện tại
   */
  async linkAccount(code: string): Promise<LinkAccountResponse> {
    try {
      logger.info('[GoogleAuth] 🔗 Linking Google account to current user');
      const response = await googleAuthApiClient.post<LinkAccountResponse>('/link', { code });
      const result = response.data;
      if (result.success) logger.info('[GoogleAuth] ✅ Google account linked successfully');
      return result;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const errorMessage =
        axiosError.response?.data?.message || axiosError.message || 'Failed to link Google account';
      logger.error('[GoogleAuth] ❌ Link Google account error:', errorMessage);
      throw new Error(errorMessage);
    }
  },

  /**
   * Hủy liên kết Google account
   */
  async unlinkAccount(): Promise<UnlinkAccountResponse> {
    try {
      logger.info('[GoogleAuth] 🔓 Unlinking Google account');
      const response = await googleAuthApiClient.delete<UnlinkAccountResponse>('/unlink');
      const result = response.data;
      if (result.success) logger.info('[GoogleAuth] ✅ Google account unlinked successfully');
      return result;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const errorMessage =
        axiosError.response?.data?.message ||
        axiosError.message ||
        'Failed to unlink Google account';
      logger.error('[GoogleAuth] ❌ Unlink Google account error:', errorMessage);
      throw new Error(errorMessage);
    }
  },

  /**
   * Đăng xuất Google
   */
  async logout(): Promise<GoogleLogoutResponse> {
    try {
      const refreshToken = tokenManager.getRefreshToken();

      if (!refreshToken) {
        logger.warn('[GoogleAuth] ⚠️ No refresh token to logout');
        await tokenManager.clearAll();
        return { success: true, message: 'Logged out locally' };
      }

      logger.info('[GoogleAuth] 🚪 Logging out from Google authentication');

      const response = await googleAuthApiClient.post<GoogleLogoutResponse>('/logout', {
        refreshToken,
      });

      const result = response.data;
      if (result.success) logger.info('[GoogleAuth] ✅ Google logout successful');

      await tokenManager.clearAll();
      return result;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const errorMessage =
        axiosError.response?.data?.message || axiosError.message || 'Google logout failed';
      logger.error('[GoogleAuth] ❌ Google logout error:', errorMessage);
      await tokenManager.clearAll(); // vẫn clear dù có lỗi
      throw new Error(errorMessage);
    }
  },

  /**
   * Kiểm tra trạng thái đăng nhập Google
   */
  isAuthenticated(): boolean {
    return tokenManager.getAuthMethod() === 'google' && tokenManager.hasRefreshToken();
  },

  /**
   * Lấy thông tin auth hiện tại
   */
  getAuthInfo() {
    return tokenManager.getAuthInfo();
  },
};