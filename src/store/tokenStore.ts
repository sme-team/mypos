// Đây là lớp bọc (wrapper) quanh AsyncStorage. Thay vì gọi trực tiếp các hàm của thư viện ở khắp nơi, bạn dùng file này để quản lý tập trung.
// Nhiệm vụ: Lưu dữ liệu xuống ổ cứng của điện thoại. Khi bạn tắt máy, bật lại, dữ liệu trong này vẫn còn.
// Cơ chế multiGet & multiRemove: Thay vì đọc/ghi từng dòng lẻ tẻ (tốn hiệu năng), nó gom tất cả ACCESS_TOKEN, USER,... vào một lần xử lý.
// In-memory Cache (private data): Nó lưu một bản sao dữ liệu vào biến data trong RAM. Điều này giúp các hàm getAccessToken() trả về kết quả ngay lập tức (sync) mà không cần await.



import AsyncStorage from '@react-native-async-storage/async-storage';
import { createModuleLogger, AppModules } from '../logger';

const logger = createModuleLogger(AppModules.AUTH_STORE);

const KEYS = {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    AUTH_METHOD: 'auth_method',
    USER: 'user_profile',
    EXPIRES_AT: 'expires_at',
};

class TokenStore {
    private data: Record<string, any> = {};

    async init() {
        try {
            const keys = Object.values(KEYS);
            const pairs = await AsyncStorage.multiGet(keys);
            pairs.forEach(([key, value]) => {
                if (value) {
                    try {
                        this.data[key] = key === KEYS.USER ? JSON.parse(value) : value;
                    } catch {
                        this.data[key] = value;
                    }
                }
            });
        } catch (error) {
            logger.error('[TokenStore] Init error:', error);
        }
    }

    getAccessToken() { return this.data[KEYS.ACCESS_TOKEN]; }
    getRefreshToken() { return this.data[KEYS.REFRESH_TOKEN]; }
    getAuthMethod() { return this.data[KEYS.AUTH_METHOD]; }
    getUser() { return this.data[KEYS.USER]; }
    getExpiresAt() { return this.data[KEYS.EXPIRES_AT] ? Number(this.data[KEYS.EXPIRES_AT]) : null; }

    async setAccessToken(token: string | null) {
        this.data[KEYS.ACCESS_TOKEN] = token;
        if (token) {await AsyncStorage.setItem(KEYS.ACCESS_TOKEN, token);}
        else {await AsyncStorage.removeItem(KEYS.ACCESS_TOKEN);}
    }

    async setRefreshToken(token: string | null) {
        this.data[KEYS.REFRESH_TOKEN] = token;
        if (token) {await AsyncStorage.setItem(KEYS.REFRESH_TOKEN, token);}
        else {await AsyncStorage.removeItem(KEYS.REFRESH_TOKEN);}
    }

    async setAuthMethod(method: string | null) {
        this.data[KEYS.AUTH_METHOD] = method;
        if (method) {await AsyncStorage.setItem(KEYS.AUTH_METHOD, method);}
        else {await AsyncStorage.removeItem(KEYS.AUTH_METHOD);}
    }

    async setUser(user: any | null) {
        this.data[KEYS.USER] = user;
        if (user) {await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));}
        else {await AsyncStorage.removeItem(KEYS.USER);}
    }

    async setExpiresAt(expiresAt: number | null) {
        this.data[KEYS.EXPIRES_AT] = expiresAt;
        if (expiresAt) {await AsyncStorage.setItem(KEYS.EXPIRES_AT, expiresAt.toString());}
        else {await AsyncStorage.removeItem(KEYS.EXPIRES_AT);}
    }

    async clear() {
        this.data = {};
        await AsyncStorage.multiRemove(Object.values(KEYS));
    }
}

export const tokenStore = new TokenStore();
