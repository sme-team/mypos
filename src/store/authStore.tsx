/**
 * src/store/authStore.tsx
 *
 * AuthContext – quản lý toàn bộ phiên đăng nhập của app.
 *
 * Hỗ trợ 2 phương thức:
 *   • Credentials  →  authService   (email/password)
 *   • Google OAuth →  googleAuthService (code từ deep-link / paste)
 *
 * API surface (useAuth):
 *   state          – AuthState (isLoading, isAuthenticated, user, authMethod, error)
 *   loginCredentials(email, password)   → Promise<boolean>
 *   loginWithCode(code)                 → Promise<boolean>   ← Google OAuth
 *   logout()                            → Promise<void>
 * ///////////////////
 * Đây là file quan trọng nhất để kết nối giữa logic và giao diện người dùng (UI).
 *  Nó sử dụng React Context API và useReducer.
Nhiệm vụ: Quản lý trạng thái "Đang đăng nhập hay chưa" cho toàn bộ ứng dụng.
Cơ chế Hydrate (Hồi phục): Khi app vừa mở lên (trong useEffect),
nó gọi tokenManager.init(). Nếu tìm thấy token cũ trong máy, nó tự động set isAuthenticated: true.
Đây là lý do tại sao bạn không phải đăng nhập lại mỗi khi mở app.
Giao tiếp UI: Nó cung cấp hook useAuth(). Bất kỳ màn hình nào (Login, Profile, Home) cũng có thể gọi:
state.isAuthenticated: Để biết nên hiện màn hình Login hay Main.
loginCredentials(): Để thực hiện đăng nhập.
logout(): Để xóa sạch trạng thái.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from 'react';

import { tokenManager } from '../services/token-manager';
import { authService } from '../services/auth.service';

import { createModuleLogger, AppModules } from '../logger';
const logger = createModuleLogger(AppModules.AUTH_STORE);

// ─── State ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  role: string;
}

export interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  authMethod: 'credentials' | 'google' | null;
  error: string | null;
}

const initialState: AuthState = {
  isLoading: true,   // true trong khi hydrate từ storage
  isAuthenticated: false,
  user: null,
  authMethod: null,
  error: null,
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'HYDRATE_START' }
  | { type: 'HYDRATE_DONE'; payload: { user: User; authMethod: 'credentials' | 'google' } | null }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; authMethod: 'credentials' | 'google' } }
  | { type: 'LOGOUT' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' };

function reducer(state: AuthState, action: Action): AuthState {
  switch (action.type) {
    case 'HYDRATE_START':
      return { ...state, isLoading: true, error: null };

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
  /** Đăng nhập bằng email / username + password */
  loginCredentials: (emailOrUsername: string, password: string) => Promise<boolean>;
  /** Đăng nhập Google – nhận authorization code từ deep-link hoặc paste thủ công */
  loginWithCode: (code: string) => Promise<boolean>;
  /** Xử lý login qua token deep-link */
  handleDeepLinkToken: (token: string) => Promise<boolean>;
  /** Đăng xuất (tự nhận diện method) */
  logout: () => Promise<void>;
  /** Xoá error banner */
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // ── Hydrate: chạy một lần khi app khởi động ──────────────────────────────
  useEffect(() => {
    const hydrate = async () => {
      dispatch({ type: 'HYDRATE_START' });

      try {
        await tokenManager.init();
        const user = tokenManager.getAuthInfo()?.user;
        const method = tokenManager.getAuthMethod();

        if (user && method) {
          dispatch({
            type: 'HYDRATE_DONE',
            payload: { user, authMethod: method },
          });
        } else {
          dispatch({ type: 'HYDRATE_DONE', payload: null });
        }
      } catch (err: any) {
        logger.error('[AuthStore] Hydrate error:', err?.message);
        dispatch({ type: 'HYDRATE_DONE', payload: null });
      }
    };

    hydrate();
  }, []);

  // ── loginCredentials ──────────────────────────────────────────────────────
  const loginCredentials = useCallback(
    async (emailOrUsername: string, _password: string): Promise<boolean> => {
      dispatch({ type: 'CLEAR_ERROR' });
      // MOCK LOGIN: Bypassing backend service
      const mockUser: User = {
        id: 'mock-uuid-1234',
        username: emailOrUsername || 'admin',
        email: emailOrUsername.includes('@') ? emailOrUsername : 'admin@example.com',
        full_name: 'Admin User',
        role: 'super_admin',
      };

      await tokenManager.setTokens({
        accessToken: 'mock-token',
        refreshToken: 'mock-refresh',
        authMethod: 'credentials',
        user: mockUser,
      });

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: mockUser, authMethod: 'credentials' },
      });
      return true;
    },
    [],
  );

  // ── handleDeepLinkToken ───────────────────────────────────────────────────
  const handleDeepLinkToken = useCallback(async (token: string): Promise<boolean> => {
    dispatch({ type: 'CLEAR_ERROR' });
    try {
      await tokenManager.updateTokens({
        accessToken: token,
      });

      const { user } = await authService.getMe();

      await tokenManager.setTokens({
        accessToken: token,
        refreshToken: '',
        authMethod: 'google',
        user: user,
      });

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, authMethod: 'google' },
      });
      return true;
    } catch (err: any) {
      logger.error('[AuthStore] Deep link token error:', err?.message);
      dispatch({ type: 'SET_ERROR', payload: err.message });
      await tokenManager.clearAll();
      return false;
    }
  }, []);

  // ── loginWithCode (Google OAuth) ──────────────────────────────────────────
  const loginWithCode = useCallback(async (_code: string): Promise<boolean> => {
    dispatch({ type: 'CLEAR_ERROR' });
    // MOCK GOOGLE LOGIN
    const mockUser: User = {
      id: 'mock-google-789',
      username: 'google_user',
      email: 'google@example.com',
      full_name: 'Google User',
      role: 'staff',
    };

    await tokenManager.setTokens({
      accessToken: 'mock-google-token',
      refreshToken: 'mock-google-refresh',
      authMethod: 'google',
      user: mockUser,
    });

    dispatch({
      type: 'LOGIN_SUCCESS',
      payload: { user: mockUser, authMethod: 'google' },
    });
    return true;
  }, []);

  // ── logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async (): Promise<void> => {
    await tokenManager.clearAll();
    dispatch({ type: 'LOGOUT' });
  }, []);

  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);

  return (
    <AuthContext.Provider value={{ state, loginCredentials, loginWithCode, handleDeepLinkToken, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
};
