import { AppState, AppStateStatus } from 'react-native';
import {
  DatabaseManager as BaseManager,
  DatabaseSchema,
  UniversalDAO,
} from '@dqcai/sqlite';

export interface RoleConfig {
  roleName: string;
  requiredDatabases: string[];
  optionalDatabases?: string[];
  priority?: number;
  description?: string;
}

export type { DatabaseSchema as DatabaseSchemaWithTypeMapping };

/**
 * DatabaseManager — thin pass-through to @dqcai/sqlite BaseManager.
 * Tất cả data flows đi qua adapter đã đăng ký (ReactNativeAdapter).
 * Trả UniversalDAO trực tiếp — không còn lớp SQLiteDAO wrapper.
 */
export class DatabaseManager {
  private static appStateListener: any = null;

  public static async init(): Promise<void> {
    this.setupAppStateListener();
  }

  // ===========================================
  // ROLE MANAGEMENT
  // ===========================================

  public static registerRole(roleConfig: RoleConfig): void {
    BaseManager.registerRole(roleConfig);
  }

  public static registerRoles(roleConfigs: RoleConfig[]): void {
    BaseManager.registerRoles(roleConfigs);
  }

  public static async setCurrentUserRoles(
    userRoles: string[],
    primaryRole?: string,
  ): Promise<void> {
    await BaseManager.setCurrentUserRoles(userRoles, primaryRole);
  }

  // ===========================================
  // CONNECTION MANAGEMENT
  // ===========================================

  public static get(key: string): UniversalDAO {
    const dao = BaseManager.get(key);
    if (!dao) {
      throw new Error(`Database '${key}' not connected in BaseManager.`);
    }
    return dao;
  }

  public static async getLazyLoading(key: string): Promise<UniversalDAO> {
    return this.ensureDatabaseConnection(key);
  }

  public static async ensureDatabaseConnection(key: string): Promise<UniversalDAO> {
    await BaseManager.ensureDatabaseConnection(key);
    return this.get(key);
  }

  public static listConnections(): string[] {
    return BaseManager.listConnections();
  }

  // ===========================================
  // RECONNECT EVENTS
  // ===========================================

  public static onDatabaseReconnect(
    schemaName: string,
    callback: (dao: UniversalDAO) => void,
  ): void {
    BaseManager.onDatabaseReconnect(schemaName, callback);
  }

  public static offDatabaseReconnect(
    schemaName: string,
    callback: (dao: UniversalDAO) => void,
  ): void {
    BaseManager.offDatabaseReconnect(schemaName, callback as any);
  }

  // ===========================================
  // LIFECYCLE
  // ===========================================

  private static setupAppStateListener(): void {
    if (this.appStateListener) return;
    this.appStateListener = AppState.addEventListener(
      'change',
      async (_nextAppState: AppStateStatus) => {
        // SQLite lifecycle managed by OS in React Native — intentionally disabled.
        // Closing manually causes in-flight query failures on resume.
      },
    );
  }

  public static async closeAll(): Promise<void> {
    await BaseManager.closeAll();
  }
}

export default DatabaseManager;
