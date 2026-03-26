// src/services/store-wrapper.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

import {createModuleLogger, AppModules} from '../logger';
const logger = createModuleLogger(AppModules.STORE_WRAPPER);

/**
 * Wrapper cho AsyncStorage (React Native) để thay thế electron-store
 * API tương tự TokenStore cũ nhưng hoạt động async
 */
export class TokenStore {
  private cache: Record<string, any> = {};
  private loaded = false;

  /**
   * Phải gọi trước khi dùng - load toàn bộ token từ AsyncStorage vào cache
   */
  async init(): Promise<void> {
    try {
      const keys = ['accessToken', 'refreshToken', 'authMethod', 'user', 'expiresAt'];
      const pairs = await AsyncStorage.multiGet(keys);
      pairs.forEach(([key, value]) => {
        if (value !== null) {
          try {
            this.cache[key] = JSON.parse(value);
          } catch {
            this.cache[key] = value;
          }
        }
      });
      this.loaded = true;
    } catch (error) {
      logger.error('[TokenStore] Error loading from AsyncStorage:', error);
      this.loaded = true;
    }
  }

  private ensureLoaded(): void {
    if (!this.loaded) {
      logger.warn('[TokenStore] Store not initialized. Call init() first.');
    }
  }

  // ─── Generic get/set/has/delete/clear ───────────────────────────────────────

  get(key: string): any {
    this.ensureLoaded();
    return this.cache[key] ?? undefined;
  }

  async set(key: string, value: any): Promise<void> {
    this.cache[key] = value;
    await AsyncStorage.setItem(key, JSON.stringify(value));
  }

  has(key: string): boolean {
    this.ensureLoaded();
    return key in this.cache && this.cache[key] !== undefined && this.cache[key] !== null;
  }

  async delete(key: string): Promise<void> {
    delete this.cache[key];
    await AsyncStorage.removeItem(key);
  }

  async clear(): Promise<void> {
    this.cache = {};
    const keys = ['accessToken', 'refreshToken', 'authMethod', 'user', 'expiresAt'];
    await AsyncStorage.multiRemove(keys);
  }

  // ─── Typed helpers ───────────────────────────────────────────────────────────

  getAccessToken(): string | undefined {
    return this.get('accessToken');
  }

  async setAccessToken(token: string): Promise<void> {
    await this.set('accessToken', token);
  }

  getRefreshToken(): string | undefined {
    return this.get('refreshToken');
  }

  async setRefreshToken(token: string): Promise<void> {
    await this.set('refreshToken', token);
  }

  getAuthMethod(): 'credentials' | 'google' | undefined {
    return this.get('authMethod');
  }

  async setAuthMethod(method: 'credentials' | 'google'): Promise<void> {
    await this.set('authMethod', method);
  }

  getUser(): any {
    return this.get('user');
  }

  async setUser(user: any): Promise<void> {
    await this.set('user', user);
  }

  getExpiresAt(): number | undefined {
    return this.get('expiresAt');
  }

  async setExpiresAt(timestamp: number): Promise<void> {
    await this.set('expiresAt', timestamp);
  }
}

export const tokenStore = new TokenStore();
