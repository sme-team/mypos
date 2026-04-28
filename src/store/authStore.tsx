/**
 * src/store/authStore.tsx
 *
 * AuthContext – quản lý toàn bộ phiên đăng nhập của app.
 *
 * Token từ BE chứa:
 *   { sub, username, role, shopId, businessTypes: "sale" | "accommodation" | "sale,accommodation" }
 *
 * Thay đổi so với version cũ:
 *   - AuthUser thêm: fullName, avatarUrl (lấy từ API /users/me sau login)
 *   - Thêm action UPDATE_PROFILE để cập nhật user trong store sau khi edit profile
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from 'react';
import axios from 'axios';
import { tokenManager } from '../services/token-manager';
import { AUTH_API_BASE, API_V1 } from '../services/api-client';
import { createModuleLogger, AppModules } from '../logger';
import { findMockAccount } from '../mocks/mockAccounts';

const logger = createModuleLogger(AppModules.AUTH_STORE);

// auth.controller.ts không có version → /api/auth/...
const AUTH_BASE = AUTH_API_BASE;           // đã có /api từ Config
// users.controller.ts có version: '1' → /api/v1/users/...
const API_V1_BASE = `${AUTH_API_BASE}${API_V1}`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function decodeJwt(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function parseBusinessTypes(raw: string | undefined): string[] {
  if (!raw || raw.trim() === '') return [];
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

// ─── State ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  username: string;
  fullName?: string;    // ← THÊM: lấy từ /users/me
  avatarUrl?: string;   // ← THÊM: lấy từ /users/me
  role: string;
  shopId: string | null;
  businessTypes: string[];
  shopSetupDone: boolean;
}

export interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  authMethod: 'credentials' | 'google' | null;
  error: string | null;
}

const initialState: AuthState = {
  isLoading: true,
  isAuthenticated: false,
  user: null,
  authMethod: null,
  error: null,
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'HYDRATE_DONE'; payload: { user: AuthUser; authMethod: 'credentials' | 'google' } | null }
  | { type: 'LOGIN_SUCCESS'; payload: { user: AuthUser; authMethod: 'credentials' | 'google' } }
  | { type: 'UPDATE_PROFILE'; payload: Partial<Pick<AuthUser, 'fullName' | 'avatarUrl' | 'username'>> }
  | { type: 'LOGOUT' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' };

function reducer(state: AuthState, action: Action): AuthState {
  switch (action.type) {
    case 'HYDRATE_DONE':
      if (action.payload) {
        return {
          isLoading: false,
          isAuthenticated: true,
          user: action.payload.user,
          authMethod: action.payload.authMethod,
          error: null,
        };
      }
      return { ...initialState, isLoading: false };

    case 'LOGIN_SUCCESS':
      return {
        isLoading: false,
        isAuthenticated: true,
        user: action.payload.user,
        authMethod: action.payload.authMethod,
        error: null,
      };

    // Cập nhật profile trong store (fullName, avatarUrl) sau khi user chỉnh sửa
    case 'UPDATE_PROFILE':
      if (!state.user) return state;
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };

    case 'LOGOUT':
      return { ...initialState, isLoading: false };

    case 'SET_ERROR':
      return { ...state, isLoading: false, error: action.payload };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AuthContextValue {
  state: AuthState;
  loginCredentials: (username: string, password: string) => Promise<boolean>;
  loginWithGoogleToken: (idToken: string, mode: 'login' | 'register') => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  /** Cập nhật fullName / avatarUrl trong store (gọi sau khi save profile thành công) */
  updateProfileInStore: (data: Partial<Pick<AuthUser, 'fullName' | 'avatarUrl'>>) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // ── Build AuthUser từ JWT + profile data ────────────────────────────────
  const buildUserFromToken = useCallback(
    (token: string, shopSetupDone: boolean): AuthUser | null => {
      const claims = decodeJwt(token);
      if (!claims) return null;
      return {
        id: claims.sub,
        username: claims.username,
        role: claims.role,
        shopId: claims.shopId ?? null,
        businessTypes: parseBusinessTypes(claims.businessTypes),
        // Ưu tiên shopSetupDone từ JWT claims (BE đã nhúng), fallback về param
        shopSetupDone: claims.shopSetupDone ?? shopSetupDone,
        fullName: undefined,
        avatarUrl: undefined,
      };
    },
    [],
  );

  // ── Hydrate: khôi phục session khi app khởi động ─────────────────────────
  useEffect(() => {
    const hydrate = async () => {

      console.log('[AuthStore] Starting hydrate...');

      try {
        await tokenManager.init();
        console.log('[AuthStore] Token manager initialized');
        const user = tokenManager.getAuthInfo()?.user;
        const method = tokenManager.getAuthMethod();
        console.log('[AuthStore] User:', user, 'Method:', method);

        if (user && method) {
          dispatch({
            type: 'HYDRATE_DONE',
            payload: { user: user, authMethod: method },
          });
          logger.info('[AuthStore] ✅ Hydrate thành công', {
            userId: user.id,
            businessTypes: user.businessTypes,
          });
        } else {

          console.log('[AuthStore] No user found, setting to unauthenticated');
          dispatch({type: 'HYDRATE_DONE', payload: null});
        }
      } catch (err: any) {
        console.error('[AuthStore] Hydrate error:', err);
        logger.error('[AuthStore] Hydrate error:', err?.message);
        dispatch({ type: 'HYDRATE_DONE', payload: null });
      }
    };

    hydrate();
  }, []);

  // ── loginCredentials ─────────────────────────────────────────────────────
  const loginCredentials = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      dispatch({ type: 'CLEAR_ERROR' });

      // ── [MOCK] Kiểm tra tài khoản hardcoded trước khi gọi BE ─────────────
      // Nếu khớp → đăng nhập ngay, không cần mạng / server.
      const mockAccount = findMockAccount(username, password);
      if (mockAccount) {
        logger.info('[AuthStore] 🧪 Mock login:', mockAccount.username, '-', mockAccount.description);

        const user = buildUserFromToken(mockAccount.accessToken, true);
        if (!user) {
          dispatch({ type: 'SET_ERROR', payload: '[Mock] Token không hợp lệ' });
          return false;
        }

        await tokenManager.setTokens({
          accessToken: mockAccount.accessToken,
          refreshToken: mockAccount.accessToken,
          authMethod: 'credentials',
          user,
          expiresIn: 9999999, // hết hạn rất xa
        });

        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user, authMethod: 'credentials' },
        });

        logger.info('[AuthStore] ✅ Mock đăng nhập thành công', {
          userId: user.id,
          businessTypes: user.businessTypes,
        });

        return true;
      }
      // ── [/MOCK] ────────────────────────────────────────────────────────────

      try {
        logger.info('[AuthStore] 🔐 Đăng nhập credentials:', username);

        const response = await axios.get(
          `${AUTH_BASE}/auth/login/${encodeURIComponent(username)}/${encodeURIComponent(password)}`,
          { timeout: 15000 },
        );

        const data = response.data as {
          success: boolean;
          message: string;
          access_token?: string;
          shopSetupDone?: boolean;
        };

        if (!data.success || !data.access_token) {
          dispatch({ type: 'SET_ERROR', payload: data.message || 'Đăng nhập thất bại' });
          return false;
        }

        const user = buildUserFromToken(data.access_token, data.shopSetupDone ?? false);
        if (!user) {
          dispatch({ type: 'SET_ERROR', payload: 'Token không hợp lệ' });
          return false;
        }

        await tokenManager.setTokens({
          accessToken: data.access_token,
          refreshToken: data.access_token,
          authMethod: 'credentials',
          user,
          expiresIn: 3600,
        });

        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user, authMethod: 'credentials' },
        });

        logger.info('[AuthStore] ✅ Đăng nhập thành công', {
          userId: user.id,
          businessTypes: user.businessTypes,
          shopSetupDone: user.shopSetupDone,
        });

        // Load thêm fullName, avatarUrl từ /users/me (không block login)
        loadExtraProfile(data.access_token, dispatch);

        return true;
      } catch (error: any) {
        const msg =
          error.response?.data?.message || error.message || 'Lỗi kết nối server';
        logger.error('[AuthStore] ❌ Đăng nhập thất bại:', msg);
        dispatch({ type: 'SET_ERROR', payload: msg });
        return false;
      }
    },
    [buildUserFromToken],
  );

  // ── loginWithGoogleToken ─────────────────────────────────────────────────
  const loginWithGoogleToken = useCallback(
    async (idToken: string, mode: 'login' | 'register'): Promise<boolean> => {
      dispatch({ type: 'CLEAR_ERROR' });
      try {
        logger.info('[AuthStore] 🔐 Đăng nhập Google token, mode:', mode);

        const response = await axios.post(
          `${AUTH_BASE}/auth/google/token`,
          { idToken, mode },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000,
          },
        );

        const data = response.data as {
          success: boolean;
          message: string;
          access_token?: string;
          shopSetupDone?: boolean;
        };

        if (!data.success || !data.access_token) {
          dispatch({ type: 'SET_ERROR', payload: data.message || 'Google đăng nhập thất bại' });
          return false;
        }

        const user = buildUserFromToken(data.access_token, data.shopSetupDone ?? false);
        if (!user) {
          dispatch({ type: 'SET_ERROR', payload: 'Token không hợp lệ' });
          return false;
        }

        await tokenManager.setTokens({
          accessToken: data.access_token,
          refreshToken: data.access_token,
          authMethod: 'google',
          user,
          expiresIn: 3600,
        });

        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user, authMethod: 'google' },
        });

        logger.info('[AuthStore] ✅ Google đăng nhập thành công', {
          userId: user.id,
          businessTypes: user.businessTypes,
        });

        loadExtraProfile(data.access_token, dispatch);

        return true;
      } catch (error: any) {
        const msg =
          error.response?.data?.message || error.message || 'Lỗi Google đăng nhập';
        logger.error('[AuthStore] ❌ Google đăng nhập thất bại:', msg);
        dispatch({ type: 'SET_ERROR', payload: msg });
        return false;
      }
    },
    [buildUserFromToken],
  );

  // ── logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async (): Promise<void> => {
    logger.info('[AuthStore] 🚪 Đăng xuất');
    await tokenManager.clearAll();
    dispatch({ type: 'LOGOUT' });
  }, []);

  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);

  // Cập nhật profile info trong store (fullName, avatarUrl)
  const updateProfileInStore = useCallback(
    (data: Partial<Pick<AuthUser, 'fullName' | 'avatarUrl'>>) => {
      dispatch({ type: 'UPDATE_PROFILE', payload: data });
      // Cập nhật cả trong tokenManager để persist
      const currentUser = tokenManager.getUser();
      if (currentUser) {
        void tokenManager.setTokens({
          accessToken: tokenManager.getAccessToken() ?? '',
          refreshToken: tokenManager.getRefreshToken() ?? '',
          authMethod: tokenManager.getAuthMethod() ?? 'credentials',
          user: { ...currentUser, ...data },
          expiresIn: 3600,
        });
      }
    },
    [],
  );

  return (
    <AuthContext.Provider
      value={{
        state,
        loginCredentials,
        loginWithGoogleToken,
        logout,
        clearError,
        updateProfileInStore,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Load extra profile (không block login) ───────────────────────────────────

async function loadExtraProfile(
  token: string,
  dispatch: React.Dispatch<Action>,
): Promise<void> {
  try {
    const res = await axios.get(`${API_V1_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000,
    });
    // BE trả { user: { _id, username, fullName, avatarUrl, ... } }
    const user = res.data?.user ?? res.data;
    if (user) {
      dispatch({
        type: 'UPDATE_PROFILE',
        payload: {
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
        },
      });
    }
  } catch {
    // Không critical – user vẫn đăng nhập được
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
};
