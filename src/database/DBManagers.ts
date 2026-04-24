import { AppState, AppStateStatus } from 'react-native';
import {
  DatabaseManager as BaseManager,
  DatabaseSchema,
  UniversalDAO,
} from '@dqcai/sqlite';
import { createModuleLogger, AppModules } from '../logger';

const logger = createModuleLogger(AppModules.DB_MANAGER);

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
    logger.debug('DatabaseManager.init — setting up AppState listener');
    this.setupAppStateListener();
  }

  // ===========================================
  // ROLE MANAGEMENT
  // ===========================================

  public static registerRole(roleConfig: RoleConfig): void {
    logger.debug('registerRole', { role: roleConfig.roleName, dbs: roleConfig.requiredDatabases });
    BaseManager.registerRole(roleConfig);
  }

  public static registerRoles(roleConfigs: RoleConfig[]): void {
    logger.debug('registerRoles', { count: roleConfigs.length, roles: roleConfigs.map(r => r.roleName) });
    BaseManager.registerRoles(roleConfigs);
  }

  public static async setCurrentUserRoles(
    userRoles: string[],
    primaryRole?: string,
  ): Promise<void> {
    logger.info('setCurrentUserRoles', { roles: userRoles, primary: primaryRole });
    await BaseManager.setCurrentUserRoles(userRoles, primaryRole);
    logger.debug('setCurrentUserRoles — done');
  }

  // ===========================================
  // CONNECTION MANAGEMENT
  // ===========================================

  public static get(key: string): UniversalDAO {
    const dao = BaseManager.get(key);
    if (!dao) {
      logger.error(`Database '${key}' not connected`, { key });
      throw new Error(`Database '${key}' not connected in BaseManager.`);
    }
    return dao;
  }

  public static async getLazyLoading(key: string): Promise<UniversalDAO> {
    return this.ensureDatabaseConnection(key);
  }

  public static async ensureDatabaseConnection(key: string): Promise<UniversalDAO> {
    logger.debug(`ensureDatabaseConnection — '${key}'`);
    await BaseManager.ensureDatabaseConnection(key);
    const dao = this.get(key);
    logger.debug(`ensureDatabaseConnection — '${key}' ready`);
    return dao;
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
    logger.info('closeAll — closing all database connections');
    await BaseManager.closeAll();
    logger.info('closeAll — done');
  }
}

export default DatabaseManager;
