// src/services/api-client.ts
import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';
import {tokenManager} from './token-manager';
// Thay vì dùng process.env (đôi khi không ổn định trong RN), hãy dùng import
import {AUTH_API_BASE as ENV_AUTH_API_BASE} from '@env';

import {createModuleLogger, AppModules} from '../logger';
const logger = createModuleLogger(AppModules.API_CLIENT);

// ─── Config ─────────────────────────────────────────────────────────────────
// Thay đổi BASE_URL cho phù hợp với môi trường của bạn:
// - Máy thật: dùng IP máy chủ BE (vd: http://192.168.1.100:3000)
// - Emulator Android: http://10.0.2.2:3000
// - Simulator iOS: http://127.0.0.1:3000
export const AUTH_API_BASE = ENV_AUTH_API_BASE ?? 'http://10.0.2.2:3000';
logger.trace('AUTH_API_BASE:', AUTH_API_BASE);

// ─── Factory ─────────────────────────────────────────────────────────────────

function createAuthApiClient(apiPrefix: string, tag: string): AxiosInstance {
  const instance = axios.create({
    baseURL: `${AUTH_API_BASE}${apiPrefix}`,
    headers: {'Content-Type': 'application/json'},
    timeout: 10000,
  });

  // Request interceptor - tự động đính token vào header
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // --- DANH SÁCH CÁC API KHÔNG CẦN CHECK TOKEN ---
      const publicEndpoints = ['/login', '/register', '/url', '/callback'];
      const isPublicEndpoint = publicEndpoints.some(endpoint =>
        config.url?.endsWith(endpoint),
      );

      if (isPublicEndpoint) {
        return config; // Trả về ngay, không chạy logic check token phía dưới
      }

      // Logic check token chỉ dành cho các API bảo mật (Private)
      const token = tokenManager.getAccessToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      logger.debug(
        `[${tag}] ➡️ ${config.method?.toUpperCase()} ${config.url}`,
        {
          hasAuth: !!token,
        },
      );
      // trường hợp hết token thì gọi refresh nhé
      return config;
    },
    error => {
      logger.error(`[${tag}] ❌ Request error:`, error);
      return Promise.reject(error);
    },
  );

  // Response interceptor - auto refresh token khi 401
  instance.interceptors.response.use(
    response => {
      logger.debug(`[${tag}] 📥 ${response.status} ${response.config.url}`);
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          logger.info(`[${tag}] 🔄 Access token expired, attempting refresh…`);

          const authMethod = tokenManager.getAuthMethod();
          const refreshToken = tokenManager.getRefreshToken();

          if (!refreshToken) throw new Error('No refresh token available');

          let refreshSuccess = false;

          if (authMethod === 'credentials') {
            refreshSuccess = await refreshCredentialsToken(refreshToken);
          } else if (authMethod === 'google') {
            refreshSuccess = await refreshGoogleToken(refreshToken);
          }

          if (refreshSuccess) {
            const newToken = tokenManager.getAccessToken();
            if (newToken && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return instance(originalRequest);
          }
        } catch (refreshError) {
          logger.error(`[${tag}] ❌ Token refresh failed:`, refreshError);
          await tokenManager.clearAll();
          return Promise.reject(refreshError);
        }
      }

      logger.error(`[${tag}] ❌ Response error:`, {
        status: error.response?.status,
        message: error.message,
      });

      return Promise.reject(error);
    },
  );

  return instance;
}

// ─── Refresh helpers ─────────────────────────────────────────────────────────

export async function refreshCredentialsToken(
  refreshToken: string,
): Promise<boolean> {
  try {
    logger.info('[ApiClient] 🔄 Refreshing access token (credentials)');

    const response = await axios.post(
      `${AUTH_API_BASE}/api/auth/refresh`,
      {refreshToken},
      {headers: {'Content-Type': 'application/json'}, timeout: 10000},
    );

    const result = response.data;

    if (result.accessToken) {
      await tokenManager.updateTokens({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      });
      logger.info('[ApiClient] ✅ Credentials token refreshed');
      return true;
    }

    return false;
  } catch (error) {
    logger.error('[ApiClient] ❌ Credentials token refresh error:', error);
    throw error;
  }
}

export async function refreshGoogleToken(
  refreshToken: string,
): Promise<boolean> {
  try {
    logger.info('[ApiClient] 🔄 Refreshing Google access token');

    const response = await axios.post(
      `${AUTH_API_BASE}/api/auth/google/refresh`,
      {refreshToken},
      {headers: {'Content-Type': 'application/json'}, timeout: 10000},
    );

    const result = response.data;

    if (result.success && result.data?.accessToken) {
      await tokenManager.updateTokens({
        accessToken: result.data.accessToken,
        refreshToken: result.data.refreshToken,
        expiresIn: result.data.expiresIn,
      });
      logger.info('[ApiClient] ✅ Google token refreshed');
      return true;
    }

    return false;
  } catch (error) {
    logger.error('[ApiClient] ❌ Google token refresh error:', error);
    throw error;
  }
}

// ─── Instances ───────────────────────────────────────────────────────────────

export const authApiClient = createAuthApiClient('/api/auth', 'AUTH_SERVICE');
export const googleAuthApiClient = createAuthApiClient(
  '/api/auth/google',
  'GOOGLE_AUTH_SERVICE',
);
