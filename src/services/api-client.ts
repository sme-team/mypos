// src/services/api-client.ts
import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';
import {tokenManager} from './token-manager';
import {AUTH_API_BASE as ENV_AUTH_API_BASE} from '@env';

import {createModuleLogger, AppModules} from '../logger';
const logger = createModuleLogger(AppModules.API_CLIENT);

// ─── Config ─────────────────────────────────────────────────────────────────
// - Máy thật (cùng WiFi): dùng IP máy chủ BE (set trong .env)
// - Emulator Android:      http://10.0.2.2:3001
// - Simulator iOS:         http://127.0.0.1:3001
export const AUTH_API_BASE = ENV_AUTH_API_BASE ?? 'http://192.168.1.76:3001';
logger.trace('AUTH_API_BASE:', AUTH_API_BASE);

// ─── Route prefix theo từng controller ──────────────────────────────────────────
// BE dùng URI versioning (enableVersioning), nhưng KHÔNG phải tất cả controller đều có version:
//
//   auth.controller.ts      → @Controller('auth')                    → /api/auth/...
//   password.controller.ts  → @Controller({ path:'auth', version:'1' }) → /api/v1/auth/...
//   users.controller.ts     → @Controller({ version: '1' })           → /api/v1/users/...
//
// auth routes (login, register, google/token, shop/setup) KHÔNG có /v1
const API_NO_VERSION = '/api';
// password / users routes CÓ /v1
export const API_V1 = '/api/v1';

// ─── Factory ─────────────────────────────────────────────────────────────────

function createAuthApiClient(apiPrefix: string, tag: string): AxiosInstance {
  const instance = axios.create({
    baseURL: `${AUTH_API_BASE}${API_NO_VERSION}${apiPrefix}`,
    headers: {'Content-Type': 'application/json'},
    timeout: 15000,
  });

  // Request interceptor - tự động đính token vào header
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // --- DANH SÁCH CÁC API KHÔNG CẦN CHECK TOKEN ---
      const publicEndpoints = [
        '/login',
        '/register',
        '/pre-register',
        '/verify-email',
        '/url',
        '/callback',
        '/token',
        '/shop/setup',
      ];
      const isPublicEndpoint = publicEndpoints.some(endpoint =>
        config.url?.includes(endpoint),
      );

      if (isPublicEndpoint) {
        logger.debug(
          `[${tag}] ➡️ PUBLIC ${config.method?.toUpperCase()} ${config.url}`,
        );
        return config;
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

          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

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
        url: error.config?.url,
        baseURL: error.config?.baseURL,
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
      `${AUTH_API_BASE}${API_NO_VERSION}/auth/refresh`,
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
      `${AUTH_API_BASE}${API_NO_VERSION}/auth/google/refresh`,
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

export const authApiClient = createAuthApiClient('/auth', 'AUTH_SERVICE');

export const googleAuthApiClient = createAuthApiClient(
  '/auth/google',
  'GOOGLE_AUTH_SERVICE',
);
