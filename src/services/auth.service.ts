// src/services/auth.service.ts
import axios, { AxiosError } from 'axios';
import { tokenManager } from './token-manager';
import { authApiClient, refreshCredentialsToken, AUTH_API_BASE, API_V1 } from './api-client';

import {createModuleLogger, AppModules} from '../logger';
const logger = createModuleLogger(AppModules.AUTH_SERVICE);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LoginCredentials {
  username?: string;
  email?: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  full_name?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  role: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

export interface RegisterResponse {
  message: string;
  user: User;
}

export interface LogoutResponse {
  message: string;
}

export interface UserProfileResponse {
  user: User;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const authService = {
  /**
   * Đăng ký tài khoản mới
   */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    try {
      logger.info('[AuthService] 📝 Registering new user', {
        username: data.username,
        email: data.email,
      });

      const response = await authApiClient.post<RegisterResponse>('/register', data);
      const result = response.data;

      logger.info('[AuthService] ✅ Registration successful', {
        userId: result.user.id,
        username: result.user.username,
      });

      return result;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const errorMessage =
        axiosError.response?.data?.message || axiosError.message || 'Registration failed';
      logger.error('[AuthService] ❌ Registration error:', errorMessage);
      throw new Error(errorMessage);
    }
  },

  /**
   * Đăng nhập bằng username/email + password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      logger.info('[AuthService] 🔐 Attempting login with credentials');

      // BE endpoint: GET /api/auth/login/:username/:password
      const identifier = encodeURIComponent(credentials.username ?? credentials.email ?? '');
      const pwd = encodeURIComponent(credentials.password);
      const response = await authApiClient.get<AuthResponse>(`/login/${identifier}/${pwd}`);
      const result = response.data;

      if (!result.user || !result.accessToken || !result.refreshToken) {
        throw new Error('Invalid login response');
      }

      await tokenManager.setTokens({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        authMethod: 'credentials',
        user: result.user,
        expiresIn: result.expiresIn,
      });

      logger.info('[AuthService] ✅ Login successful', {
        userId: result.user.id,
        email: result.user.email,
      });

      return result;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const errorMessage =
        axiosError.response?.data?.message || axiosError.message || 'Login failed';
      logger.error('[AuthService] ❌ Login error:', errorMessage);
      throw new Error(errorMessage);
    }
  },

  /**
   * Refresh access token bằng refresh token đang lưu
   */
  async refreshAccessToken(): Promise<boolean> {
    try {
      const refreshToken = tokenManager.getRefreshToken();

      if (!refreshToken) {
        logger.error('[AuthService] ❌ No refresh token available');
        return false;
      }

      return await refreshCredentialsToken(refreshToken);
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const errorMessage =
        axiosError.response?.data?.message || axiosError.message || 'Token refresh failed';
      logger.error('[AuthService] ❌ Token refresh error:', errorMessage);
      throw new Error(errorMessage);
    }
  },

  /**
   * Tự động đăng nhập khi app khởi động bằng refresh token đã lưu
   */
  async autoLogin(): Promise<{ success: boolean; user?: User }> {
    try {
      const refreshToken = tokenManager.getRefreshToken();
      const authMethod = tokenManager.getAuthMethod();

      if (!refreshToken || authMethod !== 'credentials') {
        logger.info('[AuthService] ℹ️ No stored credentials refresh token');
        return { success: false };
      }

      logger.info('[AuthService] 🔄 Attempting auto-login with stored refresh token');

      const refreshSuccess = await this.refreshAccessToken();

      if (refreshSuccess) {
        const userProfile = await this.getCurrentUser();
        logger.info('[AuthService] ✅ Auto-login successful');
        return { success: true, user: userProfile.user };
      }

      return { success: false };
    } catch (error: any) {
      logger.error('[AuthService] ❌ Auto-login failed:', error.message);
      await tokenManager.clearAll();
      return { success: false };
    }
  },

  /**
   * Đăng xuất
   */
  async logout(): Promise<LogoutResponse> {
    try {
      const refreshToken = tokenManager.getRefreshToken();
      logger.info('[AuthService] 🚪 Logging out (credentials)');

      const response = await authApiClient.post<LogoutResponse>(
        '/logout',
        { refreshToken },
        {
          headers: {
            Authorization: `Bearer ${tokenManager.getAccessToken()}`,
          },
        }
      );

      logger.info('[AuthService] ✅ Logout successful');
      await tokenManager.clearAll();
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const errorMessage =
        axiosError.response?.data?.message || axiosError.message || 'Logout failed';
      logger.error('[AuthService] ❌ Logout error:', errorMessage);
      await tokenManager.clearAll(); // vẫn clear dù có lỗi
      throw new Error(errorMessage);
    }
  },

  /**
   * Lấy thông tin user hiện tại (alias)
   */
  async getMe(): Promise<UserProfileResponse> {
    return this.getCurrentUser();
  },

  /**
   * Lấy thông tin user hiện tại
   */
  async getCurrentUser(): Promise<UserProfileResponse> {
    try {
      logger.info('[AuthService] 👤 Getting current user profile');

      // BE endpoint: GET /api/v1/users/me (users.controller có version: '1')
      const token = tokenManager.getAccessToken();
      const response = await axios.get<UserProfileResponse>(
        `${AUTH_API_BASE}${API_V1}/users/me`,
        { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 },
      );
      const result = response.data;

      logger.info('[AuthService] ✅ User profile retrieved', {
        userId: result.user.id,
        username: result.user.username,
      });

      return result;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const errorMessage =
        axiosError.response?.data?.message || axiosError.message || 'Failed to get user profile';
      logger.error('[AuthService] ❌ Get user profile error:', errorMessage);
      throw new Error(errorMessage);
    }
  },

  /**
   * Kiểm tra trạng thái đăng nhập
   */
  isAuthenticated(): boolean {
    return tokenManager.hasRefreshToken();
  },

  /**
   * Lấy thông tin auth hiện tại
   */
  getAuthInfo() {
    return tokenManager.getAuthInfo();
  },
};
