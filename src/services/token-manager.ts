// src/services/token-manager.ts
import { tokenStore } from './store-wrapper';
import {createModuleLogger, AppModules} from '../logger';
const logger = createModuleLogger(AppModules.TOKEN_MANAGER);

type AuthMethod = 'credentials' | 'google';

/**
 * Token Manager - Quản lý tokens trong memory và AsyncStorage (React Native)
 * Vì AsyncStorage là async, TokenManager cũng cần được init() trước khi dùng.
 */
class TokenManager {
  // In-memory cache
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private authMethod: AuthMethod | null = null;
  private user: any | null = null;
  private expiresAt: number | null = null;

  private initialized = false;

  /**
   * Khởi tạo TokenManager - phải gọi một lần khi app khởi động
   * Ví dụ: trong App.tsx -> useEffect(() => { tokenManager.init() }, [])
   */
  async init(): Promise<void> {
    if (this.initialized) {return;}
    await tokenStore.init();
    this.loadFromStorage();
    this.initialized = true;

    if (this.refreshToken) {
      logger.info('[TokenManager] ✅ Loaded tokens from storage', {
        hasAccessToken: !!this.accessToken,
        hasRefreshToken: !!this.refreshToken,
        authMethod: this.authMethod,
        userId: this.user?.id,
      });
    } else {
      logger.info('[TokenManager] ℹ️ No stored tokens found');
    }
  }

  private loadFromStorage(): void {
    try {
      this.accessToken = tokenStore.getAccessToken() ?? null;
      this.refreshToken = tokenStore.getRefreshToken() ?? null;
      this.authMethod = tokenStore.getAuthMethod() ?? null;
      this.user = tokenStore.getUser() ?? null;
      this.expiresAt = tokenStore.getExpiresAt() ?? null;
    } catch (error) {
      logger.error('[TokenManager] ❌ Error loading tokens from storage:', error);
      this.clearMemory();
    }
  }

  async setTokens(data: {
    accessToken: string;
    refreshToken: string;
    authMethod: AuthMethod;
    user: any;
    expiresIn?: number;
  }): Promise<void> {
    try {
      this.accessToken = data.accessToken;
      this.refreshToken = data.refreshToken;
      this.authMethod = data.authMethod;
      this.user = data.user;

      const expiresIn = data.expiresIn || 3600;
      this.expiresAt = Date.now() + expiresIn * 1000;

      await Promise.all([
        tokenStore.setAccessToken(this.accessToken),
        tokenStore.setRefreshToken(this.refreshToken),
        tokenStore.setAuthMethod(this.authMethod),
        tokenStore.setUser(this.user),
        tokenStore.setExpiresAt(this.expiresAt),
      ]);

      logger.info('[TokenManager] ✅ Tokens saved successfully', {
        authMethod: this.authMethod,
        userId: this.user?.id,
        expiresIn: `${expiresIn}s`,
      });
    } catch (error) {
      logger.error('[TokenManager] ❌ Error saving tokens:', error);
      throw error;
    }
  }

  async updateTokens(data: {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
  }): Promise<void> {
    try {
      this.accessToken = data.accessToken;

      const expires = data.expiresIn || 3600;
      this.expiresAt = Date.now() + expires * 1000;

      const ops: Promise<void>[] = [
        tokenStore.setAccessToken(this.accessToken),
        tokenStore.setExpiresAt(this.expiresAt),
      ];

      if (data.refreshToken) {
        this.refreshToken = data.refreshToken;
        ops.push(tokenStore.setRefreshToken(this.refreshToken));
      }

      await Promise.all(ops);

      logger.info('[TokenManager] ✅ Tokens updated', {
        hasNewRefreshToken: !!data.refreshToken,
        expiresIn: `${expires}s`,
      });
    } catch (error) {
      logger.error('[TokenManager] ❌ Error updating tokens:', error);
      throw error;
    }
  }

  // ─── Getters (synchronous từ memory cache) ──────────────────────────────────

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  getAuthMethod(): AuthMethod | null {
    return this.authMethod;
  }

  getUser(): any | null {
    return this.user;
  }

  hasTokens(): boolean {
    return !!this.accessToken && !!this.refreshToken;
  }

  hasRefreshToken(): boolean {
    return !!this.refreshToken;
  }

  isAccessTokenExpired(): boolean {
    if (!this.expiresAt) {return true;}
    return Date.now() >= this.expiresAt - 5 * 60 * 1000; // 5 phút buffer
  }

  getTimeToExpire(): number {
    if (!this.expiresAt) {return 0;}
    return Math.floor(Math.max(0, this.expiresAt - Date.now()) / 1000);
  }

  getAuthInfo(): {
    accessToken: string | null;
    refreshToken: string | null;
    authMethod: AuthMethod | null;
    user: any | null;
    expiresAt: number | null;
    isExpired: boolean;
  } {
    return {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      authMethod: this.authMethod,
      user: this.user,
      expiresAt: this.expiresAt,
      isExpired: this.isAccessTokenExpired(),
    };
  }

  // ─── Clear ───────────────────────────────────────────────────────────────────

  private clearMemory(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.authMethod = null;
    this.user = null;
    this.expiresAt = null;
  }

  async clearAll(): Promise<void> {
    logger.info('[TokenManager] 🗑️ Clearing all tokens');
    this.clearMemory();
    await tokenStore.clear();
  }
}

export const tokenManager = new TokenManager();
