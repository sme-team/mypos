import { AppState, AppStateStatus } from 'react-native';
import {
  DatabaseManager as BaseManager,
  DatabaseSchema,
} from '@dqcai/sqlite';
import { DatabaseFactory } from './DatabaseFactory';
import SQLiteDAO from './SQLiteDAO';
import { posSchema as MyPOS } from './configs/MyPOS';

// Local definition of RoleConfig since it's not exported from the library's main index
export interface RoleConfig {
  roleName: string;
  requiredDatabases: string[];
  optionalDatabases?: string[];
  priority?: number;
}

// Re-export type mappings for backward compatibility if needed
export type {
  DatabaseSchema as DatabaseSchemaWithTypeMapping,
};

// Registry of schemas for the ecosystem
export const onePosEcosystemSchemas: Record<string, DatabaseSchema> = {
  pos: MyPOS,
};

export type DatabaseConnections = {
  [key: string]: SQLiteDAO;
};

/**
 * DatabaseManager acts as a thin wrapper for @dqcai/sqlite.DatabaseManager.
 * Refactored to eliminate duplicate state and handle lazy wrapping.
 */
export class DatabaseManager {
  private static appStateListener: any = null;
  // Wrapper cache: Maps schema name to local SQLiteDAO wrapper
  private static connections: DatabaseConnections = {};

  /**
   * Initialize the manager and register schemas
   */
  public static async init(): Promise<void> {
    BaseManager.registerSchemas(onePosEcosystemSchemas);
    this.setupAppStateListener();
  }

  // ===========================================
  // ROLE MANAGEMENT (Delegated to library)
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
    // Delegate core connection lifecycle to library
    await BaseManager.setCurrentUserRoles(userRoles, primaryRole);
    // Cleanup local wrappers that were closed by the library
    this.syncLocalWrappers();
  }

  // ===========================================
  // CONNECTION MANAGEMENT (Wrapper)
  // ===========================================

  /**
   * Get a wrapped connection. Lazily creates the wrapper if it doesn't exist.
   */
  public static get(key: string): SQLiteDAO {
    // 1. Check if the library still has the active connection
    const baseDao = BaseManager.get(key);
    if (!baseDao) {
      throw new Error(`Database '${key}' not connected in BaseManager.`);
    }

    // 2. Wrap and cache if necessary
    if (!this.connections[key] || this.connections[key].getInternalDAO() !== baseDao) {
      this.connections[key] = new SQLiteDAO(baseDao);
    }

    return this.connections[key];
  }

  /**
   * Alias for ensureDatabaseConnection to maintain backward compatibility with BaseService.
   */
  public static async getLazyLoading(key: string): Promise<SQLiteDAO> {
    return this.ensureDatabaseConnection(key);
  }

  /**
   * Ensure a connection is active (delegated)
   */
  public static async ensureDatabaseConnection(key: string): Promise<SQLiteDAO> {
    await BaseManager.ensureDatabaseConnection(key);
    return this.get(key);
  }

  /**
   * Synchronize local wrapper cache with library active connections
   */
  private static syncLocalWrappers(): void {
    const activeKeys = BaseManager.listConnections();
    // Remove local wrappers that are no longer active in library
    for (const key in this.connections) {
      if (!activeKeys.includes(key)) {
        delete this.connections[key];
      }
    }
  }

  // ===========================================
  // EVENTS & LIFECYCLE (Wrapper)
  // ===========================================

  public static onDatabaseReconnect(
    schemaName: string,
    callback: (dao: SQLiteDAO) => void,
  ): void {
    // Wrap the listener: when library reconnects, notify with wrapper
    BaseManager.onDatabaseReconnect(schemaName, (baseDao) => {
      const dao = this.get(schemaName);
      callback(dao);
    });
  }

  public static offDatabaseReconnect(
    schemaName: string,
    callback: (dao: SQLiteDAO) => void,
  ): void {
    // Note: Since we wrap the callback in onDatabaseReconnect, we technically need
    // to map back to the library's internal callback to truly remove it.
    // For now, this is a placeholder that delegates to BaseManager assuming
    // direct cleanup if supported by the library.
    BaseManager.offDatabaseReconnect(schemaName, callback as any);
  }

  /**
   * AppState listener: simple notify library of state changes.
   * Race conditions are handled within BaseManager.
   */
  private static setupAppStateListener(): void {
    if (this.appStateListener) return;

    this.appStateListener = AppState.addEventListener(
      'change',
      async (nextAppState: AppStateStatus) => {
        // Tạm thời vô hiệu hoá tính năng tự động đóng/mở kết nối SQLite khi app rơi vào background
        // SQLite trong React Native vốn dĩ được OS tự động quản lý vòng đời. Đóng bằng code thường gây đứt gãy query đang dở dang hoặc lỗi khi reopen.
        /*
        if (nextAppState === 'background' || nextAppState === 'inactive') {
          await BaseManager.closeAll();
          this.connections = {}; // Flush wrappers
        } else if (nextAppState === 'active') {
          await BaseManager.reopenConnections();
          this.syncLocalWrappers();
        }
        */
      },
    );
  }

  public static async closeAll(): Promise<void> {
    await BaseManager.closeAll();
    this.connections = {};
  }
}

export default DatabaseManager;
